"use server";

import { platformSchema } from "@content-empire/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const apiBaseUrl = process.env.API_URL ?? "http://127.0.0.1:4000";
const proxyPlatformSet = new Set<string>(platformSchema.options);

async function postJson(path: string, body: object, token?: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${path}`);
  }

  return response.json();
}

function collectPrefixedConfig(formData: FormData, prefix: string) {
  const output: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(prefix) || typeof value !== "string") {
      continue;
    }

    output[key.slice(prefix.length)] = value;
  }

  return output;
}

function parseJsonField(formData: FormData, key: string, fallback: unknown) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) {
    return fallback;
  }

  return JSON.parse(raw);
}

function parseCsvField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getTrimmedField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formatIssue(issue: { path?: Array<string | number>; message?: unknown }) {
  const path = Array.isArray(issue.path) && issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : "";
  const message = typeof issue.message === "string" ? issue.message : "";
  return `${path}${message}`.trim();
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(message) as {
      error?: unknown;
      issues?: Array<{ path?: Array<string | number>; message?: unknown }>;
    };

    if (typeof parsed.error === "string") {
      const issueSummary = Array.isArray(parsed.issues)
        ? parsed.issues.map(formatIssue).find(Boolean)
        : null;
      return issueSummary ? `${parsed.error}: ${issueSummary}` : parsed.error;
    }
  } catch {
    return message;
  }

  return message;
}

function buildProxyErrorRedirect(message: string) {
  return `/proxies?${new URLSearchParams({ error: message }).toString()}`;
}

function parseProxyPlatformTargets(formData: FormData) {
  const values: string[] = [];
  const invalid: string[] = [];

  for (const value of parseCsvField(formData, "platformTargets")) {
    const normalized = value.toLowerCase();
    if (!proxyPlatformSet.has(normalized)) {
      invalid.push(value);
      continue;
    }

    if (!values.includes(normalized)) {
      values.push(normalized);
    }
  }

  return {
    values,
    invalid
  };
}

export async function createProjectAction(formData: FormData) {
  await postJson("/api/projects", {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    voice: formData.get("voice")
  });

  revalidatePath("/");
  revalidatePath("/connect");
  redirect("/connect");
}

export async function createAccountAction(formData: FormData) {
  await postJson("/api/accounts", {
    projectId: formData.get("projectId"),
    platform: formData.get("platform"),
    handle: formData.get("handle"),
    displayName: formData.get("displayName"),
    connectorMode: formData.get("connectorMode"),
    automationMode: formData.get("automationMode")
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/connect");
  redirect("/accounts");
}

export async function updateAccountSetupAction(formData: FormData) {
  const apiConfig =
    formData.get("apiConfig") !== null
      ? JSON.parse(String(formData.get("apiConfig") ?? "{}"))
      : collectPrefixedConfig(formData, "api__");
  const sessionConfig =
    formData.get("sessionConfig") !== null
      ? JSON.parse(String(formData.get("sessionConfig") ?? "{}"))
      : collectPrefixedConfig(formData, "session__");

  await postJson("/api/accounts/setup", {
    accountId: formData.get("accountId"),
    connectorMode: formData.get("connectorMode"),
    automationMode: formData.get("automationMode"),
    openClawEnabled: formData.get("openClawEnabled") === "on",
    notes: formData.get("notes"),
    apiConfig,
    sessionConfig
  });

  revalidatePath("/accounts");
  revalidatePath("/session-vault");
  redirect(`/accounts/${formData.get("accountId")}`);
}

export async function connectAccessTokenAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "").trim();
  const accessToken = String(formData.get("accessToken") ?? "").trim();
  const externalAccountId = String(formData.get("externalAccountId") ?? "").trim();

  await postJson(`/api/accounts/${accountId}/connect-access-token`, {
    accountId,
    accessToken,
    externalAccountId
  });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}

export async function upsertProxyAction(formData: FormData) {
  const label = getTrimmedField(formData, "label");
  const raw = getTrimmedField(formData, "raw");
  const provider = getTrimmedField(formData, "provider");
  const countryCode = getTrimmedField(formData, "countryCode");
  const notes = getTrimmedField(formData, "notes");
  const { values: platformTargets, invalid } = parseProxyPlatformTargets(formData);

  if (label.length < 2) {
    redirect(buildProxyErrorRedirect("Label must be at least 2 characters."));
  }

  if (raw.length < 3) {
    redirect(buildProxyErrorRedirect("Enter a proxy string before saving."));
  }

  if (invalid.length > 0) {
    const noun = invalid.length === 1 ? "target" : "targets";
    redirect(
      buildProxyErrorRedirect(
        `Unsupported platform ${noun}: ${invalid.join(", ")}. Use: ${platformSchema.options.join(", ")}.`
      )
    );
  }

  try {
    await postJson("/api/proxies", {
      proxyId: getTrimmedField(formData, "proxyId") || undefined,
      label,
      raw,
      provider,
      countryCode,
      platformTargets,
      enabled: formData.get("enabled") === "on",
      notes
    });
  } catch (error) {
    redirect(buildProxyErrorRedirect(getActionErrorMessage(error, "Could not save proxy.")));
  }

  revalidatePath("/proxies");
  revalidatePath("/accounts");
  revalidatePath("/");
  redirect("/proxies");
}

export async function deleteProxyAction(formData: FormData) {
  const proxyId = getTrimmedField(formData, "proxyId");
  if (!proxyId) {
    redirect(buildProxyErrorRedirect("Select a proxy to delete."));
  }

  try {
    await postJson("/api/proxies/delete", {
      proxyId
    });
  } catch (error) {
    redirect(buildProxyErrorRedirect(getActionErrorMessage(error, "Could not delete proxy.")));
  }

  revalidatePath("/proxies");
  revalidatePath("/accounts");
  revalidatePath("/");
  redirect("/proxies");
}

export async function rotateProxyAssignmentAction(formData: FormData) {
  const key = getTrimmedField(formData, "key");
  if (!key) {
    redirect(buildProxyErrorRedirect("Select a sticky assignment to rotate."));
  }

  try {
    await postJson("/api/proxies/assignments/rotate", {
      key
    });
  } catch (error) {
    redirect(buildProxyErrorRedirect(getActionErrorMessage(error, "Could not rotate proxy assignment.")));
  }

  revalidatePath("/proxies");
  revalidatePath("/accounts");
  revalidatePath("/");
  redirect("/proxies");
}

export async function connectAccountAction(formData: FormData) {
  const accountId = String(formData.get("accountId"));
  await postJson("/api/accounts/connect", { accountId });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/audit");
  redirect(`/accounts/${accountId}`);
}

export async function refreshAuthAction(formData: FormData) {
  const accountId = String(formData.get("accountId"));
  await postJson(`/api/accounts/${accountId}/refresh-auth`, {});

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/audit");
  redirect(`/accounts/${accountId}`);
}

export async function certifyAccountAction(formData: FormData) {
  await postJson("/api/accounts/certify", {
    accountId: formData.get("accountId")
  });

  revalidatePath("/accounts");
  revalidatePath("/session-vault");
  redirect("/accounts");
}

export async function captureSessionAction(formData: FormData) {
  await postJson("/api/session-vault/capture", {
    accountId: formData.get("accountId"),
    mode: formData.get("mode"),
    notes: formData.get("notes")
  });

  revalidatePath("/session-vault");
  revalidatePath("/accounts");
  redirect("/session-vault");
}

export async function importSessionBundleAction(formData: FormData) {
  const accountId = String(formData.get("accountId"));
  const bundleText = String(formData.get("bundleJson") ?? "").trim();
  const bundleFile = formData.get("bundleFile");

  let sourceText = bundleText;
  if (!sourceText && bundleFile instanceof File && bundleFile.size > 0) {
    sourceText = await bundleFile.text();
  }

  const bundle =
    sourceText.length > 0
      ? JSON.parse(sourceText)
      : {
          cookies: parseJsonField(formData, "cookiesJson", []),
          localStorage: parseJsonField(formData, "localStorageJson", {}),
          sessionStorage: parseJsonField(formData, "sessionStorageJson", {}),
          csrfTokens: parseJsonField(formData, "csrfTokensJson", {}),
          fingerprint: {
            userAgent: String(formData.get("fingerprintUserAgent") ?? "Mozilla/5.0"),
            viewport: String(formData.get("fingerprintViewport") ?? "1440x900"),
            locale: String(formData.get("fingerprintLocale") ?? "en-GB")
          },
          profileObjectKey: String(formData.get("profileObjectKey") ?? "").trim() || null
        };

  if (!sourceText && !Array.isArray(bundle.cookies)) {
    throw new Error("Provide a session bundle JSON payload, upload a JSON file, or enter cookies in the manual session fields.");
  }

  await postJson("/api/session-vault/import", {
    accountId,
    mode: formData.get("mode"),
    notes: formData.get("notes"),
    bundle
  });

  revalidatePath("/session-vault");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/audit");
  redirect("/session-vault");
}

export async function queueAction(formData: FormData) {
  await postJson("/api/queue", {
    accountId: formData.get("accountId"),
    platform: formData.get("platform"),
    type: formData.get("type"),
    owner: formData.get("owner"),
    scheduledFor: formData.get("scheduledFor")
  });

  revalidatePath("/openclaw");
  revalidatePath("/");
  redirect("/openclaw");
}

export async function uploadMediaAssetAction(formData: FormData) {
  const file = formData.get("mediaFile");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Select a media file to upload.");
  }

  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  const rawTags = String(formData.get("tags") ?? "");
  const tags = rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  await postJson("/api/content-studio/assets", {
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description"),
    mediaKind: formData.get("mediaKind"),
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    tags,
    transcriptHint: formData.get("transcriptHint"),
    dataBase64: bytes
  });

  revalidatePath("/content-studio");
  revalidatePath("/");
  redirect("/content-studio");
}

export async function analyzeMediaAssetAction(formData: FormData) {
  await postJson("/api/content-studio/assets/analyze", {
    assetId: formData.get("assetId"),
    transcriptHint: formData.get("transcriptHint")
  });

  revalidatePath("/content-studio");
  redirect("/content-studio");
}

export async function createEditJobAction(formData: FormData) {
  const rawBroll = String(formData.get("brollAssetIds") ?? "");
  const brollAssetIds = rawBroll
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await postJson("/api/content-studio/edit-jobs", {
    projectId: formData.get("projectId"),
    accountId: String(formData.get("accountId") ?? "").trim() || undefined,
    title: formData.get("title"),
    sourceAssetId: formData.get("sourceAssetId"),
    brollAssetIds,
    includeCaptions: formData.get("includeCaptions") === "on",
    instructions: formData.get("instructions"),
    aspectRatio: formData.get("aspectRatio"),
    renderTemplate: formData.get("renderTemplate")
  });

  revalidatePath("/content-studio");
  revalidatePath("/audit");
  redirect("/content-studio");
}

export async function openClawAction(formData: FormData) {
  const token = process.env.INTERNAL_MACHINE_TOKEN;
  if (!token) {
    throw new Error("INTERNAL_MACHINE_TOKEN is not set");
  }

  const payloadText = String(formData.get("payloadJson") ?? "").trim();
  const payload =
    payloadText.length > 0
      ? JSON.parse(payloadText)
      : {
          prompt: formData.get("prompt")
        };

  await postJson(
    "/api/openclaw/actions",
    {
      action: formData.get("action"),
      accountId: formData.get("accountId"),
      payload
    },
    token
  );

  revalidatePath("/openclaw");
  revalidatePath("/audit");
  revalidatePath("/");
  redirect("/openclaw");
}
