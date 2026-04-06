# Content Empire Ultimate Operator Manual

This is the practical operator manual for the current live rollout.

It reflects the current operating verdict on April 5, 2026:

- `X`: auth first, cookies fallback only
- `LinkedIn`: auth for posting, cookies for non-posting workflows
- `Bluesky`: app password
- `Pinterest`: cookies first
- `Reddit`: cookies first
- `Medium`, `Substack`, `Quora`: cookies first
- `Facebook`, `Instagram`, `TikTok`, `YouTube`: defer live rollout until auth work is finished

## 1. What This App Is For Right Now

The current production focus is text and image workflow control:

- account setup
- session vault
- auth tracking
- content planning
- inbox and reply workflow
- OpenClaw machine control

Short-form platform automation is intentionally on the backburner for now:

- Facebook
- Instagram
- TikTok
- YouTube

## 2. Current Platform Matrix

| Platform | Current operating mode | What to do now |
| --- | --- | --- |
| X | `api_auth` or `hybrid_auth` | Use official auth first. Keep cookies as fallback only. |
| LinkedIn | `hybrid_auth` | Use auth for posting. Use cookies for comments, inbox, and DMs. |
| Bluesky | `api_auth` | Use handle/DID plus app password. |
| Pinterest | `session_auth` | Use cookies/session as the main path. |
| Reddit | `session_auth` | Use cookies/session as the main path. |
| Medium | `session_auth` | Use cookies/session. |
| Substack | `session_auth` | Use cookies/session. |
| Quora | `session_auth` | Use cookies/session. |
| Facebook | `hybrid_auth` later | Defer live rollout. |
| Instagram | `hybrid_auth` later | Defer live rollout. |
| TikTok | `hybrid_auth` later | Defer live rollout. |
| YouTube | `api_auth` later | Defer live rollout until real callback domain exists. |

## 3. Deploy Or Redeploy The App

On the VPS:

```bash
cd /opt/content-empire
sudo git config --global --add safe.directory /opt/content-empire
git pull
docker compose -f infra/docker/docker-compose.yml down
docker compose -f infra/docker/docker-compose.yml up -d --build
docker compose -f infra/docker/docker-compose.yml ps
```

To inspect logs:

```bash
cd /opt/content-empire
docker compose -f infra/docker/docker-compose.yml logs --tail=200
docker compose -f infra/docker/docker-compose.yml logs web --tail=200
docker compose -f infra/docker/docker-compose.yml logs api --tail=200
```

Main private URL:

- `http://100.111.98.27:8088/login`

## 4. Core Operator Workflow

### Before you touch any account

Split credentials into two buckets:

- VPS `.env` only:
  - provider app IDs
  - provider client secrets
  - global callback-domain settings
- Account page only:
  - app passwords
  - account-specific IDs
  - capture mode
  - workflow override JSON
  - operator notes

Do not paste global provider client secrets into individual account records.

### Create a project

1. Open `Connect`
2. Create the project
3. Set name, slug, description, and voice

### Add an account

1. Stay in `Connect`
2. Select project
3. Select platform
4. Select connector mode
5. Set display name and handle/site URL
6. Set automation mode
7. Create account

### Finish the account setup

1. Go to `Accounts`
2. Open the account
3. Review the `Setup instructions` panel
4. Save the required setup fields
5. If session-backed, go to `Session Vault` and import the bundle
6. Run `Prepare connector`
7. Run `Run certification`
8. Enable OpenClaw only after readiness is clean

## 5. Session Bundle Standard

The session bundle JSON should include:

```json
{
  "cookies": [],
  "localStorage": {},
  "sessionStorage": {},
  "csrfTokens": {},
  "fingerprint": {
    "userAgent": "Mozilla/5.0",
    "viewport": "1440x900",
    "locale": "en-GB"
  },
  "profileObjectKey": null
} 
```

Important rule:

- do not try to hand-pick only one or two cookies unless you already know exactly what you are doing
- the preferred import path is the full authenticated browser-state JSON
- that means cookies plus any local/session storage and fingerprint values the app captured

General capture flow:

1. Log into the target platform in a clean browser profile.
2. Export cookies/browser state as JSON.
3. Open `Session Vault`.
4. Select the account.
5. Import the bundle.
6. Return to the account page and certify it.

## 6. Platform-Specific Setup

### X

Use official auth first.

