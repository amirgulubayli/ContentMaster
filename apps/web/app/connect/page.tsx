import { platformRegistry } from "@content-empire/connectors";
import { createAccountAction, createProjectAction } from "../actions";
import { DashboardShell } from "../../components/dashboard-shell";
import { getPlatformSetup, getProjects } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const [projects, setupBlueprints] = await Promise.all([getProjects(), getPlatformSetup()]);

  return (
    <DashboardShell
      title="Connection Wizard"
      description="Concrete onboarding path for OAuth, app-password, and session-backed accounts."
    >
      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Wizard flow</h2>
            <p>How operators set up accounts safely before OpenClaw gets control.</p>
          </header>
          <ol className="ordered-list">
            <li>Select the project that will own the account.</li>
            <li>Choose the platform and the connector path it allows.</li>
            <li>Save the account setup fields before attempting connect or session capture.</li>
            <li>Run OAuth, app-password, or controlled session capture depending on the mode.</li>
            <li>Execute dry-run publish, comment, inbox, and metrics certification.</li>
            <li>Enable OpenClaw once the account reaches the required trust level.</li>
          </ol>
        </article>
        <article className="panel">
          <header className="panel-header">
            <h2>Create project</h2>
            <p>Add a new project with its own voice and automation boundaries.</p>
          </header>
          <form action={createProjectAction} className="stack-form">
            <input name="name" placeholder="Project name" required />
            <input name="slug" placeholder="project-slug" required />
            <textarea name="description" placeholder="What this project covers" required />
            <textarea name="voice" placeholder="Voice guidelines" required />
            <button type="submit">Create project</button>
          </form>
        </article>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Add account</h2>
          <p>Attach an account to a project before OAuth or session capture begins.</p>
        </header>
        <form action={createAccountAction} className="grid-form">
          <select name="projectId" required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select name="platform" required>
            {Object.keys(platformRegistry).map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <input name="displayName" placeholder="Display name" required />
          <input name="handle" placeholder="@handle or site URL" required />
          <select name="automationMode" required>
            <option value="manual_review">manual_review</option>
            <option value="assisted_auto">assisted_auto</option>
            <option value="full_auto">full_auto</option>
          </select>
          <button type="submit">Create account</button>
        </form>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Platform setup map</h2>
          <p>The expected connection method for every launch platform.</p>
        </header>
        <div className="platform-cards">
          {setupBlueprints.map((profile) => (
            <article className="platform-card" key={profile.platform}>
              <strong>{profile.platform}</strong>
              <span>{profile.supportedModes.join(" / ")}</span>
              <p>API fields: {profile.apiFields.length} | Session fields: {profile.sessionFields.length}</p>
              <p>Execution: {profile.liveExecutionImplemented ? "live" : "scaffolded"}</p>
              <p>{profile.notes.join(" ")}</p>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
