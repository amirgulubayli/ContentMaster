import {
  automationModeSchema,
  connectorModeSchema,
  featureKeySchema,
  openClawActionSchema,
  platformSchema,
  sessionBundleSchema
} from "@content-empire/shared";
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(5),
  voice: z.string().min(5)
});

export const createAccountSchema = z.object({
  projectId: z.string(),
  platform: platformSchema,
  handle: z.string().min(2),
  displayName: z.string().min(2),
  connectorMode: connectorModeSchema.optional(),
  automationMode: automationModeSchema.default("manual_review")
});

export const updateAccountSetupSchema = z.object({
  accountId: z.string(),
  connectorMode: connectorModeSchema,
  automationMode: automationModeSchema,
  openClawEnabled: z.boolean().default(false),
  notes: z.string().default(""),
  apiConfig: z.record(z.string(), z.string()).default({}),
  sessionConfig: z.record(z.string(), z.string()).default({})
});

export const connectAccountSchema = z.object({
  accountId: z.string()
});

export const connectAccessTokenSchema = z.object({
  accountId: z.string(),
  accessToken: z.string().min(20),
  externalAccountId: z.string().optional().default("")
});

export const certifyAccountSchema = z.object({
  accountId: z.string(),
  featureOverrides: z.array(featureKeySchema).optional()
});

export const queueActionSchema = z.object({
  accountId: z.string(),
  platform: platformSchema,
  type: z.enum(["publish", "edit", "comment_reply", "dm_reply", "session_refresh"]),
  owner: z.string().default("Operator"),
  scheduledFor: z.string()
});

export const captureSessionSchema = z.object({
  accountId: z.string(),
  mode: z.enum(["cookies_only", "bundle", "profile"]).default("bundle"),
  notes: z.string().default("")
});

export const importSessionBundleSchema = z.object({
  accountId: z.string(),
  mode: z.enum(["cookies_only", "bundle", "profile"]).default("bundle"),
  notes: z.string().default(""),
  bundle: sessionBundleSchema
});

export const uploadMediaAssetSchema = z.object({
  projectId: z.string(),
  title: z.string().min(2),
  description: z.string().default(""),
  mediaKind: z.enum(["source_video", "b_roll_video", "image", "audio", "transcript", "document", "other"]),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  tags: z.array(z.string()).default([]),
  transcriptHint: z.string().optional(),
  dataBase64: z.string().min(1)
});

export const analyzeMediaAssetSchema = z.object({
  assetId: z.string(),
  transcriptHint: z.string().optional()
});

export const createEditJobSchema = z.object({
  projectId: z.string(),
  accountId: z.string().optional(),
  title: z.string().min(2),
  sourceAssetId: z.string(),
  brollAssetIds: z.array(z.string()).default([]),
  includeCaptions: z.boolean().default(true),
  instructions: z.string().min(2),
  aspectRatio: z.string().default("9:16"),
  renderTemplate: z.string().default("slideshow")
});

export const upsertProxySchema = z.object({
  proxyId: z.string().optional(),
  label: z.string().min(2),
  raw: z.string().min(3),
  provider: z.string().default(""),
  countryCode: z.string().default(""),
  platformTargets: z.array(platformSchema).default([]),
  enabled: z.boolean().default(true),
  notes: z.string().default("")
});

export const deleteProxySchema = z.object({
  proxyId: z.string()
});

export const rotateProxyAssignmentSchema = z.object({
  key: z.string()
});

export { openClawActionSchema };
