# Content Empire API Control Surface

This file explains the API paths the operator AI can use directly.

Base URL inside the deployed stack:

- UI-facing: `http://100.111.98.27:8088`
- API service internal default: `http://api:4000`

Machine-auth endpoints use:

- `Authorization: Bearer $INTERNAL_MACHINE_TOKEN`

## 1. Create Project

`POST /api/projects`

```json
{
  "name": "Rag Medium",
  "slug": "rag-medium",
  "description": "Long-form text content project",
  "voice": "Direct, analytical, high-signal"
}
```

## 2. Create Account

`POST /api/accounts`

```json
{
  "projectId": "proj_rag-medium",
  "platform": "reddit",
  "handle": "u/example",
  "displayName": "Reddit Main",
  "connectorMode": "session_auth",
  "automationMode": "manual_review"
}
```

## 3. Update Account Setup

`POST /api/accounts/setup`

```json
{
  "accountId": "acc_reddit_123",
  "connectorMode": "session_auth",
  "automationMode": "manual_review",
  "openClawEnabled": true,
  "notes": "Cookie-first rollout",
  "apiConfig": {},
  "sessionConfig": {
    "captureMode": "bundle",
    "workflowOverridesJson": "{\"publish_post\":{\"composeSelector\":\"textarea\"}}"
  }
}
```

## 4. Import Session Bundle

`POST /api/session-vault/import`

```json
{
  "accountId": "acc_reddit_123",
  "mode": "bundle",
  "notes": "Imported from browser export",
  "bundle": {
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
}
```

## 5. Prepare Connector

`POST /api/accounts/connect`

```json
{
  "accountId": "acc_reddit_123"
}
```

## 6. Run Certification

`POST /api/accounts/certify`

```json
{
  "accountId": "acc_reddit_123"
}
```

## 7. OpenClaw Actions

`POST /api/openclaw/actions`

Headers:

```text
Authorization: Bearer YOUR_INTERNAL_MACHINE_TOKEN
Content-Type: application/json
```

Example publish:

```json
{
  "action": "publish_post",
  "accountId": "acc_x_123",
  "payload": {
    "message": "Shipping today.",
    "text": "Shipping today."
  }
}
```

Example Reddit session-first reply:

```json
{
  "action": "reply_comment",
  "accountId": "acc_reddit_123",
  "payload": {
    "message": "Thanks, this is helpful.",
    "targetUrl": "https://www.reddit.com/r/example/comments/..."
  }
}
```

Example LinkedIn post:

```json
{
  "action": "publish_post",
  "accountId": "acc_linkedin_123",
  "payload": {
    "message": "New article is live."
  }
}
```

## 8. Read Surfaces

- `GET /api/projects`
- `GET /api/accounts`
- `GET /api/platforms`
- `GET /api/platform-setup`
- `GET /api/accounts/:accountId/profile`
- `GET /api/session-vault`
- `GET /api/queue`
- `GET /api/dashboard`
- `GET /api/content`
- `GET /api/inbox`

## 9. Current AI Control Rule

The AI should prefer:

1. direct API calls into this app
2. Session Vault storage for cookies
3. account-bound setup updates
4. OpenClaw actions for machine execution

The AI should avoid:

- keeping credentials only in prompts
- repeatedly re-analyzing the same session data when the app already stores the account state
- claiming deferred short-form platforms are live if they are still operationally on hold

