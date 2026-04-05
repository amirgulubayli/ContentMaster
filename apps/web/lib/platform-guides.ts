import type { Platform } from "@content-empire/shared";

export type PlatformGuide = {
  currentPriority: string;
  recommendedMode: string;
  status: string;
  authGuide?: string[];
  cookieGuide?: string[];
  callbackUrl?: string;
  credentialNotes?: string[];
};

export const platformGuides: Record<Platform, PlatformGuide> = {
  x: {
    currentPriority: "Use official auth first. Keep cookies as a controlled fallback only.",
    recommendedMode: "api_auth or hybrid_auth",
    status: "Live text-first production path.",
    authGuide: [
      "Create an X developer app and enable OAuth 2.0.",
      "Register the callback URL shown below in the X app.",
      "Copy the client ID and client secret into the account setup form.",
      "Run OAuth from this account page after saving the setup."
    ],
    cookieGuide: [
      "Only keep an X session bundle as fallback.",
      "Log into X in a clean browser profile, export cookies/browser state, then import the JSON bundle in Session Vault.",
      "Use workflow override JSON if X changes its compose or DM selectors."
    ],
    callbackUrl: "http://100.111.98.27:8088/api/oauth/x/callback",
    credentialNotes: ["API is the primary path for X because policy risk is lower than browser automation."]
  },
  linkedin: {
    currentPriority: "Use auth for posting. Use cookies/session for comments, inbox, DMs, and other non-posting workflows.",
    recommendedMode: "hybrid_auth",
    status: "Posting path live, non-posting should lean on cookies.",
    authGuide: [
      "Create a LinkedIn developer app.",
      "Enable the products/scopes needed for posting.",
      "Register the callback URL shown below.",
      "Copy client ID and client secret into the setup form.",
      "Run OAuth from this account page after saving the setup."
    ],
    cookieGuide: [
      "Log into LinkedIn in a clean browser profile.",
      "Export a session JSON bundle and import it in Session Vault for this account.",
      "Keep the bundle attached if you want DM, comment, or inbox workflows."
    ],
    callbackUrl: "http://100.111.98.27:8088/api/oauth/linkedin/callback",
    credentialNotes: ["LinkedIn auth is currently intended for posting. Session execution should handle the rest when needed."]
  },
  medium: {
    currentPriority: "Session-first platform.",
    recommendedMode: "session_auth",
    status: "Cookie/session production path.",
    cookieGuide: [
      "Log into Medium in a clean browser profile.",
      "Export cookies/browser state to JSON.",
      "Import the bundle in Session Vault for the Medium account.",
      "Use workflow override JSON if the Medium editor selectors differ from defaults."
    ],
    credentialNotes: ["No provider app registration is needed for the current operating path."]
  },
  substack: {
    currentPriority: "Session-first platform.",
    recommendedMode: "session_auth",
    status: "Cookie/session production path.",
    cookieGuide: [
      "Log into Substack in a clean browser profile.",
      "Export cookies/browser state to JSON.",
      "Import the bundle in Session Vault for the publication account.",
      "Add the publication URL in setup before certification."
    ],
    credentialNotes: ["No provider app registration is needed for the current operating path."]
  },
  quora: {
    currentPriority: "Session-first platform.",
    recommendedMode: "session_auth",
    status: "Cookie/session production path.",
    cookieGuide: [
      "Log into Quora in a clean browser profile.",
      "Export cookies/browser state to JSON.",
      "Import the bundle in Session Vault.",
      "Use workflow override JSON if Quora changes selectors for posts, answers, or messages."
    ],
    credentialNotes: ["No provider app registration is needed for the current operating path."]
  },
  reddit: {
    currentPriority: "Run Reddit as cookie/session-first for now.",
    recommendedMode: "session_auth",
    status: "API path exists in code, but current operating policy is cookies first.",
    authGuide: [
      "Optional later: create a classic Reddit OAuth app and register the callback URL below.",
      "Only finish the API path later if you decide it is worth the effort."
    ],
    cookieGuide: [
      "Log into Reddit in a clean browser profile.",
      "Export cookies/browser state to JSON.",
      "Import the bundle in Session Vault for this Reddit account.",
      "Use workflow override JSON if submit, comment, or inbox selectors need tuning."
    ],
    callbackUrl: "http://100.111.98.27:8088/api/oauth/reddit/callback",
    credentialNotes: ["Current operating verdict: Reddit is cookie-first for now."]
  },
  bluesky: {
    currentPriority: "Use Bluesky app password flow.",
    recommendedMode: "api_auth",
    status: "App-password production path.",
    authGuide: [
      "Open Bluesky settings and create an app password for this app.",
      "Use your Bluesky handle or DID as the identifier.",
      "Paste the identifier and app password into the account setup form.",
      "Run Prepare connector after saving setup."
    ],
    credentialNotes: ["Bluesky does not need cookie capture for the current intended path."]
  },
  pinterest: {
    currentPriority: "Run Pinterest as cookie/session-first for now.",
    recommendedMode: "session_auth",
    status: "API path exists in code, but current operating policy is cookies first.",
    authGuide: [
      "Optional later: create a Pinterest app and register the callback URL below if you want to finish the API path."
    ],
    cookieGuide: [
      "Log into Pinterest in a clean browser profile.",
      "Export cookies/browser state to JSON.",
      "Import the bundle in Session Vault for this Pinterest account.",
      "Use workflow override JSON if board or publishing selectors need tuning."
    ],
    callbackUrl: "http://100.111.98.27:8088/api/oauth/pinterest/callback",
    credentialNotes: ["Current operating verdict: Pinterest is cookie-first for now."]
  },
  facebook: {
    currentPriority: "Backburner for now. Official auth path still needs to be finished in operations.",
    recommendedMode: "hybrid_auth",
    status: "Defer live rollout until auth is finished.",
    authGuide: [
      "Create a Meta developer app and register the callback URL below.",
      "Link the correct Page/business assets in Meta Business Manager.",
      "Finish OAuth later when this platform comes back into focus."
    ],
    cookieGuide: [
      "If you need experiments before full auth rollout, attach a fallback session bundle to the account."
    ],
    callbackUrl: "http://100.111.98.27:8088/api/oauth/meta/callback"
  },
  instagram: {
    currentPriority: "Backburner for now. Official auth path still needs to be finished in operations.",
    recommendedMode: "hybrid_auth",
    status: "Defer live rollout until auth is finished.",
    authGuide: [
      "Use the Meta developer app and callback URL below.",
      "Make sure the Instagram account is business/creator and attached to the correct Meta business assets.",
      "Finish OAuth later when this platform comes back into focus."
    ],
    cookieGuide: [
      "If you need experiments before full auth rollout, attach a fallback session bundle to the account."
    ],
    callbackUrl: "http://100.111.98.27:8088/api/oauth/meta/callback"
  },
  tiktok: {
    currentPriority: "Backburner for now. Auth setup is unstable enough that it should not be the current focus.",
    recommendedMode: "hybrid_auth",
    status: "Defer live rollout until another account/channel is tested successfully.",
    authGuide: [
      "Keep the TikTok client key and secret notes, but defer operational setup for now.",
      "Return to the official auth flow later if another account/channel proves easier to onboard."
    ],
    cookieGuide: [
      "If you need non-official testing, attach a session bundle later, but this is not the active rollout focus."
    ],
    callbackUrl: "http://100.111.98.27:8088/api/oauth/tiktok/callback"
  },
  youtube: {
    currentPriority: "Backburner for now. Google OAuth requires a real domain callback.",
    recommendedMode: "api_auth",
    status: "Defer live rollout until callback-domain setup is finished.",
    authGuide: [
      "Create a Google OAuth web app.",
      "Use a real HTTPS domain for the callback URL below instead of the raw VPS IP.",
      "Finish OAuth later when the callback-domain setup is in place."
    ],
    callbackUrl: "https://auth.yourdomain.com/api/oauth/google/callback",
    credentialNotes: ["Google rejects raw-IP redirect URIs for web-app OAuth. Use a real domain later."]
  }
};

