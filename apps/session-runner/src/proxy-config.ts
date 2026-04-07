export type RunnerProxyConfig = {
  id: string;
  label: string;
  raw: string;
};

export type ParsedRunnerProxy = {
  id: string;
  label: string;
  server: string;
  username?: string;
  password?: string;
};

function normalizeHost(host: string) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

export function parseRunnerProxy(proxy: RunnerProxyConfig): ParsedRunnerProxy {
  const value = proxy.raw.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    const parsed = new URL(value);
    return {
      id: proxy.id,
      label: proxy.label,
      server: `${parsed.protocol}//${parsed.host}`,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined
    };
  }

  const parts = value.split(":");
  if (parts.length < 4) {
    throw new Error(`Proxy ${proxy.label} must use URL form or IP:PORT:USER:PASS.`);
  }

  const password = parts.pop() ?? "";
  const username = parts.pop() ?? "";
  const port = parts.pop() ?? "";
  const host = parts.join(":");

  return {
    id: proxy.id,
    label: proxy.label,
    server: `http://${normalizeHost(host)}:${port}`,
    username,
    password
  };
}
