import type {
  Account,
  AccountSetupReadiness,
  AccountSetupState,
  Alert,
  AuthField,
  AuditEvent,
  ContentCard,
  DashboardSnapshot,
  InboxItem,
  PlatformSetupBlueprint,
  Project,
  QueueItem
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
  return getJson<Project[]>("/api/projects", []);
}

export function getAccounts() {
  return getJson<Account[]>("/api/accounts", []);
}

export function getPlatformSetup() {
  return getJson<PlatformSetupBlueprint[]>("/api/platform-setup", []);
}

export function getAccountProfile(accountId: string) {
  return getJson<{
    account: Account;
    profile: {
      platform: Account["platform"];
      defaultMode: Account["connectorMode"];
      sessionFallback: boolean;
      requiresSessionAtLaunch: boolean;
      dmSupport: "none" | "api" | "session" | "hybrid";
      notes: string;
      features: Account["features"];
      liveExecutionImplemented: boolean;
    };
    blueprint: PlatformSetupBlueprint;
    setup: AccountSetupState;
    readiness: AccountSetupReadiness;
    authConnection: {
      provider: string;
      scopes: string[];
      expiresAt: string | null;
      refreshExpiresAt: string | null;
      updatedAt: string;
      externalAccountId: string | null;
      externalUsername: string | null;
      metadata: Record<string, string>;
    } | null;
  }>(`/api/accounts/${accountId}/profile`, null as never);
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
      source: string;
      cookieCount: number;
      localStorageCount: number;
      warnings: string[];
    }>
  >("/api/session-vault", []);
}

export function getAlerts() {
  return getJson<DashboardSnapshot>("/api/dashboard", {
    projects: [],
    accounts: [],
    alerts: [],
    queue: [],
    audit: []
  }).then((snapshot) => snapshot.alerts);
}

export function getQueue() {
  return getJson<QueueItem[]>("/api/queue", []);
}

export function getAudit() {
  return getJson<DashboardSnapshot>("/api/dashboard", {
    projects: [],
    accounts: [],
    alerts: [],
    queue: [],
    audit: []
  }).then((snapshot) => snapshot.audit);
}

export function getContent() {
  return getJson<ContentCard[]>("/api/content", []);
}

export function getInbox() {
  return getJson<InboxItem[]>("/api/inbox", []);
}
