import {
  type AccountSetupState,
  type ProxyAssignment,
  type ProxyRecord,
  encryptJson,
  seedAccounts,
  seedAlerts,
  seedAudit,
  seedContent,
  seedInbox,
  seedProjects,
  seedQueue,
  seedSessionBundles,
  type Account,
  type Alert,
  type AuditEvent,
  type ContentCard,
  type InboxItem,
  type Project,
  type QueueItem
} from "@content-empire/shared";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const encryptionSecret = process.env.SESSION_ENCRYPTION_KEY ?? "development-session-key";
const demoMode = process.env.DEMO_MODE === "true";

type StoredSessionRecord = {
  encryptedBundle: string;
  version: number;
  storageMode: string;
  source: string;
};

type StoredCredential = {
  provider: "meta" | "tiktok" | "x" | "linkedin" | "reddit" | "pinterest" | "google" | "bluesky";
  encryptedTokenSet: string;
  scopes: string[];
  expiresAt: string | null;
  refreshExpiresAt: string | null;
  updatedAt: string;
  externalAccountId: string | null;
  externalUsername: string | null;
  metadata: Record<string, string>;
};

type StoredOauthState = {
  accountId: string;
  provider: "meta" | "tiktok" | "x" | "linkedin" | "reddit" | "pinterest" | "google";
  createdAt: string;
  codeVerifier?: string;
};

export type AppState = {
  projects: Project[];
  accounts: Account[];
  alerts: Alert[];
  audit: AuditEvent[];
  queue: QueueItem[];
  content: ContentCard[];
  inbox: InboxItem[];
  proxies: ProxyRecord[];
  proxyAssignments: Record<string, ProxyAssignment>;
  sessions: Record<string, StoredSessionRecord>;
  credentials: Record<string, StoredCredential>;
  oauthStates: Record<string, StoredOauthState>;
  setup: Record<string, AccountSetupState>;
};

const stateStorePath = process.env.STATE_STORE_PATH ?? "/data/state.json";

function createDefaultState(): AppState {
  return {
    projects: structuredClone(demoMode ? seedProjects : []) as Project[],
    accounts: structuredClone(demoMode ? seedAccounts : []) as Account[],
    alerts: structuredClone(demoMode ? seedAlerts : []) as Alert[],
    audit: structuredClone(demoMode ? seedAudit : []) as AuditEvent[],
    queue: structuredClone(demoMode ? seedQueue : []) as QueueItem[],
    content: structuredClone(demoMode ? seedContent : []) as ContentCard[],
    inbox: structuredClone(demoMode ? seedInbox : []) as InboxItem[],
    proxies: [],
    proxyAssignments: {},
    sessions: Object.fromEntries(
      Object.entries(demoMode ? seedSessionBundles : {}).map(([accountId, bundle]) => [
        accountId,
        {
          encryptedBundle: encryptJson(bundle, encryptionSecret),
          version: 3,
          storageMode: "encrypted_profile+bundle",
          source: "seed"
        }
      ])
    ) as Record<string, StoredSessionRecord>,
    credentials: {},
    oauthStates: {},
    setup: {}
  };
}

function loadState(): AppState {
  const fallback = createDefaultState();

  if (!existsSync(stateStorePath)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(readFileSync(stateStorePath, "utf8")) as Partial<AppState>;
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : fallback.projects,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : fallback.accounts,
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : fallback.alerts,
      audit: Array.isArray(parsed.audit) ? parsed.audit : fallback.audit,
      queue: Array.isArray(parsed.queue) ? parsed.queue : fallback.queue,
      content: Array.isArray(parsed.content) ? parsed.content : fallback.content,
      inbox: Array.isArray(parsed.inbox) ? parsed.inbox : fallback.inbox,
      proxies: Array.isArray(parsed.proxies) ? parsed.proxies : fallback.proxies,
      proxyAssignments:
        parsed.proxyAssignments && typeof parsed.proxyAssignments === "object"
          ? parsed.proxyAssignments
          : fallback.proxyAssignments,
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : fallback.sessions,
      credentials:
        parsed.credentials && typeof parsed.credentials === "object" ? parsed.credentials : fallback.credentials,
      oauthStates:
        parsed.oauthStates && typeof parsed.oauthStates === "object" ? parsed.oauthStates : fallback.oauthStates,
      setup: parsed.setup && typeof parsed.setup === "object" ? parsed.setup : fallback.setup
    };
  } catch (error) {
    console.error(`Failed to load persisted API state from ${stateStorePath}. Using defaults instead.`, error);
    return fallback;
  }
}

export const state = loadState();

export function persistState() {
  try {
    mkdirSync(dirname(stateStorePath), { recursive: true });
    writeFileSync(stateStorePath, JSON.stringify(state, null, 2), "utf8");
  } catch (error) {
    console.error(`Failed to persist API state to ${stateStorePath}.`, error);
  }
}

export function appendAudit(event: AuditEvent) {
  state.audit.unshift(event);
  persistState();
}
