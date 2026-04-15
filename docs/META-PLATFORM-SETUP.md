# Meta Platform Setup

This guide is the ContentMaster-specific setup for running Meta as three separate platform lanes:

- Facebook Pages
- Instagram Login
- Threads API

The codebase now supports separate OAuth starts, callback routes, token storage, and execution paths for all three.

## Recommended app layout

Use separate Meta apps per platform and per environment.

- Dev Facebook Pages app
- Dev Instagram Login app
- Dev Threads app
- Prod Facebook Pages app
- Prod Instagram Login app
- Prod Threads app

This gives cleaner app review, cleaner blast radius, and easier webhook and permission management later.

The code still supports `META_APP_ID` and `META_APP_SECRET` as a shared fallback, but the preferred setup is the per-platform env keys below.

## Required server env

Add these values to the server `.env`:

```env
APP_URL=https://your-public-app-url
META_API_VERSION=v23.0
THREADS_API_VERSION=v1.0

META_FACEBOOK_APP_ID=your-facebook-pages-app-id
META_FACEBOOK_APP_SECRET=your-facebook-pages-app-secret

META_INSTAGRAM_APP_ID=your-instagram-login-app-id
META_INSTAGRAM_APP_SECRET=your-instagram-login-app-secret

META_THREADS_APP_ID=your-threads-app-id
META_THREADS_APP_SECRET=your-threads-app-secret
```

Notes:

- `APP_URL` must match the public base URL that Meta redirects back to.
- If `APP_URL` is wrong, OAuth will fail even if the app credentials are correct.
- `META_APP_ID` and `META_APP_SECRET` are now optional fallback values only.

## Callback URLs

Register these exact redirect URIs in the matching Meta apps:

- Facebook: `https://your-public-app-url/api/oauth/facebook/callback`
- Instagram: `https://your-public-app-url/api/oauth/instagram/callback`
- Threads: `https://your-public-app-url/api/oauth/threads/callback`

## In-app auth start routes

ContentMaster now starts each provider separately:

- Facebook: `/api/auth/facebook/start?accountId=...`
- Instagram: `/api/auth/instagram/start?accountId=...`
- Threads: `/api/auth/threads/start?accountId=...`

## Facebook Pages setup

Use case:

- Manage everything on your Page

Permissions to request:

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `pages_manage_metadata`
- `pages_messaging`

Meta dashboard steps:

1. Create or open the Facebook Pages Meta app.
2. Add the Pages use case.
3. Add the permissions listed above.
4. Register the Facebook callback URL.
5. Put the Facebook app ID and secret into `.env`.
6. In ContentMaster, open the Facebook account and click the OAuth connect flow.
7. Log into the Facebook account that manages the target Page.
8. Approve the requested Page permissions.

What ContentMaster stores:

- long-lived user access token
- selected Page access token
- Page ID

What is already wired in code:

- OAuth callback and credential storage
- Page selection from the Pages list
- text/image/video publishing
- comment replies
- page messaging send path
- page insights reads

Account setup notes:

- If you want to pin a specific Page, store `pageId` in the account API config before running OAuth.
- If you need unsupported browser-only workflows later, keep Facebook on `hybrid_auth`.

## Instagram Login setup

Use case:

- Instagram API with Instagram Login

Permissions to request:

- `instagram_business_basic`
- `instagram_business_content_publish`
- `instagram_manage_comments`
- `instagram_business_manage_messages`

Meta dashboard steps:

1. Create or open the Instagram Login app.
2. Add the Instagram API use case.
3. Add the permissions listed above.
4. In development mode, assign the Instagram account as an Instagram Tester and accept the invite on that account.
5. Register the Instagram callback URL.
6. Put the Instagram app ID and secret into `.env`.
7. In ContentMaster, open the Instagram account and click the OAuth connect flow.
8. Log into the correct Instagram business or professional account and approve access.

What ContentMaster stores:

- Instagram access token
- resolved Instagram business account ID
- username and profile metadata

What is already wired in code:

- Instagram Login OAuth callback and token storage
- image publishing
- video or reels publishing
- comment replies
- business messaging token storage and execution path
- insights reads

Account setup notes:

- If you want to pin a specific Instagram account in setup, store `instagramBusinessId` in the account API config.
- Meta's own dashboard notes that hashtag discovery and some insights flows still point to the Facebook Login path. Treat that as a separate analytics lane if you need it.
- Keep Instagram on `hybrid_auth` only if you truly need browser fallback for a UI-only workflow.
- Manual access-token import is also supported. The server validates the pasted token against the Instagram profile endpoint before storing it, but it does not introspect the token's granted scopes.
- Instagram token refresh in the app still depends on Meta accepting the token on the refresh path, so short-lived or incompatible tokens may need to be re-imported or reconnected through OAuth.

## Threads setup

Use case:

- Access the Threads API

Permissions to request:

- `threads_basic`
- `threads_content_publish`
- `threads_manage_replies`
- `threads_manage_insights`

Meta dashboard steps:

1. Create or open the Threads app.
2. Add the Threads use case.
3. Add the permissions listed above.
4. Register the Threads callback URL.
5. Put the Threads app ID and secret into `.env`.
6. In ContentMaster, open the Threads account and click the OAuth connect flow.
7. Log into the correct Threads profile and approve access.

What ContentMaster stores:

- Threads access token
- Threads user ID
- username and profile metadata

What is already wired in code:

- Threads OAuth callback and token storage
- text post publishing
- image post publishing
- video post publishing
- reply publishing through `reply_to_id`
- account insights reads

Account setup notes:

- If you want to pin a specific Threads profile, store `threadsUserId` in the account API config.
- Threads runs as `api_auth` only in the current implementation.
- Manual access-token import is also supported. The server validates the pasted token against the Threads profile endpoint before storing it, but it does not introspect the token's granted scopes.
- Threads refresh handling is not implemented in this repo yet, so manual token imports should be treated as a reconnectable credential rather than a fully managed long-lived session.

## Platform routing inside ContentMaster

Recommended platform modes:

- Facebook: `hybrid_auth`
- Instagram: `hybrid_auth`
- Threads: `api_auth`

Why:

- Facebook sometimes benefits from a controlled session fallback for edge business workflows.
- Instagram can still need fallback if you hit unsupported UI-only behavior.
- Threads is cleanest as API-only.

## Current implementation gaps

The split is wired, but a few Meta features are still not implemented in this repo:

- provider webhooks
- webhook verification token handling
- inbound webhook event processing for comments, DMs, or Threads replies
- automated app-review evidence tooling

If you need those next, add:

```env
META_WEBHOOK_VERIFY_TOKEN=replace-with-random-string
```

Then implement:

- `/api/webhooks/meta/facebook`
- `/api/webhooks/meta/instagram`
- `/api/webhooks/meta/threads`

## Rollout order

The safest rollout order for ContentMaster is:

1. Facebook Pages
2. Instagram Login
3. Threads

Reason:

- Facebook gives the broadest business-surface validation first.
- Instagram has the most permission and tester friction.
- Threads is the simplest once the shared Meta operational flow is already proven.
