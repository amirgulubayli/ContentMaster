import { DashboardShell } from "../../components/dashboard-shell";
import { getContent } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function ContentStudioPage() {
  const content = await getContent();

  return (
    <DashboardShell
      title="Content Studio"
      description="Drafts, repurposing plans, and the current content-hub operating focus across projects."
    >
      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Current operating focus</h2>
            <p>The production focus right now is text and image account control rather than short-form rollout.</p>
          </header>
          <div className="feature-stack">
            <span className="feature-pill">text publishing</span>
            <span className="feature-pill">image-led workflows</span>
            <span className="feature-pill">account setup</span>
            <span className="feature-pill">session vault</span>
            <span className="feature-pill">OpenClaw control</span>
          </div>
        </article>
        <article className="panel">
          <header className="panel-header">
            <h2>Planned video editor path</h2>
            <p>The B-roll tagging, transcript analysis, highlight detection, and subtitle editor are still planned expansion work.</p>
          </header>
          <ol className="ordered-list">
            <li>Upload and tag B-roll or source footage.</li>
            <li>Transcribe and label reusable source material once.</li>
            <li>Allow AI to assemble edits from tagged assets.</li>
            <li>Toggle subtitles on or off at export time.</li>
            <li>Reuse prior analysis instead of reprocessing the same clip.</li>
          </ol>
        </article>
      </section>

      <section className="panel">
        {content.length === 0 ? (
          <p className="empty-state">No content items yet. Once you add projects and start running the text/image workflows, drafts and content records will appear here.</p>
        ) : (
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
        )}
      </section>
    </DashboardShell>
  );
}
