import { captureSessionAction } from "../actions";
import { DashboardShell } from "../../components/dashboard-shell";
import { getAccounts, getSessionVault } from "../../lib/api";

export const dynamic = "force-dynamic";

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
          <p className="empty-state">No session-backed accounts yet. Accounts that need cookie/session capture will appear here.</p>
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
                      </td>
                      <td>
                        <div className="feature-stack">
                          <span className="feature-pill">cookies</span>
                          <span className="feature-pill">localStorage</span>
                          <span className="feature-pill">csrf</span>
                          {bundle?.storageMode.includes("profile") ? (
                            <span className="feature-pill">encrypted profile</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{bundle?.storageMode ?? "bundle only"}</td>
                      <td>
                        <span className={`badge badge-${account.sessionHealth}`}>
                          {account.sessionHealth}
                        </span>
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
      <section className="panel">
        <header className="panel-header">
          <h2>Capture or refresh session</h2>
          <p>Store a new encrypted session bundle or browser profile for a session-backed account.</p>
        </header>
        {sessionAccounts.length === 0 ? (
          <p className="empty-state">Create an account that uses session or hybrid auth, then capture its session here.</p>
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
      </section>
    </DashboardShell>
  );
}
