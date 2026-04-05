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
    automationMode: formData.get("automationMode")
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/connect");
  redirect("/accounts");
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

  await postJson(
    "/api/openclaw/actions",
    {
      action: formData.get("action"),
      accountId: formData.get("accountId"),
      payload: {
        prompt: formData.get("prompt")
      }
    },
    token
  );

  revalidatePath("/openclaw");
  revalidatePath("/audit");
  revalidatePath("/");
  redirect("/openclaw");
}
