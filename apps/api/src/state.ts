import {
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

const encryptionSecret = process.env.SESSION_ENCRYPTION_KEY ?? "development-session-key";
const demoMode = process.env.DEMO_MODE === "true";

export const state = {
  projects: structuredClone(demoMode ? seedProjects : []) as Project[],
  accounts: structuredClone(demoMode ? seedAccounts : []) as Account[],
  alerts: structuredClone(demoMode ? seedAlerts : []) as Alert[],
  audit: structuredClone(demoMode ? seedAudit : []) as AuditEvent[],
  queue: structuredClone(demoMode ? seedQueue : []) as QueueItem[],
  content: structuredClone(demoMode ? seedContent : []) as ContentCard[],
  inbox: structuredClone(demoMode ? seedInbox : []) as InboxItem[],
  sessions: Object.fromEntries(
    Object.entries(demoMode ? seedSessionBundles : {}).map(([accountId, bundle]) => [
      accountId,
      {
        encryptedBundle: encryptJson(bundle, encryptionSecret),
        version: 3,
        storageMode: "encrypted_profile+bundle"
      }
    ])
  ) as Record<string, { encryptedBundle: string; version: number; storageMode: string }>
};

export function appendAudit(event: AuditEvent) {
  state.audit.unshift(event);
}
