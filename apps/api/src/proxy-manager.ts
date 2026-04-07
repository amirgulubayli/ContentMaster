import type { ProxyAssignment, ProxyAssignmentScope, ProxyRecord } from "@content-empire/shared";
import type { AppState } from "./state.js";

export type ParsedProxy = {
  id: string;
  label: string;
  raw: string;
  server: string;
  username?: string;
  password?: string;
  proxyUrl: string;
};

export type ProxySelectionContext = {
  key: string;
  scope: ProxyAssignmentScope;
  target: string;
  platformHint?: string | null;
};

function normalizeHost(host: string) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

export function getAccountProxyKey(accountId: string) {
  return `account:${accountId}`;
}

export function parseProxyRecord(proxy: ProxyRecord): ParsedProxy {
  const value = proxy.raw.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    const parsed = new URL(value);
    return {
      id: proxy.id,
      label: proxy.label,
      raw: proxy.raw,
      server: `${parsed.protocol}//${parsed.host}`,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      proxyUrl: value
    };
  }

  const parts = value.split(":");
  if (parts.length < 4) {
    throw new Error(`Proxy ${proxy.label} must use URL form or IP:PORT:USER:PASS.`);
  }

  const password = parts.pop() ?? "";
  const username = parts.pop() ?? "";
  const port = parts.pop() ?? "";
  const host = parts.join(":");
  const normalizedHost = normalizeHost(host);
  const auth = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;

  return {
    id: proxy.id,
    label: proxy.label,
    raw: proxy.raw,
    server: `http://${normalizedHost}:${port}`,
    username,
    password,
    proxyUrl: `http://${auth}@${normalizedHost}:${port}`
  };
}

export function inferPlatformFromHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host.includes("reddit")) return "reddit";
  if (host.includes("twitter") || host.includes("x.com") || host.includes("twimg")) return "x";
  if (host.includes("linkedin")) return "linkedin";
  if (host.includes("medium")) return "medium";
  if (host.includes("substack")) return "substack";
  if (host.includes("quora")) return "quora";
  if (host.includes("bsky") || host.includes("bluesky")) return "bluesky";
  if (host.includes("pinterest")) return "pinterest";
  if (host.includes("facebook") || host.includes("instagram") || host.includes("graph.facebook")) {
    return host.includes("instagram") ? "instagram" : "facebook";
  }
  if (host.includes("tiktok")) return "tiktok";
  if (host.includes("youtube") || host.includes("googleapis") || host.includes("googleusercontent")) {
    return "youtube";
  }

  return null;
}

export function shouldBypassProxy(url: URL) {
  const host = url.hostname.toLowerCase();
  if (!["http:", "https:"].includes(url.protocol)) {
    return true;
  }

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "session-runner" ||
    host === "content-empire-api"
  );
}

function proxySupportsPlatform(proxy: ProxyRecord, platformHint?: string | null) {
  if (proxy.platformTargets.length === 0 || !platformHint) {
    return true;
  }

  return proxy.platformTargets.includes(platformHint as never);
}

function getEligibleProxies(state: AppState, platformHint?: string | null) {
  return state.proxies.filter((proxy) => proxy.enabled && proxySupportsPlatform(proxy, platformHint));
}

function countAssignmentsForProxy(state: AppState, proxyId: string) {
  return Object.values(state.proxyAssignments).filter((assignment) => assignment.proxyId === proxyId).length;
}

function getBestProxy(state: AppState, platformHint?: string | null) {
  const eligible = getEligibleProxies(state, platformHint);
  if (eligible.length === 0) {
    return null;
  }

  return [...eligible].sort((left, right) => {
    if (left.consecutiveFailures !== right.consecutiveFailures) {
      return left.consecutiveFailures - right.consecutiveFailures;
    }

    const assignmentDelta = countAssignmentsForProxy(state, left.id) - countAssignmentsForProxy(state, right.id);
    if (assignmentDelta !== 0) {
      return assignmentDelta;
    }

    return left.label.localeCompare(right.label);
  })[0];
}

function writeAssignment(state: AppState, context: ProxySelectionContext, proxyId: string) {
  const assignment: ProxyAssignment = {
    key: context.key,
    scope: context.scope,
    target: context.target,
    platformHint: context.platformHint ?? null,
    proxyId,
    updatedAt: new Date().toISOString()
  };

  state.proxyAssignments[context.key] = assignment;
  return assignment;
}

export function selectProxyForContext(state: AppState, context: ProxySelectionContext) {
  const eligible = getEligibleProxies(state, context.platformHint);
  if (eligible.length === 0) {
    return null;
  }

  const existing = state.proxyAssignments[context.key];
  const existingProxy = existing
    ? eligible.find((proxy) => proxy.id === existing.proxyId) ?? null
    : null;
  const selected = existingProxy ?? getBestProxy(state, context.platformHint);

  if (!selected) {
    return null;
  }

  if (!existing || existing.proxyId !== selected.id || existing.platformHint !== (context.platformHint ?? null)) {
    writeAssignment(state, context, selected.id);
  }

  return selected;
}

export function rotateProxyForContext(
  state: AppState,
  context: ProxySelectionContext
) {
  const eligible = getEligibleProxies(state, context.platformHint);
  if (eligible.length === 0) {
    return null;
  }

  const currentProxyId = state.proxyAssignments[context.key]?.proxyId ?? null;
  const currentIndex = eligible.findIndex((proxy) => proxy.id === currentProxyId);
  const nextProxy = eligible[(currentIndex + 1 + eligible.length) % eligible.length];
  writeAssignment(state, context, nextProxy.id);
  return nextProxy;
}

function updateProxyRecord(
  state: AppState,
  proxyId: string,
  updater: (proxy: ProxyRecord) => ProxyRecord
) {
  const index = state.proxies.findIndex((proxy) => proxy.id === proxyId);
  if (index === -1) {
    return;
  }

  state.proxies[index] = updater(state.proxies[index]);
}

export function recordProxySuccess(state: AppState, proxyId: string) {
  updateProxyRecord(state, proxyId, (proxy) => ({
    ...proxy,
    lastUsedAt: new Date().toISOString(),
    successCount: proxy.successCount + 1,
    consecutiveFailures: 0,
    updatedAt: new Date().toISOString()
  }));
}

export function recordProxyFailure(state: AppState, proxyId: string, reason: string) {
  updateProxyRecord(state, proxyId, (proxy) => ({
    ...proxy,
    lastFailureAt: new Date().toISOString(),
    lastError: reason,
    failureCount: proxy.failureCount + 1,
    consecutiveFailures: proxy.consecutiveFailures + 1,
    updatedAt: new Date().toISOString()
  }));
}

export function deleteProxyFromState(state: AppState, proxyId: string) {
  state.proxies = state.proxies.filter((proxy) => proxy.id !== proxyId);

  for (const [key, assignment] of Object.entries(state.proxyAssignments)) {
    if (assignment.proxyId === proxyId) {
      delete state.proxyAssignments[key];
    }
  }
}

export function buildProxySnapshot(state: AppState) {
  return {
    proxies: state.proxies,
    assignments: Object.values(state.proxyAssignments)
      .map((assignment) => ({
        ...assignment,
        proxyLabel: state.proxies.find((proxy) => proxy.id === assignment.proxyId)?.label ?? null
      }))
      .sort((left, right) => left.key.localeCompare(right.key))
  };
}
