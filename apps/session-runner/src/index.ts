import Fastify from "fastify";
import { chromium } from "playwright";
import { z } from "zod";
import { parseRunnerProxy } from "./proxy-config.js";

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
  payload: z.record(z.string(), z.unknown()).default({}),
  proxy: z
    .object({
      id: z.string(),
      label: z.string(),
      raw: z.string()
    })
    .optional()
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

function normalizeRedditRecipient(value: string) {
  return value.trim().replace(/^\/?u\//i, "");
}

function getStringPayloadValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  return "";
}

function getNavigationFailureReason(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("err_proxy_connection_failed")) {
    return "proxy connection failed";
  }

  if (message.includes("err_tunnel_connection_failed")) {
    return "proxy tunnel failed";
  }

  if (message.includes("err_socks_connection_failed")) {
    return "proxy socks connection failed";
  }

  if (message.includes("err_name_not_resolved")) {
    return "dns resolution failed";
  }

  if (message.includes("err_connection_reset")) {
    return "connection reset";
  }

  if (message.includes("err_internet_disconnected")) {
    return "internet disconnected";
  }

  if (message.includes("timeout") || message.includes("timed out")) {
    return "navigation timeout";
  }

  return "page failed to render";
}

function describeConnection(proxyLabel?: string | null) {
  return proxyLabel ? `via proxy ${proxyLabel}` : "via direct connection";
}

class RetryableProxyError extends Error {
  reason: string;

  cause: unknown;

  constructor(reason: string, message: string, cause?: unknown) {
    super(message);
    this.name = "RetryableProxyError";
    this.reason = reason;
    this.cause = cause;
  }
}

function isRetryableProxyError(error: unknown): error is RetryableProxyError {
  return error instanceof RetryableProxyError;
}

function resolveRedditComposeUrl(payload: Record<string, unknown>) {
  const explicitUrl = getStringPayloadValue(payload, ["composeUrl", "targetUrl", "url"]);
  const recipient =
    getStringPayloadValue(payload, ["to", "username", "recipient", "handle"]) ??
    (() => {
      if (!explicitUrl) return undefined;

      try {
        return new URL(explicitUrl).searchParams.get("to") ?? undefined;
      } catch {
        return undefined;
      }
    })();

  const normalizedRecipient = recipient ? normalizeRedditRecipient(recipient) : undefined;
  const composeUrl =
    explicitUrl ??
    (normalizedRecipient
      ? `https://www.reddit.com/message/compose/?to=${encodeURIComponent(normalizedRecipient)}`
      : undefined);

  return {
    composeUrl,
    recipient: normalizedRecipient
  };
}

async function getShadowFieldHandle(
  page: import("playwright").Page,
  hostSelector: string,
  inputSelector: string
) {
  const host = await page.waitForSelector(hostSelector, { state: "attached" });
  const handle = await host.evaluateHandle(
    (element, selector) => element.shadowRoot?.querySelector(selector) ?? null,
    inputSelector
  );
  const field = handle.asElement();

  if (!field) {
    throw new Error(`Unable to resolve shadow field ${inputSelector} from ${hostSelector}`);
  }

  return field;
}

async function typeIntoField(
  field: import("playwright").ElementHandle<Element>,
  value: string
) {
  await field.click({ clickCount: 3 });
  await field.press("Backspace");
  await field.type(value, { delay: 25 });
  await field.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.blur();
    }
  });
}

async function pulseFieldValidation(
  field: import("playwright").ElementHandle<Element>,
  value: string
) {
  await field.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
      return;
    }

    element.focus();
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        data: nextValue,
        inputType: "insertText"
      })
    );
    element.dispatchEvent(
      new Event("change", {
        bubbles: true,
        composed: true
      })
    );
    element.dispatchEvent(
      new KeyboardEvent("keyup", {
        bubbles: true,
        composed: true,
        key: nextValue.slice(-1) || " "
      })
    );
    element.blur();
  }, value);
}

