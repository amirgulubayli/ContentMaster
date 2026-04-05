import type { AuthField } from "@content-empire/shared";
import {
  captureSessionAction,
  certifyAccountAction,
  connectAccountAction,
  refreshAuthAction,
  updateAccountSetupAction
} from "../../actions";
import { DashboardShell } from "../../../components/dashboard-shell";
import { getAccountProfile } from "../../../lib/api";
import { platformGuides } from "../../../lib/platform-guides";

export const dynamic = "force-dynamic";

function FieldInput({
  scope,
  field,
  currentValue
}: {
  scope: "api" | "session";
  field: AuthField;
  currentValue: string | undefined;
}) {
  const name = `${scope}__${field.key}`;
  const isPassword = field.kind === "password";
  const defaultValue = isPassword ? "" : currentValue ?? "";
  const placeholder = isPassword && currentValue ? "Configured" : field.help;

  if (field.kind === "textarea") {
    return (
      <label className="field-block">
        <span>{field.label}</span>
        <textarea
          name={name}
          rows={4}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={field.required}
        />
        <small>{field.help}</small>
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="field-block">
        <span>{field.label}</span>
        <select name={name} defaultValue={currentValue ?? field.options?.[0] ?? ""} required={field.required}>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <small>{field.help}</small>
      </label>
    );
  }

  return (
    <label className="field-block">
      <span>{field.label}</span>
      <input
        type={isPassword ? "password" : field.kind === "url" ? "url" : "text"}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={field.required}
      />
      <small>{field.help}</small>
    </label>
  );
}

