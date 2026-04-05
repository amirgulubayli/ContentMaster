import { randomBytes } from "node:crypto";

type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
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

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function buildMetaRedirectUri() {
  return `${getAppUrl()}/api/oauth/meta/callback`;
}

export function buildTikTokRedirectUri() {
  return `${getAppUrl()}/api/oauth/tiktok/callback`;
}

export function createOauthState() {
  return randomBytes(24).toString("hex");
}

export function buildMetaAuthUrl() {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    throw new Error("META_APP_ID is not configured");
  }

  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_metadata",
    "pages_messaging",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_messages",
    "business_management"
  ];

  return new URL(`https://www.facebook.com/${metaVersion}/dialog/oauth`);
}

export function buildTikTokAuthUrl() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    throw new Error("TIKTOK_CLIENT_KEY is not configured");
  }

  return new URL("https://www.tiktok.com/v2/auth/authorize/");
}

export function buildGenericRedirectUri(provider: string) {
  return `${getAppUrl()}/api/oauth/${provider}/callback`;
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

export async function exchangeMetaCode(code: string) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Meta app credentials are not configured");
  }

  const url = new URL(`https://graph.facebook.com/${metaVersion}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", buildMetaRedirectUri());
  url.searchParams.set("code", code);

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as MetaTokenResponse;
}

export async function exchangeMetaLongLivedToken(accessToken: string) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Meta app credentials are not configured");
  }

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
