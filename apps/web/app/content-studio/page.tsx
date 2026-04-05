import { DashboardShell } from "../../components/dashboard-shell";
import { getContent } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function ContentStudioPage() {
  const content = await getContent();

  return (
    <DashboardShell
      title="Content Studio"
      description="Drafts, repurposing plans, image/video generation pipeline, and publish readiness across projects."
    >
      <section className="panel">
        <div className="platform-cards">
          {content.map((item) => (
            <article className="platform-card" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.stage}</span>
              <p>
                {item.projectName} · {item.platformTargets.join(", ")}
              </p>
              <p>
                Image: {item.imageProvider} · Video: {item.videoPipeline}
              </p>
              <p>{item.nextAction}</p>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
