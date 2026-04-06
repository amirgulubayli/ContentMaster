"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const apiBaseUrl = process.env.API_URL ?? "http://127.0.0.1:4000";

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
