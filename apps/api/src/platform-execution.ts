type MetaPublishPayload = {
  pageId?: string;
  instagramBusinessId?: string;
  caption?: string;
  message?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | "REELS";
  commentId?: string;
  recipientId?: string;
  metrics?: string[];
};

type TikTokPublishPayload = {
  postMode?: "DIRECT_POST" | "MEDIA_UPLOAD";
  postInfo?: Record<string, unknown>;
  sourceInfo?: Record<string, unknown>;
};

type GenericTextPayload = {
  text?: string;
  title?: string;
  url?: string;
  community?: string;
  message?: string;
  imageUrl?: string;
  videoUrl?: string;
  parentId?: string;
  postId?: string;
  commentId?: string;
  boardId?: string;
  mediaSource?: Record<string, unknown>;
};

const metaVersion = process.env.META_API_VERSION ?? "v23.0";

async function postGraph(path: string, accessToken: string, body: URLSearchParams) {
  const response = await fetch(`https://graph.facebook.com/${metaVersion}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function getGraph(path: string, accessToken: string, params?: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${metaVersion}/${path}`);
  url.searchParams.set("access_token", accessToken);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function publishFacebookContent(accessToken: string, payload: MetaPublishPayload) {
  if (!payload.pageId) {
    throw new Error("pageId is required for Facebook publishing.");
  }

  if (payload.videoUrl) {
    return postGraph(
      `${payload.pageId}/videos`,
      accessToken,
      new URLSearchParams({
        access_token: accessToken,
        file_url: payload.videoUrl,
        description: payload.caption ?? payload.message ?? ""
      })
    );
  }

  if (payload.imageUrl) {
    return postGraph(
      `${payload.pageId}/photos`,
      accessToken,
      new URLSearchParams({
        access_token: accessToken,
        url: payload.imageUrl,
        caption: payload.caption ?? payload.message ?? ""
      })
    );
  }

  return postGraph(
    `${payload.pageId}/feed`,
    accessToken,
    new URLSearchParams({
      access_token: accessToken,
      message: payload.message ?? payload.caption ?? ""
    })
  );
}

export async function publishInstagramContent(accessToken: string, payload: MetaPublishPayload) {
  if (!payload.instagramBusinessId) {
    throw new Error("instagramBusinessId is required for Instagram publishing.");
  }

  const mediaParams = new URLSearchParams({
    access_token: accessToken,
    caption: payload.caption ?? ""
  });

  if (payload.videoUrl) {
    mediaParams.set("media_type", payload.mediaType ?? "REELS");
    mediaParams.set("video_url", payload.videoUrl);
  } else if (payload.imageUrl) {
    mediaParams.set("image_url", payload.imageUrl);
  } else {
    throw new Error("Instagram publishing requires imageUrl or videoUrl.");
  }

  const container = (await postGraph(`${payload.instagramBusinessId}/media`, accessToken, mediaParams)) as {
    id: string;
  };

  return postGraph(
    `${payload.instagramBusinessId}/media_publish`,
    accessToken,
    new URLSearchParams({
      access_token: accessToken,
      creation_id: container.id
    })
  );
}

export async function replyMetaComment(accessToken: string, commentId: string, message: string) {
  return postGraph(
    `${commentId}/replies`,
    accessToken,
    new URLSearchParams({
      access_token: accessToken,
      message
    })
  );
}

export async function sendMetaDm(accessToken: string, recipientId: string, message: string) {
  return postGraph(
    "me/messages",
    accessToken,
    new URLSearchParams({
      access_token: accessToken,
      messaging_type: "RESPONSE",
      recipient: JSON.stringify({ id: recipientId }),
      message: JSON.stringify({ text: message })
    })
  );
}

export async function fetchMetaMetrics(accessToken: string, objectId: string, metrics: string[]) {
  return getGraph(`${objectId}/insights`, accessToken, {
    metric: metrics.join(",")
  });
}

export async function publishTikTokContent(accessToken: string, payload: TikTokPublishPayload) {
  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({
      post_info: payload.postInfo ?? {
        title: "Content Empire post",
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000
      },
      source_info: payload.sourceInfo ?? {
        source: "PULL_FROM_URL",
        video_url: ""
      },
      post_mode: payload.postMode ?? "DIRECT_POST"
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function fetchTikTokCreatorAnalytics(accessToken: string) {
  const response = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      max_count: 20
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function publishXPost(accessToken: string, payload: GenericTextPayload) {
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: payload.text ?? payload.message ?? ""
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function fetchXMetrics(accessToken: string, postId: string) {
  const response = await fetch(`https://api.x.com/2/tweets/${postId}?tweet.fields=public_metrics`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function publishLinkedInPost(accessToken: string, author: string, payload: GenericTextPayload) {
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202504",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify({
      author,
      commentary: payload.text ?? payload.message ?? "",
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function publishRedditPost(accessToken: string, payload: GenericTextPayload) {
  const response = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "content-empire/0.1.0"
    },
    body: new URLSearchParams({
      api_type: "json",
      sr: payload.community ?? "",
      kind: payload.url ? "link" : "self",
      title: payload.title ?? payload.text ?? payload.message ?? "Content Empire post",
      text: payload.text ?? payload.message ?? "",
      url: payload.url ?? ""
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function replyRedditComment(accessToken: string, parentId: string, text: string) {
  const response = await fetch("https://oauth.reddit.com/api/comment", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "content-empire/0.1.0"
    },
    body: new URLSearchParams({
      api_type: "json",
      parent: parentId,
      text
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function fetchRedditInbox(accessToken: string) {
  const response = await fetch("https://oauth.reddit.com/message/inbox", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "content-empire/0.1.0"
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function createBlueskySession(identifier: string, appPassword: string) {
  const response = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier,
      password: appPassword
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    accessJwt: string;
    refreshJwt: string;
    did: string;
    handle: string;
  }>;
}

export async function publishBlueskyPost(accessJwt: string, repo: string, payload: GenericTextPayload) {
  const response = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      repo,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: payload.text ?? payload.message ?? "",
        createdAt: new Date().toISOString()
      }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function publishPinterestPin(accessToken: string, payload: GenericTextPayload) {
  const response = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      board_id: payload.boardId,
      title: payload.title ?? payload.text ?? "Content Empire pin",
      description: payload.message ?? payload.text ?? "",
      link: payload.url,
      media_source: payload.mediaSource ?? {
        source_type: "image_url",
        url: payload.imageUrl
      }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function fetchPinterestAnalytics(accessToken: string, pinId: string) {
  const response = await fetch(`https://api.pinterest.com/v5/pins/${pinId}/analytics`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function uploadYoutubeVideo(accessToken: string, payload: GenericTextPayload) {
  const response = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/*"
    },
    body: JSON.stringify({
      snippet: {
        title: payload.title ?? "Content Empire upload",
        description: payload.text ?? payload.message ?? ""
      },
      status: {
        privacyStatus: "private"
      }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return {
    uploadUrl: response.headers.get("location")
  };
}

export async function replyYoutubeComment(accessToken: string, parentId: string, text: string) {
  const response = await fetch("https://www.googleapis.com/youtube/v3/comments?part=snippet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      snippet: {
        parentId,
        textOriginal: text
      }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function fetchYoutubeAnalytics(accessToken: string, channelId: string) {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channelId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
