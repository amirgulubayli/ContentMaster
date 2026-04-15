import cors from "@fastify/cors";
import {
  connectorFactory,
  getAccountSetupReadiness,
  getPlatformProfile,
  getPlatformSetupBlueprint,
  platformRegistry,
  platformSetupBlueprints
} from "@content-empire/connectors";
import { type DashboardSnapshot, decryptJson, encryptJson } from "@content-empire/shared";
import Fastify from "fastify";
import {
  buildFacebookAuthUrl,
  buildInstagramAuthUrl,
  buildPlatformRedirectUri,
  buildThreadsAuthUrl,
  buildGenericRedirectUri,
  buildGoogleAuthUrl,
  buildLinkedInAuthUrl,
  buildPinterestAuthUrl,
  buildPkceVerifier,
  buildRedditAuthUrl,
  buildTikTokAuthUrl,
  buildTikTokRedirectUri,
  buildXAuthUrl,
  createOauthState,
  FACEBOOK_SCOPES,
  exchangeGoogleCode,
  exchangeLinkedInCode,
  exchangeFacebookCode,
  exchangeFacebookLongLivedToken,
  exchangeInstagramCode,
  exchangeThreadsCode,
  exchangePinterestCode,
  exchangeRedditCode,
  exchangeTikTokCode,
  exchangeXCode,
  fetchGoogleChannel,
  fetchInstagramProfile,
  fetchLinkedInProfile,
  fetchMetaBusinessContext,
  fetchPinterestMe,
  fetchRedditMe,
  fetchTikTokCreatorInfo,
  fetchThreadsProfile,
  INSTAGRAM_SCOPES,
  refreshGoogleToken,
  refreshInstagramToken,
  refreshPinterestToken,
  refreshRedditToken,
  refreshTikTokToken,
  THREADS_SCOPES,
  refreshXToken
} from "./platform-auth.js";
import {
  createBlueskySession,
  fetchFacebookMetrics,
  fetchInstagramMetrics,
  fetchPinterestAnalytics,
  fetchRedditInbox,
  fetchThreadsMetrics,
  fetchTikTokCreatorAnalytics,
  fetchXMetrics,
  fetchYoutubeAnalytics,
  publishBlueskyPost,
  publishFacebookContent,
  publishLinkedInPost,
  publishPinterestPin,
  publishRedditPost,
  publishThreadsContent,
  publishXPost,
  publishInstagramContent,
  publishTikTokContent,
  replyFacebookComment,
  replyInstagramComment,
  replyRedditComment,
  replyYoutubeComment,
  sendMetaDm,
  uploadYoutubeVideo
} from "./platform-execution.js";
import {
  analyzeMediaAssetRecord,
  createEditJobRecord,
  createMediaAssetRecord,
  getContentStudioSnapshot,
  streamMediaAsset
} from "./content-hub.js";
import {
  captureSessionSchema,
  certifyAccountSchema,
  connectAccountSchema,
  connectAccessTokenSchema,
  createEditJobSchema,
  createAccountSchema,
  createProjectSchema,
  importSessionBundleSchema,
  analyzeMediaAssetSchema,
  updateAccountSetupSchema,
  openClawActionSchema,
  queueActionSchema,
  rotateProxyAssignmentSchema,
  deleteProxySchema,
  upsertProxySchema,
  uploadMediaAssetSchema
} from "./schemas.js";
import {
  buildProxySnapshot,
  deleteProxyFromState,
  getAccountProxyKey,
  parseProxyRecord,
  recordProxyFailure,
  recordProxySuccess,
  rotateProxyForContext,
  selectProxyForContext
} from "./proxy-manager.js";
import { buildSessionWorkflow } from "./session-workflows.js";
import { appendAudit, persistState, state } from "./state.js";

const app = Fastify({
  logger: true
});

function getCredentialRecord(accountId: string) {
  return state.credentials[accountId];
}

function getTokenSecret() {
  return process.env.SESSION_ENCRYPTION_KEY ?? "development-session-key";
}

function getDecryptedTokenSet(accountId: string) {
  const record = getCredentialRecord(accountId);
  if (!record) {
    return null;
  }

  return decryptJson<Record<string, string | null>>(record.encryptedTokenSet, getTokenSecret());
}

function upsertAccountSetupApiField(accountId: string, key: string, value: string) {
  const account = state.accounts.find((item) => item.id === accountId);
  const existingSetup = state.setup[accountId];

  state.setup[accountId] = {
    accountId,
    connectorMode: existingSetup?.connectorMode ?? account?.connectorMode ?? "api_auth",
    automationMode: existingSetup?.automationMode ?? account?.automationMode ?? "manual_review",
    authStatus: account?.authStatus ?? existingSetup?.authStatus ?? "configured",
    openClawEnabled: existingSetup?.openClawEnabled ?? account?.openClawEnabled ?? false,
    apiConfig: {
      ...(existingSetup?.apiConfig ?? {}),
      [key]: value
    },
    sessionConfig: existingSetup?.sessionConfig ?? {},
    notes: existingSetup?.notes ?? "",
    updatedAt: new Date().toISOString()
  };
}

async function connectInstagramManualAccessToken(
  account: (typeof state.accounts)[number],
  accessToken: string,
  externalAccountId?: string
) {
  const now = new Date().toISOString();
  const profile = await fetchInstagramProfile(accessToken);
  const instagramBusinessId = String(externalAccountId || profile.user_id ?? profile.id ?? "").trim();

  if (!instagramBusinessId) {
    throw new Error("Instagram access token is valid, but no Instagram account ID could be resolved.");
  }

  state.credentials[account.id] = {
    provider: "instagram",
    encryptedTokenSet: encryptJson(
      {
        accessToken,
        instagramBusinessId
      },
      getTokenSecret()
    ),
    scopes: [],
    expiresAt: null,
    refreshExpiresAt: null,
    updatedAt: now,
    externalAccountId: instagramBusinessId,
    externalUsername: profile.username ?? profile.name ?? null,
    metadata: {
      instagramBusinessId,
      instagramUsername: profile.username ?? "",
      instagramName: profile.name ?? "",
      connectionMethod: "manual_access_token"
    }
  };

  account.authStatus = "configured";
  account.lastAuthRefreshAt = now;
  upsertAccountSetupApiField(account.id, "instagramBusinessId", instagramBusinessId);

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "connect_instagram_access_token",
    subject: account.displayName,
    status: "success",
    createdAt: now,
    detail: "Instagram access token validated and stored."
  });
}

async function connectThreadsManualAccessToken(
  account: (typeof state.accounts)[number],
  accessToken: string,
  externalAccountId?: string
) {
  const now = new Date().toISOString();
  const profile = await fetchThreadsProfile(accessToken, externalAccountId?.trim() || undefined);
  const threadsUserId = String(profile.id ?? externalAccountId ?? "").trim();

  if (!threadsUserId) {
    throw new Error("Threads access token is valid, but no Threads user ID could be resolved.");
  }

  state.credentials[account.id] = {
    provider: "threads",
    encryptedTokenSet: encryptJson(
      {
        accessToken,
        threadsUserId
      },
      getTokenSecret()
    ),
    scopes: [],
    expiresAt: null,
    refreshExpiresAt: null,
    updatedAt: now,
    externalAccountId: threadsUserId,
    externalUsername: profile.username ?? profile.name ?? null,
    metadata: {
      threadsUserId,
      threadsUsername: profile.username ?? "",
      threadsName: profile.name ?? "",
      connectionMethod: "manual_access_token"
    }
  };

  account.authStatus = "configured";
  account.lastAuthRefreshAt = now;
  upsertAccountSetupApiField(account.id, "threadsUserId", threadsUserId);

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "connect_threads_access_token",
    subject: account.displayName,
    status: "success",
    createdAt: now,
    detail: "Threads access token validated and stored."
  });
}