async function captureRedditComposeState(page: import("playwright").Page) {
  return page.evaluate(() => {
    const getValue = (hostSelector: string, inputSelector: string) => {
      const host = document.querySelector(hostSelector);
      if (!(host instanceof HTMLElement) || !host.shadowRoot) {
        return null;
      }

      const input = host.shadowRoot.querySelector(inputSelector);
      if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) {
        return null;
      }

      return input.value;
    };

    const submit = document.querySelector('compose-message-form button[type="submit"]');
    const disabled =
      submit instanceof HTMLButtonElement ? submit.disabled : null;

    return {
      to: getValue(
        'faceplate-text-input[name="message-recipient-input"]',
        'input[name="message-recipient-input"]'
      ),
      title: getValue(
        'faceplate-text-input[name="message-title"]',
        'input[name="message-title"]'
      ),
      msg: getValue(
        'faceplate-textarea-input[name="message-content"]',
        'textarea[name="message-content"]'
      ),
      buttonDisabled: disabled
    };
  });
}

async function captureRedditPageContext(page: import("playwright").Page) {
  return page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    bodyTextPreview: document.body?.innerText?.slice(0, 500) ?? "",
    hasComposeForm: Boolean(document.querySelector("compose-message-form"))
  }));
}

function detectRedditBlockReason(pageContext: Awaited<ReturnType<typeof captureRedditPageContext>>) {
  const haystack = `${pageContext.title}\n${pageContext.bodyTextPreview}`.toLowerCase();

  if (haystack.includes("network policy")) {
    return "network policy";
  }

  return null;
}

async function gotoPage(
  page: import("playwright").Page,
  url: string,
  platform: string,
  proxyLabel?: string | null
) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (cause) {
    const reason = getNavigationFailureReason(cause);
    const detail = getErrorMessage(cause);
    const message = detail
      ? `Navigation failed for ${url} ${describeConnection(proxyLabel)}: ${detail}`
      : `Navigation failed for ${url} ${describeConnection(proxyLabel)}.`;
    throw new RetryableProxyError(reason, message, cause);
  }

  if (platform === "reddit") {
    const pageContext = await captureRedditPageContext(page);
    const blockReason = detectRedditBlockReason(pageContext);
    if (blockReason) {
      app.log.error({ pageContext }, "Reddit blocked the page after navigation");
      throw new RetryableProxyError(
        blockReason,
        `Reddit blocked the page with ${blockReason}.`
      );
    }
  }
}