1. Create an X app.
2. Enable OAuth 2.0.
3. Register callback:
   `http://100.111.98.27:8088/api/oauth/x/callback`
4. Put `clientId`, `clientSecret`, and `callbackUrl` into the account setup form.
5. Run OAuth from the account page.
6. Optionally attach a session bundle as fallback.

Cookie fallback rule:

- import the full browser-state JSON
- do not try to maintain X with manually copied single-cookie values

### LinkedIn

Use official auth for posting and cookies for everything else.

1. Create a LinkedIn app.
2. Enable posting scopes/products.
3. Register callback:
   `http://100.111.98.27:8088/api/oauth/linkedin/callback`
4. Put `clientId`, `clientSecret`, and `callbackUrl` into the account setup form.
5. Run OAuth from the account page.
6. Also attach a session bundle if you want comments, inbox, or DM workflows.

Cookie rule:

- import the full browser-state JSON
- the messaging and feed surfaces may rely on more than raw cookies alone

### Bluesky

Use app password.

1. Open Bluesky settings.
2. Create an app password.
3. Use your handle or DID as `identifier`.
4. Put `identifier` and `appPassword` into account setup.
5. Run `Prepare connector`.

### Pinterest

Run session-first for now.

1. Create the Pinterest account in the app with `session_auth`.
2. Export Pinterest cookies/browser state from a clean logged-in browser profile.
3. Import the bundle in `Session Vault`.
4. Add `workflowOverridesJson` only if Pinterest selectors need tuning.
5. Certify the account.

Cookie rule:

- import the full browser-state JSON
- do not optimize for a tiny cookie subset

### Reddit

Run session-first for now.

1. Create the Reddit account in the app with `session_auth`.
2. Export Reddit cookies/browser state from a clean logged-in browser profile.
3. Import the bundle in `Session Vault`.
4. Add `workflowOverridesJson` only if submit/comment/inbox selectors need tuning.
5. Certify the account.

Cookie rule:

- import the full browser-state JSON
- do not optimize for a tiny cookie subset

### Medium / Substack / Quora

These are session-first.

1. Create the account with `session_auth`.
2. Fill the setup fields.
3. Export cookies/browser state.
4. Import the bundle in `Session Vault`.
5. Add workflow overrides only if the site selectors differ from defaults.
6. Certify the account.

Cookie rule:

- import the full browser-state JSON
- preserve cookies plus storage values

### Meta / TikTok / YouTube

These stay on hold for now.

- Meta: auth work still pending operational finish
- TikTok: auth path is unstable enough that it is not current rollout focus
- YouTube: requires a real domain callback and is intentionally deferred

## 7. OpenClaw Control

OpenClaw should control the app through the internal API, not by holding raw cookies in chat.

Main actions:

- `connect_account`
- `publish_post`
- `edit_post`
- `reply_comment`
- `send_dm`
- `engage`
- `refresh_session`
- `analyze_performance`

The account itself stores:

- auth config
- session bundle metadata
- notes
- connector mode
- automation mode
- workflow overrides

## 8. Current Content-Hub Reality

The current app is strongest at:

- account control
- machine action dispatch
- setup and certification
- queueing and audit

The following video-editor workflow is still a product direction, not a finished implementation:

- upload B-roll
- tag assets
- transcribe and detect sentiment
- identify best moments automatically
- choose whether subtitles are added
- generate edited output automatically
- reuse prior analysis instead of reprocessing the same source

That workflow should be treated as a planned content-hub expansion, not as fully live today.

## 9. Operator Rules

- Do not paste raw cookies into AI chat if the app can store them in Session Vault instead.
- Prefer account-bound session bundles over ad hoc secrets in prompts.
- Keep new accounts in `manual_review` until they pass certification.
- Use `workflowOverridesJson` only when default browser selectors are not enough.
- Treat Meta, TikTok, and YouTube as deferred rollout platforms for now.

## 10. Quick Troubleshooting

If a page breaks after deploy:

```bash
cd /opt/content-empire
docker compose -f infra/docker/docker-compose.yml logs web --tail=200
docker compose -f infra/docker/docker-compose.yml logs api --tail=200
```

If login or redirects break:

```bash
cd /opt/content-empire
docker compose -f infra/docker/docker-compose.yml logs nginx --tail=200
```

If a session-backed account fails:

1. Re-import the session bundle.
2. Check `Session Vault` health state.
3. Review account notes and workflow override JSON.
4. Re-run certification.
