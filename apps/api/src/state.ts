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

export const state = {
  projects: structuredClone(seedProjects) as Project[],
  accounts: structuredClone(seedAccounts) as Account[],
  alerts: structuredClone(seedAlerts) as Alert[],
  audit: structuredClone(seedAudit) as AuditEvent[],
  queue: structuredClone(seedQueue) as QueueItem[],
  content: structuredClone(seedContent) as ContentCard[],
  inbox: structuredClone(seedInbox) as InboxItem[],
  sessions: Object.fromEntries(
    Object.entries(seedSessionBundles).map(([accountId, bundle]) => [
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
