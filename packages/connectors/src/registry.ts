import type { ConnectorMode, FeatureKey, Platform } from "@content-empire/shared";

export type PlatformProfile = {
  platform: Platform;
  defaultMode: ConnectorMode;
  sessionFallback: boolean;
  requiresSessionAtLaunch: boolean;
  dmSupport: "none" | "api" | "session" | "hybrid";
  notes: string;
  features: FeatureKey[];
};

export const platformRegistry: Record<Platform, PlatformProfile> = {
  x: {
    platform: "x",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "api",
    notes: "Official API only for production safety.",
    features: ["publish_text", "reply_comment", "read_metrics"]
  },
  linkedin: {
    platform: "linkedin",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "Approved scopes required. DM automation is out of scope at launch.",
    features: ["publish_text", "publish_image", "publish_video", "read_metrics"]
  },
  medium: {
    platform: "medium",
    defaultMode: "session_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: true,
    dmSupport: "none",
    notes: "Session-first connector for draft, publish, edit, and comments.",
    features: ["publish_text", "edit_published", "reply_comment", "read_metrics"]
  },
  substack: {
    platform: "substack",
    defaultMode: "session_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: true,
    dmSupport: "none",
    notes: "Session-first connector for publish/send and comment moderation.",
    features: ["publish_text", "edit_published", "reply_comment", "read_metrics"]
  },
  quora: {
    platform: "quora",
    defaultMode: "session_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: true,
    dmSupport: "session",
    notes: "Session-first connector with DM optional after certification.",
    features: [
      "publish_text",
      "edit_published",
      "reply_comment",
      "engage",
      "read_metrics"
    ]
  },
  reddit: {
    platform: "reddit",
    defaultMode: "api_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "hybrid",
    notes: "OAuth for core posting. Session fallback only for approved UI-only workflows.",
    features: ["publish_text", "reply_comment", "read_inbox", "reply_dm", "read_metrics"]
  },
  bluesky: {
    platform: "bluesky",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "App password or service credentials.",
    features: ["publish_text", "publish_image", "reply_comment", "read_metrics"]
  },
  pinterest: {
    platform: "pinterest",
    defaultMode: "api_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "Official API first. Session fallback only for unsupported organic flows.",
    features: ["publish_image", "read_metrics"]
  },
  facebook: {
    platform: "facebook",
    defaultMode: "hybrid_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "api",
    notes: "Meta business surfaces first, session fallback gated.",
    features: [
      "publish_text",
      "publish_image",
      "publish_video",
      "edit_published",
      "reply_comment",
      "engage",
      "read_inbox",
      "reply_dm",
      "read_metrics"
    ]
  },
  instagram: {
    platform: "instagram",
    defaultMode: "hybrid_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "hybrid",
    notes: "Meta business path first, session fallback optional per account.",
    features: [
      "publish_image",
      "publish_video",
      "reply_comment",
      "read_inbox",
      "reply_dm",
      "read_metrics"
    ]
  },
  tiktok: {
    platform: "tiktok",
    defaultMode: "hybrid_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "session",
    notes: "Official content posting first, session fallback for web-only flows.",
    features: [
      "publish_image",
      "publish_video",
      "reply_comment",
      "read_inbox",
      "reply_dm",
      "read_metrics"
    ]
  },
  youtube: {
    platform: "youtube",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "OAuth-based Shorts upload and comment moderation via official APIs.",
    features: ["publish_video", "edit_published", "reply_comment", "read_metrics"]
  }
};

export function getPlatformProfile(platform: Platform): PlatformProfile {
  return platformRegistry[platform];
}
