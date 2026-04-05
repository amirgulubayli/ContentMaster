import type {
  Account,
  Alert,
  AuditEvent,
  ContentCard,
  DashboardSnapshot,
  InboxItem,
  Project,
  QueueItem,
  SessionBundle
} from "./types";

export const seedProjects: Project[] = [
  {
    id: "proj_ragmedium",
    slug: "ragmedium",
    name: "Ragmedium",
    description: "AI media and publishing project with high automation.",
    voice: "Confident, direct, insight-led.",
    status: "active",
    dailyOptimizationEnabled: true
  },
  {
    id: "proj_pripitch",
    slug: "pripitch",
    name: "Pripitch",
    description: "Pitch-focused content machine with meme-first video templates.",
    voice: "Sharp, persuasive, high-energy.",
    status: "active",
    dailyOptimizationEnabled: true
  }
];

export const seedAccounts: Account[] = [
  {
    id: "acc_x_ragmedium",
    projectId: "proj_ragmedium",
    projectName: "Ragmedium",
    platform: "x",
    handle: "@ragmedium",
    displayName: "Ragmedium X",
    connectorMode: "api_auth",
    automationMode: "full_auto",
    sessionHealth: "healthy",
    features: ["publish_text", "reply_comment", "read_metrics"],
    lastAuthRefreshAt: new Date().toISOString(),
    lastPostAt: new Date().toISOString(),
    sessionRequired: false,
    openClawEnabled: true
  },
  {
    id: "acc_substack_pripitch",
    projectId: "proj_pripitch",
    projectName: "Pripitch",
    platform: "substack",
    handle: "pripitch.substack.com",
    displayName: "Pripitch Newsletter",
    connectorMode: "session_auth",
    automationMode: "assisted_auto",
    sessionHealth: "warning",
    features: [
      "publish_text",
      "edit_published",
      "reply_comment",
      "read_metrics"
    ],
    lastAuthRefreshAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    lastPostAt: null,
    sessionRequired: true,
    openClawEnabled: true
  },
  {
    id: "acc_instagram_ragmedium",
    projectId: "proj_ragmedium",
    projectName: "Ragmedium",
    platform: "instagram",
    handle: "@ragmedium.media",
    displayName: "Ragmedium IG",
    connectorMode: "hybrid_auth",
    automationMode: "manual_review",
    sessionHealth: "healthy",
    features: [
      "publish_image",
      "publish_video",
      "reply_comment",
      "read_inbox",
      "reply_dm",
      "read_metrics"
    ],
    lastAuthRefreshAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastPostAt: null,
    sessionRequired: true,
    openClawEnabled: true
  }
];

export const seedAlerts: Alert[] = [
  {
    id: "alert_1",
    severity: "critical",
    title: "Session drift detected",
    message: "Substack layout changed during certification. Reply flow downgraded to manual review.",
    createdAt: new Date().toISOString(),
    accountId: "acc_substack_pripitch"
  },
  {
    id: "alert_2",
    severity: "warning",
    title: "Instagram inbox backlog",
    message: "12 unread threads need triage rules before enabling full-auto DM replies.",
    createdAt: new Date().toISOString(),
    accountId: "acc_instagram_ragmedium"
  }
];

export const seedQueue: QueueItem[] = [
  {
    id: "queue_1",
    accountId: "acc_instagram_ragmedium",
    projectName: "Ragmedium",
    platform: "instagram",
    type: "publish",
    scheduledFor: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    status: "queued",
    owner: "OpenClaw"
  },
  {
    id: "queue_2",
    accountId: "acc_substack_pripitch",
    projectName: "Pripitch",
    platform: "substack",
    type: "session_refresh",
    scheduledFor: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    status: "needs_review",
    owner: "Operator"
  }
];

export const seedAudit: AuditEvent[] = [
  {
    id: "audit_1",
    actor: "OpenClaw",
    action: "publish_post",
    subject: "Ragmedium X launch thread",
    status: "success",
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    detail: "Posted via official API connector."
  },
  {
    id: "audit_2",
    actor: "Operator",
    action: "refresh_session",
    subject: "Pripitch Substack",
    status: "warning",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    detail: "Session captured, but comment reply capability remains uncertified."
  }
];

export const seedContent: ContentCard[] = [
  {
    id: "content_1",
    projectId: "proj_ragmedium",
    projectName: "Ragmedium",
    title: "AI content moat thread and reel pair",
    platformTargets: ["x", "instagram", "linkedin"],
    stage: "scheduled",
    imageProvider: "Gemini",
    videoPipeline: "Remotion+ffmpeg",
    lastEditedBy: "OpenClaw",
    nextAction: "Publish Instagram reel in 45 minutes."
  },
  {
    id: "content_2",
    projectId: "proj_pripitch",
    projectName: "Pripitch",
    title: "Newsletter issue on conversion hooks",
    platformTargets: ["substack", "medium", "quora"],
    stage: "ready",
    imageProvider: "Gemini",
    videoPipeline: "Remotion+ffmpeg",
    lastEditedBy: "Operator",
    nextAction: "Refresh session and certify comment replies."
  }
];

export const seedInbox: InboxItem[] = [
  {
    id: "inbox_1",
    accountId: "acc_instagram_ragmedium",
    platform: "instagram",
    kind: "dm",
    author: "@creatorops",
    message: "Can you break down your editing workflow?",
    status: "pending",
    suggestedReply: "Yes. We build with Remotion templates, then route edits through account-specific review policies."
  },
  {
    id: "inbox_2",
    accountId: "acc_x_ragmedium",
    platform: "x",
    kind: "comment",
    author: "@growthstack",
    message: "Interesting angle. How are you measuring actual lift?",
    status: "needs_review",
    suggestedReply: "We compare hook, format, and CTA cohorts daily and only carry forward patterns with sustained post-level lift."
  }
];

export const seedSessionBundles: Record<string, SessionBundle> = {
  acc_substack_pripitch: {
    cookies: [
      {
        name: "sb_session",
        value: "redacted",
        domain: ".substack.com",
        path: "/",
        secure: true,
        httpOnly: true
      }
    ],
    localStorage: {
      "substack:lastPub": "pripitch"
    },
    sessionStorage: {},
    csrfTokens: {
      substack: "redacted"
    },
    fingerprint: {
      userAgent: "Mozilla/5.0 Headless",
      viewport: "1440x900",
      locale: "en-GB"
    },
    profileObjectKey: "profiles/acc_substack_pripitch/v3.enc"
  }
};

export const seedDashboard: DashboardSnapshot = {
  projects: seedProjects,
  accounts: seedAccounts,
  alerts: seedAlerts,
  queue: seedQueue,
  audit: seedAudit
};
