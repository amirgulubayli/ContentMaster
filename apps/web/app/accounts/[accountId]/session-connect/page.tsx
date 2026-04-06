import { importSessionBundleAction } from "../../../actions";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { getAccountProfile } from "../../../../lib/api";
import { platformGuides } from "../../../../lib/platform-guides";

export const dynamic = "force-dynamic";

const exampleBundle = `{
  "cookies": [
    {
      "name": "sessionid",
      "value": "redacted",
      "domain": ".example.com",
      "path": "/",
      "secure": true,
      "httpOnly": true
    }
  ],
  "localStorage": {},
  "sessionStorage": {},
  "csrfTokens": {},
  "fingerprint": {
    "userAgent": "Mozilla/5.0",
    "viewport": "1440x900",
    "locale": "en-GB"
  },
  "profileObjectKey": null
}`;

const exampleCookies = `[
  {
    "name": "sessionid",
    "value": "redacted",
    "domain": ".example.com",
    "path": "/",
    "secure": true,
    "httpOnly": true
  }
]`;

const exampleObject = `{
  "key": "value"
}`;

export default async function SessionConnectPage({
  params
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const profile = await getAccountProfile(accountId);

  if (!profile) {
    return (
      <DashboardShell title="Start Cookie Connection" description="Account not found.">
        <section className="panel">
          <p className="empty-state">This account does not exist.</p>
        </section>
      </DashboardShell>
    );
  }

  const { account, setup } = profile;
  const guide = platformGuides[account.platform];

  return (
    <DashboardShell
      title={`Start Cookie Connection: ${account.displayName}`}
      description="Platform-specific session import flow for this account."
    >
      <section className="section-grid">
        <article className="panel">
          <header className="panel-header">
            <h2>{guide.sessionWizard?.title ?? "Session import"}</h2>
            <p>Use the full authenticated browser-state bundle for this account.</p>
          </header>
          <div className="stack-column">
            <article className="platform-card">
              <strong>{account.platform}</strong>
              <span>{guide.recommendedMode}</span>
              <p>{guide.currentPriority}</p>
            </article>
            {guide.sessionWizard ? (
              <>
                <p className="section-label">Steps</p>
                <ol className="ordered-list compact-list">
                  {guide.sessionWizard.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="section-label">Before import, verify</p>
                <ul className="ordered-list compact-list">
                  {guide.sessionWizard.checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {guide.bundleRequirement?.length ? (
              <>
                <p className="section-label">Bundle requirement</p>
                <ul className="ordered-list compact-list">
                  {guide.bundleRequirement.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <header className="panel-header">
            <h2>Import bundle</h2>
            <p>Upload a browser-state file, paste a full bundle, or fill the session parts manually.</p>
          </header>
          <form action={importSessionBundleAction} className="stack-form">
            <input type="hidden" name="accountId" value={account.id} />
            <div className="grid-form">
              <label className="field-block">
                <span>Import mode</span>
                <select name="mode" required defaultValue={setup.sessionConfig.captureMode || "bundle"}>
                  <option value="cookies_only">cookies_only</option>
                  <option value="bundle">bundle</option>
                  <option value="profile">profile</option>
                </select>
                <small>Use `bundle` unless you intentionally want a lighter cookie-only import or a stored browser profile.</small>
              </label>
              <label className="field-block">
                <span>Notes</span>
                <input name="notes" placeholder="Notes for this import" defaultValue={setup.notes} />
                <small>Optional operator notes for this import.</small>
              </label>
            </div>
            <label className="field-block">
              <span>Upload JSON file</span>
              <input type="file" name="bundleFile" accept=".json,application/json" />
              <small>Preferred if you exported browser state to a JSON file.</small>
            </label>
            <label className="field-block">
              <span>Or paste JSON bundle</span>
              <textarea name="bundleJson" rows={14} placeholder={exampleBundle} />
              <small>The JSON should include `cookies`, `localStorage`, `sessionStorage`, `csrfTokens`, `fingerprint`, and `profileObjectKey`.</small>
            </label>
            <section className="subpanel">
              <h3>Manual session entry</h3>
              <div className="grid-form">
                <label className="field-block">
                  <span>Cookies JSON</span>
                  <textarea name="cookiesJson" rows={8} placeholder={exampleCookies} />
                  <small>Paste an array of cookie objects if you want to build the bundle by parts.</small>
                </label>
                <label className="field-block">
                  <span>Local storage JSON</span>
                  <textarea name="localStorageJson" rows={8} placeholder={exampleObject} />
                  <small>Optional object of key/value pairs.</small>
                </label>
                <label className="field-block">
                  <span>Session storage JSON</span>
                  <textarea name="sessionStorageJson" rows={8} placeholder={exampleObject} />
                  <small>Optional object of key/value pairs.</small>
                </label>
                <label className="field-block">
                  <span>CSRF tokens JSON</span>
                  <textarea name="csrfTokensJson" rows={8} placeholder={exampleObject} />
                  <small>Optional object of key/value pairs.</small>
                </label>
                <label className="field-block">
                  <span>Fingerprint user agent</span>
                  <input name="fingerprintUserAgent" defaultValue="Mozilla/5.0" />
                  <small>Recommended when manually constructing the session bundle.</small>
                </label>
                <label className="field-block">
                  <span>Fingerprint viewport</span>
                  <input name="fingerprintViewport" defaultValue="1440x900" />
                  <small>Recommended when manually constructing the session bundle.</small>
                </label>
                <label className="field-block">
                  <span>Fingerprint locale</span>
                  <input name="fingerprintLocale" defaultValue="en-GB" />
                  <small>Recommended when manually constructing the session bundle.</small>
                </label>
                <label className="field-block">
                  <span>Profile object key</span>
                  <input name="profileObjectKey" placeholder="Optional object-store key for an encrypted browser profile" />
                  <small>Leave blank unless you already stored a browser profile object separately.</small>
                </label>
              </div>
            </section>
            <button type="submit">Import encrypted bundle</button>
          </form>
        </article>
      </section>
    </DashboardShell>
  );
}
