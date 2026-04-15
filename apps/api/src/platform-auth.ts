import { randomBytes } from "node:crypto";

type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type InstagramTokenResponse = {
  access_token: string;
  expires_in?: number;
  user_id?: number | string;
  permissions?: string[];
};

type InstagramProfileResponse = {
  id?: string;
  user_id?: number | string;
  username?: string;
  name?: string;
};

type ThreadsTokenResponse = {
  access_token: string;
  token_type?: string;
  user_id?: number | string;
};

type ThreadsProfileResponse = {
  id?: string;
  username?: string;
  name?: string;
};

type TikTokTokenResponse = {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
};

type GenericOauthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

const metaVersion = process.env.META_API_VERSION ?? "v23.0";
const threadsVersion = process.env.THREADS_API_VERSION ?? "v1.0";

type MetaPlatform = "facebook" | "instagram" | "threads";

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function getOauthRedirectBaseUrl(provider: string) {
  if (provider === "google") {
    return process.env.OAUTH_PUBLIC_URL ?? getAppUrl();
  }

  return getAppUrl();
}

function getMetaCredentialNames(platform: MetaPlatform) {
  if (platform === "facebook") {
    return {
      appId: ["META_FACEBOOK_APP_ID", "META_APP_ID"],
      appSecret: ["META_FACEBOOK_APP_SECRET", "META_APP_SECRET"]
    };
  }

  if (platform === "instagram") {
    return {
      appId: ["META_INSTAGRAM_APP_ID", "META_APP_ID"],
      appSecret: ["META_INSTAGRAM_APP_SECRET", "META_APP_SECRET"]
    };
  }

  return {
    appId: ["META_THREADS_APP_ID", "META_APP_ID"],
    appSecret: ["META_THREADS_APP_SECRET", "META_APP_SECRET"]
  };
}

function getMetaCredentialValue(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return null;
}

function requireMetaAppId(platform: MetaPlatform) {
  const credentialNames = getMetaCredentialNames(platform);
  const appId = getMetaCredentialValue(credentialNames.appId);
  if (!appId) {
    throw new Error(`${credentialNames.appId.join(" or ")} is not configured`);
  }

  return appId;
}

function requireMetaAppCredentials(platform: MetaPlatform) {
  const credentialNames = getMetaCredentialNames(platform);
  const appId = getMetaCredentialValue(credentialNames.appId);
  const appSecret = getMetaCredentialValue(credentialNames.appSecret);

  if (!appId || !appSecret) {
    throw new Error(
      `${credentialNames.appId.join(" or ")} and ${credentialNames.appSecret.join(" or ")} must be configured`
    );
  }

  return { appId, appSecret };
}

export function buildPlatformRedirectUri(platform: MetaPlatform) {
  return `${getAppUrl()}/api/oauth/${platform}/callback`;
}

export const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_metadata",
  "pages_messaging"
];

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_manage_comments",
  "instagram_business_manage_messages"
];

export const THREADS_SCOPES = [
  "threads_basic",
  "threads_content_publish",
  "threads_manage_replies",
  "threads_manage_insights"
];

export function buildFacebookAuthUrl() {
  requireMetaAppId("facebook");
  return new URL(`https://www.facebook.com/${metaVersion}/dialog/oauth`);
}

export function buildInstagramAuthUrl() {
  requireMetaAppId("instagram");
  return new URL("https://www.instagram.com/oauth/authorize");
}

export function buildThreadsAuthUrl() {
  requireMetaAppId("threads");
  return new URL("https://threads.net/oauth/authorize");
}

export function buildTikTokRedirectUri() {
  return `${getAppUrl()}/api/oauth/tiktok/callback`;
}

export function createOauthState() {
  return randomBytes(24).toString("hex");
}

export function buildTikTokAuthUrl() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    throw new Error("TIKTOK_CLIENT_KEY is not configured");
  }

  return new URL("https://www.tiktok.com/v2/auth/authorize/");
}

export function buildGenericRedirectUri(provider: string) {
  return `${getOauthRedirectBaseUrl(provider)}/api/oauth/${provider}/callback`;
}

export function buildXAuthUrl() {
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    throw new Error("X_CLIENT_ID is not configured");
  }

  return new URL("https://twitter.com/i/oauth2/authorize");
}

export function buildLinkedInAuthUrl() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    throw new Error("LINKEDIN_CLIENT_ID is not configured");
  }

  return new URL("https://www.linkedin.com/oauth/v2/authorization");
}

export function buildRedditAuthUrl() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  if (!clientId) {
    throw new Error("REDDIT_CLIENT_ID is not configured");
  }

  return new URL("https://www.reddit.com/api/v1/authorize");
}

