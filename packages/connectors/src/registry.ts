import type {
  Account,
  AccountSetupReadiness,
  AccountSetupState,
  AuthField,
  ConnectorMode,
  FeatureKey,
  Platform,
  PlatformSetupBlueprint
} from "@content-empire/shared";

export type PlatformProfile = {
  platform: Platform;
  defaultMode: ConnectorMode;
  sessionFallback: boolean;
  requiresSessionAtLaunch: boolean;
  dmSupport: "none" | "api" | "session" | "hybrid";
  notes: string;
  features: FeatureKey[];
  liveExecutionImplemented: boolean;
};

function apiFields(...fields: AuthField[]): AuthField[] {
  return fields;
}

function sessionFields(...fields: AuthField[]): AuthField[] {
  return fields;
}

const workflowOverridesField: AuthField = {
  key: "workflowOverridesJson",
  label: "Workflow Overrides JSON",
  kind: "textarea",
  required: false,
  help: "Optional per-account JSON override for session workflow routes and selectors."
};

export const platformRegistry: Record<Platform, PlatformProfile> = {
  x: {
    platform: "x",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "api",
    notes: "Official API auth and publish/metrics execution are wired.",
    features: ["publish_text", "reply_comment", "read_metrics"],
    liveExecutionImplemented: true
  },
  linkedin: {
    platform: "linkedin",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "Approved scopes required. Official OAuth and posting path are wired. DM automation remains out of scope.",
    features: ["publish_text", "publish_image", "publish_video", "read_metrics"],
    liveExecutionImplemented: true
  },
  medium: {
    platform: "medium",
    defaultMode: "session_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: true,
    dmSupport: "none",
    notes: "Session-first connector for draft, publish, edit, and comments via imported bundle plus isolated browser execution.",
    features: ["publish_text", "edit_published", "reply_comment", "read_metrics"],
    liveExecutionImplemented: true
  },
  substack: {
    platform: "substack",
    defaultMode: "session_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: true,
    dmSupport: "none",
    notes: "Session-first connector for publish/send and comment moderation via imported bundle plus isolated browser execution.",
    features: ["publish_text", "edit_published", "reply_comment", "read_metrics"],
    liveExecutionImplemented: true
  },
  quora: {
    platform: "quora",
    defaultMode: "session_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: true,
    dmSupport: "session",
    notes: "Session-first connector with optional DM workflows through imported bundle plus isolated browser execution.",
    features: [
      "publish_text",
      "edit_published",
      "reply_comment",
      "engage",
      "read_metrics"
    ],
    liveExecutionImplemented: true
  },
  reddit: {
    platform: "reddit",
    defaultMode: "api_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "hybrid",
    notes: "OAuth for core posting is wired, with session fallback available for UI-only workflows.",
    features: ["publish_text", "reply_comment", "read_inbox", "reply_dm", "read_metrics"],
    liveExecutionImplemented: true
  },
  bluesky: {
    platform: "bluesky",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "App-password session and post execution are wired.",
    features: ["publish_text", "publish_image", "reply_comment", "read_metrics"],
    liveExecutionImplemented: true
  },
  pinterest: {
    platform: "pinterest",
    defaultMode: "api_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "Official API auth and publish paths are wired. Session fallback remains available for unsupported organic flows.",
    features: ["publish_image", "read_metrics"],
    liveExecutionImplemented: true
  },
  facebook: {
    platform: "facebook",
    defaultMode: "hybrid_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "api",
    notes: "Meta business surfaces first, session fallback gated. Official OAuth and publish/comment/message flows are wired for supported business assets.",
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
    ],
    liveExecutionImplemented: true
  },
  instagram: {
    platform: "instagram",
    defaultMode: "hybrid_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "hybrid",
    notes: "Meta business path first, session fallback optional per account. Official OAuth, publishing, comments, and metrics paths are wired for supported business assets.",
    features: [
      "publish_image",
      "publish_video",
      "reply_comment",
      "read_inbox",
      "reply_dm",
      "read_metrics"
    ],
    liveExecutionImplemented: true
  },
  tiktok: {
    platform: "tiktok",
    defaultMode: "hybrid_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "session",
    notes: "Official content posting and analytics paths are wired first, with session fallback reserved for web-only flows not covered by the official API.",
    features: [
      "publish_image",
      "publish_video",
      "reply_comment",
      "read_inbox",
      "reply_dm",
      "read_metrics"
    ],
    liveExecutionImplemented: true
  },
  youtube: {
    platform: "youtube",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "Google OAuth, upload initiation, comment reply, and analytics paths are wired via official APIs.",
    features: ["publish_video", "edit_published", "reply_comment", "read_metrics"],
    liveExecutionImplemented: true
  }
};