async function executeSessionAction(accountId: string, platform: string, action: string, payload: Record<string, unknown>) {
  const sessionRecord = state.sessions[accountId];
  if (!sessionRecord) {
    return null;
  }

  const sessionConfig = state.setup[accountId]?.sessionConfig ?? {};

  const sessionBundle = decryptJson<{
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      secure: boolean;
      httpOnly: boolean;
    }>;
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    csrfTokens: Record<string, string>;
    fingerprint: {
      userAgent: string;
      viewport: string;
      locale: string;
    };
    profileObjectKey: string | null;
  }>(sessionRecord.encryptedBundle, getTokenSecret());
  const workflow = buildSessionWorkflow(
    platform,
    action as "publish_post" | "edit_post" | "reply_comment" | "send_dm" | "engage" | "refresh_session",
    payload,
    sessionConfig
  );
  const sessionPayload = {
    ...payload,
    ...workflow
  };
  const proxyContext = {
    key: getAccountProxyKey(accountId),
    scope: "account" as const,
    target: accountId,
    platformHint: platform
  };
  const selectedProxy = selectProxyForContext(state, proxyContext);
  if (selectedProxy) {
    app.log.info(
      {
        accountId,
        platform,
        action,
        proxyId: selectedProxy.id,
        proxyLabel: selectedProxy.label
      },
      "Selected proxy for session action"
    );
    persistState();
  } else {
    app.log.warn(
      {
        accountId,
        platform,
        action
      },
      "No eligible proxy selected for session action; using direct connection"
    );
  }

  if (action === "send_dm") {
    const forwardedSteps = Array.isArray(sessionPayload.steps) ? sessionPayload.steps : undefined;
    const hasStepsArray = Boolean(forwardedSteps);
    delete sessionPayload.steps;

    app.log.info(
      {
        accountId,
        platform,
        action,
        hasStepsArray,
        stepCount: forwardedSteps?.length,
        targetUrl: sessionPayload.targetUrl,
        submitSelector: sessionPayload.submitSelector,
        proxyLabel: selectedProxy?.label ?? null
      },
      "Forwarding session DM to session-runner"
    );
  }

  const executeRunnerRequest = async (proxyId?: string) => {
    const proxy = proxyId ? state.proxies.find((item) => item.id === proxyId) ?? null : selectedProxy;
    return fetch(`${process.env.SESSION_RUNNER_URL ?? "http://session-runner:4200"}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        accountId,
        platform,
        action,
        sessionBundle,
        payload: sessionPayload,
        proxy: proxy
          ? {
              id: proxy.id,
              label: proxy.label,
              raw: proxy.raw
            }
          : undefined
      })
    });
  };

  const response = await executeRunnerRequest();
  if (response.ok) {
    if (selectedProxy) {
      recordProxySuccess(state, selectedProxy.id);
      persistState();
    }

    return response.json();
  }

  let parsedError: { retryable?: boolean; reason?: string; error?: string } | null = null;
  try {
    parsedError = (await response.json()) as { retryable?: boolean; reason?: string; error?: string };
  } catch {
    parsedError = null;
  }

  if (response.status === 409 && parsedError?.retryable && selectedProxy) {
    recordProxyFailure(state, selectedProxy.id, parsedError.reason ?? parsedError.error ?? "Retryable proxy failure");
    const rotatedProxy = rotateProxyForContext(state, proxyContext);
    persistState();

    if (rotatedProxy && rotatedProxy.id !== selectedProxy.id) {
      app.log.warn(`Rotating proxy for account ${accountId} due to ${parsedError.reason ?? "session failure"}`);
      const retryResponse = await executeRunnerRequest(rotatedProxy.id);
      if (retryResponse.ok) {
        recordProxySuccess(state, rotatedProxy.id);
        persistState();
        return retryResponse.json();
      }

      let retryErrorMessage = await retryResponse.text();
      try {
        const retryParsed = JSON.parse(retryErrorMessage) as { error?: string };
        retryErrorMessage = retryParsed.error ?? retryErrorMessage;
      } catch {
        // ignore parse failure
      }
      throw new Error(retryErrorMessage);
    }
  }

  const errorText = parsedError?.error ?? (await response.text());
  throw new Error(errorText);
}

async function executePlatformAction(accountId: string, platform: string, action: string, payload: Record<string, unknown>) {
  const record = getCredentialRecord(accountId);
  const tokenSet = getDecryptedTokenSet(accountId);

  if (!record || !tokenSet?.accessToken) {
    return null;
  }

  if (platform === "facebook") {
    if (action === "publish_post") {
      return publishFacebookContent(String(tokenSet.pageAccessToken ?? tokenSet.accessToken), {
        pageId: String(tokenSet.pageId ?? record.metadata.pageId ?? ""),
        message: typeof payload.message === "string" ? payload.message : undefined,
        caption: typeof payload.caption === "string" ? payload.caption : undefined,
        imageUrl: typeof payload.imageUrl === "string" ? payload.imageUrl : undefined,
        videoUrl: typeof payload.videoUrl === "string" ? payload.videoUrl : undefined
      });
    }

    if (action === "reply_comment" && typeof payload.commentId === "string" && typeof payload.message === "string") {
      return replyFacebookComment(String(tokenSet.pageAccessToken ?? tokenSet.accessToken), payload.commentId, payload.message);
    }

    if (action === "send_dm" && typeof payload.recipientId === "string" && typeof payload.message === "string") {
      return sendMetaDm(String(tokenSet.pageAccessToken ?? tokenSet.accessToken), payload.recipientId, payload.message);
    }

    if (action === "analyze_performance") {
      return fetchFacebookMetrics(
        String(tokenSet.pageAccessToken ?? tokenSet.accessToken),
        String(tokenSet.pageId ?? record.metadata.pageId ?? ""),
        Array.isArray(payload.metrics) ? payload.metrics.map(String) : ["page_impressions", "page_post_engagements"]
      );
    }
  }

  if (platform === "instagram") {
    if (action === "publish_post") {
      return publishInstagramContent(String(tokenSet.accessToken), {
        instagramBusinessId: String(tokenSet.instagramBusinessId ?? record.metadata.instagramBusinessId ?? ""),
        caption: typeof payload.caption === "string" ? payload.caption : typeof payload.message === "string" ? payload.message : undefined,
        imageUrl: typeof payload.imageUrl === "string" ? payload.imageUrl : undefined,
        videoUrl: typeof payload.videoUrl === "string" ? payload.videoUrl : undefined,
        mediaType: typeof payload.videoUrl === "string" ? "REELS" : "IMAGE"
      });
    }

    if (action === "reply_comment" && typeof payload.commentId === "string" && typeof payload.message === "string") {
      return replyInstagramComment(String(tokenSet.accessToken), payload.commentId, payload.message);
    }

    if (action === "analyze_performance") {
      return fetchInstagramMetrics(
        String(tokenSet.accessToken),
        String(tokenSet.instagramBusinessId ?? record.metadata.instagramBusinessId ?? ""),
        Array.isArray(payload.metrics) ? payload.metrics.map(String) : ["impressions", "reach", "profile_views"]
      );
    }
  }

  if (platform === "threads") {
    if (action === "publish_post") {
      return publishThreadsContent(String(tokenSet.accessToken), {
        threadsUserId: String(tokenSet.threadsUserId ?? record.metadata.threadsUserId ?? ""),
        text:
          typeof payload.text === "string"
            ? payload.text
            : typeof payload.message === "string"
              ? payload.message
              : typeof payload.caption === "string"
                ? payload.caption
                : undefined,
        imageUrl: typeof payload.imageUrl === "string" ? payload.imageUrl : undefined,
        videoUrl: typeof payload.videoUrl === "string" ? payload.videoUrl : undefined
      });
    }

    if (action === "reply_comment" && typeof payload.commentId === "string" && typeof payload.message === "string") {
      return publishThreadsContent(String(tokenSet.accessToken), {
        threadsUserId: String(tokenSet.threadsUserId ?? record.metadata.threadsUserId ?? ""),
        text: payload.message,
        replyToId: payload.commentId
      });
    }

    if (action === "analyze_performance") {
      return fetchThreadsMetrics(
        String(tokenSet.accessToken),
        String(tokenSet.threadsUserId ?? record.metadata.threadsUserId ?? ""),
        Array.isArray(payload.metrics)
          ? payload.metrics.map(String)
          : ["views", "likes", "replies", "reposts", "quotes", "followers_count"]
      );
    }
  }

  if (platform === "tiktok") {
    if (action === "publish_post") {
      return publishTikTokContent(String(tokenSet.accessToken), {
        postMode: typeof payload.postMode === "string" ? (payload.postMode as "DIRECT_POST" | "MEDIA_UPLOAD") : undefined,
        postInfo: typeof payload.postInfo === "object" && payload.postInfo ? (payload.postInfo as Record<string, unknown>) : undefined,
        sourceInfo: typeof payload.sourceInfo === "object" && payload.sourceInfo ? (payload.sourceInfo as Record<string, unknown>) : undefined
      });
    }

    if (action === "analyze_performance") {
      return fetchTikTokCreatorAnalytics(String(tokenSet.accessToken));
    }
  }

  if (platform === "x") {
    if (action === "publish_post") {
      return publishXPost(String(tokenSet.accessToken), {
        text: typeof payload.text === "string" ? payload.text : typeof payload.message === "string" ? payload.message : undefined
      });
    }

    if (action === "analyze_performance" && typeof payload.postId === "string") {
      return fetchXMetrics(String(tokenSet.accessToken), payload.postId);
    }
  }

  if (platform === "linkedin") {
    if (action === "publish_post") {
      return publishLinkedInPost(
        String(tokenSet.accessToken),
        String(tokenSet.authorUrn ?? record.metadata.authorUrn ?? ""),
        {
          text: typeof payload.text === "string" ? payload.text : typeof payload.message === "string" ? payload.message : undefined
        }
      );
    }
  }

  if (platform === "reddit") {
    if (action === "publish_post") {
      return publishRedditPost(String(tokenSet.accessToken), {
        title: typeof payload.title === "string" ? payload.title : undefined,
        text: typeof payload.text === "string" ? payload.text : typeof payload.message === "string" ? payload.message : undefined,
        url: typeof payload.url === "string" ? payload.url : undefined,
        community: typeof payload.community === "string" ? payload.community : undefined
      });
    }

    if (action === "reply_comment" && typeof payload.parentId === "string" && typeof payload.message === "string") {
      return replyRedditComment(String(tokenSet.accessToken), payload.parentId, payload.message);
    }

    if (action === "analyze_performance" && tokenSet.accessToken) {
      return fetchRedditInbox(String(tokenSet.accessToken));
    }
  }

  if (platform === "bluesky") {
    if (action === "publish_post") {
      return publishBlueskyPost(String(tokenSet.accessJwt ?? tokenSet.accessToken), String(tokenSet.did ?? record.externalAccountId ?? ""), {
        text: typeof payload.text === "string" ? payload.text : typeof payload.message === "string" ? payload.message : undefined
      });
    }
  }

  if (platform === "pinterest") {
    if (action === "publish_post") {
      return publishPinterestPin(String(tokenSet.accessToken), {
        boardId: typeof payload.boardId === "string" ? payload.boardId : record.metadata.boardId,
        title: typeof payload.title === "string" ? payload.title : undefined,
        text: typeof payload.text === "string" ? payload.text : typeof payload.message === "string" ? payload.message : undefined,
        url: typeof payload.url === "string" ? payload.url : undefined,
        imageUrl: typeof payload.imageUrl === "string" ? payload.imageUrl : undefined,
        mediaSource: typeof payload.mediaSource === "object" && payload.mediaSource ? (payload.mediaSource as Record<string, unknown>) : undefined
      });
    }

    if (action === "analyze_performance" && typeof payload.pinId === "string") {
      return fetchPinterestAnalytics(String(tokenSet.accessToken), payload.pinId);
    }
  }

  if (platform === "youtube") {
    if (action === "publish_post") {
      return uploadYoutubeVideo(String(tokenSet.accessToken), {
        title: typeof payload.title === "string" ? payload.title : undefined,
        text: typeof payload.text === "string" ? payload.text : typeof payload.message === "string" ? payload.message : undefined
      });
    }

    if (action === "reply_comment" && typeof payload.parentId === "string" && typeof payload.message === "string") {
      return replyYoutubeComment(String(tokenSet.accessToken), payload.parentId, payload.message);
    }

    if (action === "analyze_performance") {
      return fetchYoutubeAnalytics(String(tokenSet.accessToken), String(tokenSet.channelId ?? record.externalAccountId ?? ""));
    }
  }

  return null;
}

await app.register(cors, {
  origin: true
});

app.get("/health", async () => ({
  status: "ok",
  service: "content-empire-api",
  timestamp: new Date().toISOString()
}));

app.get("/api/dashboard", async (): Promise<DashboardSnapshot> => ({
  projects: state.projects,
  accounts: state.accounts,
  alerts: state.alerts,
  queue: state.queue,
  audit: state.audit
}));

app.get("/api/projects", async () => state.projects);

app.post("/api/projects", async (request, reply) => {
  const parsed = createProjectSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid project payload", issues: parsed.error.issues };
  }

  const project = {
    id: `proj_${parsed.data.slug}`,
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description,
    voice: parsed.data.voice,
    status: "active" as const,
    dailyOptimizationEnabled: true
  };

  state.projects.push(project);
  persistState();
  return project;
});

app.get("/api/accounts", async () => state.accounts);

app.get("/api/proxies", async () => buildProxySnapshot(state));

app.post("/api/proxies", async (request, reply) => {
  const parsed = upsertProxySchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid proxy payload", issues: parsed.error.issues };
  }

  const existing = parsed.data.proxyId
    ? state.proxies.find((proxy) => proxy.id === parsed.data.proxyId) ?? null
    : null;
  const nextRecord = {
    id: existing?.id ?? `proxy_${Date.now()}`,
    label: parsed.data.label,
    raw: parsed.data.raw,
    provider: parsed.data.provider,
    countryCode: parsed.data.countryCode.toUpperCase(),
    platformTargets: parsed.data.platformTargets,
    enabled: parsed.data.enabled,
    notes: parsed.data.notes,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastUsedAt: existing?.lastUsedAt ?? null,
    lastFailureAt: existing?.lastFailureAt ?? null,
    lastError: existing?.lastError ?? null,
    successCount: existing?.successCount ?? 0,
    failureCount: existing?.failureCount ?? 0,
    consecutiveFailures: existing?.consecutiveFailures ?? 0
  };

  try {
    parseProxyRecord(nextRecord);
  } catch (error) {
    reply.code(400);
    return {
      error: error instanceof Error ? error.message : "Invalid proxy format"
    };
  }

  if (existing) {
    state.proxies = state.proxies.map((proxy) => (proxy.id === existing.id ? nextRecord : proxy));
  } else {
    state.proxies.unshift(nextRecord);
  }

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: existing ? "update_proxy" : "create_proxy",
    subject: nextRecord.label,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: `${nextRecord.enabled ? "Enabled" : "Stored disabled"} proxy for ${nextRecord.platformTargets.length > 0 ? nextRecord.platformTargets.join(", ") : "all traffic"}.`
  });

  persistState();
  return nextRecord;
});

app.post("/api/proxies/delete", async (request, reply) => {
  const parsed = deleteProxySchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid proxy delete payload", issues: parsed.error.issues };
  }

  deleteProxyFromState(state, parsed.data.proxyId);

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "delete_proxy",
    subject: parsed.data.proxyId,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "Removed proxy and cleared its sticky assignments."
  });

  persistState();
  return { accepted: true };
});

app.post("/api/proxies/assignments/rotate", async (request, reply) => {
  const parsed = rotateProxyAssignmentSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid proxy assignment payload", issues: parsed.error.issues };
  }

  const assignment = state.proxyAssignments[parsed.data.key];
  if (!assignment) {
    reply.code(404);
    return { error: "Proxy assignment not found" };
  }

  const rotated = rotateProxyForContext(state, {
    key: assignment.key,
    scope: assignment.scope,
    target: assignment.target,
    platformHint: assignment.platformHint
  });

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "rotate_proxy_assignment",
    subject: assignment.target,
    status: rotated ? "success" : "warning",
    createdAt: new Date().toISOString(),
    detail: rotated ? `Rotated sticky assignment to ${rotated.label}.` : "No eligible proxy was available for rotation."
  });

  persistState();

  return {
    accepted: true,
    proxy: rotated
  };
});

app.post("/api/accounts", async (request, reply) => {
  const parsed = createAccountSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid account payload", issues: parsed.error.issues };
  }

  const profile = getPlatformProfile(parsed.data.platform);
  const account = {
    id: `acc_${parsed.data.platform}_${Date.now()}`,
    projectId: parsed.data.projectId,
    projectName: state.projects.find((project) => project.id === parsed.data.projectId)?.name ?? "Unknown",
    platform: parsed.data.platform,
    handle: parsed.data.handle,
    displayName: parsed.data.displayName,
    connectorMode: parsed.data.connectorMode ?? profile.defaultMode,
    automationMode: parsed.data.automationMode,
    sessionHealth: profile.requiresSessionAtLaunch ? ("warning" as const) : ("healthy" as const),
    authStatus: "not_started" as const,
    features: profile.features,
    lastAuthRefreshAt: new Date().toISOString(),
    lastPostAt: null,
    sessionRequired: profile.requiresSessionAtLaunch || profile.sessionFallback,
    openClawEnabled: false
  };

  state.accounts.push(account);
  state.setup[account.id] = {
    accountId: account.id,
    connectorMode: account.connectorMode,
    automationMode: account.automationMode,
    authStatus: "not_started",
    openClawEnabled: false,
    apiConfig: {},
    sessionConfig: {},
    notes: "",
    updatedAt: new Date().toISOString()
  };
  persistState();
  return account;
});

app.get("/api/platforms", async () => Object.values(platformRegistry));
app.get("/api/platform-setup", async () => Object.values(platformSetupBlueprints));

app.get("/api/accounts/:accountId/profile", async (request, reply) => {
  const params = request.params as { accountId: string };
  const account = state.accounts.find((item) => item.id === params.accountId);

  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const profile = getPlatformProfile(account.platform);
  const blueprint = getPlatformSetupBlueprint(account.platform);
  const setup =
    state.setup[account.id] ??
    ({
      accountId: account.id,
      connectorMode: account.connectorMode,
      automationMode: account.automationMode,
      authStatus: account.authStatus,
      openClawEnabled: account.openClawEnabled,
      apiConfig: {},
      sessionConfig: {},
      notes: "",
      updatedAt: new Date().toISOString()
    } as const);

  return {
    account,
    profile,
    blueprint,
    setup,
    proxyAssignment: (() => {
      const assignment = state.proxyAssignments[getAccountProxyKey(account.id)];
      if (!assignment) {
        return null;
      }

      return {
        ...assignment,
        proxyLabel: state.proxies.find((proxy) => proxy.id === assignment.proxyId)?.label ?? null
      };
    })(),
    readiness: getAccountSetupReadiness(account, setup, profile, blueprint),
    authConnection: (() => {
      const credential = state.credentials[account.id];
      if (!credential) {
        return null;
      }

      return {
        provider: credential.provider,
        scopes: credential.scopes,
        expiresAt: credential.expiresAt,
        refreshExpiresAt: credential.refreshExpiresAt,
        updatedAt: credential.updatedAt,
        externalAccountId: credential.externalAccountId,
        externalUsername: credential.externalUsername,
        metadata: credential.metadata
      };
    })()
  };
});

app.post("/api/accounts/:accountId/connect-access-token", async (request, reply) => {
  const params = request.params as { accountId: string };
  const parsed = connectAccessTokenSchema.safeParse({
    ...(request.body as Record<string, unknown>),
    accountId: params.accountId
  });

  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid access token payload", issues: parsed.error.issues };
  }

  const account = state.accounts.find((item) => item.id === parsed.data.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  if (account.platform !== "instagram" && account.platform !== "threads") {
    reply.code(400);
    return { error: "Manual access token connect is only supported for Instagram and Threads." };
  }

  try {
    if (account.platform === "instagram") {
      await connectInstagramManualAccessToken(
        account,
        parsed.data.accessToken,
        parsed.data.externalAccountId || undefined
      );
    } else {
      await connectThreadsManualAccessToken(
        account,
        parsed.data.accessToken,
        parsed.data.externalAccountId || undefined
      );
    }
  } catch (error) {
    request.log.warn({ err: error, accountId: account.id, platform: account.platform }, "Access token connect failed");
    reply.code(400);
    return {
      error:
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "The access token could not be validated for this account."
    };
  }

  return {
    accepted: true,
    provider: state.credentials[account.id]?.provider ?? account.platform,
    externalAccountId: state.credentials[account.id]?.externalAccountId ?? null,
    externalUsername: state.credentials[account.id]?.externalUsername ?? null,
    metadata: state.credentials[account.id]?.metadata ?? {}
  };
});

app.get("/api/auth/:platform/start", async (request, reply) => {
  const params = request.params as { platform: string };
  const query = request.query as { accountId?: string };

  if (!query.accountId) {
    reply.code(400);
    return { error: "accountId is required" };
  }

  const account = state.accounts.find((item) => item.id === query.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const oauthState = createOauthState();

  if (params.platform === "facebook" && account.platform !== "facebook") {
    reply.code(400);
    return { error: "Facebook OAuth only applies to Facebook accounts." };
  }

  if (params.platform === "instagram" && account.platform !== "instagram") {
    reply.code(400);
    return { error: "Instagram OAuth only applies to Instagram accounts." };
  }

  if (params.platform === "threads" && account.platform !== "threads") {
    reply.code(400);
    return { error: "Threads OAuth only applies to Threads accounts." };
  }

  if (params.platform === "tiktok" && account.platform !== "tiktok") {
    reply.code(400);
    return { error: "TikTok OAuth only applies to TikTok accounts." };
  }

  if (params.platform === "x" && account.platform !== "x") {
    reply.code(400);
    return { error: "X OAuth only applies to X accounts." };
  }

  if (params.platform === "linkedin" && account.platform !== "linkedin") {
    reply.code(400);
    return { error: "LinkedIn OAuth only applies to LinkedIn accounts." };
  }

  if (params.platform === "reddit" && account.platform !== "reddit") {
    reply.code(400);
    return { error: "Reddit OAuth only applies to Reddit accounts." };
  }

  if (params.platform === "pinterest" && account.platform !== "pinterest") {
    reply.code(400);
    return { error: "Pinterest OAuth only applies to Pinterest accounts." };
  }

  if (params.platform === "google" && account.platform !== "youtube") {
    reply.code(400);
    return { error: "Google OAuth only applies to YouTube accounts." };
  }

  state.oauthStates[oauthState] = {
    accountId: account.id,
    provider:
      params.platform === "facebook" || params.platform === "instagram" || params.platform === "threads"
        ? (params.platform as "facebook" | "instagram" | "threads")
        : params.platform === "tiktok"
          ? "tiktok"
          : params.platform === "google"
            ? "google"
            : (params.platform as "x" | "linkedin" | "reddit" | "pinterest"),
    createdAt: new Date().toISOString()
  };

  if (params.platform === "facebook") {
    persistState();
    const authUrl = buildFacebookAuthUrl();
    authUrl.searchParams.set("client_id", process.env.META_FACEBOOK_APP_ID ?? process.env.META_APP_ID ?? "");
    authUrl.searchParams.set("redirect_uri", buildPlatformRedirectUri("facebook"));
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", oauthState);
    authUrl.searchParams.set("scope", FACEBOOK_SCOPES.join(","));
    return reply.redirect(authUrl.toString());
  }

  if (params.platform === "instagram") {
    persistState();
    const authUrl = buildInstagramAuthUrl();
    authUrl.searchParams.set("client_id", process.env.META_INSTAGRAM_APP_ID ?? process.env.META_APP_ID ?? "");
    authUrl.searchParams.set("redirect_uri", buildPlatformRedirectUri("instagram"));
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", oauthState);
    authUrl.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
    return reply.redirect(authUrl.toString());
  }

  if (params.platform === "threads") {
    persistState();
    const authUrl = buildThreadsAuthUrl();
    authUrl.searchParams.set("client_id", process.env.META_THREADS_APP_ID ?? process.env.META_APP_ID ?? "");
    authUrl.searchParams.set("redirect_uri", buildPlatformRedirectUri("threads"));
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", oauthState);
    authUrl.searchParams.set("scope", THREADS_SCOPES.join(","));
    return reply.redirect(authUrl.toString());
  }

  const authUrl = buildTikTokAuthUrl();
  if (params.platform === "tiktok") {
    persistState();
    authUrl.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY ?? "");
    authUrl.searchParams.set("redirect_uri", buildTikTokRedirectUri());
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "user.info.basic,video.publish,video.upload,video.list");
    authUrl.searchParams.set("state", oauthState);
    return reply.redirect(authUrl.toString());
  }

  if (params.platform === "x") {
    const codeVerifier = buildPkceVerifier();
    state.oauthStates[oauthState].codeVerifier = codeVerifier;
    persistState();
    const xUrl = buildXAuthUrl();
    xUrl.searchParams.set("response_type", "code");
    xUrl.searchParams.set("client_id", process.env.X_CLIENT_ID ?? "");
    xUrl.searchParams.set("redirect_uri", buildGenericRedirectUri("x"));
    xUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
    xUrl.searchParams.set("state", oauthState);
    xUrl.searchParams.set("code_challenge", codeVerifier);
    xUrl.searchParams.set("code_challenge_method", "plain");
    return reply.redirect(xUrl.toString());
  }

  if (params.platform === "linkedin") {
    persistState();
    const linkedInUrl = buildLinkedInAuthUrl();
    linkedInUrl.searchParams.set("response_type", "code");
    linkedInUrl.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID ?? "");
    linkedInUrl.searchParams.set("redirect_uri", buildGenericRedirectUri("linkedin"));
    linkedInUrl.searchParams.set("scope", "openid profile email w_member_social");
    linkedInUrl.searchParams.set("state", oauthState);
    return reply.redirect(linkedInUrl.toString());
  }

  if (params.platform === "reddit") {
    persistState();
    const redditUrl = buildRedditAuthUrl();
    redditUrl.searchParams.set("client_id", process.env.REDDIT_CLIENT_ID ?? "");
    redditUrl.searchParams.set("response_type", "code");
    redditUrl.searchParams.set("state", oauthState);
    redditUrl.searchParams.set("redirect_uri", buildGenericRedirectUri("reddit"));
    redditUrl.searchParams.set("duration", "permanent");
    redditUrl.searchParams.set("scope", "identity submit edit privatemessages read");
    return reply.redirect(redditUrl.toString());
  }

  if (params.platform === "pinterest") {
    persistState();
    const pinterestUrl = buildPinterestAuthUrl();
    pinterestUrl.searchParams.set("client_id", process.env.PINTEREST_APP_ID ?? "");
    pinterestUrl.searchParams.set("redirect_uri", buildGenericRedirectUri("pinterest"));
    pinterestUrl.searchParams.set("response_type", "code");
    pinterestUrl.searchParams.set("scope", "boards:read,pins:read,pins:write,user_accounts:read");
    pinterestUrl.searchParams.set("state", oauthState);
    return reply.redirect(pinterestUrl.toString());
  }

  const googleUrl = buildGoogleAuthUrl();
  persistState();
  googleUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  googleUrl.searchParams.set("redirect_uri", buildGenericRedirectUri("google"));
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl");
  googleUrl.searchParams.set("access_type", "offline");
  googleUrl.searchParams.set("prompt", "consent");
  googleUrl.searchParams.set("state", oauthState);
  return reply.redirect(googleUrl.toString());
});

app.get("/api/oauth/facebook/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string; error_message?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (query.error) {
    return reply.redirect(`${appUrl}/accounts?oauth_error=${encodeURIComponent(query.error_message ?? query.error)}`);
  }

  if (!query.code || !query.state || !state.oauthStates[query.state]) {
    reply.code(400);
    return { error: "Invalid Facebook OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();

  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const shortLived = await exchangeFacebookCode(query.code);
  const longLived = await exchangeFacebookLongLivedToken(shortLived.access_token);
  const businessContext = await fetchMetaBusinessContext(longLived.access_token ?? shortLived.access_token);

  const preferredPageId = state.setup[account.id]?.apiConfig.pageId;
  const selectedPage = businessContext.find((page) => page.id === preferredPageId) ?? businessContext[0];

  state.credentials[account.id] = {
    provider: "facebook",
    encryptedTokenSet: encryptJson(
      {
        accessToken: longLived.access_token ?? shortLived.access_token,
        pageAccessToken: selectedPage?.access_token ?? null,
        pageId: selectedPage?.id ?? null
      },
      getTokenSecret()
    ),
    scopes: [],
    expiresAt: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000).toISOString() : null,
    refreshExpiresAt: null,
    updatedAt: new Date().toISOString(),
    externalAccountId: selectedPage?.id ?? null,
    externalUsername: selectedPage?.name ?? null,
    metadata: {
      pageId: selectedPage?.id ?? "",
      pageName: selectedPage?.name ?? ""
    }
  };

  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_facebook",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "Facebook OAuth connected."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=facebook-connected`);
});

