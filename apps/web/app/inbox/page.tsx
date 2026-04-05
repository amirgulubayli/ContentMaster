import { queueAction } from "../actions";
import { DashboardShell } from "../../components/dashboard-shell";
import { getInbox } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const inbox = await getInbox();

  return (
    <DashboardShell
      title="Engagement Inbox"
      description="Unified comment and DM queue with AI suggestions and manual review gates."
    >
      <section className="panel">
        <div className="stack">
          {inbox.map((item) => (
            <article className="audit-item" key={item.id}>
              <strong>
                {item.kind} · {item.platform}
              </strong>
              <span>{item.author}</span>
              <p>{item.message}</p>
              <small>{item.status}</small>
              <p>
                <strong>Suggested reply:</strong> {item.suggestedReply}
              </p>
              <form action={queueAction} className="inline-form">
                <input name="accountId" type="hidden" value={item.accountId} />
                <input name="platform" type="hidden" value={item.platform} />
                <input
                  name="type"
                  type="hidden"
                  value={item.kind === "dm" ? "dm_reply" : "comment_reply"}
                />
                <input name="owner" type="hidden" value="Operator" />
                <input
                  name="scheduledFor"
                  type="hidden"
                  value={new Date(Date.now() + 5 * 60 * 1000).toISOString()}
                />
                <button type="submit">Queue suggested reply</button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
