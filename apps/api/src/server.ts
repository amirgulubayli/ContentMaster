import cors from "@fastify/cors";
import { connectorFactory, getPlatformProfile, platformRegistry } from "@content-empire/connectors";
import { decryptJson, seedDashboard } from "@content-empire/shared";
import Fastify from "fastify";
import {
  captureSessionSchema,
  certifyAccountSchema,
  createAccountSchema,
  createProjectSchema,
  openClawActionSchema,
  queueActionSchema
} from "./schemas.js";
import { appendAudit, state } from "./state.js";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

app.get("/health", async () => ({
  status: "ok",
  service: "content-empire-api",
  timestamp: new Date().toISOString()
}));

app.get("/api/dashboard", async () => seedDashboard);

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
  return project;
});

app.get("/api/accounts", async () => state.accounts);

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
    features: profile.features,
    lastAuthRefreshAt: new Date().toISOString(),
    lastPostAt: null,
    sessionRequired: profile.requiresSessionAtLaunch || profile.sessionFallback,
    openClawEnabled: false
  };

  state.accounts.push(account);
  return account;
});

app.get("/api/platforms", async () => Object.values(platformRegistry));

app.get("/api/accounts/:accountId/profile", async (request, reply) => {
  const params = request.params as { accountId: string };
  const account = state.accounts.find((item) => item.id === params.accountId);

  if (!account) {
    reply.code(404);
    return { error: "Account not found" };
  }

  return {
    account,
    profile: getPlatformProfile(account.platform)
  };
});

app.get("/api/session-vault", async () =>
  state.accounts
    .filter((account) => account.sessionRequired)
    .map((account) => ({
      accountId: account.id,
      displayName: account.displayName,
      platform: account.platform,
      connectorMode: account.connectorMode,
      sessionHealth: account.sessionHealth,
      lastAuthRefreshAt: account.lastAuthRefreshAt,
      certifiedFeatures: account.features,
      version: state.sessions[account.id]?.version ?? (account.sessionHealth === "healthy" ? 3 : 2),
      storageMode: state.sessions[account.id]?.storageMode ?? "encrypted_profile+bundle",
      warnings:
        account.sessionHealth === "healthy"
          ? []
          : ["Connector needs recertification before enabling unattended replies."]
    }))
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
      Buffer.from(`placeholder-${parsed.data.mode}-${account.id}`).toString("base64"),
    version: (existing?.version ?? 2) + 1,
    storageMode:
      parsed.data.mode === "profile" ? "encrypted_profile+bundle" : "encrypted_bundle_only"
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

app.get("/api/content", async () => state.content);

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
    execution,
    note: "Action accepted. Worker execution and session handling occur in downstream services."
  };
});

export { app };