app.get("/api/oauth/instagram/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string; error_reason?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (query.error) {
    return reply.redirect(`${appUrl}/accounts?oauth_error=${encodeURIComponent(query.error_reason ?? query.error)}`);
  }

  if (!query.code || !query.state || !state.oauthStates[query.state]) {
    reply.code(400);
    return { error: "Invalid Instagram OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();

  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const tokenSet = await exchangeInstagramCode(query.code);
  const profile = await fetchInstagramProfile(tokenSet.access_token);
  const instagramBusinessId = String(profile.user_id ?? profile.id ?? tokenSet.user_id ?? "");

  state.credentials[account.id] = {
    provider: "instagram",
    encryptedTokenSet: encryptJson(
      {
        accessToken: tokenSet.access_token,
        instagramBusinessId
      },
      getTokenSecret()
    ),
    scopes: INSTAGRAM_SCOPES,
    expiresAt: tokenSet.expires_in ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString() : null,
    refreshExpiresAt: null,
    updatedAt: new Date().toISOString(),
    externalAccountId: instagramBusinessId || null,
    externalUsername: profile.username ?? profile.name ?? null,
    metadata: {
      instagramBusinessId,
      instagramUsername: profile.username ?? "",
      instagramName: profile.name ?? "",
      connectionMethod: "oauth"
    }
  };

  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_instagram",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "Instagram OAuth connected."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=instagram-connected`);
});

