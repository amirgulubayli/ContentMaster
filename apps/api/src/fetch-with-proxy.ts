import { ProxyAgent } from "undici";
import {
  buildProxySnapshot,
  inferPlatformFromHost,
  parseProxyRecord,
  recordProxyFailure,
  recordProxySuccess,
  rotateProxyForContext,
  selectProxyForContext,
  shouldBypassProxy,
  type ProxySelectionContext
} from "./proxy-manager.js";
import { persistState, state } from "./state.js";

const nativeFetch = globalThis.fetch.bind(globalThis);
const agentCache = new Map<string, ProxyAgent>();
const fetchInstalled = Symbol.for("content-empire.proxy-fetch-installed");

function getProxyAgent(proxyUrl: string) {
  const cached = agentCache.get(proxyUrl);
  if (cached) {
    return cached;
  }

  const agent = new ProxyAgent(proxyUrl);
  agentCache.set(proxyUrl, agent);
  return agent;
}

function isRetryableStatus(status: number) {
  return [407, 408, 429, 502, 503, 504].includes(status);
}

async function proxiedFetch(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1]
) {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
  if (shouldBypassProxy(url) || state.proxies.filter((proxy) => proxy.enabled).length === 0) {
    return nativeFetch(input, init);
  }

  const platformHint = inferPlatformFromHost(url.hostname);
  const context: ProxySelectionContext = {
    key: `host:${url.hostname.toLowerCase()}`,
    scope: "host",
    target: url.hostname.toLowerCase(),
    platformHint
  };

  const selected = selectProxyForContext(state, context);
  if (!selected) {
    return nativeFetch(input, init);
  }

  const initialProxy = parseProxyRecord(selected);
  const initialRequestInit = {
    ...(init ?? {}),
    dispatcher: getProxyAgent(initialProxy.proxyUrl)
  } as RequestInit;

  try {
    const response = await nativeFetch(input, initialRequestInit);
    if (!isRetryableStatus(response.status)) {
      recordProxySuccess(state, selected.id);
      persistState();
      return response;
    }

    recordProxyFailure(state, selected.id, `HTTP ${response.status}`);
    const rotated = rotateProxyForContext(state, context);
    persistState();
    if (!rotated || rotated.id === selected.id) {
      return response;
    }

    const rotatedProxy = parseProxyRecord(rotated);
    const retryInit = {
      ...(init ?? {}),
      dispatcher: getProxyAgent(rotatedProxy.proxyUrl)
    } as RequestInit;
    const retryResponse = await nativeFetch(input, retryInit);
    if (retryResponse.ok || !isRetryableStatus(retryResponse.status)) {
      recordProxySuccess(state, rotated.id);
    } else {
      recordProxyFailure(state, rotated.id, `HTTP ${retryResponse.status}`);
    }
    persistState();
    return retryResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    recordProxyFailure(state, selected.id, message);
    const rotated = rotateProxyForContext(state, context);
    persistState();

    if (!rotated || rotated.id === selected.id) {
      throw error;
    }

    const rotatedProxy = parseProxyRecord(rotated);
    const retryInit = {
      ...(init ?? {}),
      dispatcher: getProxyAgent(rotatedProxy.proxyUrl)
    } as RequestInit;
    const retryResponse = await nativeFetch(input, retryInit);
    if (retryResponse.ok || !isRetryableStatus(retryResponse.status)) {
      recordProxySuccess(state, rotated.id);
    } else {
      recordProxyFailure(state, rotated.id, `HTTP ${retryResponse.status}`);
    }
    persistState();
    return retryResponse;
  }
}

export function installProxyAwareFetch() {
  const globalState = globalThis as typeof globalThis & { [fetchInstalled]?: boolean };
  if (globalState[fetchInstalled]) {
    return;
  }

  globalThis.fetch = proxiedFetch as typeof globalThis.fetch;
  globalState[fetchInstalled] = true;
}

export function getProxyDashboardSnapshot() {
  return buildProxySnapshot(state);
}
