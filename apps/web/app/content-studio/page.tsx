import { DashboardShell } from "../../components/dashboard-shell";
import {
  analyzeMediaAssetAction,
  createEditJobAction,
  uploadMediaAssetAction
} from "../actions";
import { getAccounts, getContentStudio } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function ContentStudioPage() {
  const [snapshot, accounts] = await Promise.all([getContentStudio(), getAccounts()]);

  return (
    <DashboardShell
      title="Content Studio"
      description="Durable media library, transcript cache, highlight analysis, and editor job orchestration."
    >
      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Hub state</h2>
            <p>Everything here is intended to persist through Postgres records and MinIO-backed objects.</p>
          </header>
          <div className="feature-stack">
            <span className="feature-pill">assets {snapshot.stats.assetCount}</span>
            <span className="feature-pill">analyzed {snapshot.stats.analyzedAssetCount}</span>
            <span className="feature-pill">edit jobs {snapshot.stats.editJobCount}</span>
            <span className="feature-pill">rendered {snapshot.stats.renderedJobCount}</span>
          </div>
          <ol className="ordered-list">
            <li>Upload source footage, B-roll, images, transcripts, or docs into the asset library.</li>
            <li>Cache transcript and highlight analysis once per asset instead of redoing it every run.</li>
            <li>Build edit jobs against a source asset plus selected B-roll assets.</li>
            <li>Reuse the durable content record when the AI routes the output downstream.</li>
          </ol>
        </article>
        <article className="panel">
          <header className="panel-header">
            <h2>Upload asset</h2>
            <p>Source files are stored in MinIO. Metadata, tags, transcript cache, and analysis live in Postgres.</p>
          </header>
          <form action={uploadMediaAssetAction} className="stack-form">
            <select name="projectId" required defaultValue="">
              <option value="" disabled>
                Select project
              </option>
              {snapshot.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <input name="title" placeholder="Asset title" required />
            <textarea name="description" placeholder="What this asset contains and when to use it" />
            <select name="mediaKind" required defaultValue="source_video">
              <option value="source_video">source_video</option>
              <option value="b_roll_video">b_roll_video</option>
              <option value="image">image</option>
              <option value="audio">audio</option>
              <option value="transcript">transcript</option>
              <option value="document">document</option>
              <option value="other">other</option>
            </select>
            <input name="tags" placeholder="comma,separated,tags" />
            <textarea
              name="transcriptHint"
              placeholder="Optional transcript or key spoken lines. If supplied, analysis and highlights become much stronger."
            />
            <input name="mediaFile" type="file" required />
            <button type="submit">Upload to Content Hub</button>
          </form>
        </article>
      </section>

      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Create edit job</h2>
            <p>Point the AI at a source asset, optional B-roll assets, and the render plan you want.</p>
          </header>
          <form action={createEditJobAction} className="stack-form">
            <select name="projectId" required defaultValue="">
              <option value="" disabled>
                Select project
              </option>
              {snapshot.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select name="accountId" defaultValue="">
              <option value="">No account binding</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName} ({account.platform})
                </option>
              ))}
            </select>
            <input name="title" placeholder="Edit job title" required />
            <select name="sourceAssetId" required defaultValue="">
              <option value="" disabled>
                Select source asset
              </option>
              {snapshot.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title} [{asset.mediaKind}]
                </option>
              ))}
            </select>
            <input
              name="brollAssetIds"
              placeholder="Optional B-roll asset IDs, comma separated"
            />
            <textarea
              name="instructions"
              placeholder="Editing brief. Example: use strongest hook, keep it fast, add cutaway shots on tension points."
              required
            />
            <div className="grid-form">
              <select name="aspectRatio" defaultValue="9:16">
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
              </select>
              <select name="renderTemplate" defaultValue="slideshow">
                <option value="slideshow">slideshow</option>
                <option value="meme">meme</option>
                <option value="fade">fade</option>
              </select>
            </div>
            <label className="check-row">
              <input name="includeCaptions" type="checkbox" defaultChecked />
              <span>Include captions on output</span>
            </label>
            <button type="submit">Create Edit Job</button>
          </form>
        </article>
        <article className="panel">
          <header className="panel-header">
            <h2>How analysis works</h2>
            <p>The strongest results come from uploading a transcript hint or transcript file alongside the source media.</p>
          </header>
          <ol className="ordered-list">
            <li>Upload the asset with project, kind, and tags.</li>
            <li>If you already have transcript text, include it on upload or in the analyze step below.</li>
            <li>The app caches transcript, sentiment, keywords, highlights, and vector metadata once.</li>
            <li>Edit jobs reuse the cached analysis so the AI does not need to re-interpret the same asset every time.</li>
          </ol>
        </article>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Asset library</h2>
          <p>Each asset has a durable object, tags, transcript state, highlights, and a one-click analysis refresh.</p>
        </header>
        {snapshot.assets.length === 0 ? (
          <p className="empty-state">No assets yet. Upload footage or B-roll above to start building the content hub.</p>
        ) : (
          <div className="platform-cards">
            {snapshot.assets.map((asset) => (
              <article className="platform-card" key={asset.id}>
                <strong>{asset.title}</strong>
                <span>
                  {asset.mediaKind} · {asset.transcriptStatus}
                </span>
                <p>{asset.description || "No description yet."}</p>
                <p>Project: {asset.projectName}</p>
                <p>Tags: {asset.tags.length ? asset.tags.join(", ") : "none"}</p>
                <p>Sentiment: {asset.sentiment ?? "not analyzed yet"}</p>
                <p>
                  <a href={asset.objectUrl}>Open stored object</a>
                </p>
                {asset.analysisSummary ? <p>{asset.analysisSummary}</p> : null}
                {asset.highlights.length > 0 ? (
                  <ol className="ordered-list compact-list">
                    {asset.highlights.map((highlight, index) => (
                      <li key={`${asset.id}-${index}`}>
                        {highlight.label}: {highlight.sourceText}
                      </li>
                    ))}
                  </ol>
                ) : null}
                <form action={analyzeMediaAssetAction} className="stack-form">
                  <input type="hidden" name="assetId" value={asset.id} />
                  <textarea
                    name="transcriptHint"
                    placeholder="Optional transcript text to strengthen the cached analysis"
                  />
                  <button type="submit">Analyze Asset</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Edit job board</h2>
          <p>These are the durable render/edit records tied to source media and reusable content records.</p>
        </header>
        {snapshot.editJobs.length === 0 ? (
          <p className="empty-state">No edit jobs yet. Create one from the form above once source media is available.</p>
        ) : (
          <div className="platform-cards">
            {snapshot.editJobs.map((job) => (
              <article className="platform-card" key={job.id}>
                <strong>{job.title}</strong>
                <span>
                  {job.status} · {job.aspectRatio} · {job.renderTemplate}
                </span>
                <p>Project: {job.projectName}</p>
                <p>Source: {job.sourceAssetTitle}</p>
                <p>B-roll: {job.brollAssetTitles.length ? job.brollAssetTitles.join(", ") : "none"}</p>
                <p>Captions: {job.includeCaptions ? "on" : "off"}</p>
                <p>{job.instructions}</p>
                {job.selectedHighlights.length > 0 ? (
                  <ol className="ordered-list compact-list">
                    {job.selectedHighlights.map((highlight, index) => (
                      <li key={`${job.id}-${index}`}>
                        {highlight.label}: {highlight.sourceText}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Durable content records</h2>
          <p>Edit jobs automatically create content records so downstream routing has something persistent to act on.</p>
        </header>
        {snapshot.content.length === 0 ? (
          <p className="empty-state">No content records yet. They will appear here after edit jobs are created.</p>
        ) : (
          <div className="platform-cards">
            {snapshot.content.map((item) => (
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