app.get("/api/oauth/threads/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (query.error) {
    return reply.redirect(`${appUrl}/accounts?oauth_error=${encodeURIComponent(query.error)}`);
  }

  if (!query.code || !query.state || !state.oauthStates[query.state]) {
    reply.code(400);
    return { error: "Invalid Threads OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();

  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const tokenSet = await exchangeThreadsCode(query.code);
  const threadsUserId = String(tokenSet.user_id ?? "");
  const profile = await fetchThreadsProfile(tokenSet.access_token, threadsUserId);
  const resolvedThreadsUserId = String(profile.id ?? threadsUserId);

  state.credentials[account.id] = {
    provider: "threads",
    encryptedTokenSet: encryptJson(
      {
        accessToken: tokenSet.access_token,
        threadsUserId: resolvedThreadsUserId
      },
      getTokenSecret()
    ),
    scopes: THREADS_SCOPES,
    expiresAt: null,
    refreshExpiresAt: null,
    updatedAt: new Date().toISOString(),
    externalAccountId: resolvedThreadsUserId || null,
    externalUsername: profile.username ?? profile.name ?? null,
    metadata: {
      threadsUserId: resolvedThreadsUserId,
      threadsUsername: profile.username ?? "",
      threadsName: profile.name ?? "",
      connectionMethod: "oauth"
    }
  };

  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_threads",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "Threads OAuth connected."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=threads-connected`);
});