async function executeRedditSendDm(
  page: import("playwright").Page,
  payload: Record<string, unknown>,
  proxyLabel?: string | null
) {
  const { composeUrl, recipient } = resolveRedditComposeUrl(payload);
  const title = getStringPayloadValue(payload, ["title", "subject"]);
  const message = getStringPayloadValue(payload, ["message", "text", "body"]);
  const submitSelector =
    getStringPayloadValue(payload, ["submitSelector"]) ?? 'compose-message-form button[type="submit"]';
  const submitTimeoutMs =
    typeof payload.submitTimeoutMs === "number" && Number.isFinite(payload.submitTimeoutMs)
      ? payload.submitTimeoutMs
      : 15000;

  if (!composeUrl) {
    throw new Error("Reddit send_dm requires composeUrl/targetUrl or a recipient in payload.to");
  }

  if (!recipient) {
    throw new Error("Reddit send_dm requires a recipient in payload.to or composeUrl query param");
  }

  if (!title) {
    throw new Error("Reddit send_dm requires payload.title");
  }

  if (!message) {
    throw new Error("Reddit send_dm requires payload.message");
  }

  await gotoPage(page, composeUrl, "reddit", proxyLabel);
  try {
    await page.waitForSelector("compose-message-form", { timeout: submitTimeoutMs });
  } catch (cause) {
    const pageContext = await captureRedditPageContext(page);
    const blockReason = detectRedditBlockReason(pageContext);
    const reason = blockReason ?? "compose-message-form not visible";
    app.log.error({ pageContext }, "Reddit compose form did not render");
    throw new RetryableProxyError(
      reason,
      `Reddit DM compose page failed with ${reason}.`,
      cause
    );
  }
  const recipientField = await getShadowFieldHandle(
    page,
    'faceplate-text-input[name="message-recipient-input"]',
    'input[name="message-recipient-input"]'
  );
  const titleField = await getShadowFieldHandle(
    page,
    'faceplate-text-input[name="message-title"]',
    'input[name="message-title"]'
  );
  const messageField = await getShadowFieldHandle(
    page,
    'faceplate-textarea-input[name="message-content"]',
    'textarea[name="message-content"]'
  );

  await typeIntoField(recipientField, recipient);
  await typeIntoField(titleField, title);
  await typeIntoField(messageField, message);
  await pulseFieldValidation(recipientField, recipient);
  await pulseFieldValidation(titleField, title);
  await pulseFieldValidation(messageField, message);

  const typedState = await captureRedditComposeState(page);
  app.log.info({ typedState }, "Reddit DM compose state after shadow typing");

  try {
    await page.waitForFunction(
      (selector) => {
        const submit = document.querySelector(selector);
        return submit instanceof HTMLButtonElement && !submit.disabled;
      },
      submitSelector,
      { timeout: Math.min(3000, submitTimeoutMs) }
    );
  } catch {
    const result = await page.evaluate(
      ({ to, title, message }) => {
        const pulseField = (
          hostSelector: string,
          inputSelector: string,
          value: string
        ) => {
          const host = document.querySelector(hostSelector);
          if (!(host instanceof HTMLElement) || !host.shadowRoot) {
            return false;
          }

          const input = host.shadowRoot.querySelector(inputSelector);
          if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) {
            return false;
          }

          input.focus();
          input.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              composed: true,
              data: value,
              inputType: "insertText"
            })
          );
          input.dispatchEvent(
            new KeyboardEvent("keyup", {
              bubbles: true,
              composed: true,
              key: value.slice(-1) || " "
            })
          );
          input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
          input.blur();
          return input.value === value;
        };

        const okRecipient = pulseField(
          'faceplate-text-input[name="message-recipient-input"]',
          'input[name="message-recipient-input"]',
          to
        );
        const okTitle = pulseField(
          'faceplate-text-input[name="message-title"]',
          'input[name="message-title"]',
          title
        );
        const okMessage = pulseField(
          'faceplate-textarea-input[name="message-content"]',
          'textarea[name="message-content"]',
          message
        );

        return { okRecipient, okTitle, okMessage };
      },
      { to: recipient, title, message }
    );
    const reinforcedState = await captureRedditComposeState(page);
    app.log.info({ reinforcedState }, "Reddit DM compose state after fallback events");

    if (!result.okRecipient || !result.okTitle || !result.okMessage) {
      throw new Error(`Reddit DM shadow input reinforcement failed: ${JSON.stringify(result)}`);
    }
  }

  await page.waitForFunction(
    (selector) => {
      const submit = document.querySelector(selector);
      return submit instanceof HTMLButtonElement && !submit.disabled;
    },
    submitSelector,
    { timeout: submitTimeoutMs }
  ).catch(async (cause) => {
    const finalState = await captureRedditComposeState(page);
    app.log.error({ finalState }, "Reddit DM submit button stayed disabled");
    throw new RetryableProxyError(
      "submit button never enabled",
      "Reddit DM submit button never enabled.",
      cause
    );
  });
  await page.click(submitSelector);
}

