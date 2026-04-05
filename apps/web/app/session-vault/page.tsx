import Link from "next/link";
import { captureSessionAction, importSessionBundleAction } from "../actions";
import { DashboardShell } from "../../components/dashboard-shell";
import { getAccounts, getSessionVault } from "../../lib/api";
import { platformGuides } from "../../lib/platform-guides";

export const dynamic = "force-dynamic";

const exampleBundle = `{
  "cookies": [
    {
      "name": "sessionid",
      "value": "redacted",
      "domain": ".example.com",
      "path": "/",
      "secure": true,
      "httpOnly": true
    }
  ],
  "localStorage": {},
  "sessionStorage": {},
  "csrfTokens": {},
  "fingerprint": {
    "userAgent": "Mozilla/5.0",
    "viewport": "1440x900",
    "locale": "en-GB"
  },
  "profileObjectKey": null
}`;

export default async function SessionVaultPage() {
  const [accounts, sessionVault] = await Promise.all([getAccounts(), getSessionVault()]);
  const sessionAccounts = accounts.filter((account) => account.sessionRequired);

  return (
    <DashboardShell
      title="Session Vault"
      description="Encrypted cookie/session bundles, versioned browser profiles, and health state for every session-backed account."
    >
      <section className="panel">
        {sessionAccounts.length === 0 ? (
          <p className="empty-state">
            No session-backed accounts yet. Accounts that need cookie/session capture will appear here.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Bundle makeup</th>
                  <th>Storage</th>
                  <th>Health</th>
                  <th>Use cases</th>
                </tr>
              </thead>
              <tbody>
                {sessionAccounts.map((account) => {
                  const bundle = sessionVault.find((item) => item.accountId === account.id);
                  return (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.displayName}</strong>
                        <div className="cell-note">{account.platform}</div>
                        <div className="cell-note">
                          <Link href={`/accounts/${account.id}`} prefetch={false}>
                            Open setup
                          </Link>
                        </div>
                      </td>
                      <td>
                        <div className="feature-stack">
                          <span className="feature-pill">{bundle?.cookieCount ?? 0} cookies</span>
                          <span className="feature-pill">{bundle?.localStorageCount ?? 0} localStorage</span>
                          <span className="feature-pill">csrf</span>
                          {bundle?.storageMode.includes("profile") ? (
                            <span className="feature-pill">encrypted profile</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {bundle?.storageMode ?? "bundle only"}
                        <div className="cell-note">Source: {bundle?.source ?? "none"}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${account.sessionHealth}`}>{account.sessionHealth}</span>
                      </td>
                      <td>{account.features.join(", ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Capture or refresh session</h2>
            <p>Store a new encrypted session bundle or browser profile for a session-backed account.</p>
          </header>
          {sessionAccounts.length === 0 ? (
            <p className="empty-state">
              Create an account that uses session or hybrid auth, then capture its session here.
            </p>
          ) : (
            <form action={captureSessionAction} className="grid-form">
              <select name="accountId" required>
                {sessionAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName}
                  </option>
                ))}
              </select>
              <select name="mode" required>
                <option value="cookies_only">cookies_only</option>
                <option value="bundle">bundle</option>
                <option value="profile">profile</option>
              </select>
              <input name="notes" placeholder="Notes for this capture" />
              <button type="submit">Capture session</button>
            </form>
          )}
        </article>

        <article className="panel">
          <header className="panel-header">
            <h2>Import session bundle</h2>
            <p>
              Upload or paste a real cookie/session bundle. The bundle is validated and encrypted before it is stored.
            </p>
          </header>
          {sessionAccounts.length === 0 ? (
            <p className="empty-state">
              Create a session-backed account first, then import its cookies or browser-state bundle here.
            </p>
          ) : (
            <form action={importSessionBundleAction} className="stack-form">
              <div className="grid-form">
                <select name="accountId" required>
                  {sessionAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.displayName}
                    </option>
                  ))}
                </select>
                <select name="mode" required defaultValue="bundle">
                  <option value="cookies_only">cookies_only</option>
                  <option value="bundle">bundle</option>
                  <option value="profile">profile</option>
                </select>
              </div>
              <label className="field-block">
                <span>Upload JSON file</span>
                <input type="file" name="bundleFile" accept=".json,application/json" />
                <small>Use this if you exported the browser state to a JSON file.</small>
              </label>
              <label className="field-block">
                <span>Or paste JSON bundle</span>
                <textarea name="bundleJson" rows={14} placeholder={exampleBundle} />
                <small>
                  The JSON must include `cookies`, `localStorage`, `sessionStorage`, `csrfTokens`, `fingerprint`, and
                  `profileObjectKey`.
                </small>
              </label>
              <input name="notes" placeholder="Notes for this import" />
              <button type="submit">Import encrypted bundle</button>
            </form>
          )}
        </article>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Cookie and app-password help</h2>
          <p>Use these operator notes when deciding whether to import cookies or gather official credentials.</p>
        </header>
        <div className="platform-cards">
          {sessionAccounts.map((account) => {
            const guide = platformGuides[account.platform];
            return (
              <article className="platform-card" key={`guide-${account.id}`}>
                <strong>{account.displayName}</strong>
                <span>{account.platform}</span>
                <p>Recommended mode: {guide.recommendedMode}</p>
                <p>{guide.currentPriority}</p>
                {guide.cookieGuide?.length ? <p>{guide.cookieGuide[0]}</p> : <p>No cookie guidance needed for this account.</p>}
                <p>
                  <Link href={`/accounts/${account.id}`} prefetch={false}>
                    Open full setup instructions
                  </Link>
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </DashboardShell>
  );
}