app.get("/api/oauth/tiktok/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string; error_description?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (query.error) {
    return reply.redirect(`${appUrl}/accounts?oauth_error=${encodeURIComponent(query.error_description ?? query.error)}`);
  }

  if (!query.code || !query.state || !state.oauthStates[query.state]) {
    reply.code(400);
    return { error: "Invalid TikTok OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();

  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const tokenSet = await exchangeTikTokCode(query.code);
  const creatorInfo = await fetchTikTokCreatorInfo(tokenSet.access_token);
  const user = creatorInfo.data?.user;

  state.credentials[account.id] = {
    provider: "tiktok",
    encryptedTokenSet: encryptJson(
      {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        openId: tokenSet.open_id
      },
      getTokenSecret()
    ),
    scopes: tokenSet.scope.split(",").map((scope) => scope.trim()).filter(Boolean),
    expiresAt: new Date(Date.now() + tokenSet.expires_in * 1000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + tokenSet.refresh_expires_in * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    externalAccountId: tokenSet.open_id,
    externalUsername: user?.display_name ?? null,
    metadata: {
      openId: tokenSet.open_id,
      displayName: user?.display_name ?? ""
    }
  };

  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_tiktok",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "TikTok OAuth connected."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=tiktok-connected`);
});

app.get("/api/oauth/x/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!query.code || !query.state || !state.oauthStates[query.state]?.codeVerifier) {
    reply.code(400);
    return { error: "Invalid X OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();
  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const tokenSet = await exchangeXCode(query.code, pending.codeVerifier ?? "");
  state.credentials[account.id] = {
    provider: "x",
    encryptedTokenSet: encryptJson(
      {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token ?? null
      },
      getTokenSecret()
    ),
    scopes: tokenSet.scope?.split(" ").filter(Boolean) ?? [],
    expiresAt: tokenSet.expires_in ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString() : null,
    refreshExpiresAt: null,
    updatedAt: new Date().toISOString(),
    externalAccountId: null,
    externalUsername: null,
    metadata: {}
  };
  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();
  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_x",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "X OAuth connected."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=x-connected`);
});

app.get("/api/oauth/linkedin/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!query.code || !query.state || !state.oauthStates[query.state]) {
    reply.code(400);
    return { error: "Invalid LinkedIn OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();
  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const tokenSet = await exchangeLinkedInCode(query.code);
  const profile = await fetchLinkedInProfile(tokenSet.access_token);
  state.credentials[account.id] = {
    provider: "linkedin",
    encryptedTokenSet: encryptJson(
      {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token ?? null,
        authorUrn: profile.sub ? `urn:li:person:${profile.sub}` : null
      },
      getTokenSecret()
    ),
    scopes: tokenSet.scope?.split(" ").filter(Boolean) ?? [],
    expiresAt: tokenSet.expires_in ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString() : null,
    refreshExpiresAt: null,
    updatedAt: new Date().toISOString(),
    externalAccountId: profile.sub ?? null,
    externalUsername: profile.name ?? profile.email ?? null,
    metadata: {
      authorUrn: profile.sub ? `urn:li:person:${profile.sub}` : ""
    }
  };
  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();
  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_linkedin",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "LinkedIn OAuth connected."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=linkedin-connected`);
});

app.get("/api/oauth/reddit/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!query.code || !query.state || !state.oauthStates[query.state]) {
    reply.code(400);
    return { error: "Invalid Reddit OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();
  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const tokenSet = await exchangeRedditCode(query.code);
  const me = await fetchRedditMe(tokenSet.access_token);
  state.credentials[account.id] = {
    provider: "reddit",
    encryptedTokenSet: encryptJson(
      {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token ?? null
      },
      getTokenSecret()
    ),
    scopes: tokenSet.scope?.split(" ").filter(Boolean) ?? [],
    expiresAt: tokenSet.expires_in ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString() : null,
    refreshExpiresAt: null,
    updatedAt: new Date().toISOString(),
    externalAccountId: me.id ?? null,
    externalUsername: me.name ?? null,
    metadata: {}
  };
  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();
  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_reddit",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "Reddit OAuth connected."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=reddit-connected`);
});

app.get("/api/oauth/pinterest/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!query.code || !query.state || !state.oauthStates[query.state]) {
    reply.code(400);
    return { error: "Invalid Pinterest OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();
  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const tokenSet = await exchangePinterestCode(query.code);
  const me = await fetchPinterestMe(tokenSet.access_token);
  state.credentials[account.id] = {
    provider: "pinterest",
    encryptedTokenSet: encryptJson(
      {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token ?? null
      },
      getTokenSecret()
    ),
    scopes: tokenSet.scope?.split(",").map((value) => value.trim()).filter(Boolean) ?? [],
    expiresAt: tokenSet.expires_in ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString() : null,
    refreshExpiresAt: null,
    updatedAt: new Date().toISOString(),
    externalAccountId: null,
    externalUsername: me.username ?? null,
    metadata: {}
  };
  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();
  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_pinterest",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "Pinterest OAuth connected."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=pinterest-connected`);
});

app.get("/api/oauth/google/callback", async (request, reply) => {
  const query = request.query as { code?: string; state?: string; error?: string };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!query.code || !query.state || !state.oauthStates[query.state]) {
    reply.code(400);
    return { error: "Invalid Google OAuth callback." };
  }

  const pending = state.oauthStates[query.state];
  delete state.oauthStates[query.state];
  persistState();
  const account = state.accounts.find((item) => item.id === pending.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const tokenSet = await exchangeGoogleCode(query.code);
  const channel = await fetchGoogleChannel(tokenSet.access_token);
  const firstChannel = channel.items?.[0];
  state.credentials[account.id] = {
    provider: "google",
    encryptedTokenSet: encryptJson(
      {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token ?? null,
        channelId: firstChannel?.id ?? null
      },
      getTokenSecret()
    ),
    scopes: tokenSet.scope?.split(" ").filter(Boolean) ?? [],
    expiresAt: tokenSet.expires_in ? new Date(Date.now() + tokenSet.expires_in * 1000).toISOString() : null,
    refreshExpiresAt: null,
    updatedAt: new Date().toISOString(),
    externalAccountId: firstChannel?.id ?? null,
    externalUsername: firstChannel?.snippet?.title ?? null,
    metadata: {
      channelId: firstChannel?.id ?? ""
    }
  };
  account.authStatus = "configured";
  account.lastAuthRefreshAt = new Date().toISOString();
  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "oauth_connect_google",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: "Google OAuth connected for YouTube."
  });

  return reply.redirect(`${appUrl}/accounts/${account.id}?oauth=google-connected`);
});

