# Content Empire AI Agent Usage Guide

This guide explains how an AI agent should operate the current Content Empire app, what is implemented today, and what still remains before every live platform connector is fully real.

## What The App Is Right Now

The current app is a deployed control plane with:

- operator login and private dashboard
- project creation
- account creation
- per-account setup pages
- connector mode selection
- structured API/session config storage
- session vault overview and capture flow
- encrypted session bundle import
- account readiness analysis
- certification flow
- OpenClaw internal action dispatch
- queueing, audit, inbox, and content views

The app is strong at orchestration and setup.

The app is not yet a completed universal live social execution engine across every supported platform.

## What The AI Agent Can Truthfully Do Today

The AI agent can:

- log into the app if given the operator password
- create projects
- create account records
- open the per-account setup screen
- choose the intended connector mode
- fill the required setup fields for each platform
- save API or session configuration into the account setup record
- tell whether the account is missing required setup
- trigger connector preparation
- trigger session capture
- trigger certification
- dispatch OpenClaw internal actions
- inspect queue, audit, inbox, content, and session-vault state

## What The AI Agent Cannot Truthfully Claim Yet

The AI agent must not claim that:

- every platform already has a real production connector
- every OAuth flow is already wired end-to-end
- every cookie/session capture is fully live and automated
- every DM, comment, publish, edit, and analytics flow is already operational against real platforms

Today, many platform connectors are still scaffolded. The app will say that clearly through the readiness and execution status views.

## Core Screens

### Overview

Use this to understand the overall state of the system:

- how many projects exist
- how many accounts exist
- whether session-backed accounts are present
- whether OpenClaw is enabled anywhere

If the app is fresh, the overview should look empty and clean.

### Connect

Use this screen to:

- create a project
- create an account
- review the setup map for each platform

The platform setup map tells the agent:

- which connector modes the platform supports
- how many API fields are expected
- how many session fields are expected
- whether execution is `live` or `scaffolded`

### Accounts

Use this screen to:

- review all accounts
- inspect connector mode
- inspect auth status
- inspect automation mode
- jump into per-account setup
- run certification

### Account Setup

This is now the main working screen for platform onboarding.

For each account, the agent can:

- see current auth status
- see whether live execution is implemented or only scaffolded
- see a readiness summary
- see blockers
- see next steps
- save API fields
- save session fields
- prepare the connector
- capture a session
- run certification

The readiness panel is the source of truth for whether an account is actually ready.

### Session Vault

Use this screen to:

- review session-backed accounts
- see bundle/profile storage mode
- see health state
- capture or refresh session state
- import a cookie/session JSON bundle for a specific account
- jump back to account setup

When importing a bundle:

- raw cookies should be uploaded through the app, not pasted into agent chat
- the bundle is validated against the expected schema
- the app stores it encrypted server-side
- the UI only exposes safe metadata such as cookie count, storage mode, version, and source

### Content Studio

Use this screen to review content items and future production flows. At this stage it is primarily an oversight surface, not the final full production editor.

### Inbox

Use this to inspect comment and DM work items that the system knows about internally.

### OpenClaw

Use this to dispatch internal actions such as:

- `connect_account`
- `publish_post`
- `edit_post`
- `reply_comment`
- `send_dm`
- `engage`
- `refresh_session`
- `analyze_performance`

These actions go through the internal control plane. They do not automatically prove that the real platform connector is live.

### Audit

Use this to verify what happened:

- setup saves
- connector preparation
- session capture
- certification
- OpenClaw actions

## Standard Agent Workflow

### 1. Log In

- open the app URL
- submit the operator password

### 2. Create A Project

On `Connect`, create a project with:

- name
- slug
- description
- voice

### 3. Create An Account

Still on `Connect`, create the account with:

- project
- platform
- display name
- handle or site URL
- automation mode

### 4. Open The Account Setup Screen

On `Accounts`, click `Open setup`.

This page is where the agent should actually onboard the account.

### 5. Choose Connector Mode

Use the platform-appropriate mode:

- `api_auth` for API-native setups
- `session_auth` for session-first setups
- `hybrid_auth` when both API and session layers are intended

### 6. Fill Required Fields

The setup form renders the platform fields directly.

The agent should fill:

- API client IDs
- API client secrets
- callback URLs
- app passwords
- page or business IDs
- capture mode
- login hints or publication URLs

The readiness panel will immediately reflect what is still missing after save.

### 7. Save Setup

When saved:

- the account moves from `not_started` to `configured` if config now exists
- existing hidden secret fields are preserved if the password inputs are left blank
- the saved setup becomes the account’s working onboarding state

### 8. Prepare Connector

Use `Prepare connector` to tell the internal router to prepare the platform connection path.

Today this is still mostly scaffold logic. It records a real action in the system and makes the flow visible in audit.

### 9. Capture Session If Needed

If readiness says session capture is needed:

- choose `cookies_only`, `bundle`, or `profile`
- capture the session
- confirm session health is now acceptable

### 10. Run Certification

Only do this after:

- required setup fields are complete
- session capture is done if needed

Certification should be treated as the internal gate before higher automation levels.

### 11. Enable OpenClaw Carefully

The AI agent should not claim an account is truly live-ready unless:

- required config is complete
- session capture is complete when needed
- certification has succeeded
- the platform execution status is actually `live`

If execution is still `scaffolded`, keep the account conservative even if setup is complete.

## Platform Guidance

### API-First Platforms

- X
- LinkedIn
- Bluesky
- YouTube
- TikTok posting
- Pinterest
- Reddit core posting
- Meta business surfaces where supported

The agent should prefer API credentials and callback URLs first.

### Session-First Platforms

- Medium
- Substack
- Quora

The agent should expect session capture to be part of setup.

### Hybrid Platforms

- Facebook
- Instagram
- TikTok
- Reddit
- Pinterest

The agent should assume API config first, with session config only where needed for unsupported flows.

## How To Interpret Readiness

The readiness panel includes:

- `config complete` or `config incomplete`
- `session captured`, `session needed`, or `session not needed`
- whether certification is ready
- whether live control is actually ready

Blockers mean concrete reasons the account is not ready yet.

Next steps tell the agent exactly what to do next.

## Safe Promises The Agent Can Make

The agent may say:

- the control platform is live
- this account record exists
- this account setup is incomplete or complete
- this account still needs session capture
- this account is ready for certification
- this account is only scaffolded, not yet truly live

The agent must not say:

- this platform is fully connected unless it really is
- this account can already publish live if execution is still scaffolded
- DMs, comments, edits, or analytics are live on every platform

## Current Bottom Line

Content Empire is now a deployed and usable operator platform for:

- organizing projects
- organizing accounts
- storing connector setup
- tracking readiness
- handling internal control flow
- auditing actions

The remaining work for the full vision is still the real external connector layer:

- real OAuth exchanges
- real token persistence
- real browser/session capture and replay
- real publish/edit/comment/DM implementations
- real analytics ingestion

Use the app as the source of truth for setup and readiness, and use the readiness panel to avoid overstating what each account can actually do.
