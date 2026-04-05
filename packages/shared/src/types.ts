import { z } from "zod";

export const platformSchema = z.enum([
  "x",
  "linkedin",
  "medium",
  "substack",
  "quora",
  "reddit",
  "bluesky",
  "pinterest",
  "facebook",
  "instagram",
  "tiktok",
  "youtube"
]);

export type Platform = z.infer<typeof platformSchema>;

export const connectorModeSchema = z.enum(["api_auth", "session_auth", "hybrid_auth"]);
export type ConnectorMode = z.infer<typeof connectorModeSchema>;

export const automationModeSchema = z.enum(["manual_review", "assisted_auto", "full_auto"]);
export type AutomationMode = z.infer<typeof automationModeSchema>;

export const featureKeySchema = z.enum([
  "publish_text",
  "publish_image",
  "publish_video",
  "edit_published",
  "reply_comment",
  "engage",
  "read_inbox",
  "reply_dm",
  "read_metrics"
]);

export type FeatureKey = z.infer<typeof featureKeySchema>;

export const sessionHealthSchema = z.enum(["healthy", "warning", "expired", "revoked"]);
export type SessionHealth = z.infer<typeof sessionHealthSchema>;

export const projectSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  voice: z.string(),
  status: z.enum(["active", "paused"]),
  dailyOptimizationEnabled: z.boolean()
});

export type Project = z.infer<typeof projectSchema>;

export const accountSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  platform: platformSchema,
  handle: z.string(),
  displayName: z.string(),
  connectorMode: connectorModeSchema,
  automationMode: automationModeSchema,
  sessionHealth: sessionHealthSchema,
  authStatus: z.enum(["not_started", "configured", "certified"]),
  features: z.array(featureKeySchema),
  lastAuthRefreshAt: z.string(),
  lastPostAt: z.string().nullable(),
  sessionRequired: z.boolean(),
  openClawEnabled: z.boolean()
});

export type Account = z.infer<typeof accountSchema>;

export const authFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(["text", "password", "url", "textarea", "select"]),
  required: z.boolean(),
  help: z.string(),
  options: z.array(z.string()).optional()
});

export type AuthField = z.infer<typeof authFieldSchema>;

export const platformSetupBlueprintSchema = z.object({
  platform: platformSchema,
  supportedModes: z.array(connectorModeSchema),
  apiFields: z.array(authFieldSchema),
  sessionFields: z.array(authFieldSchema),
  notes: z.array(z.string()),
  liveExecutionImplemented: z.boolean()
});

export type PlatformSetupBlueprint = z.infer<typeof platformSetupBlueprintSchema>;

export const accountSetupStateSchema = z.object({
  accountId: z.string(),
  connectorMode: connectorModeSchema,
  automationMode: automationModeSchema,
  authStatus: z.enum(["not_started", "configured", "certified"]),
  openClawEnabled: z.boolean(),
  apiConfig: z.record(z.string(), z.string()),
  sessionConfig: z.record(z.string(), z.string()),
  notes: z.string(),
  updatedAt: z.string()
});

export type AccountSetupState = z.infer<typeof accountSetupStateSchema>;

export const accountSetupReadinessSchema = z.object({
  requiredApiFields: z.array(z.string()),
  requiredSessionFields: z.array(z.string()),
  missingApiFields: z.array(z.string()),
  missingSessionFields: z.array(z.string()),
  configComplete: z.boolean(),
  sessionCaptureNeeded: z.boolean(),
  sessionCaptured: z.boolean(),
  canCertify: z.boolean(),
  canEnableOpenClaw: z.boolean(),
  liveExecutionImplemented: z.boolean(),
  blockers: z.array(z.string()),
  nextSteps: z.array(z.string())
});

export type AccountSetupReadiness = z.infer<typeof accountSetupReadinessSchema>;

export const auditEventSchema = z.object({
  id: z.string(),
  actor: z.string(),
  action: z.string(),
  subject: z.string(),
  status: z.enum(["success", "warning", "failed"]),
  createdAt: z.string(),
  detail: z.string()
});

export type AuditEvent = z.infer<typeof auditEventSchema>;

export const alertSchema = z.object({
  id: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string(),
  message: z.string(),
  createdAt: z.string(),
  accountId: z.string().nullable()
});

export type Alert = z.infer<typeof alertSchema>;

export const queueItemSchema = z.object({
  id: z.string(),
  accountId: z.string().nullable().default(null),
  projectName: z.string(),
  platform: platformSchema,
  type: z.enum(["publish", "edit", "comment_reply", "dm_reply", "session_refresh"]),
  scheduledFor: z.string(),
  status: z.enum(["queued", "running", "needs_review", "failed"]),
  owner: z.string()
});

export type QueueItem = z.infer<typeof queueItemSchema>;

export const dashboardSnapshotSchema = z.object({
  projects: z.array(projectSchema),
  accounts: z.array(accountSchema),
  alerts: z.array(alertSchema),
  queue: z.array(queueItemSchema),
  audit: z.array(auditEventSchema)
});

export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;

export const openClawActionSchema = z.object({
  action: z.enum([
    "connect_account",
    "publish_post",
    "edit_post",
    "reply_comment",
    "send_dm",
    "engage",
    "refresh_session",
    "analyze_performance"
  ]),
  accountId: z.string().optional(),
  projectId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).default({})
});

export type OpenClawAction = z.infer<typeof openClawActionSchema>;

export const connectorCertificationSchema = z.object({
  authValid: z.boolean(),
  dryRunPublish: z.boolean(),
  mediaUploadValidated: z.boolean(),
  commentReplyValidated: z.boolean(),
  inboxCapabilityValidated: z.boolean(),
  sessionStabilityScore: z.number().min(0).max(100)
});

export type ConnectorCertification = z.infer<typeof connectorCertificationSchema>;

export const sessionBundleSchema = z.object({
  cookies: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string(),
      path: z.string(),
      secure: z.boolean(),
      httpOnly: z.boolean()
    })
  ),
  localStorage: z.record(z.string(), z.string()),
  sessionStorage: z.record(z.string(), z.string()),
  csrfTokens: z.record(z.string(), z.string()),
  fingerprint: z.object({
    userAgent: z.string(),
    viewport: z.string(),
    locale: z.string()
  }),
  profileObjectKey: z.string().nullable()
});

export type SessionBundle = z.infer<typeof sessionBundleSchema>;

export const contentCardSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  title: z.string(),
  platformTargets: z.array(platformSchema),
  stage: z.enum(["draft", "ready", "scheduled", "published"]),
  imageProvider: z.string(),
  videoPipeline: z.string(),
  lastEditedBy: z.string(),
  nextAction: z.string()
});

export type ContentCard = z.infer<typeof contentCardSchema>;

export const inboxItemSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  platform: platformSchema,
  kind: z.enum(["comment", "dm"]),
  author: z.string(),
  message: z.string(),
  status: z.enum(["pending", "auto_replied", "needs_review"]),
  suggestedReply: z.string()
});

export type InboxItem = z.infer<typeof inboxItemSchema>;