app.post("/api/accounts/:accountId/refresh-auth", async (request, reply) => {
  const params = request.params as { accountId: string };
  const account = state.accounts.find((item) => item.id === params.accountId);

  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const credential = state.credentials[account.id];
  if (!credential) {
    reply.code(400);
    return { error: "No OAuth credential is stored for this account." };
  }

  if (credential.provider === "tiktok") {
    const tokenSet = getDecryptedTokenSet(account.id);
    const refreshToken = tokenSet?.refreshToken;
    if (typeof refreshToken !== "string" || !refreshToken) {
      reply.code(400);
      return { error: "No TikTok refresh token is available." };
    }

    const refreshed = await refreshTikTokToken(refreshToken);
    state.credentials[account.id] = {
      provider: "tiktok",
      encryptedTokenSet: encryptJson(
        {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          openId: refreshed.open_id
        },
        getTokenSecret()
      ),
      scopes: refreshed.scope.split(",").map((scope) => scope.trim()).filter(Boolean),
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      refreshExpiresAt: new Date(Date.now() + refreshed.refresh_expires_in * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      externalAccountId: refreshed.open_id,
      externalUsername: credential.externalUsername,
      metadata: credential.metadata
    };
  }

  if (credential.provider === "facebook") {
    const tokenSet = getDecryptedTokenSet(account.id);
    const accessToken = typeof tokenSet?.accessToken === "string" ? tokenSet.accessToken : null;
    if (!accessToken) {
      reply.code(400);
      return { error: "No Facebook access token is available." };
    }

    const refreshed = await exchangeFacebookLongLivedToken(accessToken);
    state.credentials[account.id] = {
      ...credential,
      encryptedTokenSet: encryptJson(
        {
          ...tokenSet,
          accessToken: refreshed.access_token ?? accessToken
        },
        getTokenSecret()
      ),
      expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : credential.expiresAt,
      updatedAt: new Date().toISOString()
    };
  }

  if (credential.provider === "instagram") {
    const tokenSet = getDecryptedTokenSet(account.id);
    const accessToken = typeof tokenSet?.accessToken === "string" ? tokenSet.accessToken : null;
    if (!accessToken) {
      reply.code(400);
      return { error: "No Instagram access token is available." };
    }

    const refreshed = await refreshInstagramToken(accessToken);
    state.credentials[account.id] = {
      ...credential,
      encryptedTokenSet: encryptJson(
        {
          ...tokenSet,
          accessToken: refreshed.access_token ?? accessToken
        },
        getTokenSecret()
      ),
      expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : credential.expiresAt,
      updatedAt: new Date().toISOString()
    };
  }

  if (credential.provider === "x") {
    const tokenSet = getDecryptedTokenSet(account.id);
    const refreshToken = tokenSet?.refreshToken;
    if (typeof refreshToken === "string" && refreshToken) {
      const refreshed = await refreshXToken(refreshToken);
      state.credentials[account.id] = {
        ...credential,
        encryptedTokenSet: encryptJson(
          {
            ...tokenSet,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token ?? refreshToken
          },
          getTokenSecret()
        ),
        scopes: refreshed.scope?.split(" ").filter(Boolean) ?? credential.scopes,
        expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : credential.expiresAt,
        updatedAt: new Date().toISOString()
      };
    }
  }

  if (credential.provider === "reddit") {
    const tokenSet = getDecryptedTokenSet(account.id);
    const refreshToken = tokenSet?.refreshToken;
    if (typeof refreshToken === "string" && refreshToken) {
      const refreshed = await refreshRedditToken(refreshToken);
      state.credentials[account.id] = {
        ...credential,
        encryptedTokenSet: encryptJson(
          {
            ...tokenSet,
            accessToken: refreshed.access_token,
            refreshToken
          },
          getTokenSecret()
        ),
        scopes: refreshed.scope?.split(" ").filter(Boolean) ?? credential.scopes,
        expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : credential.expiresAt,
        updatedAt: new Date().toISOString()
      };
    }
  }

  if (credential.provider === "pinterest") {
    const tokenSet = getDecryptedTokenSet(account.id);
    const refreshToken = tokenSet?.refreshToken;
    if (typeof refreshToken === "string" && refreshToken) {
      const refreshed = await refreshPinterestToken(refreshToken);
      state.credentials[account.id] = {
        ...credential,
        encryptedTokenSet: encryptJson(
          {
            ...tokenSet,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token ?? refreshToken
          },
          getTokenSecret()
        ),
        scopes: refreshed.scope?.split(",").map((scope) => scope.trim()).filter(Boolean) ?? credential.scopes,
        expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : credential.expiresAt,
        updatedAt: new Date().toISOString()
      };
    }
  }

  if (credential.provider === "google") {
    const tokenSet = getDecryptedTokenSet(account.id);
    const refreshToken = tokenSet?.refreshToken;
    if (typeof refreshToken === "string" && refreshToken) {
      const refreshed = await refreshGoogleToken(refreshToken);
      state.credentials[account.id] = {
        ...credential,
        encryptedTokenSet: encryptJson(
          {
            ...tokenSet,
            accessToken: refreshed.access_token
          },
          getTokenSecret()
        ),
        scopes: refreshed.scope?.split(" ").filter(Boolean) ?? credential.scopes,
        expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : credential.expiresAt,
        updatedAt: new Date().toISOString()
      };
    }
  }

  account.lastAuthRefreshAt = new Date().toISOString();

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "refresh_auth",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: `Refreshed ${credential.provider} auth state.`
  });

  return {
    accepted: true,
    provider: credential.provider,
    expiresAt: state.credentials[account.id].expiresAt,
    refreshExpiresAt: state.credentials[account.id].refreshExpiresAt
  };
});

