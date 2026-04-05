import { getPlatformProfile } from "@content-empire/connectors";
import { DashboardShell } from "../components/dashboard-shell";
import { getAccounts, getAlerts, getAudit, getQueue } from "../lib/api";
import { logoutAction } from "./login/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [accounts, alerts, queue, audit] = await Promise.all([
    getAccounts(),
    getAlerts(),
    getQueue(),
    getAudit()
  ]);

  const stats = [
    {
      label: "Connected accounts",
      value: `${accounts.length}`,
      detail: "Across API, session, and hybrid connector modes."
    },
    {
      label: "Session-backed accounts",
      value: `${accounts.filter((account) => account.sessionRequired).length}`,
      detail: "Encrypted vault records with certified features."
    },
    {
      label: "OpenClaw authority",
      value: "Full",
      detail: "Machine token can control publishing, edits, comments, DMs, analytics, and session refresh."
    }
  ];

  return (
    <DashboardShell
      title="Overview"
      description="Private command center for account setup, session-backed automation, content operations, and OpenClaw control."
    >
      <section className="hero">
        <div className="hero-copy">
          <form action={logoutAction} className="logout-row">
            <button className="ghost-button" type="submit">
              Logout
            </button>
          </form>
          <p className="eyebrow">Private Operations Network</p>
          <h1>Content Empire Control</h1>
          <p className="lede">
            One internal surface for project oversight, one internal API for OpenClaw, and one
            hardened session vault for every cookie-backed workflow that cannot be handled through
            official platform APIs.
          </p>
        </div>
        <div className="hero-panel">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Operator workflow</h2>
            <p>You connect accounts, certify features, and retain kill switches.</p>
          </header>
          <ol className="ordered-list">
            <li>Create a project and set its voice, media policy, and automation ceiling.</li>
            <li>Connect each account through OAuth, app-password, or controlled session capture.</li>
            <li>Certify publish, edit, comment, inbox, DM, and analytics capabilities.</li>
            <li>Choose `manual_review`, `assisted_auto`, or `full_auto` per account.</li>
            <li>Enable OpenClaw control once the account passes certification.</li>
          </ol>
        </article>

        <article className="panel">
          <header className="panel-header">
            <h2>Session vault model</h2>
            <p>Cookies are treated as structured session bundles, not flat strings.</p>
          </header>
          <ul className="chip-list">
            <li>Cookies</li>
            <li>Local storage</li>
            <li>Session storage</li>
            <li>CSRF state</li>
            <li>Fingerprint metadata</li>
            <li>Encrypted browser profile</li>
          </ul>
          <p className="muted">
            OpenClaw can use session-backed features without ever seeing the raw session bundle.
          </p>
        </article>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Account and connector matrix</h2>
          <p>Each account has a concrete auth mode, certified features, and a visible health state.</p>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Platform</th>
                <th>Connector</th>
                <th>Session</th>
                <th>Features</th>
                <th>OpenClaw</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const profile = getPlatformProfile(account.platform);
                return (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.projectName}</strong>
                      <div className="cell-note">{account.displayName}</div>
                    </td>
                    <td>{account.platform}</td>
                    <td>
                      <strong>{account.connectorMode}</strong>
                      <div className="cell-note">{profile.notes}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${account.sessionHealth}`}>
                        {account.sessionHealth}
                      </span>
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
                    <td>{account.openClawEnabled ? "enabled" : "disabled"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="two-up">
        <article className="panel">
          <header className="panel-header">
            <h2>Session-backed platforms</h2>
            <p>Concrete launch posture for cookie-backed automation.</p>
          </header>
          <div className="platform-cards">
            {[
              "medium",
              "substack",
              "quora",
              "instagram",
              "facebook",
              "tiktok",
              "reddit",
              "pinterest"
            ].map((platform) => {
              const profile = getPlatformProfile(platform as Parameters<typeof getPlatformProfile>[0]);
              return (
                <article className="platform-card" key={platform}>
                  <strong>{platform}</strong>
                  <span>{profile.defaultMode}</span>
                  <p>{profile.notes}</p>
                </article>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <header className="panel-header">
            <h2>Alerts and queue</h2>
            <p>High-risk actions remain visible even when OpenClaw has full scope.</p>
          </header>
          <div className="stack">
            {alerts.map((alert) => (
              <article className={`alert alert-${alert.severity}`} key={alert.id}>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
              </article>
            ))}
          </div>
          <div className="queue-list">
            {queue.map((item) => (
              <div className="queue-item" key={item.id}>
                <span>{item.projectName}</span>
                <strong>
                  {item.type} on {item.platform}
                </strong>
                <small>{item.status}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>OpenClaw audit trail</h2>
          <p>Every machine action is routed through the control API and logged.</p>
        </header>
        <div className="audit-list">
          {audit.map((event) => (
            <article className="audit-item" key={event.id}>
              <strong>{event.action}</strong>
              <span>{event.subject}</span>
              <small>
                {event.actor} · {event.status}
              </small>
              <p>{event.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