async function executeStep(
  page: import("playwright").Page,
  step: z.infer<typeof stepSchema>,
  platform: string,
  proxyLabel?: string | null
) {
  switch (step.type) {
    case "goto":
      await gotoPage(page, step.url ?? "about:blank", platform, proxyLabel);
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

type SessionRunnerAction = z.infer<typeof actionSchema>;

function resolveViewport(sessionBundle: SessionRunnerAction["sessionBundle"]) {
  const viewportParts = sessionBundle.fingerprint.viewport.split("x").map(Number);
  return viewportParts.length === 2 && viewportParts.every((value) => Number.isFinite(value))
    ? { width: viewportParts[0], height: viewportParts[1] }
    : { width: 1440, height: 900 };
}

async function executeAttempt(
  input: SessionRunnerAction,
  proxyConfig: SessionRunnerAction["proxy"] | null
) {
  const proxy = proxyConfig ? parseRunnerProxy(proxyConfig) : null;
  app.log.info(
    {
      accountId: input.accountId,
      platform: input.platform,
      action: input.action,
      proxyLabel: proxy?.label ?? null,
      connectionMode: proxy ? "proxy" : "direct"
    },
    proxy ? "Executing session action with proxy" : "Executing session action without proxy"
  );

  const browser = await chromium.launch({
    headless: true,
    proxy: proxy
      ? {
          server: proxy.server,
          username: proxy.username,
          password: proxy.password
        }
      : undefined
  });

  try {
    const context = await browser.newContext({
      userAgent: input.sessionBundle.fingerprint.userAgent,
      locale: input.sessionBundle.fingerprint.locale,
      viewport: resolveViewport(input.sessionBundle)
    });

    await context.addCookies(
      input.sessionBundle.cookies.map((cookie) => ({
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
        localStorageEntries: input.sessionBundle.localStorage,
        sessionStorageEntries: input.sessionBundle.sessionStorage
      }
    );

    const page = await context.newPage();
    const steps = Array.isArray(input.payload.steps) ? input.payload.steps : [];
    if (steps.length > 0) {
      const targetUrl =
        (typeof input.payload.targetUrl === "string" && input.payload.targetUrl) ||
        (typeof input.payload.url === "string" && input.payload.url) ||
        defaultUrlForPlatform(input.platform);

      await gotoPage(page, targetUrl, input.platform);

      for (const rawStep of steps) {
        const step = stepSchema.parse(rawStep);
        await executeStep(page, step, input.platform, proxy?.label ?? null);
      }
    } else if (input.action === "send_dm" && input.platform === "reddit") {
      await executeRedditSendDm(page, input.payload, proxy?.label ?? null);
    } else {
      const targetUrl =
        (typeof input.payload.targetUrl === "string" && input.payload.targetUrl) ||
        (typeof input.payload.url === "string" && input.payload.url) ||
        defaultUrlForPlatform(input.platform);

      await gotoPage(page, targetUrl, input.platform, proxy?.label ?? null);

      const text =
        typeof input.payload.message === "string"
          ? input.payload.message
          : typeof input.payload.text === "string"
            ? input.payload.text
            : "";
      const composeSelector =
        typeof input.payload.composeSelector === "string" ? input.payload.composeSelector : undefined;
      const submitSelector =
        typeof input.payload.submitSelector === "string" ? input.payload.submitSelector : undefined;

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
        profileLoadedFrom: input.sessionBundle.profileObjectKey ? "encrypted-profile+bundle" : "encrypted-bundle",
        liveBrowserLifetime: "per-job",
        secretExposure: "none",
        action: input.action,
        finalUrl: page.url(),
        title: await page.title()
      }
    };
  } finally {
    await browser.close();
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

  try {
    return await executeAttempt(parsed.data, parsed.data.proxy ?? null);
  } catch (error) {
    if (isRetryableProxyError(error)) {
      app.log.warn(
        {
          accountId: parsed.data.accountId,
          platform: parsed.data.platform,
          action: parsed.data.action,
          proxyLabel: parsed.data.proxy?.label ?? null,
          reason: error.reason,
          detail: getErrorMessage(error.cause)
        },
        "Session runner returned retryable failure"
      );
      reply.code(409);
      return {
        error: error.message,
        retryable: true,
        reason: error.reason
      };
    }

    app.log.error(error);
    throw error;
  }
});

const port = Number(process.env.SESSION_RUNNER_PORT ?? 4200);
app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
