import {
  deleteProxyAction,
  rotateProxyAssignmentAction,
  upsertProxyAction
} from "../actions";
import { DashboardShell } from "../../components/dashboard-shell";
import { getAccounts, getProxies } from "../../lib/api";

export const dynamic = "force-dynamic";

const platformList = [
  "x",
  "linkedin",
  "medium",
  "substack",
  "quora",
  "reddit",
  "bluesky",
  "pinterest",
  "facebook",
  "instagram",
  "tiktok",
  "youtube"
];

const proxyExample = "http://user:pass@203.0.113.20:8080";

export default async function ProxiesPage() {
  const [proxySnapshot, accounts] = await Promise.all([getProxies(), getAccounts()]);
  const accountMap = new Map(accounts.map((account) => [account.id, account.displayName]));
  const enabledCount = proxySnapshot.proxies.filter((proxy) => proxy.enabled).length;

  return (
    <DashboardShell
      title="Proxies"
      description="Global proxy pool for provider API traffic and session-backed browser execution, with sticky assignment and one-step failover."
    >
      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Pool status</h2>
            <p>All enabled proxies are available to the app. Empty platform targets means the proxy can be used anywhere.</p>
          </header>
          <div className="stack-column">
            <article className="platform-card">
              <strong>{enabledCount} enabled proxies</strong>
              <span>{proxySnapshot.proxies.length} total records</span>
              <p>{proxySnapshot.assignments.length} sticky assignments are currently tracked across accounts and outbound hosts.</p>
            </article>
            <article className="platform-card">
              <strong>Rotation policy</strong>
              <span>Automatic</span>
              <p>Browser jobs rotate on retryable render or block failures. API fetches rotate on proxy/network failures and retry once.</p>
            </article>
          </div>
        </article>

        <article className="panel">
          <header className="panel-header">
            <h2>Add proxy</h2>
            <p>Store a proxy once, then let the app assign and rotate it automatically.</p>
          </header>
          <form action={upsertProxyAction} className="stack-form">
            <div className="grid-form">
              <label className="field-block">
                <span>Label</span>
                <input name="label" placeholder="US Residential 01" required />
              </label>
              <label className="field-block">
                <span>Provider</span>
                <input name="provider" placeholder="NetNut" />
              </label>
            </div>
            <label className="field-block">
              <span>Proxy string</span>
              <input name="raw" placeholder={proxyExample} required />
              <small>Supported: `http://user:pass@ip:port`, `socks5://user:pass@ip:port`, or `IP:PORT:USER:PASS`.</small>
            </label>
            <div className="grid-form">
              <label className="field-block">
                <span>Country code</span>
                <input name="countryCode" placeholder="US" />
              </label>
              <label className="field-block">
                <span>Platform targets</span>
                <input name="platformTargets" placeholder="reddit, x, instagram" />
                <small>Leave blank for all traffic.</small>
              </label>
            </div>
            <label className="check-row">
              <input type="checkbox" name="enabled" defaultChecked />
              Enable this proxy immediately
            </label>
            <label className="field-block">
              <span>Notes</span>
              <textarea name="notes" rows={3} placeholder="Static residential IPv6 pool, low-latency US exits." />
            </label>
            <button type="submit">Save proxy</button>
          </form>
        </article>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Managed proxies</h2>
          <p>Edit, disable, or remove existing pool entries. Platform targets must use these keys: {platformList.join(", ")}.</p>
        </header>
        {proxySnapshot.proxies.length === 0 ? (
          <p className="empty-state">No proxies configured yet.</p>
        ) : (
          <div className="platform-cards">
            {proxySnapshot.proxies.map((proxy) => (
              <article className="platform-card" key={proxy.id}>
                <strong>{proxy.label}</strong>
                <span>{proxy.enabled ? "enabled" : "disabled"}</span>
                <p>Provider: {proxy.provider || "not set"}</p>
                <p>Country: {proxy.countryCode || "n/a"}</p>
                <p>Targets: {proxy.platformTargets.length > 0 ? proxy.platformTargets.join(", ") : "all"}</p>
                <p>Success: {proxy.successCount} | Failures: {proxy.failureCount} | Streak: {proxy.consecutiveFailures}</p>
                <p>Last error: {proxy.lastError ?? "none"}</p>
                <form action={upsertProxyAction} className="stack-form">
                  <input type="hidden" name="proxyId" value={proxy.id} />
                  <div className="grid-form">
                    <label className="field-block">
                      <span>Label</span>
                      <input name="label" defaultValue={proxy.label} required />
                    </label>
                    <label className="field-block">
                      <span>Provider</span>
                      <input name="provider" defaultValue={proxy.provider} />
                    </label>
                  </div>
                  <label className="field-block">
                    <span>Proxy string</span>
                    <input name="raw" defaultValue={proxy.raw} required />
                  </label>
                  <div className="grid-form">
                    <label className="field-block">
                      <span>Country code</span>
                      <input name="countryCode" defaultValue={proxy.countryCode} />
                    </label>
                    <label className="field-block">
                      <span>Platform targets</span>
                      <input name="platformTargets" defaultValue={proxy.platformTargets.join(", ")} />
                    </label>
                  </div>
                  <label className="check-row">
                    <input type="checkbox" name="enabled" defaultChecked={proxy.enabled} />
                    Enabled
                  </label>
                  <label className="field-block">
                    <span>Notes</span>
                    <textarea name="notes" rows={3} defaultValue={proxy.notes} />
                  </label>
                  <div className="inline-form">
                    <button type="submit">Update proxy</button>
                  </div>
                </form>
                <form action={deleteProxyAction} className="inline-form">
                  <input type="hidden" name="proxyId" value={proxy.id} />
                  <button type="submit">Delete proxy</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Sticky assignments</h2>
          <p>Account assignments keep browser identity stable. Host assignments keep provider API traffic consistent until rotation is needed.</p>
        </header>
        {proxySnapshot.assignments.length === 0 ? (
          <p className="empty-state">No sticky assignments have been created yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Target</th>
                  <th>Platform</th>
                  <th>Proxy</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {proxySnapshot.assignments.map((assignment) => (
                  <tr key={assignment.key}>
                    <td>{assignment.scope}</td>
                    <td>
                      {assignment.scope === "account"
                        ? accountMap.get(assignment.target) ?? assignment.target
                        : assignment.target}
                    </td>
                    <td>{assignment.platformHint ?? "all"}</td>
                    <td>{assignment.proxyLabel ?? assignment.proxyId}</td>
                    <td>{assignment.updatedAt}</td>
                    <td>
                      <form action={rotateProxyAssignmentAction} className="inline-form">
                        <input type="hidden" name="key" value={assignment.key} />
                        <button type="submit">Rotate now</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