app.post("/api/accounts/setup", async (request, reply) => {
  const parsed = updateAccountSetupSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid setup payload", issues: parsed.error.issues };
  }

  const account = state.accounts.find((item) => item.id === parsed.data.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const existingSetup = state.setup[account.id];
  const mergedApiConfig = Object.fromEntries(
    Object.entries({
      ...(existingSetup?.apiConfig ?? {}),
      ...parsed.data.apiConfig
    }).filter(([, value]) => value !== "")
  );
  const mergedSessionConfig = Object.fromEntries(
    Object.entries({
      ...(existingSetup?.sessionConfig ?? {}),
      ...parsed.data.sessionConfig
    }).filter(([, value]) => value !== "")
  );

  account.connectorMode = parsed.data.connectorMode;
  account.automationMode = parsed.data.automationMode;
  account.openClawEnabled = parsed.data.openClawEnabled;
  account.authStatus =
    Object.keys(mergedApiConfig).length > 0 || Object.keys(mergedSessionConfig).length > 0
      ? "configured"
      : "not_started";

  state.setup[account.id] = {
    accountId: account.id,
    connectorMode: parsed.data.connectorMode,
    automationMode: parsed.data.automationMode,
    authStatus: account.authStatus,
    openClawEnabled: parsed.data.openClawEnabled,
    apiConfig: mergedApiConfig,
    sessionConfig: mergedSessionConfig,
    notes: parsed.data.notes,
    updatedAt: new Date().toISOString()
  };

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "update_account_setup",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: `Setup updated for ${account.platform} using ${parsed.data.connectorMode}.`
  });

  return state.setup[account.id];
});

app.post("/api/accounts/connect", async (request, reply) => {
  const parsed = connectAccountSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid connect payload", issues: parsed.error.issues };
  }

  const account = state.accounts.find((item) => item.id === parsed.data.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const connector = connectorFactory(account.platform);
  const execution = await connector.connect({
    accountId: account.id,
    platform: account.platform,
    handle: account.handle
  });

  if (account.platform === "bluesky") {
    const setup = state.setup[account.id];
    const identifier = setup?.apiConfig.identifier;
    const appPassword = setup?.apiConfig.appPassword;
    if (identifier && appPassword) {
      const session = await createBlueskySession(identifier, appPassword);
      state.credentials[account.id] = {
        provider: "bluesky",
        encryptedTokenSet: encryptJson(
          {
            accessJwt: session.accessJwt,
            refreshJwt: session.refreshJwt,
            did: session.did,
            handle: session.handle,
            accessToken: session.accessJwt
          },
          getTokenSecret()
        ),
        scopes: [],
        expiresAt: null,
        refreshExpiresAt: null,
        updatedAt: new Date().toISOString(),
        externalAccountId: session.did,
        externalUsername: session.handle,
        metadata: {
          did: session.did,
          handle: session.handle
        }
      };
    }
  }

  if (account.authStatus === "not_started") {
    account.authStatus = "configured";
  }

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "prepare_connector",
    subject: account.displayName,
    status: execution.ok ? "success" : "warning",
    createdAt: new Date().toISOString(),
    detail: execution.message
  });

  return execution;
});

app.get("/api/session-vault", async () =>
  state.accounts
    .filter((account) => account.sessionRequired)
    .map((account) => {
      const record = state.sessions[account.id];
      const bundle = record
        ? decryptJson<{
            cookies: Array<unknown>;
            localStorage: Record<string, string>;
          }>(record.encryptedBundle, process.env.SESSION_ENCRYPTION_KEY ?? "development-session-key")
        : null;

      return {
        accountId: account.id,
        displayName: account.displayName,
        platform: account.platform,
        connectorMode: account.connectorMode,
        sessionHealth: account.sessionHealth,
        lastAuthRefreshAt: account.lastAuthRefreshAt,
        certifiedFeatures: account.features,
        version: record?.version ?? (account.sessionHealth === "healthy" ? 3 : 2),
        storageMode: record?.storageMode ?? "encrypted_profile+bundle",
        source: record?.source ?? "placeholder_capture",
        cookieCount: bundle?.cookies.length ?? 0,
        localStorageCount: bundle ? Object.keys(bundle.localStorage).length : 0,
        warnings:
          account.sessionHealth === "healthy"
            ? []
            : ["Connector needs recertification before enabling unattended replies."]
      };
    })
);

app.post("/api/session-vault/capture", async (request, reply) => {
  const parsed = captureSessionSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid capture payload", issues: parsed.error.issues };
  }

  const account = state.accounts.find((item) => item.id === parsed.data.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const connector = connectorFactory(account.platform);
  const connectionResult = await connector.connect({
    accountId: account.id,
    platform: account.platform,
    handle: account.handle
  });

  const existing = state.sessions[account.id];
  state.sessions[account.id] = {
    encryptedBundle:
      existing?.encryptedBundle ??
      encryptJson(
        {
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          csrfTokens: {},
          fingerprint: {
            userAgent: "capture-placeholder",
            viewport: "0x0",
            locale: "en-GB"
          },
          profileObjectKey: parsed.data.mode === "profile" ? `profiles/${account.id}/placeholder.enc` : null
        },
        process.env.SESSION_ENCRYPTION_KEY ?? "development-session-key"
      ),
    version: (existing?.version ?? 2) + 1,
    storageMode:
      parsed.data.mode === "profile" ? "encrypted_profile+bundle" : "encrypted_bundle_only",
    source: "capture_flow"
  };

  account.sessionHealth = "healthy";
  account.openClawEnabled = true;
  account.lastAuthRefreshAt = new Date().toISOString();

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "capture_session",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: connectionResult.message
  });

  return {
    accepted: true,
    accountId: account.id,
    version: state.sessions[account.id].version,
    storageMode: state.sessions[account.id].storageMode
  };
});

app.post("/api/session-vault/import", async (request, reply) => {
  const parsed = importSessionBundleSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid session import payload", issues: parsed.error.issues };
  }

  const account = state.accounts.find((item) => item.id === parsed.data.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  state.sessions[account.id] = {
    encryptedBundle: encryptJson(
      parsed.data.bundle,
      process.env.SESSION_ENCRYPTION_KEY ?? "development-session-key"
    ),
    version: (state.sessions[account.id]?.version ?? 0) + 1,
    storageMode: parsed.data.mode === "profile" ? "encrypted_profile+bundle" : "encrypted_bundle_only",
    source: "manual_import"
  };

  account.sessionHealth = parsed.data.bundle.cookies.length > 0 ? "healthy" : "warning";
  account.lastAuthRefreshAt = new Date().toISOString();
  account.authStatus = account.authStatus === "not_started" ? "configured" : account.authStatus;

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "import_session_bundle",
    subject: account.displayName,
    status: "success",
    createdAt: new Date().toISOString(),
    detail: `Imported encrypted session bundle with ${parsed.data.bundle.cookies.length} cookies.`
  });

  return {
    accepted: true,
    accountId: account.id,
    version: state.sessions[account.id].version,
    storageMode: state.sessions[account.id].storageMode,
    cookieCount: parsed.data.bundle.cookies.length
  };
});

