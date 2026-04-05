import { DashboardShell } from "../../components/dashboard-shell";
import { getAudit } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const audit = await getAudit();

  return (
    <DashboardShell
      title="Audit Trail"
      description="Every operator and OpenClaw action is retained with actor, subject, status, and detail."
    >
      <section className="panel">
        {audit.length === 0 ? (
          <p className="empty-state">No audit events yet.</p>
        ) : (
          <div className="audit-list">
            {audit.map((event) => (
              <article className="audit-item" key={event.id}>
                <strong>{event.action}</strong>
                <span>{event.subject}</span>
                <small>
                  {event.actor} · {event.status} · {event.createdAt}
                </small>
                <p>{event.detail}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
