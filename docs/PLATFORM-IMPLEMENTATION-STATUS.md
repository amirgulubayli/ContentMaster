# Platform Implementation Status

This document reflects the implementation now present in the codebase.

## Status legend

- `setup`: the app can create the account, store config, and expose the setup flow
- `session import`: the app can accept and encrypt a cookie/session bundle for the account
- `official auth`: real provider OAuth or official credential exchange is implemented
- `official execution`: real provider API calls are implemented
- `session execution`: the isolated session-runner can execute browser steps with imported bundles

## Current matrix

| Platform | Modes in app | Setup | Session import | Official auth | Official execution | Session execution | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| X | `api_auth` | Yes | No | Yes | Yes | No | OAuth and post/metrics API paths are wired. |
| LinkedIn | `api_auth` | Yes | No | Yes | Yes | No | OAuth and post API path are wired. |
| Medium | `session_auth` | Yes | Yes | N/A | No | Yes | Browser execution uses imported bundles and operator-supplied selectors/steps. |
| Substack | `session_auth` | Yes | Yes | N/A | No | Yes | Browser execution uses imported bundles and operator-supplied selectors/steps. |
| Quora | `session_auth` | Yes | Yes | N/A | No | Yes | Browser execution uses imported bundles and operator-supplied selectors/steps. |
| Reddit | `api_auth`, `hybrid_auth` | Yes | Yes | Yes | Yes | Yes | Official OAuth/post/reply/inbox paths are wired, with session fallback available. |
| Bluesky | `api_auth` | Yes | No | App password | Yes | No | Session creation and post execution are wired from app password setup. |
| Pinterest | `api_auth`, `hybrid_auth` | Yes | Yes | Yes | Yes | Yes | Official OAuth/publish/analytics paths are wired, with session fallback available. |
| Facebook | `api_auth`, `hybrid_auth` | Yes | Yes | Yes | Yes | Yes | Meta business OAuth and official API flows are wired, with session fallback available. |
| Instagram | `api_auth`, `hybrid_auth` | Yes | Yes | Yes | Yes | Yes | Meta business OAuth and official API flows are wired, with session fallback available. |
| TikTok | `api_auth`, `hybrid_auth` | Yes | Yes | Yes | Yes | Yes | Official OAuth/refresh/publish/analytics paths are wired, with session fallback available. |
| YouTube Shorts | `api_auth` | Yes | No | Yes | Yes | No | Google OAuth, upload initiation, comment reply, and analytics paths are wired. |

## Important operational note

Official execution means the API path exists in the app. The actual provider result still depends on:

- valid provider app credentials
- approved scopes
- correct redirect URIs
- valid account or asset types
- payloads that match the provider’s expectations

Session execution means the browser executor exists in the app and can run imported bundles. For session-first platforms, the operator or agent may still need to supply target URLs, selectors, and step sequences that match the current site UI.
