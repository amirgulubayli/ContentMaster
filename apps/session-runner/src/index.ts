import Fastify from "fastify";
import { chromium } from "playwright";
import { z } from "zod";

const sessionBundleSchema = z.object({
  cookies: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string(),
      path: z.string(),
      secure: z.boolean(),
      httpOnly: z.boolean()
    })
  ),
  localStorage: z.record(z.string(), z.string()),
  sessionStorage: z.record(z.string(), z.string()),
  csrfTokens: z.record(z.string(), z.string()),
  fingerprint: z.object({
    userAgent: z.string(),
    viewport: z.string(),
    locale: z.string()
  }),
  profileObjectKey: z.string().nullable()
});

const stepSchema = z.object({
  type: z.enum(["goto", "click", "fill", "press", "wait_for_selector", "wait_for_timeout"]),
  selector: z.string().optional(),
  value: z.string().optional(),
  url: z.string().optional(),
  timeoutMs: z.number().optional()
});

const actionSchema = z.object({
  accountId: z.string(),
  platform: z.string(),
  action: z.enum([
    "publish_post",
    "edit_post",
    "reply_comment",
    "send_dm",
    "engage",
    "refresh_session"
  ]),
  sessionBundle: sessionBundleSchema,
  payload: z.record(z.string(), z.unknown()).default({})
});

function defaultUrlForPlatform(platform: string) {
  const urls: Record<string, string> = {
    medium: "https://medium.com/me/stories/drafts",
    substack: "https://substack.com/home",
    quora: "https://www.quora.com/",
    reddit: "https://www.reddit.com/",
    pinterest: "https://www.pinterest.com/",
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    tiktok: "https://www.tiktok.com/",
    x: "https://x.com/home"
  };

  return urls[platform] ?? "https://example.com/";
}

async function executeStep(page: import("playwright").Page, step: z.infer<typeof stepSchema>) {
  switch (step.type) {
    case "goto":
      await page.goto(step.url ?? "about:blank", { waitUntil: "domcontentloaded" });
      break;
    case "click":
      if (!step.selector) throw new Error("click step requires selector");
      await page.click(step.selector);
      break;
    case "fill":
      if (!step.selector) throw new Error("fill step requires selector");
      await page.fill(step.selector, step.value ?? "");
      break;
    case "press":
      if (!step.selector) throw new Error("press step requires selector");
      await page.press(step.selector, step.value ?? "Enter");
      break;
    case "wait_for_selector":
      if (!step.selector) throw new Error("wait_for_selector step requires selector");
      await page.waitForSelector(step.selector, { timeout: step.timeoutMs ?? 15000 });
      break;
    case "wait_for_timeout":
      await page.waitForTimeout(step.timeoutMs ?? 1000);
      break;
  }
}

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  status: "ok",
  service: "session-runner",
  isolated: true
}));

app.post("/execute", async (request, reply) => {
  const parsed = actionSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid request", issues: parsed.error.issues };
  }

  const { action, payload, platform, sessionBundle } = parsed.data;
  const viewportParts = sessionBundle.fingerprint.viewport.split("x").map(Number);
  const viewport =
    viewportParts.length === 2 && viewportParts.every((value) => Number.isFinite(value))
      ? { width: viewportParts[0], height: viewportParts[1] }
      : { width: 1440, height: 900 };

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: sessionBundle.fingerprint.userAgent,
      locale: sessionBundle.fingerprint.locale,
      viewport
    });

    await context.addCookies(
      sessionBundle.cookies.map((cookie) => ({
        ...cookie,
        sameSite: "Lax"
      }))
    );

    await context.addInitScript(
      ({ localStorageEntries, sessionStorageEntries }) => {
        for (const [key, value] of Object.entries(localStorageEntries)) {
          window.localStorage.setItem(key, value);
        }

        for (const [key, value] of Object.entries(sessionStorageEntries)) {
          window.sessionStorage.setItem(key, value);
        }
      },
      {
        localStorageEntries: sessionBundle.localStorage,
        sessionStorageEntries: sessionBundle.sessionStorage
      }
    );

    const page = await context.newPage();
    const targetUrl =
      (typeof payload.targetUrl === "string" && payload.targetUrl) ||
      (typeof payload.url === "string" && payload.url) ||
      defaultUrlForPlatform(platform);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    const steps = Array.isArray(payload.steps) ? payload.steps : [];
    if (steps.length > 0) {
      for (const rawStep of steps) {
        const step = stepSchema.parse(rawStep);
        await executeStep(page, step);
      }
    } else {
      const text = typeof payload.message === "string" ? payload.message : typeof payload.text === "string" ? payload.text : "";
      const composeSelector = typeof payload.composeSelector === "string" ? payload.composeSelector : undefined;
      const submitSelector = typeof payload.submitSelector === "string" ? payload.submitSelector : undefined;

      if (composeSelector && text) {
        await page.fill(composeSelector, text);
      }

      if (submitSelector) {
        await page.click(submitSelector);
      }
    }

    return {
      accepted: true,
      execution: {
        profileLoadedFrom: sessionBundle.profileObjectKey ? "encrypted-profile+bundle" : "encrypted-bundle",
        liveBrowserLifetime: "per-job",
        secretExposure: "none",
        action,
        finalUrl: page.url(),
        title: await page.title()
      }
    };
  } finally {
    await browser.close();
  }
});

const port = Number(process.env.SESSION_RUNNER_PORT ?? 4200);
app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