export default async function AccountDetailPage({
  params
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const profile = await getAccountProfile(accountId);

  if (!profile) {
    return (
      <DashboardShell title="Account Setup" description="Account not found.">
        <section className="panel">
          <p className="empty-state">This account does not exist.</p>
        </section>
      </DashboardShell>
    );
  }

  const { account, blueprint, readiness, setup } = profile;
  const guide = platformGuides[account.platform];
  const authStartUrl =
    account.platform === "facebook" || account.platform === "instagram"
      ? `/api/auth/meta/start?accountId=${account.id}`
      : account.platform === "tiktok"
        ? `/api/auth/tiktok/start?accountId=${account.id}`
        : account.platform === "x"
          ? `/api/auth/x/start?accountId=${account.id}`
          : account.platform === "linkedin"
            ? `/api/auth/linkedin/start?accountId=${account.id}`
            : account.platform === "reddit"
              ? `/api/auth/reddit/start?accountId=${account.id}`
              : account.platform === "pinterest"
                ? `/api/auth/pinterest/start?accountId=${account.id}`
                : account.platform === "youtube"
                  ? `/api/auth/google/start?accountId=${account.id}`
                  : null;

  return (
    <DashboardShell
      title={`${account.displayName} Setup`}
      description="Configure connector mode, credentials, session requirements, and OpenClaw access for this account."
    >
      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Account state</h2>
            <p>Current setup progress for this platform account.</p>
          </header>
          <div className="stack-column">
            <article className="platform-card">
              <strong>{account.platform}</strong>
              <span>{setup.connectorMode}</span>
              <p>Auth status: {account.authStatus}</p>
              <p>Automation: {account.automationMode}</p>
              <p>OpenClaw: {account.openClawEnabled ? "enabled" : "disabled"}</p>
            </article>
            <article className="platform-card">
              <strong>Live connector status</strong>
              <span>{profile.profile.liveExecutionImplemented ? "implemented" : "scaffolded only"}</span>
              <p>{profile.profile.notes}</p>
            </article>
          </div>
        </article>
        <article className="panel">
          <header className="panel-header">
            <h2>Readiness</h2>
            <p>What is still missing before this account can be trusted in production.</p>
          </header>
          <div className="stack-column">
            <div className="feature-stack">
              <span className={`badge ${readiness.configComplete ? "badge-healthy" : "badge-warning"}`}>
                config {readiness.configComplete ? "complete" : "incomplete"}
              </span>
              <span className={`badge ${readiness.sessionCaptured ? "badge-healthy" : "badge-warning"}`}>
                session {readiness.sessionCaptureNeeded ? (readiness.sessionCaptured ? "captured" : "needed") : "not needed"}
              </span>
              <span className={`badge ${readiness.canCertify ? "badge-healthy" : "badge-warning"}`}>
                certify {readiness.canCertify ? "ready" : "blocked"}
              </span>
              <span className={`badge ${readiness.canEnableOpenClaw ? "badge-healthy" : "badge-warning"}`}>
                live control {readiness.canEnableOpenClaw ? "ready" : "blocked"}
              </span>
            </div>
            {readiness.blockers.length > 0 ? (
              <ul className="ordered-list compact-list">
                {readiness.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No blockers detected.</p>
            )}
            {readiness.nextSteps.length > 0 ? (
              <>
                <p className="section-label">Next steps</p>
                <ul className="ordered-list compact-list">
                  {readiness.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </article>
      </section>

      {authStartUrl || profile.authConnection ? (
        <section className="panel">
          <header className="panel-header">
            <h2>Provider auth</h2>
            <p>Official auth/app-password state for platforms that use provider credentials.</p>
          </header>
          <div className="stack-column">
            {profile.authConnection ? (
              <article className="platform-card">
                <strong>{profile.authConnection.provider}</strong>
                <span>{profile.authConnection.externalUsername ?? profile.authConnection.externalAccountId ?? "connected"}</span>
                <p>Updated: {profile.authConnection.updatedAt}</p>
                <p>Expires: {profile.authConnection.expiresAt ?? "not supplied"}</p>
                <p>Scopes: {profile.authConnection.scopes.length > 0 ? profile.authConnection.scopes.join(", ") : "not returned"}</p>
              </article>
            ) : (
              <p className="empty-state">No official OAuth token set stored for this account yet.</p>
            )}
            <div className="inline-form">
              {authStartUrl ? (
                <a className="button-link" href={authStartUrl}>
                  Start{" "}
                  {account.platform === "tiktok"
                    ? "TikTok"
                    : account.platform === "facebook" || account.platform === "instagram"
                      ? "Meta"
                      : account.platform === "youtube"
                        ? "Google"
                        : account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}{" "}
                  OAuth
                </a>
              ) : null}
              {profile.authConnection ? (
                <form action={refreshAuthAction} className="inline-form">
                  <input type="hidden" name="accountId" value={account.id} />
                  <button type="submit">Refresh auth</button>
                </form>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>Required setup fields</h2>
            <p>These are the fields your agent or operator must gather for this connector mode.</p>
          </header>
          <div className="stack-column">
            <article className="platform-card">
              <strong>API / OAuth fields</strong>
              <p>
                {readiness.requiredApiFields.length > 0
                  ? readiness.requiredApiFields.join(", ")
                  : "No API fields required for this mode."}
              </p>
            </article>
            <article className="platform-card">
              <strong>Session fields</strong>
              <p>
                {readiness.requiredSessionFields.length > 0
                  ? readiness.requiredSessionFields.join(", ")
                  : "No session fields required for this mode."}
              </p>
            </article>
          </div>
        </article>
        <article className="panel">
          <header className="panel-header">
            <h2>Execution actions</h2>
            <p>Run the setup stages in order from this account page.</p>
          </header>
          <div className="stack-column">
            <form action={connectAccountAction} className="inline-form">
              <input type="hidden" name="accountId" value={account.id} />
              <button type="submit">Prepare connector</button>
            </form>
            {readiness.sessionCaptureNeeded ? (
              <form action={captureSessionAction} className="grid-form">
                <input type="hidden" name="accountId" value={account.id} />
                <select name="mode" required defaultValue={setup.sessionConfig.captureMode || "bundle"}>
                  <option value="cookies_only">cookies_only</option>
                  <option value="bundle">bundle</option>
                  <option value="profile">profile</option>
                </select>
                <input name="notes" placeholder="Notes for this capture" defaultValue={setup.notes} />
                <button type="submit">Capture session</button>
              </form>
            ) : (
              <p className="empty-state">This connector mode does not need a session capture.</p>
            )}
            <form action={certifyAccountAction} className="inline-form">
              <input type="hidden" name="accountId" value={account.id} />
              <button type="submit">Run certification</button>
            </form>
          </div>
        </article>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Setup instructions</h2>
          <p>Operator instructions for how to gather credentials, cookies, or app passwords for this platform.</p>
        </header>
        <div className="stack-column">
          <article className="platform-card">
            <strong>Current operating policy</strong>
            <span>{guide.recommendedMode}</span>
            <p>{guide.currentPriority}</p>
            <p>{guide.status}</p>
            {guide.callbackUrl ? <p>Callback URL: {guide.callbackUrl}</p> : null}
          </article>
          {guide.authGuide?.length ? (
            <details className="platform-card">
              <summary>How to get auth credentials</summary>
              <ol className="ordered-list compact-list">
                {guide.authGuide.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ) : null}
          {guide.cookieGuide?.length ? (
            <details className="platform-card">
              <summary>How to get cookies or session bundle</summary>
              <ol className="ordered-list compact-list">
                {guide.cookieGuide.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ) : null}
          {guide.credentialNotes?.length ? (
            <article className="platform-card">
              <strong>Credential notes</strong>
              <ul className="ordered-list compact-list">
                {guide.credentialNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Update connector setup</h2>
          <p>Store the mode and account-specific auth config needed for this platform.</p>
        </header>
        <form action={updateAccountSetupAction} className="stack-form">
          <input type="hidden" name="accountId" value={account.id} />
          <div className="grid-form">
            <label className="field-block">
              <span>Connector mode</span>
              <select name="connectorMode" defaultValue={setup.connectorMode}>
                {blueprint.supportedModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              <small>Choose the auth path this account should use.</small>
            </label>
            <label className="field-block">
              <span>Automation mode</span>
              <select name="automationMode" defaultValue={setup.automationMode}>
                <option value="manual_review">manual_review</option>
                <option value="assisted_auto">assisted_auto</option>
                <option value="full_auto">full_auto</option>
              </select>
              <small>Keep new accounts conservative until they are proven.</small>
            </label>
          </div>
          <label className="check-row">
            <input type="checkbox" name="openClawEnabled" defaultChecked={setup.openClawEnabled} />
            Enable OpenClaw access for this account
          </label>

          {blueprint.apiFields.length > 0 ? (
            <section className="subpanel">
              <h3>API / OAuth config</h3>
              <div className="grid-form">
                {blueprint.apiFields.map((field) => (
                  <FieldInput
                    key={field.key}
                    scope="api"
                    field={field}
                    currentValue={setup.apiConfig[field.key]}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {blueprint.sessionFields.length > 0 ? (
            <section className="subpanel">
              <h3>Session config</h3>
              <div className="grid-form">
                {blueprint.sessionFields.map((field) => (
                  <FieldInput
                    key={field.key}
                    scope="session"
                    field={field}
                    currentValue={setup.sessionConfig[field.key]}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <label className="field-block">
            <span>Operator notes</span>
            <textarea name="notes" rows={4} defaultValue={setup.notes} placeholder="Operator notes" />
            <small>Use this for per-account caveats and rollout decisions.</small>
          </label>
          <button type="submit">Save setup</button>
        </form>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Platform notes</h2>
          <p>What the current codebase knows about this platform and its intended connection path.</p>
        </header>
        <ul className="ordered-list">
          {blueprint.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
