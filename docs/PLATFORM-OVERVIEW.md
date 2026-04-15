# Content Empire Platform Overview

This is the plain-English overview of what the app is, what each part does, and why it exists.

## What This App Is

Content Empire is a private internal platform for operating multi-account, multi-platform content systems from one place.

It is not just a posting app.

It is meant to be the control layer for:

- projects and brands
- account onboarding
- official API auth
- session-backed account access
- content operations
- machine-triggered actions
- queueing, audit, and operator review

## Why This App Exists

Running content workflows across many platforms becomes messy fast.

Different platforms require different auth models, different account metadata, different media formats, and different execution paths. On top of that, some workflows are best done through official APIs while others still need browser-backed session execution.

This app exists to centralize all of that into one private system with clear status, repeatable onboarding, and visible operational control.

## The Main Goal

The goal is to let one operator surface manage the full path from account setup to content execution without relying on scattered spreadsheets, browser tabs, one-off scripts, or prompt-only memory.

In simple terms, the platform aims to:

- organize all projects and social accounts in one place
- keep auth and session state attached to the right account
- make setup and readiness visible
- route actions through the correct execution path
- support content upload, analysis, and edit jobs
- keep every important action auditable

## The Main Parts Of The System

### 1. Web App

The Next.js dashboard is the operator-facing control surface.

It is where you:

- log in
- create projects
- add accounts
- configure connector modes
- import or refresh session bundles
- certify accounts
- manage content assets
- trigger OpenClaw actions
- review queue, inbox, audit, and proxy state

### 2. API

The Fastify API is the system control layer.

It handles:

- account and project records
- setup persistence
- readiness and certification logic
- provider auth callbacks and token refresh
- session-vault import/capture flows
- OpenClaw action routing
- content-studio asset and edit-job endpoints
- queue, inbox, and audit feeds

### 3. Session Runner

The session runner is the isolated service that executes browser-backed actions for session-based or hybrid accounts.

This keeps cookie-backed automation away from the main UI and API surface.

### 4. Worker

The worker is the orchestration layer for background jobs and machine workflows.

### 5. Renderer

The renderer is the media output service for content-generation and edit pipelines.

### 6. Shared Packages

The packages folder contains shared types, connector logic, DB access, policies, and common utilities used across the monorepo.

## Main Screens And What They Do

### Overview

The home dashboard gives the high-level operating picture:

- connected accounts
- session-backed accounts
- active proxies
- queue and alerts
- recent audit activity

### Connect

This is the onboarding surface.

Use it to:

- create a project
- add an account
- choose the connector mode
- review the platform setup map and operating policy

### Accounts

This is the account management surface.

Use it to:

- review all accounts
- inspect auth status
- inspect connector mode
- inspect certified features
- open the account setup page
- run certification

### Account Setup

This is the detailed per-account operating page.

Use it to:

- save API config
- save session config
- review readiness
- inspect blockers and next steps
- start provider auth when relevant
- prepare the connector

### Session Vault

This is where session-backed accounts are managed.

Use it to:

- capture a session
- refresh a session
- import a browser-state bundle
- review session health
- confirm storage mode and bundle metadata

### Content Studio

This is the content operations hub.

Use it to:

- upload source assets
- analyze media
- review transcript and highlight data
- create edit jobs
- inspect durable content records

### Inbox

This is the unified engagement work queue for comments and DM-style follow-up.

### OpenClaw

This is the machine-control surface.

Use it to:

- trigger account actions
- review which accounts are under machine control
- inspect current queue state
- dispatch publish, reply, DM, refresh, and analysis actions

### Proxies

This is the network-control surface for API and session traffic.

Use it to:

- add proxies
- target proxies to platforms
- inspect sticky assignments
- rotate assignments after failures

### Audit Trail

This is the history of what happened and who triggered it.

Use it to verify setup changes, session activity, certifications, and OpenClaw actions.

## Core Operating Concepts

### Projects

A project is the brand or content unit that accounts belong to.

### Accounts

An account is one platform identity attached to a project.

Each account stores:

- platform
- handle
- connector mode
- automation mode
- auth status
- feature set
- session health

### Connector Modes

- `api_auth`: official auth only
- `session_auth`: session-backed execution only
- `hybrid_auth`: official auth plus session fallback

### Readiness

Readiness tells you whether the account is actually ready for certification and execution.

It depends on:

- required config fields
- session health when needed
- official auth completion when needed
- live execution status for that platform path

### Certification

Certification is the internal gate before giving the account broader machine control.

### OpenClaw

OpenClaw is the machine actor that sends actions through the internal API instead of reaching directly into raw credentials or session data.

## The Main End-To-End Flow

1. Create a project.
2. Add an account.
3. Choose the correct connector mode.
4. Save the required setup fields.
5. Complete provider auth if the account needs it.
6. Capture or import a session bundle if the account needs it.
7. Prepare the connector.
8. Run certification.
9. Enable machine-assisted execution only after readiness is clean.

## What “All Paths” Means In Practice

The platform supports three operational paths:

### API-first path

Use the provider's official auth and official execution path wherever possible.

Best for platforms where approved OAuth and API actions are reliable.

### Session-first path

Use encrypted browser-state bundles and the isolated session runner.

Best for platforms or workflows that depend on the live site UI instead of official APIs.

### Hybrid path

Use official auth for stable platform-native actions and session-backed execution for the gaps.

Best for platforms where some workflows are official and others still need browser execution.

## What The App Does Not Try To Be

- a public-facing SaaS
- a consumer social scheduler
- a place to keep raw credentials in prompts
- a blind automation bot without review, readiness, and audit

## Documentation Map

Read these in order if you are new:

1. `docs/PLATFORM-OVERVIEW.md`
2. `docs/ULTIMATE-PLATFORM-USAGE-GUIDE.md`
3. `docs/PLATFORM-VISION.md`
4. `docs/PLATFORM-IMPLEMENTATION-STATUS.md`

Use these when needed:

- `docs/API-CONTROL-SURFACE.md` for direct API usage
- `docs/VPS-DEPLOYMENT.md` for deploy and infra work
- `docs/AI-AGENT-USAGE-GUIDE.md` for AI-operator behavior
