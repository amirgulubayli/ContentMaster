import type { ConnectorCertification, OpenClawAction, Platform } from "@content-empire/shared";
import { getPlatformProfile } from "./registry";
import type { ConnectorContext, ConnectorExecutionResult, PlatformConnector } from "./types";

class GenericPlatformConnector implements PlatformConnector {
  constructor(public platform: Platform) {}

  async connect(context: ConnectorContext): Promise<ConnectorExecutionResult> {
    const profile = getPlatformProfile(this.platform);
    return {
      ok: true,
      platform: this.platform,
      authMode: profile.defaultMode,
      usedSessionRunner: profile.defaultMode !== "api_auth" || profile.sessionFallback,
      message: `Connection flow prepared for ${context.handle} using ${profile.defaultMode}.`
    };
  }

  async certify(): Promise<ConnectorCertification> {
    const profile = getPlatformProfile(this.platform);
    return {
      authValid: true,
      dryRunPublish: true,
      mediaUploadValidated: profile.features.includes("publish_video") || profile.features.includes("publish_image"),
      commentReplyValidated: profile.features.includes("reply_comment"),
      inboxCapabilityValidated:
        profile.features.includes("read_inbox") || profile.features.includes("reply_dm"),
      sessionStabilityScore: profile.requiresSessionAtLaunch ? 78 : 92
    };
  }

  async execute(_context: ConnectorContext, action: OpenClawAction): Promise<ConnectorExecutionResult> {
    const profile = getPlatformProfile(this.platform);
    const featureMap: Record<OpenClawAction["action"], ConnectorExecutionResult["feature"]> = {
      connect_account: undefined,
      publish_post: profile.features.find((feature) => feature.startsWith("publish")) ?? "publish_text",
      edit_post: "edit_published",
      reply_comment: "reply_comment",
      send_dm: "reply_dm",
      engage: "engage",
      refresh_session: undefined,
      analyze_performance: "read_metrics"
    };

    return {
      ok: true,
      platform: this.platform,
      authMode: profile.defaultMode,
      usedSessionRunner:
        profile.defaultMode === "session_auth" ||
        (profile.defaultMode === "hybrid_auth" && profile.sessionFallback),
      feature: featureMap[action.action],
      message: `Prepared ${action.action} for ${this.platform} via ${profile.defaultMode}.`
    };
  }
}

export function connectorFactory(platform: Platform): PlatformConnector {
  return new GenericPlatformConnector(platform);
}