export function buildPinterestAuthUrl() {
  const clientId = process.env.PINTEREST_APP_ID;
  if (!clientId) {
    throw new Error("PINTEREST_APP_ID is not configured");
  }

  return new URL("https://www.pinterest.com/oauth/");
}

export function buildGoogleAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  return new URL("https://accounts.google.com/o/oauth2/v2/auth");
}

export function buildPkceVerifier() {
  return randomBytes(32).toString("base64url");
}

export async function exchangeXCode(code: string, codeVerifier: string) {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("X app credentials are not configured");
  }

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: buildGenericRedirectUri("x"),
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function refreshXToken(refreshToken: string) {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("X app credentials are not configured");
  }

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      client_id: clientId
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function exchangeLinkedInCode(code: string) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn app credentials are not configured");
  }

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: buildGenericRedirectUri("linkedin")
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function exchangeRedditCode(code: string) {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Reddit app credentials are not configured");
  }

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: buildGenericRedirectUri("reddit")
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function refreshRedditToken(refreshToken: string) {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Reddit app credentials are not configured");
  }

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function exchangePinterestCode(code: string) {
  const clientId = process.env.PINTEREST_APP_ID;
  const clientSecret = process.env.PINTEREST_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Pinterest app credentials are not configured");
  }

  const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: buildGenericRedirectUri("pinterest"),
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function refreshPinterestToken(refreshToken: string) {
  const clientId = process.env.PINTEREST_APP_ID;
  const clientSecret = process.env.PINTEREST_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Pinterest app credentials are not configured");
  }

  const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function exchangeGoogleCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google app credentials are not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: buildGenericRedirectUri("google"),
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function refreshGoogleToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google app credentials are not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as GenericOauthTokenResponse;
}

export async function fetchLinkedInProfile(accessToken: string) {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ sub?: string; name?: string; email?: string }>;
}

export async function fetchRedditMe(accessToken: string) {
  const response = await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "content-empire/0.1.0"
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ name?: string; id?: string }>;
}

export async function fetchPinterestMe(accessToken: string) {
  const response = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ username?: string; account_type?: string }>;
}

export async function fetchGoogleChannel(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ items?: Array<{ id?: string; snippet?: { title?: string } }> }>;
}

export async function exchangeFacebookCode(code: string) {
  const { appId, appSecret } = requireMetaAppCredentials("facebook");
  const url = new URL(`https://graph.facebook.com/${metaVersion}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", buildPlatformRedirectUri("facebook"));
  url.searchParams.set("code", code);

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as MetaTokenResponse;
}

export async function exchangeFacebookLongLivedToken(accessToken: string) {
  const { appId, appSecret } = requireMetaAppCredentials("facebook");
  const url = new URL(`https://graph.facebook.com/${metaVersion}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", accessToken);

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as MetaTokenResponse;
}

export async function fetchMetaBusinessContext(accessToken: string) {
  const pagesUrl = new URL(`https://graph.facebook.com/${metaVersion}/me/accounts`);
  pagesUrl.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}"
  );
  pagesUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(pagesUrl, { method: "GET" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const json = (await response.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token?: string;
      instagram_business_account?: { id: string; username?: string };
      connected_instagram_account?: { id: string; username?: string };
    }>;
  };

  return json.data ?? [];
}

export async function exchangeInstagramCode(code: string) {
  const { appId, appSecret } = requireMetaAppCredentials("instagram");
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: buildPlatformRedirectUri("instagram"),
      code
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as InstagramTokenResponse;
}

export async function refreshInstagramToken(accessToken: string) {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as MetaTokenResponse;
}

export async function fetchInstagramProfile(accessToken: string) {
  const url = new URL(`https://graph.instagram.com/${metaVersion}/me`);
  url.searchParams.set("fields", "id,user_id,username,name");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as InstagramProfileResponse;
}

export async function exchangeThreadsCode(code: string) {
  const { appId, appSecret } = requireMetaAppCredentials("threads");
  const response = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: buildPlatformRedirectUri("threads"),
      code
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as ThreadsTokenResponse;
}

export async function fetchThreadsProfile(accessToken: string, userId?: string) {
  const objectId = userId && userId.length > 0 ? userId : "me";
  const url = new URL(`https://graph.threads.net/${threadsVersion}/${objectId}`);
  url.searchParams.set("fields", "id,username,name");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as ThreadsProfileResponse;
}

export async function exchangeTikTokCode(code: string) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error("TikTok app credentials are not configured");
  }

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: buildTikTokRedirectUri()
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as TikTokTokenResponse;
}

export async function refreshTikTokToken(refreshToken: string) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error("TikTok app credentials are not configured");
  }

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as TikTokTokenResponse;
}

export async function fetchTikTokCreatorInfo(accessToken: string) {
  const response = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as {
    data?: {
      user?: {
        open_id?: string;
        display_name?: string;
      };
    };
  };
}
