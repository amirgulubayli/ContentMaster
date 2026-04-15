# Content Empire Ultimate Platform Usage Guide

This is the main operator manual for using the platform day to day.

If you want one document that explains how to run the app and operate its main paths, use this one.

## 1. Start Here

Before using the platform, understand the three operating paths:

- `api_auth`: official provider auth and official API execution
- `session_auth`: session-backed execution through the session vault and session runner
- `hybrid_auth`: official auth first, with session fallback where needed

Every account in the system should follow one of those paths on purpose.

## 2. First-Time Setup

### Log in

Open the web app and sign in through the operator login page.

### Create a project

Go to `Connect` and create the project with:

- name
- slug
- description
- voice

### Add an account

Still on `Connect`, add the platform account with:

- project
- platform
- display name
- handle or URL
- connector mode
- automation mode

## 3. The Main Screens

### Overview

Use `Overview` to quickly understand:

- how many accounts exist
- which accounts are session-backed
- proxy health
- alerts
- queue state
- recent audit activity

### Connect

Use `Connect` when you need to onboard something new.

This is where you:

- create projects
- create accounts
- review the platform setup map
- check the current operating policy for each platform

### Accounts

Use `Accounts` to manage live account records.

This is where you:

- review account status
- inspect connector mode
- inspect certified features
- open detailed setup
- run certification

### Account Setup

This is the most important working page for each account.

Use it to:

- save API config
- save session config
- inspect readiness
- see blockers
- see next steps
- prepare the connector
- start official auth when relevant

### Session Vault

Use `Session Vault` for any account that depends on browser-backed execution.

This is where you:

- capture a new session
- refresh an existing session
- import a browser-state bundle
- review session metadata and health

### Content Studio

Use `Content Studio` for content operations.

This is where you:

- upload source media
- analyze assets
- review generated metadata
- create edit jobs
- review durable content records

### Inbox

Use `Inbox` to review comments, replies, and DM-style work items.

### OpenClaw

Use `OpenClaw` to trigger account actions through the control plane.

This is where you:

- trigger publish actions
- trigger reply actions
- trigger DM actions
- refresh session-backed accounts
- review the machine queue

### Proxies

Use `Proxies` to manage outbound routing for both API traffic and session execution.

### Audit

Use `Audit` to confirm what happened after any important action.

## 4. Account Onboarding Paths

### Path A: API-First Account

Use this for accounts that should rely on official provider auth and official APIs.

Operator flow:

1. Create the account in `Connect`.
2. Open the account setup page.
3. Fill required API-side fields if the platform needs any account-specific values.
4. Keep global provider secrets in `.env`, not in account notes or prompts.
5. Start official auth from the account flow when available.
6. Save setup.
7. Run `Prepare connector`.
8. Run `Certification`.
9. Enable machine control only when readiness is clean.

### Path B: Session-First Account

Use this for platforms or workflows that depend on browser-backed execution.

Operator flow:

1. Create the account in `Connect` with `session_auth`.
2. Open the account setup page.
3. Fill required session config such as capture mode and workflow overrides if needed.
4. Save setup.
5. Go to `Session Vault`.
6. Capture or import the full authenticated browser-state bundle.
7. Confirm session health is acceptable.
8. Run `Prepare connector`.
9. Run `Certification`.
10. Only then allow unattended machine actions.

### Path C: Hybrid Account

Use this when part of the workflow is stable through official APIs and part still needs session-backed execution.

Operator flow:

1. Create the account in `Connect` with `hybrid_auth`.
2. Complete the official auth side first.
3. Attach session config only if fallback or non-API paths are needed.
4. Capture or import a session bundle for the same account.
5. Save setup.
6. Run `Prepare connector`.
7. Run `Certification`.
8. Use readiness and certified features to decide what OpenClaw can safely do.

## 5. How To Use The Readiness Panel

The readiness panel is the internal truth for whether an account is actually ready.

Check it for:

- missing API fields
- missing session fields
- whether session capture is still required
- whether official auth is still incomplete
- whether certification can run
- whether OpenClaw can be enabled safely

Do not treat an account as live just because the account record exists.

## 6. Session Vault Rules

When using session-backed accounts:

- import the full browser-state bundle, not just one or two cookies
- keep the session attached to the correct account
- use encrypted storage through the app
- refresh the session when health degrades
- avoid keeping raw cookies in chat, notes, or prompts

The preferred bundle contains:

- cookies
- localStorage
- sessionStorage
- CSRF values
- fingerprint metadata
- optional profile object reference

## 7. OpenClaw Rules

OpenClaw is the machine actor, not the source of truth.

Use it only after setup is complete and certification is acceptable.

Typical actions include:

- publish post
- edit post
- reply to comment
- send DM
- refresh session
- analyze performance

OpenClaw should work through the internal API and account state, not by manually carrying credentials or cookies in prompts.

## 8. Content Studio Path

Use this when the workflow starts with media or content production.

Operator flow:

1. Upload the source asset.
2. Add tags and metadata.
3. Run asset analysis if needed.
4. Review transcript or highlights.
5. Create an edit job.
6. Track the output in content records.
7. Route the final content toward the right platform account and action path.

## 9. Proxy Path

Use the proxy system when you need platform-aware network routing and safer session execution.

Operator flow:

1. Add the proxy record.
2. Set platform targeting if needed.
3. Leave it enabled only if it is actually healthy.
4. Review sticky assignments.
5. Rotate failed assignments when needed.

This matters for both official API traffic and browser-backed session work.

## 10. Audit Path

After any important action, confirm it in `Audit`.

Use the audit trail to verify:

- setup saves
- connector preparation
- auth refreshes
- session imports
- session captures
- certifications
- content actions
- OpenClaw actions

## 11. General Operating Rules

- Keep global provider secrets in environment config, not on account forms.
- Keep per-account setup on the account itself.
- Prefer official auth when it is reliable and supported.
- Use session-backed execution when the workflow truly needs it.
- Use hybrid mode intentionally, not by default.
- Treat certification as the gate before heavier automation.
- Use audit to verify actions instead of assuming they worked.

## 12. Quick Troubleshooting

If an account is blocked:

1. Open the account setup page.
2. Read the blockers and next steps.
3. Fix missing config.
4. Refresh or import session data if required.
5. Re-run connector preparation.
6. Re-run certification.
7. Verify the result in `Audit`.

If a session-backed workflow fails:

1. Check `Session Vault` health.
2. Re-import or refresh the bundle.
3. Check whether workflow overrides are needed.
4. Review proxy assignment if a proxy is in use.

If machine execution is unclear:

1. Check account readiness.
2. Check certified features.
3. Check the queue.
4. Check the audit trail.

## 13. Best Reading Order

If you are learning the platform from scratch, read:

1. `docs/PLATFORM-OVERVIEW.md`
2. `docs/ULTIMATE-PLATFORM-USAGE-GUIDE.md`
3. `docs/PLATFORM-VISION.md`
4. `docs/PLATFORM-IMPLEMENTATION-STATUS.md`
