import { openClawAction, queueAction } from "../actions";
import { DashboardShell } from "../../components/dashboard-shell";
import { getAccounts, getQueue } from "../../lib/api";

const actions = [
  "connect_account",
  "publish_post",
  "edit_post",
  "reply_comment",
  "send_dm",
  "engage",
  "refresh_session",
  "analyze_performance"
];

export const dynamic = "force-dynamic";

export default async function OpenClawPage() {
  const [accounts, queue] = await Promise.all([getAccounts(), getQueue()]);

  return (
    <DashboardShell
      title="OpenClaw Control Plane"
      description="Machine authority over certified account actions with queueing, audit, and session-safe execution boundaries."
    >
      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Available machine actions</h2>
            <p>Normalized verbs accepted by the control API.</p>
          </header>
          <div className="feature-stack">
            {actions.map((action) => (
              <span className="feature-pill" key={action}>
                {action}
              </span>
            ))}
          </div>
        </article>
        <article className="panel">
          <header className="panel-header">
            <h2>Accounts under machine control</h2>
            <p>OpenClaw can operate any account that passes certification and is enabled.</p>
          </header>
          {accounts.length === 0 ? (
            <p className="empty-state">No accounts are available for OpenClaw yet.</p>
          ) : (
            <div className="stack">
              {accounts.map((account) => (
                <article className="platform-card" key={account.id}>
                  <strong>{account.displayName}</strong>
                  <span>{account.openClawEnabled ? "enabled" : "disabled"}</span>
                  <p>{account.features.join(", ")}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Trigger OpenClaw action</h2>
          <p>Send a normalized command through the machine control API.</p>
        </header>
        {accounts.length === 0 ? (
          <p className="empty-state">Create and certify an account before dispatching OpenClaw actions.</p>
        ) : (
          <form action={openClawAction} className="grid-form">
            <select name="accountId" required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName}
                </option>
              ))}
            </select>
            <select name="action" required>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <input name="prompt" placeholder="Optional operator note or prompt" />
            <textarea
              name="payloadJson"
              rows={8}
              placeholder='Optional JSON payload, for example {"message":"Launch post","imageUrl":"https://...","pageId":"..."}'
            />
            <button type="submit">Dispatch action</button>
          </form>
        )}
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Queue manual machine job</h2>
          <p>Place a publish, edit, reply, or session refresh task into the orchestration queue.</p>
        </header>
        {accounts.length === 0 ? (
          <p className="empty-state">Once accounts exist, you can queue machine jobs here.</p>
        ) : (
          <form action={queueAction} className="grid-form">
            <select name="accountId" required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName}
                </option>
              ))}
            </select>
            <select name="platform" required>
              {accounts.map((account) => (
                <option key={`${account.id}-${account.platform}`} value={account.platform}>
                  {account.platform}
                </option>
              ))}
            </select>
            <select name="type" required>
              <option value="publish">publish</option>
              <option value="edit">edit</option>
              <option value="comment_reply">comment_reply</option>
              <option value="dm_reply">dm_reply</option>
              <option value="session_refresh">session_refresh</option>
            </select>
            <input name="owner" defaultValue="Operator" required />
            <input
              name="scheduledFor"
              defaultValue={new Date(Date.now() + 15 * 60 * 1000).toISOString()}
              required
            />
            <button type="submit">Queue job</button>
          </form>
        )}
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Current machine queue</h2>
          <p>OpenClaw actions are routed to queues before platform execution.</p>
        </header>
        {queue.length === 0 ? (
          <p className="empty-state">No machine jobs queued yet.</p>
        ) : (
          <div className="queue-list">
            {queue.map((item) => (
              <div className="queue-item" key={item.id}>
                <span>{item.owner}</span>
                <strong>
                  {item.type} · {item.platform}
                </strong>
                <small>{item.scheduledFor}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
