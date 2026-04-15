# Connector Matrix

## Auth modes

- `api_auth`: OAuth, app password, or service credential only.
- `session_auth`: encrypted session bundle and optional encrypted persistent browser profile.
- `hybrid_auth`: API-first with session fallback when the account and certified features require it.

## Session bundle contents

- Cookies
- Local storage
- Session storage
- CSRF state
- Browser fingerprint metadata
- Optional encrypted persistent browser profile stored in MinIO

## Launch matrix

| Platform | Default auth | Session fallback | DM support | Expected launch features |
| --- | --- | --- | --- | --- |
| X | `api_auth` | No | API-limited | post, reply, hide replies, metrics |
| LinkedIn | `api_auth` | No | None | post, media, metrics |
| Medium | `session_auth` | N/A | None | draft, publish, edit, comment reply, stats scrape |
| Substack | `session_auth` | N/A | None | draft, publish/send, edit, comment reply, stats scrape |
| Quora | `session_auth` | N/A | Session-optional | publish, edit, reply, engage, stats scrape |
| Reddit | `api_auth` | Yes | Hybrid | post, reply, inbox, optional DM/chat after certification |
| Bluesky | `api_auth` | No | None | post, thread replies, media, metrics |
| Pinterest | `api_auth` | Yes | None | organic pin/board actions, metrics |
| Facebook | `hybrid_auth` | Yes | API | business-surface post, video, comments, messaging |
| Instagram | `hybrid_auth` | Yes | Hybrid | image/reel publishing, comments, inbox, DM reply |
| Threads | `api_auth` | No | None | text/image/video publishing, reply publishing, insights |
| TikTok | `hybrid_auth` | Yes | Session-optional | direct post/upload, comments, optional inbox |
| YouTube | `api_auth` | No | None | Shorts upload, metadata updates, comment replies, metrics |

## Certification checklist per account

- Auth validity check
- Dry-run publish
- Media upload validation
- Published edit validation
- Comment reply validation
- Inbox read validation
- DM reply validation if enabled
- Session stability scoring
- Platform-specific rate limit policy assignment

## OpenClaw boundary

- OpenClaw can trigger actions across all certified features.
- OpenClaw cannot read raw cookie values, browser profiles, refresh tokens, or encryption keys.
- Session-backed jobs are executed only by the isolated session-runner service.
