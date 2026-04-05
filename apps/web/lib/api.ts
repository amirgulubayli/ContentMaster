import type {
  Account,
  Alert,
  AuditEvent,
  ContentCard,
  DashboardSnapshot,
  InboxItem,
  Project,
  QueueItem
} from "@content-empire/shared";
import {
  seedAccounts,
  seedAlerts,
  seedAudit,
  seedContent,
  seedInbox,
  seedProjects,
  seedQueue
} from "@content-empire/shared";

const apiBaseUrl = process.env.API_URL ?? "http://127.0.0.1:4000";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function getProjects() {
  return getJson<Project[]>("/api/projects", seedProjects);
}

export function getAccounts() {
  return getJson<Account[]>("/api/accounts", seedAccounts);
}

export function getSessionVault() {
  return getJson<
    Array<{
      accountId: string;
      displayName: string;
      platform: string;
      connectorMode: string;
      sessionHealth: string;
      lastAuthRefreshAt: string;
      certifiedFeatures: string[];
      version: number;
      storageMode: string;
      warnings: string[];
    }>
  >("/api/session-vault", []);
}

export function getAlerts() {
  return getJson<DashboardSnapshot>("/api/dashboard", {
    projects: seedProjects,
    accounts: seedAccounts,
    alerts: seedAlerts,
    queue: seedQueue,
    audit: seedAudit
  }).then((snapshot) => snapshot.alerts);
}

export function getQueue() {
  return getJson<QueueItem[]>("/api/queue", seedQueue);
}

export function getAudit() {
  return getJson<DashboardSnapshot>("/api/dashboard", {
    projects: seedProjects,
    accounts: seedAccounts,
    alerts: seedAlerts,
    queue: seedQueue,
    audit: seedAudit
  }).then((snapshot) => snapshot.audit);
}

export function getContent() {
  return getJson<ContentCard[]>("/api/content", seedContent);
}

export function getInbox() {
  return getJson<InboxItem[]>("/api/inbox", seedInbox);
}
