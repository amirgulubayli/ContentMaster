import { getPlatformProfile } from "@content-empire/connectors";
import Link from "next/link";
import { certifyAccountAction } from "../actions";
import { DashboardShell } from "../../components/dashboard-shell";
import { getAccounts } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await getAccounts();

  return (
    <DashboardShell
      title="Accounts"
      description="Per-account connector mode, setup state, certified features, automation level, and OpenClaw access."
    >
      <section className="panel">
        {accounts.length === 0 ? (
          <p className="empty-state">No accounts yet. Create your first one in `Connect`.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Auth path</th>
                  <th>Certified features</th>
                  <th>Automation</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const profile = getPlatformProfile(account.platform);

                  return (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.displayName}</strong>
                        <div className="cell-note">
                          {account.projectName} | {account.handle}
                        </div>
                        <div className="cell-note">
                          <Link href={`/accounts/${account.id}`} prefetch={false}>
                            Open setup
                          </Link>
                        </div>
                      </td>
                      <td>
                        <strong>{account.connectorMode}</strong>
                        <div className="cell-note">
                          Session required: {account.sessionRequired ? "yes" : "no"}
                        </div>
                        <div className="cell-note">
                          Execution: {profile.liveExecutionImplemented ? "live" : "scaffolded"}
                        </div>
                      </td>
                      <td>
                        <div className="feature-stack">
                          {account.features.map((feature) => (
                            <span className="feature-pill" key={feature}>
                              {feature}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${account.sessionHealth}`}>
                          {account.automationMode}
                        </span>
                        <div className="cell-note">{account.authStatus}</div>
                      </td>
                      <td>{profile.notes}</td>
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
          <h2>Certify account</h2>
          <p>Run the connector certification flow before enabling unattended automation.</p>
        </header>
        {accounts.length === 0 ? (
          <p className="empty-state">Add an account first, then you can certify it here.</p>
        ) : (
          <form action={certifyAccountAction} className="inline-form">
            <select name="accountId" required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName}
                </option>
              ))}
            </select>
            <button type="submit">Run certification</button>
          </form>
        )}
      </section>
    </DashboardShell>
  );
}
