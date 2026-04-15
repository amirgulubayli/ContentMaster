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
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "hybrid",
    notes: "Use official X auth first. Keep a session bundle ready only as a controlled fallback for workflows the API path cannot complete.",
    features: ["publish_text", "reply_comment", "read_inbox", "reply_dm", "read_metrics"],
    liveExecutionImplemented: true
  },
  linkedin: {
    platform: "linkedin",
    defaultMode: "hybrid_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: false,
    dmSupport: "session",
    notes: "Use official LinkedIn auth for posting. Route comments, inbox, DMs, and other non-posting workflows through session execution when needed.",
    features: [
      "publish_text",
      "publish_image",
      "publish_video",
      "reply_comment",
      "read_inbox",
      "reply_dm",
      "read_metrics"
    ],
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
    defaultMode: "session_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: true,
    dmSupport: "session",
    notes: "Use session-backed execution as the main Reddit path for now. Keep the official OAuth/API path available as an optional later route if account app registration becomes worth finishing.",
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
    defaultMode: "session_auth",
    sessionFallback: true,
    requiresSessionAtLaunch: true,
    dmSupport: "none",
    notes: "Use session-backed execution as the main Pinterest path for now. Keep the official API available as an optional later path if app approval and credentials are ready.",
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
    notes: "Instagram Login is the primary path for publishing, comment replies, and business messaging. Use session fallback only if you truly need an unsupported workflow.",
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
  threads: {
    platform: "threads",
    defaultMode: "api_auth",
    sessionFallback: false,
    requiresSessionAtLaunch: false,
    dmSupport: "none",
    notes: "Threads is API-first. OAuth, publishing, reply posting, and insights are wired without a browser-session dependency.",
    features: ["publish_text", "publish_image", "publish_video", "reply_comment", "read_metrics"],
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
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: false, help: "Only needed if hybrid fallback is enabled.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: [
      "Official API is the primary production path.",
      "Keep session fallback only as a controlled backup for workflows that the API path cannot complete.",
      "X policy risk is higher for browser automation than for API use."
    ],
    liveExecutionImplemented: true
  },
  linkedin: {
    platform: "linkedin",
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: false, help: "Use if LinkedIn should also run non-posting workflows through cookies.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: [
      "Use official auth for posting.",
      "Use session fallback for comments, inbox, and other non-posting workflows when required.",
      "Approved scopes are still required for the posting path."
    ],
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
    supportedModes: ["session_auth", "hybrid_auth", "api_auth"],
    apiFields: apiFields(),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: true, help: "Use session mode as the main Reddit path for now.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: [
      "Use session-backed execution as the default Reddit path for now.",
      "Hybrid mode can combine Reddit OAuth later with cookies kept as fallback.",
      "API auth remains available later if Reddit app registration becomes worth finishing."
    ],
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
    supportedModes: ["session_auth", "api_auth", "hybrid_auth"],
    apiFields: apiFields(),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: true, help: "Use session mode as the main Pinterest path for now.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: [
      "Use session-backed execution as the default Pinterest path for now.",
      "API auth is still available later if Pinterest app approval and credentials are in place.",
      "Hybrid mode can combine both if you want API later with cookies kept as fallback."
    ],
    liveExecutionImplemented: true
  },
  facebook: {
    platform: "facebook",
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(
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
      { key: "instagramBusinessId", label: "Instagram Account ID", kind: "text", required: false, help: "Instagram business/professional account ID if you want to pin a specific asset." }
    ),
    sessionFields: sessionFields(
      { key: "captureMode", label: "Capture Mode", kind: "select", required: false, help: "Use for hybrid fallback.", options: ["cookies_only", "bundle", "profile"] },
      workflowOverridesField
    ),
    notes: [
      "Instagram Login is the preferred setup for publishing, comment moderation, and business messaging.",
      "Hybrid fallback is optional for unsupported flows only.",
      "If you need hashtag discovery or some insights paths, Meta currently points those to the Facebook Login setup."
    ],
    liveExecutionImplemented: true
  },
  threads: {
    platform: "threads",
    supportedModes: ["api_auth"],
    apiFields: apiFields(
      { key: "threadsUserId", label: "Threads User ID", kind: "text", required: false, help: "Threads profile ID if you want to pin the account manually." }
    ),
    sessionFields: [],
    notes: [
      "Threads is API-only in this codebase.",
      "OAuth, post publishing, reply publishing, and insights are handled through the Threads API.",
      "No session bundle is needed for the intended production path."
    ],
    liveExecutionImplemented: true
  },
  tiktok: {
    platform: "tiktok",
    supportedModes: ["api_auth", "hybrid_auth"],
    apiFields: apiFields(),
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
    apiFields: apiFields(),
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
  const officialAuthNeeded = setup.connectorMode !== "session_auth" && requiredFields.apiFields.length === 0;
  const officialAuthReady = !officialAuthNeeded || account.authStatus !== "not_started";

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
  if (officialAuthNeeded && !officialAuthReady) {
    blockers.push("Official provider auth has not been completed yet.");
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
  if (officialAuthNeeded && !officialAuthReady) {
    nextSteps.push("Start official auth from the Provider auth section.");
  }
  if (configComplete && sessionCaptured && officialAuthReady && account.authStatus !== "certified") {
    nextSteps.push("Run account certification after setup is complete.");
  }
  if (configComplete && sessionCaptured && officialAuthReady && account.authStatus === "certified" && !profile.liveExecutionImplemented) {
    nextSteps.push("Keep the account in review mode until the live connector is implemented.");
  }
  if (configComplete && sessionCaptured && officialAuthReady && account.authStatus === "certified" && profile.liveExecutionImplemented) {
    nextSteps.push("OpenClaw can be enabled for real execution on this account.");
  }

  const canCertify = configComplete && sessionCaptured && officialAuthReady;
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
