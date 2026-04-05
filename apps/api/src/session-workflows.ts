type SessionAction =
  | "publish_post"
  | "edit_post"
  | "reply_comment"
  | "send_dm"
  | "engage"
  | "refresh_session";

type SessionStep = {
  type: "goto" | "click" | "fill" | "press" | "wait_for_selector" | "wait_for_timeout";
  selector?: string;
  value?: string;
  url?: string;
  timeoutMs?: number;
};

type WorkflowConfig = {
  targetUrl?: string;
  composeSelector?: string;
  submitSelector?: string;
  editSelector?: string;
  saveSelector?: string;
  commentSelector?: string;
  dmSelector?: string;
  engageSelector?: string;
  bodySelector?: string;
};

const defaults: Record<
  string,
  Partial<Record<SessionAction, WorkflowConfig>>
> = {
  medium: {
    publish_post: {
      targetUrl: "https://medium.com/new-story",
      composeSelector: "h1[contenteditable='true']",
      bodySelector: "article [contenteditable='true']",
      submitSelector: "button[title='Publish']"
    },
    edit_post: {
      editSelector: "button[title='More']",
      bodySelector: "article [contenteditable='true']",
      saveSelector: "button[title='Save']"
    },
    reply_comment: {
      commentSelector: "textarea, [contenteditable='true']",
      submitSelector: "button[type='submit']"
    }
  },
  substack: {
    publish_post: {
      targetUrl: "https://substack.com/home",
      composeSelector: "[contenteditable='true']",
      bodySelector: ".ProseMirror",
      submitSelector: "button"
    },
    edit_post: {
      bodySelector: ".ProseMirror",
      saveSelector: "button"
    },
    reply_comment: {
      commentSelector: "textarea",
      submitSelector: "button"
    }
  },
  quora: {
    publish_post: {
      targetUrl: "https://www.quora.com/",
      composeSelector: "[contenteditable='true']",
      submitSelector: "button"
    },
    edit_post: {
      bodySelector: "[contenteditable='true']",
      saveSelector: "button"
    },
    reply_comment: {
      commentSelector: "[contenteditable='true']",
      submitSelector: "button"
    },
    send_dm: {
      dmSelector: "[contenteditable='true']",
      submitSelector: "button"
    }
  },
  instagram: {
    publish_post: {
      targetUrl: "https://www.instagram.com/",
      composeSelector: "textarea, [contenteditable='true']",
      submitSelector: "button"
    },
    reply_comment: {
      commentSelector: "textarea, [contenteditable='true']",
      submitSelector: "button"
    },
    send_dm: {
      dmSelector: "textarea, [contenteditable='true']",
      submitSelector: "button"
    },
    engage: {
      engageSelector: "svg[aria-label='Like']"
    }
  },
  facebook: {
    publish_post: {
      targetUrl: "https://www.facebook.com/",
      composeSelector: "[contenteditable='true']",
      submitSelector: "div[aria-label='Post'], button"
    },
    reply_comment: {
      commentSelector: "[contenteditable='true']",
      submitSelector: "button"
    },
    send_dm: {
      dmSelector: "[contenteditable='true']",
      submitSelector: "button"
    },
    engage: {
      engageSelector: "div[aria-label='Like'], button"
    }
  },
  tiktok: {
    publish_post: {
      targetUrl: "https://www.tiktok.com/upload",
      composeSelector: "textarea",
      submitSelector: "button"
    },
    reply_comment: {
      commentSelector: "textarea",
      submitSelector: "button"
    },
    send_dm: {
      dmSelector: "textarea",
      submitSelector: "button"
    },
    engage: {
      engageSelector: "button"
    }
  },
  reddit: {
    publish_post: {
      targetUrl: "https://www.reddit.com/submit",
      composeSelector: "textarea",
      submitSelector: "button"
    },
    reply_comment: {
      commentSelector: "textarea",
      submitSelector: "button"
    },
    send_dm: {
      targetUrl: "https://www.reddit.com/message/compose/",
      composeSelector: "textarea",
      submitSelector: "button"
    }
  },
  pinterest: {
    publish_post: {
      targetUrl: "https://www.pinterest.com/pin-builder/",
      composeSelector: "textarea, input",
      submitSelector: "button"
    }
  }
};

function parseOverrides(raw: string | undefined): Partial<Record<SessionAction, WorkflowConfig>> {
  if (!raw?.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as Partial<Record<SessionAction, WorkflowConfig>>;
  } catch {
    return {};
  }
}

export function buildSessionWorkflow(
  platform: string,
  action: SessionAction,
  payload: Record<string, unknown>,
  sessionConfig: Record<string, string>
) {
  const base = defaults[platform]?.[action] ?? {};
  const overrides = parseOverrides(sessionConfig.workflowOverridesJson)?.[action] ?? {};
  const config = {
    ...base,
    ...overrides
  };

  const text =
    typeof payload.message === "string"
      ? payload.message
      : typeof payload.text === "string"
        ? payload.text
        : "";

  const targetUrl =
    (typeof payload.targetUrl === "string" && payload.targetUrl) ||
    (typeof payload.url === "string" && payload.url) ||
    config.targetUrl;

  const steps: SessionStep[] = [];
  if (targetUrl) {
    steps.push({ type: "goto", url: targetUrl });
  }

  if (action === "publish_post") {
    if (config.composeSelector && text) {
      steps.push({ type: "fill", selector: config.composeSelector, value: text });
    }
    if (config.bodySelector && typeof payload.body === "string") {
      steps.push({ type: "fill", selector: config.bodySelector, value: payload.body });
    }
    if (config.submitSelector) {
      steps.push({ type: "click", selector: config.submitSelector });
    }
  }

  if (action === "edit_post") {
    if (config.editSelector) {
      steps.push({ type: "click", selector: config.editSelector });
    }
    if (config.bodySelector && text) {
      steps.push({ type: "fill", selector: config.bodySelector, value: text });
    }
    if (config.saveSelector) {
      steps.push({ type: "click", selector: config.saveSelector });
    }
  }

  if (action === "reply_comment") {
    if (config.commentSelector && text) {
      steps.push({ type: "fill", selector: config.commentSelector, value: text });
    }
    if (config.submitSelector) {
      steps.push({ type: "click", selector: config.submitSelector });
    }
  }

  if (action === "send_dm") {
    if (config.dmSelector && text) {
      steps.push({ type: "fill", selector: config.dmSelector, value: text });
    }
    if (config.submitSelector) {
      steps.push({ type: "click", selector: config.submitSelector });
    }
  }

  if (action === "engage" && config.engageSelector) {
    steps.push({ type: "click", selector: config.engageSelector });
  }

  if (action === "refresh_session") {
    steps.push({ type: "wait_for_timeout", timeoutMs: 1500 });
  }

  return {
    targetUrl,
    steps
  };
}