export const platformSetupBlueprints: Record<Platform, PlatformSetupBlueprint> = {
  x: {
    platform: "x",
    supportedModes: ["api_auth"],
    apiFields: apiFields(
      { key: "clientId", label: "Client ID", kind: "text", required: true, help: "X app client ID." },
      { key: "clientSecret", label: "Client Secret", kind: "password", required: true, help: "X app client secret." },
      { key: "callbackUrl", label: "Callback URL", kind: "url", required: true, help: "Redirect URI configured in the X app." }
    ),
    sessionFields: [],
    notes: ["Official API is the intended production path.", "Session fallback is intentionally disabled.", "OAuth and provider execution are wired."],
    liveExecutionImplemented: true
  },
  linkedin: {
    platform: "linkedin",
    supportedModes: ["api_auth"],
    apiFields: apiFields(
      { key: "clientId", label: "Client ID", kind: "text", required: true, help: "LinkedIn app client ID." },
      { key: "clientSecret", label: "Client Secret", kind: "password", required: true, help: "LinkedIn app client secret." },
      { key: "callbackUrl", label: "Callback URL", kind: "url", required: true, help: "LinkedIn redirect URI." }
    ),
    sessionFields: [],
    notes: ["Approved scopes are required for posting and analytics.", "OAuth and provider execution are wired."],
    liveExecutionImplemented: true
  },
  medium: {
    platform: "medium",
    supportedModes: ["session_auth"],
    apiFields: [],
    sessionFields: sessionFields(
      { key: "loginEmail", label: "Login Email", kind: "text", required: true, help: "Medium login email for guided setup." },
      { key: "captureMode", label: "Capture Mode", kind: "select", required: true, help: "Preferred session capture mode.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: ["Session-backed connector expected.", "Publishing and editing use encrypted session bundles plus isolated browser execution."],
    liveExecutionImplemented: true
  },
  substack: {
    platform: "substack",
    supportedModes: ["session_auth"],
    apiFields: [],
    sessionFields: sessionFields(
      { key: "publicationUrl", label: "Publication URL", kind: "url", required: true, help: "Substack publication URL." },
      { key: "captureMode", label: "Capture Mode", kind: "select", required: true, help: "Preferred session capture mode.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: ["Session-backed connector expected.", "Newsletter send flows use encrypted session bundles plus isolated browser execution."],
    liveExecutionImplemented: true
  },
  quora: {
    platform: "quora",
    supportedModes: ["session_auth"],
    apiFields: [],
    sessionFields: sessionFields(
      { key: "loginEmail", label: "Login Email", kind: "text", required: true, help: "Quora account email." },
      { key: "captureMode", label: "Capture Mode", kind: "select", required: true, help: "Preferred session capture mode.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: ["Session-backed connector expected.", "DM automation can be routed through imported bundles and browser execution with explicit selectors."],
    liveExecutionImplemented: true
  },
  reddit: {
    platform: "reddit",
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(
      { key: "clientId", label: "Client ID", kind: "text", required: true, help: "Reddit app client ID." },
      { key: "clientSecret", label: "Client Secret", kind: "password", required: true, help: "Reddit app client secret." },
      { key: "callbackUrl", label: "Callback URL", kind: "url", required: true, help: "Reddit redirect URI." }
    ),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: false, help: "Only needed if hybrid mode is used.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: ["API-first for core posting.", "Hybrid mode can use imported bundles plus browser execution for UI-only flows."],
    liveExecutionImplemented: true
  },
  bluesky: {
    platform: "bluesky",
    supportedModes: ["api_auth"],
    apiFields: apiFields(
      { key: "identifier", label: "Identifier", kind: "text", required: true, help: "Bluesky handle or DID." },
      { key: "appPassword", label: "App Password", kind: "password", required: true, help: "Bluesky app password." }
    ),
    sessionFields: [],
    notes: ["App-password based setup.", "Session and post execution are wired."],
    liveExecutionImplemented: true
  },
  pinterest: {
    platform: "pinterest",
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(
      { key: "appId", label: "App ID", kind: "text", required: true, help: "Pinterest app ID." },
      { key: "appSecret", label: "App Secret", kind: "password", required: true, help: "Pinterest app secret." },
      { key: "callbackUrl", label: "Callback URL", kind: "url", required: true, help: "Pinterest redirect URI." }
    ),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: false, help: "Use only if hybrid mode is needed.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: ["API-first for organic publishing.", "Hybrid mode can use imported bundles plus browser execution for unsupported flows."],
    liveExecutionImplemented: true
  },
  facebook: {
    platform: "facebook",
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(
      { key: "appId", label: "App ID", kind: "text", required: true, help: "Meta app ID." },
      { key: "appSecret", label: "App Secret", kind: "password", required: true, help: "Meta app secret." },
      { key: "callbackUrl", label: "Callback URL", kind: "url", required: true, help: "Meta redirect URI." },
      { key: "pageId", label: "Page ID", kind: "text", required: false, help: "Target Facebook Page ID." }
    ),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: false, help: "Use only for hybrid fallback.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: ["Business/Page surfaces are the intended target.", "Hybrid mode is optional fallback only.", "Official OAuth callback and provider API execution are wired for supported business assets."],
    liveExecutionImplemented: true
  },
  instagram: {
    platform: "instagram",
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(
      { key: "appId", label: "App ID", kind: "text", required: true, help: "Meta app ID." },
      { key: "appSecret", label: "App Secret", kind: "password", required: true, help: "Meta app secret." },
      { key: "callbackUrl", label: "Callback URL", kind: "url", required: true, help: "Meta redirect URI." },
      { key: "instagramBusinessId", label: "Instagram Business ID", kind: "text", required: false, help: "Business account ID if known." }
    ),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: false, help: "Use for hybrid fallback.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: ["Business messaging and publishing are API-first.", "Hybrid fallback is optional for unsupported flows.", "Official OAuth callback and provider API execution are wired for supported business assets."],
    liveExecutionImplemented: true
  },
  tiktok: {
    platform: "tiktok",
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(
      { key: "clientKey", label: "Client Key", kind: "text", required: true, help: "TikTok app client key." },
      { key: "clientSecret", label: "Client Secret", kind: "password", required: true, help: "TikTok app client secret." },
      { key: "callbackUrl", label: "Callback URL", kind: "url", required: true, help: "TikTok redirect URI." }
    ),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: false, help: "Needed for hybrid mode.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: ["API-first for content posting.", "Hybrid fallback only for unsupported web flows.", "Official OAuth callback, token refresh, publishing, and analytics paths are wired."],
    liveExecutionImplemented: true
  },
  youtube: {
    platform: "youtube",
    supportedModes: ["api_auth"],
    apiFields: apiFields(
      { key: "clientId", label: "Client ID", kind: "text", required: true, help: "Google OAuth client ID." },
      { key: "clientSecret", label: "Client Secret", kind: "password", required: true, help: "Google OAuth client secret." },
      { key: "callbackUrl", label: "Callback URL", kind: "url", required: true, help: "Google redirect URI." }
    ),
    sessionFields: [],
    notes: ["OAuth-based setup for Shorts upload and comments.", "Provider execution is wired."],
    liveExecutionImplemented: true
  }
};

export function getPlatformProfile(platform: Platform): PlatformProfile {
  return platformRegistry[platform];
}

export function getPlatformSetupBlueprint(platform: Platform): PlatformSetupBlueprint {
  return platformSetupBlueprints[platform];
}

export function getRequiredSetupFields(
  blueprint: PlatformSetupBlueprint,
  connectorMode: ConnectorMode
) {
  if (connectorMode === "api_auth") {
    return {
      apiFields: blueprint.apiFields,
      sessionFields: []
    };
  }

  if (connectorMode === "session_auth") {
    return {
      apiFields: [],
      sessionFields: blueprint.sessionFields
    };
  }

  return {
    apiFields: blueprint.apiFields,
    sessionFields: blueprint.sessionFields
  };
}

export function getAccountSetupReadiness(
  account: Pick<Account, "sessionRequired" | "sessionHealth" | "authStatus">,
  setup: AccountSetupState,
  profile: PlatformProfile,
  blueprint: PlatformSetupBlueprint
): AccountSetupReadiness {
  const requiredFields = getRequiredSetupFields(blueprint, setup.connectorMode);
  const missingApiFields = requiredFields.apiFields
    .filter((field) => field.required && !setup.apiConfig[field.key]?.trim())
    .map((field) => field.label);
  const missingSessionFields = requiredFields.sessionFields
    .filter((field) => field.required && !setup.sessionConfig[field.key]?.trim())
    .map((field) => field.label);
  const configComplete = missingApiFields.length === 0 && missingSessionFields.length === 0;
  const sessionCaptureNeeded =
    setup.connectorMode !== "api_auth" && (account.sessionRequired || requiredFields.sessionFields.length > 0);
  const sessionCaptured = !sessionCaptureNeeded || account.sessionHealth === "healthy";

  const blockers: string[] = [];
  if (missingApiFields.length > 0) {
    blockers.push(`Missing API fields: ${missingApiFields.join(", ")}`);
  }
  if (missingSessionFields.length > 0) {
    blockers.push(`Missing session fields: ${missingSessionFields.join(", ")}`);
  }
  if (sessionCaptureNeeded && !sessionCaptured) {
    blockers.push("Session bundle has not been captured or is not healthy.");
  }
  if (!profile.liveExecutionImplemented) {
    blockers.push("Live connector execution is still scaffolded, not fully implemented.");
  }

  const nextSteps: string[] = [];
  if (!configComplete) {
    nextSteps.push("Fill every required connector field and save the setup.");
  }
  if (sessionCaptureNeeded && !sessionCaptured) {
    nextSteps.push("Capture or refresh the encrypted session bundle.");
  }
  if (configComplete && sessionCaptured && account.authStatus !== "certified") {
    nextSteps.push("Run account certification after setup is complete.");
  }
  if (configComplete && sessionCaptured && account.authStatus === "certified" && !profile.liveExecutionImplemented) {
    nextSteps.push("Keep the account in review mode until the live connector is implemented.");
  }
  if (configComplete && sessionCaptured && account.authStatus === "certified" && profile.liveExecutionImplemented) {
    nextSteps.push("OpenClaw can be enabled for real execution on this account.");
  }

  const canCertify = configComplete && sessionCaptured;
  const canEnableOpenClaw = canCertify && account.authStatus === "certified" && profile.liveExecutionImplemented;

  return {
    requiredApiFields: requiredFields.apiFields.map((field) => field.label),
    requiredSessionFields: requiredFields.sessionFields.map((field) => field.label),
    missingApiFields,
    missingSessionFields,
    configComplete,
    sessionCaptureNeeded,
    sessionCaptured,
    canCertify,
    canEnableOpenClaw,
    liveExecutionImplemented: profile.liveExecutionImplemented,
    blockers,
    nextSteps
  };
}