app.post("/api/accounts/certify", async (request, reply) => {
  const parsed = certifyAccountSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid certification payload", issues: parsed.error.issues };
  }

  const account = state.accounts.find((item) => item.id === parsed.data.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const connector = connectorFactory(account.platform);
  const certification = await connector.certify({
    accountId: account.id,
    platform: account.platform,
    handle: account.handle
  });

  if (parsed.data.featureOverrides) {
    account.features = parsed.data.featureOverrides;
  }

  account.openClawEnabled = certification.authValid;
  account.sessionHealth = certification.sessionStabilityScore >= 80 ? "healthy" : "warning";
  account.authStatus = certification.authValid ? "certified" : "configured";

  if (state.setup[account.id]) {
    state.setup[account.id].authStatus = account.authStatus;
    state.setup[account.id].updatedAt = new Date().toISOString();
  }

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "Operator",
    action: "certify_account",
    subject: account.displayName,
    status: certification.authValid ? "success" : "warning",
    createdAt: new Date().toISOString(),
    detail: `Certification score ${certification.sessionStabilityScore}.`
  });

  return certification;
});

app.get("/api/content-studio", async (_request, reply) => {
  try {
    return await getContentStudioSnapshot();
  } catch (error) {
    app.log.error(error);
    reply.code(503);
    return { error: "Content studio storage is unavailable." };
  }
});

app.post("/api/content-studio/assets", async (request, reply) => {
  const parsed = uploadMediaAssetSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid media upload payload", issues: parsed.error.issues };
  }

  try {
    const asset = await createMediaAssetRecord({
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      mediaKind: parsed.data.mediaKind,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
      bytes: Buffer.from(parsed.data.dataBase64, "base64"),
      tags: parsed.data.tags,
      transcriptHint: parsed.data.transcriptHint
    });

    appendAudit({
      id: `audit_${Date.now()}`,
      actor: "Operator",
      action: "upload_media_asset",
      subject: asset.title,
      status: "success",
      createdAt: new Date().toISOString(),
      detail: `Stored ${asset.mediaKind} asset in durable media storage.`
    });

    return asset;
  } catch (error) {
    reply.code(500);
    return {
      error: "Failed to persist media asset.",
      detail: error instanceof Error ? error.message : "Unknown upload error"
    };
  }
});

app.post("/api/content-studio/assets/analyze", async (request, reply) => {
  const parsed = analyzeMediaAssetSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid asset analysis payload", issues: parsed.error.issues };
  }

  try {
    const asset = await analyzeMediaAssetRecord(parsed.data.assetId, parsed.data.transcriptHint);

    appendAudit({
      id: `audit_${Date.now()}`,
      actor: "Operator",
      action: "analyze_media_asset",
      subject: asset.title,
      status: "success",
      createdAt: new Date().toISOString(),
      detail: `Generated transcript cache, highlights, and vector metadata for ${asset.mediaKind}.`
    });

    return asset;
  } catch (error) {
    reply.code(500);
    return {
      error: "Failed to analyze media asset.",
      detail: error instanceof Error ? error.message : "Unknown analysis error"
    };
  }
});

app.get("/api/content-studio/assets/:assetId/download", async (request, reply) => {
  const params = request.params as { assetId: string };

  try {
    const media = await streamMediaAsset(params.assetId);
    reply.header("Content-Type", media.contentType);
    reply.header("Content-Disposition", `inline; filename="${media.asset.originalFilename}"`);
    return reply.send(media.body as never);
  } catch (error) {
    reply.code(404);
    return {
      error: "Media asset not found",
      detail: error instanceof Error ? error.message : "Unknown media retrieval error"
    };
  }
});

app.post("/api/content-studio/edit-jobs", async (request, reply) => {
  const parsed = createEditJobSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid edit job payload", issues: parsed.error.issues };
  }

  try {
    const editJob = await createEditJobRecord(parsed.data);

    appendAudit({
      id: `audit_${Date.now()}`,
      actor: "Operator",
      action: "create_edit_job",
      subject: editJob.title,
      status: "success",
      createdAt: new Date().toISOString(),
      detail: `Queued edit job with ${editJob.brollAssetIds.length} supporting assets.`
    });

    return editJob;
  } catch (error) {
    reply.code(500);
    return {
      error: "Failed to create edit job.",
      detail: error instanceof Error ? error.message : "Unknown edit job error"
    };
  }
});

app.get("/api/content", async () => {
  try {
    const snapshot = await getContentStudioSnapshot();
    return snapshot.content;
  } catch {
    return state.content;
  }
});

app.get("/api/inbox", async () => state.inbox);

app.get("/api/queue", async () => state.queue);

app.post("/api/queue", async (request, reply) => {
  const parsed = queueActionSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid queue payload", issues: parsed.error.issues };
  }

  const account = state.accounts.find((item) => item.id === parsed.data.accountId);
  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  const queueItem = {
    id: `queue_${Date.now()}`,
    accountId: account.id,
    projectName: account.projectName,
    platform: parsed.data.platform,
    type: parsed.data.type,
    scheduledFor: parsed.data.scheduledFor,
    status: "queued" as const,
    owner: parsed.data.owner
  };

  state.queue.unshift(queueItem);
  persistState();
  return queueItem;
});

app.post("/api/openclaw/actions", async (request, reply) => {
  const authHeader = request.headers.authorization;
  const machineToken = process.env.INTERNAL_MACHINE_TOKEN;

  if (!machineToken || authHeader !== `Bearer ${machineToken}`) {
    reply.code(401);
    return { error: "Unauthorized" };
  }

  const parsed = openClawActionSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid action payload", issues: parsed.error.issues };
  }

  const payload = parsed.data;
  const account = payload.accountId
    ? state.accounts.find((item) => item.id === payload.accountId)
    : undefined;
  const platform = account?.platform;
  const connector = platform ? connectorFactory(platform) : undefined;
  const preferSessionExecution =
    account?.connectorMode === "session_auth" || (platform ? platformRegistry[platform].requiresSessionAtLaunch : false);
  const sessionExecution =
    account && account.connectorMode !== "api_auth" && preferSessionExecution
      ? await executeSessionAction(account.id, account.platform, payload.action, payload.payload)
      : null;
  const officialExecution =
    connector && account && !sessionExecution
      ? await executePlatformAction(account.id, account.platform, payload.action, payload.payload)
      : null;
  const fallbackSessionExecution =
    !sessionExecution && !officialExecution && account && account.connectorMode !== "api_auth"
      ? await executeSessionAction(account.id, account.platform, payload.action, payload.payload)
      : null;
  const resolvedSessionExecution = sessionExecution ?? fallbackSessionExecution;
  const execution =
    connector && account
      ? await connector.execute(
          {
            accountId: account.id,
            platform: account.platform,
            handle: account.handle
          },
          payload
        )
      : null;

  if (account && payload.action !== "analyze_performance") {
    state.queue.unshift({
      id: `queue_${Date.now()}`,
      accountId: account.id,
      projectName: account.projectName,
      platform: account.platform,
      type:
        payload.action === "publish_post"
          ? "publish"
          : payload.action === "edit_post"
            ? "edit"
            : payload.action === "reply_comment"
              ? "comment_reply"
              : payload.action === "send_dm"
                ? "dm_reply"
                : "session_refresh",
      scheduledFor: new Date().toISOString(),
      status: "queued",
      owner: "OpenClaw"
    });
  }

  appendAudit({
    id: `audit_${Date.now()}`,
    actor: "OpenClaw",
    action: payload.action,
    subject: account?.displayName ?? payload.projectId ?? "global",
    status: "success",
    createdAt: new Date().toISOString(),
    detail: execution?.message ?? "Global action accepted."
  });

  return {
    accepted: true,
    routedBy: "connector-router",
    mode: account?.connectorMode ?? "api_auth",
    action: payload.action,
    queuedAt: new Date().toISOString(),
    execution: officialExecution ?? resolvedSessionExecution ?? execution,
    note:
      officialExecution
        ? "Action executed against the official provider integration."
        : resolvedSessionExecution
          ? "Action executed through the isolated session-runner."
          : "Action accepted. Worker execution and session handling occur in downstream services."
  };
});

export { app };
