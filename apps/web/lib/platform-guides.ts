import type { Platform } from "@content-empire/shared";

export type PlatformGuide = {
  currentPriority: string;
  recommendedMode: string;
  status: string;
  envManagedCredentials?: string[];
  accountFields?: string[];
  authGuide?: string[];
  cookieGuide?: string[];
  bundleRequirement?: string[];
  cookieExamples?: string[];
  sessionWizard?: {
    title: string;
    steps: string[];
    checks: string[];
  };
  callbackUrl?: string;
  credentialNotes?: string[];
};

export const platformGuides: Record<Platform, PlatformGuide> = {
  x: {
    currentPriority: "Use official auth first. Keep cookies as a controlled fallback only.",
    recommendedMode: "api_auth or hybrid_auth",
    status: "Live text-first production path.",
    envManagedCredentials: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
    accountFields: ["No per-account API fields are needed in the UI for the primary auth flow."],
    authGuide: [
      "Create an X developer app and enable OAuth 2.0.",
      "Register the callback URL shown below in the X app.",
      "Store the client ID and client secret in the VPS .env file, not on the account page.",
      "Run OAuth from this account page after saving the account."
    ],
    cookieGuide: [
      "Only keep an X session bundle as fallback.",
      "Log into X in a clean browser profile, export full browser state, then import the JSON bundle in Session Vault.",
      "Use workflow override JSON if X changes its compose or DM selectors."
    ],
    bundleRequirement: [
      "Import the full authenticated browser-state JSON, not a hand-picked subset of cookies.",
      "The bundle should include cookies, localStorage, sessionStorage, csrfTokens, and fingerprint.",
      "Do not try to maintain X by manually copying one or two cookie names."
    ],
    sessionWizard: {
      title: "X fallback bundle",
      steps: [
        "Sign into the X account in a clean browser profile that you control.",
        "Open the home feed and confirm the account can load compose.",
        "If you plan to use DMs, open the DM view once before export.",
        "Export full authenticated browser state from that profile and import it into Session Vault."
      ],
      checks: [
        "Home feed loads while signed in.",
        "Compose surface opens successfully.",
        "DM surface opens successfully if DM fallback is needed."
      ]
    },
    callbackUrl: "http://100.111.98.27:8088/api/oauth/x/callback",
    credentialNotes: ["API is the primary path for X because policy risk is lower than browser automation."]
  },
  linkedin: {
    currentPriority: "Use auth for posting. Use cookies/session for comments, inbox, DMs, and other non-posting workflows.",
    recommendedMode: "hybrid_auth",
    status: "Posting path live, non-posting should lean on cookies.",
    envManagedCredentials: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    accountFields: ["No per-account API fields are needed in the UI for the normal posting auth flow."],
    authGuide: [
      "Create a LinkedIn developer app.",
      "Enable the products/scopes needed for posting.",
      "Register the callback URL shown below.",
      "Store client ID and client secret in the VPS .env file, not on the account page.",
      "Run OAuth from this account page after saving the setup."
    ],
    cookieGuide: [
      "Log into LinkedIn in a clean browser profile.",
      "Export a full browser-state JSON bundle and import it in Session Vault for this account.",
      "Keep the bundle attached if you want DM, comment, or inbox workflows."
    ],
    bundleRequirement: [
      "Import the full authenticated browser-state JSON, not single copied cookies.",
      "The bundle should include cookies plus any LinkedIn local/session storage values needed by the messaging UI."
    ],
    sessionWizard: {
      title: "LinkedIn non-posting bundle",
      steps: [
        "Sign into LinkedIn in a clean browser profile.",
        "Open the main feed.",
        "Open one messaging thread if DM workflows are needed.",
        "Export full authenticated browser state from that profile and import it into Session Vault."
      ],
      checks: [
        "Feed loads while signed in.",
        "Messaging loads while signed in if DMs are needed.",
        "Comment box is visible on a post if reply workflows are needed."
      ]
    },
    callbackUrl: "http://100.111.98.27:8088/api/oauth/linkedin/callback",
    credentialNotes: ["LinkedIn auth is currently intended for posting. Session execution should handle the rest when needed."]
  },
  medium: {
    currentPriority: "Session-first platform.",
    recommendedMode: "session_auth",
    status: "Cookie/session production path.",
    accountFields: ["loginEmail", "captureMode", "workflowOverridesJson if needed"],
    cookieGuide: [
      "Log into Medium in a clean browser profile.",
      "Export full browser state to JSON.",
      "Import the bundle in Session Vault for the Medium account.",
      "Use workflow override JSON if the Medium editor selectors differ from defaults."
    ],
    bundleRequirement: [
      "Use the full browser-state JSON export.",
      "The app expects cookies, localStorage, sessionStorage, csrfTokens, and fingerprint."
    ],
    sessionWizard: {
      title: "Medium editor bundle",
      steps: [
        "Sign into Medium in a clean browser profile.",
        "Open the new-story editor once.",
        "Confirm the story editor accepts focus while signed in.",
        "Export full authenticated browser state and import it into Session Vault."
      ],
      checks: [
        "Editor opens successfully.",
        "Draft area is visible.",
        "Publish controls are visible."
      ]
    },
    credentialNotes: ["No provider app registration is needed for the current operating path."]
  },
  substack: {
    currentPriority: "Session-first platform.",
    recommendedMode: "session_auth",
    status: "Cookie/session production path.",
    accountFields: ["publicationUrl", "captureMode", "workflowOverridesJson if needed"],
    cookieGuide: [
      "Log into Substack in a clean browser profile.",
      "Export full browser state to JSON.",
      "Import the bundle in Session Vault for the publication account.",
      "Add the publication URL in setup before certification."
    ],
    bundleRequirement: [
      "Use the full browser-state JSON export.",
      "Substack often relies on more than raw cookies alone, so keep the full bundle."
    ],
    sessionWizard: {
      title: "Substack publication bundle",
      steps: [
        "Sign into the publication owner account in a clean browser profile.",
        "Open the publication dashboard.",
        "Open the editor once so compose state is present before export.",
        "Export full authenticated browser state and import it into Session Vault."
      ],
      checks: [
        "Publication dashboard loads.",
        "Editor opens while signed in.",
        "Publication URL in account setup matches the account you exported."
      ]
    },
    credentialNotes: ["No provider app registration is needed for the current operating path."]
  },
  quora: {
    currentPriority: "Session-first platform.",
    recommendedMode: "session_auth",
    status: "Cookie/session production path.",
    accountFields: ["loginEmail", "captureMode", "workflowOverridesJson if needed"],
    cookieGuide: [
      "Log into Quora in a clean browser profile.",
      "Export full browser state to JSON.",
      "Import the bundle in Session Vault.",
      "Use workflow override JSON if Quora changes selectors for posts, answers, or messages."
    ],
    bundleRequirement: [
      "Use the full browser-state JSON export.",
      "Do not rely on a hand-picked cookie subset."
    ],
    sessionWizard: {
      title: "Quora posting bundle",
      steps: [
        "Sign into Quora in a clean browser profile.",
        "Open the main feed or writer surface.",
        "If you plan to answer questions, open one answer editor before export.",
        "Export full authenticated browser state and import it into Session Vault."
      ],
      checks: [
        "Signed-in home view loads.",
        "Answer or post editor opens.",
        "Message surface opens if DM workflows are required."
      ]
    },
    credentialNotes: ["No provider app registration is needed for the current operating path."]
  },
  reddit: {
    currentPriority: "Run Reddit as cookie/session-first for now.",
    recommendedMode: "session_auth",
    status: "API path exists in code, but current operating policy is cookies first.",
    envManagedCredentials: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"],
    accountFields: ["captureMode", "workflowOverridesJson if needed"],
    authGuide: [
      "Optional later: create a classic Reddit OAuth app and register the callback URL below.",
      "Only finish the API path later if you decide it is worth the effort."
    ],
    cookieGuide: [
      "Log into Reddit in a clean browser profile.",
      "Export full browser state to JSON.",
      "Import the bundle in Session Vault for this Reddit account.",
      "Use workflow override JSON if submit, comment, or inbox selectors need tuning."
    ],
    bundleRequirement: [
      "Use the full browser-state JSON export.",
      "For Reddit, the stable path is importing the whole authenticated state instead of individual cookie names."
    ],
    sessionWizard: {
      title: "Reddit posting bundle",
      steps: [
        "Sign into Reddit in a clean browser profile.",
        "Open the target subreddit and then open the submit flow once.",
        "Open the inbox once if reply workflows are needed.",
        "Export full authenticated browser state and import it into Session Vault."
      ],
      checks: [
        "Target subreddit loads while signed in.",
        "Submit flow opens successfully.",
        "Inbox loads successfully if reply workflows are needed."
      ]
    },
    callbackUrl: "http://100.111.98.27:8088/api/oauth/reddit/callback",
    credentialNotes: ["Current operating verdict: Reddit is cookie-first for now."]
  },
  bluesky: {
    currentPriority: "Use Bluesky app password flow.",
    recommendedMode: "api_auth",
    status: "App-password production path.",
    accountFields: ["identifier", "appPassword"],
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
    envManagedCredentials: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET"],
    accountFields: ["captureMode", "workflowOverridesJson if needed"],
    authGuide: [
      "Optional later: create a Pinterest app and register the callback URL below if you want to finish the API path."
    ],
    cookieGuide: [
      "Log into Pinterest in a clean browser profile.",
      "Export full browser state to JSON.",
      "Import the bundle in Session Vault for this Pinterest account.",
      "Use workflow override JSON if board or publishing selectors need tuning."
    ],
    bundleRequirement: [
      "Use the full browser-state JSON export.",
      "Pinterest session handling is easier to keep stable when the whole authenticated bundle is imported."
    ],
    sessionWizard: {
      title: "Pinterest pin-builder bundle",
      steps: [
        "Sign into Pinterest in a clean browser profile.",
        "Open the pin builder or create-pin flow once.",
        "Open the target board selector if you plan to post into a specific board.",
        "Export full authenticated browser state and import it into Session Vault."
      ],
      checks: [
        "Home/dashboard loads while signed in.",
        "Pin builder opens.",
        "Board picker opens if board-specific posting is needed."
      ]
    },
    callbackUrl: "http://100.111.98.27:8088/api/oauth/pinterest/callback",
    credentialNotes: ["Current operating verdict: Pinterest is cookie-first for now."]
  },
  facebook: {
    currentPriority: "Backburner for now. Official auth path still needs to be finished in operations.",
    recommendedMode: "hybrid_auth",
    status: "Defer live rollout until auth is finished.",
    envManagedCredentials: ["META_APP_ID", "META_APP_SECRET"],
    accountFields: ["pageId if you want to pin a specific page", "captureMode only if using fallback session"],
    authGuide: [
      "Create a Meta developer app and register the callback URL below.",
      "Link the correct Page/business assets in Meta Business Manager.",
      "Finish OAuth later when this platform comes back into focus."
    ],
    cookieGuide: [
      "If you need experiments before full auth rollout, attach a fallback session bundle to the account."
    ],
    sessionWizard: {
      title: "Facebook fallback bundle",
      steps: [
        "Sign into the correct Facebook business/page-managing account in a clean browser profile.",
        "Open the target Page once.",
        "Open the composer or inbox surface if those flows are needed.",
        "Export full authenticated browser state and import it into Session Vault."
      ],
      checks: [
        "Target Page loads.",
        "Composer opens if posting fallback is needed.",
        "Inbox opens if message fallback is needed."
      ]
    },
    callbackUrl: "http://100.111.98.27:8088/api/oauth/meta/callback"
  },
  instagram: {
    currentPriority: "Backburner for now. Official auth path still needs to be finished in operations.",
    recommendedMode: "hybrid_auth",
    status: "Defer live rollout until auth is finished.",
    envManagedCredentials: ["META_APP_ID", "META_APP_SECRET"],
    accountFields: ["instagramBusinessId if you want to pin a specific asset", "captureMode only if using fallback session"],
    authGuide: [
      "Use the Meta developer app and callback URL below.",
      "Make sure the Instagram account is business/creator and attached to the correct Meta business assets.",
      "Finish OAuth later when this platform comes back into focus."
    ],
    cookieGuide: [
      "If you need experiments before full auth rollout, attach a fallback session bundle to the account."
    ],
    sessionWizard: {
      title: "Instagram fallback bundle",
      steps: [
        "Sign into the correct Instagram account in a clean browser profile.",
        "Open the profile and compose surfaces once.",
        "Open DMs if inbox fallback is needed.",
        "Export full authenticated browser state and import it into Session Vault."
      ],
      checks: [
        "Profile loads while signed in.",
        "Compose or create flow opens.",
        "DM surface opens if inbox fallback is needed."
      ]
    },
    callbackUrl: "http://100.111.98.27:8088/api/oauth/meta/callback"
  },
  tiktok: {
    currentPriority: "Backburner for now. Auth setup is unstable enough that it should not be the current focus.",
    recommendedMode: "hybrid_auth",
    status: "Defer live rollout until another account/channel is tested successfully.",
    envManagedCredentials: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    accountFields: ["captureMode only if you are experimenting with fallback session use"],
    authGuide: [
      "Keep the TikTok client key and secret notes, but defer operational setup for now.",
      "Return to the official auth flow later if another account/channel proves easier to onboard."
    ],
    cookieGuide: [
      "If you need non-official testing, attach a session bundle later, but this is not the active rollout focus."
    ],
    sessionWizard: {
      title: "TikTok fallback bundle",
      steps: [
        "Sign into TikTok in a clean browser profile.",
        "Open the upload flow once if you are testing upload fallback.",
        "Open inbox or comments once if those experiments are needed.",
        "Export full authenticated browser state and import it into Session Vault."
      ],
      checks: [
        "Home view loads while signed in.",
        "Upload flow opens if upload fallback is being tested.",
        "Inbox/comments open if those fallbacks are being tested."
      ]
    },
    callbackUrl: "http://100.111.98.27:8088/api/oauth/tiktok/callback"
  },
  youtube: {
    currentPriority: "Backburner for now. Google OAuth requires a real domain callback.",
    recommendedMode: "api_auth",
    status: "Defer live rollout until callback-domain setup is finished.",
    envManagedCredentials: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    accountFields: ["No per-account API fields are needed in the UI for the normal YouTube auth flow."],
    authGuide: [
      "Create a Google OAuth web app.",
      "Use a real HTTPS domain for the callback URL below instead of the raw VPS IP.",
      "Finish OAuth later when the callback-domain setup is in place."
    ],
    callbackUrl: "https://auth.yourdomain.com/api/oauth/google/callback",
    credentialNotes: ["Google rejects raw-IP redirect URIs for web-app OAuth. Use a real domain later."]
  }
};
