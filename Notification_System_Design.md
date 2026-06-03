# Stage 1: Notification System — REST API Design & Contract

---

## Table of Contents

1. [Overview](#overview)
2. [Core Actions](#core-actions)
3. [Common Conventions](#common-conventions)
4. [Authentication & Headers](#authentication--headers)
5. [REST API Endpoints](#rest-api-endpoints)
   - [1. List Notifications](#1-get-apiv1notifications--list-notifications)
   - [2. Get a Single Notification](#2-get-apiv1notificationsid--get-single-notification)
   - [3. Mark a Notification as Read](#3-patch-apiv1notificationsidread--mark-as-read)
   - [4. Mark All Notifications as Read](#4-patch-apiv1notificationsread-all--mark-all-as-read)
   - [5. Delete a Notification](#5-delete-apiv1notificationsid--delete-a-notification)
   - [6. Get Unread Count](#6-get-apiv1notificationscount--get-unread-count)
   - [7. Update Notification Preferences](#7-put-apiv1notificationspreferences--update-preferences)
   - [8. Get Notification Preferences](#8-get-apiv1notificationspreferences--get-preferences)
6. [JSON Schemas](#json-schemas)
7. [Error Responses](#error-responses)
8. [Real-Time Notification Mechanism](#real-time-notification-mechanism)
9. [Summary Table](#summary-table)

---

## Overview

This document defines the REST API contract for a user-facing notification platform. It is written for front-end engineers consuming the API and covers endpoint definitions, request/response JSON structures, header contracts, and real-time delivery strategy.

The notification system supports the following principles:

- **Stateful read tracking** — notifications carry a `read` flag managed server-side.
- **Typed notifications** — each notification carries a `type` field so the UI can render appropriately (e.g., alert, info, warning, promo).
- **Pagination** — list endpoints use cursor-based pagination for performance at scale.
- **Real-time delivery** — Server-Sent Events (SSE) are used to push new notifications without polling.

---

## Core Actions

| # | Action | Description |
|---|--------|-------------|
| 1 | **List notifications** | Fetch paginated notifications for the authenticated user |
| 2 | **Get a notification** | Retrieve full detail of a single notification by ID |
| 3 | **Mark as read** | Mark one notification as read |
| 4 | **Mark all as read** | Bulk-mark all unread notifications as read |
| 5 | **Delete a notification** | Permanently remove a notification |
| 6 | **Get unread count** | Return the count of unread notifications (for badge display) |
| 7 | **Get preferences** | Retrieve the user's notification preferences |
| 8 | **Update preferences** | Update the user's notification preferences |
| 9 | **Subscribe (real-time)** | Open an SSE stream to receive notifications in real time |

---

## Common Conventions

| Convention | Detail |
|------------|--------|
| **Base URL** | `https://api.example.com` |
| **API version prefix** | `/api/v1` |
| **Resource name** | `/notifications` |
| **ID format** | UUID v4 strings (e.g., `"a3f1c2d4-..."`) |
| **Timestamps** | ISO 8601 UTC strings (e.g., `"2025-06-03T14:22:00Z"`) |
| **Casing** | `snake_case` for all JSON field names |
| **HTTP methods** | `GET` (read), `PATCH` (partial update), `PUT` (full replace), `DELETE` |
| **Status codes** | Standard HTTP (200, 201, 204, 400, 401, 403, 404, 422, 500) |
| **Pagination style** | Cursor-based via `cursor` + `limit` query params |

---

## Authentication & Headers

### Request Headers (all endpoints)

```http
Authorization: Bearer <access_token>
Accept: application/json
Content-Type: application/json       (required for POST/PATCH/PUT only)
X-Request-ID: <uuid>                 (optional, for tracing; echoed back in response)
```

### Response Headers (all endpoints)

```http
Content-Type: application/json
X-Request-ID: <uuid>                 (echoed from request, or generated server-side)
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1748959320
```

---

## REST API Endpoints

---

### 1. `GET /api/v1/notifications` — List Notifications

Fetch a paginated list of notifications for the currently authenticated user.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | `20` | Max items to return (1–100) |
| `cursor` | string | No | — | Opaque pagination cursor from previous response |
| `status` | string | No | `all` | Filter: `all`, `read`, `unread` |
| `type` | string | No | — | Filter by type: `info`, `warning`, `alert`, `promo` |

#### Request

```http
GET /api/v1/notifications?limit=20&status=unread
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Accept: application/json
```

#### Response — `200 OK`

```json
{
  "data": [
    {
      "id": "a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d",
      "type": "alert",
      "title": "Your password was changed",
      "body": "If this wasn't you, please contact support immediately.",
      "read": false,
      "created_at": "2025-06-03T14:22:00Z",
      "read_at": null,
      "action_url": "https://app.example.com/security",
      "icon": "shield",
      "metadata": {
        "category": "security",
        "priority": "high"
      }
    },
    {
      "id": "b4e2d3f5-9c8f-5a6b-0d1e-2f3a4b5c6d7e",
      "type": "info",
      "title": "Your export is ready",
      "body": "Your data export from June 2 is ready to download.",
      "read": false,
      "created_at": "2025-06-03T11:05:00Z",
      "read_at": null,
      "action_url": "https://app.example.com/exports/june-2",
      "icon": "download",
      "metadata": {
        "category": "system",
        "priority": "normal"
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "next_cursor": "eyJpZCI6ImI0ZTJkM2Y1In0=",
    "has_more": true
  },
  "meta": {
    "total_unread": 5
  }
}
```

---

### 2. `GET /api/v1/notifications/:id` — Get Single Notification

Retrieve the full detail of one notification. **Does not** auto-mark it as read.

#### Request

```http
GET /api/v1/notifications/a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Accept: application/json
```

#### Response — `200 OK`

```json
{
  "data": {
    "id": "a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d",
    "type": "alert",
    "title": "Your password was changed",
    "body": "If this wasn't you, please contact support immediately.",
    "read": false,
    "created_at": "2025-06-03T14:22:00Z",
    "read_at": null,
    "action_url": "https://app.example.com/security",
    "icon": "shield",
    "metadata": {
      "category": "security",
      "priority": "high"
    }
  }
}
```

#### Response — `404 Not Found`

```json
{
  "error": {
    "code": "NOTIFICATION_NOT_FOUND",
    "message": "Notification with the given ID does not exist or does not belong to this user."
  }
}
```

---

### 3. `PATCH /api/v1/notifications/:id/read` — Mark as Read

Mark a single notification as read. Idempotent — calling it on an already-read notification is safe.

#### Request

```http
PATCH /api/v1/notifications/a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d/read
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json
```

> No request body required.

#### Response — `200 OK`

```json
{
  "data": {
    "id": "a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d",
    "read": true,
    "read_at": "2025-06-03T15:00:45Z"
  }
}
```

---

### 4. `PATCH /api/v1/notifications/read-all` — Mark All as Read

Bulk-mark every unread notification as read for the authenticated user.

#### Request

```http
PATCH /api/v1/notifications/read-all
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json
```

#### Optional Request Body

```json
{
  "before": "2025-06-03T15:00:00Z"
}
```

`before` (optional ISO 8601 timestamp) — if provided, only notifications created before this time are marked read. Omit to mark all.

#### Response — `200 OK`

```json
{
  "data": {
    "updated_count": 5
  }
}
```

---

### 5. `DELETE /api/v1/notifications/:id` — Delete a Notification

Permanently remove a single notification.

#### Request

```http
DELETE /api/v1/notifications/a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

#### Response — `204 No Content`

```http
HTTP/1.1 204 No Content
```

No response body.

---

### 6. `GET /api/v1/notifications/count` — Get Unread Count

Lightweight endpoint designed for badge rendering. Returns only the unread notification count — no notification data.

#### Request

```http
GET /api/v1/notifications/count
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Accept: application/json
```

#### Response — `200 OK`

```json
{
  "data": {
    "unread": 5
  }
}
```

---

### 7. `PUT /api/v1/notifications/preferences` — Update Preferences

Replace the user's notification preferences. Uses `PUT` (full replacement) rather than `PATCH`.

#### Request

```http
PUT /api/v1/notifications/preferences
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json
```

```json
{
  "channels": {
    "in_app": true,
    "email": true,
    "push": false,
    "sms": false
  },
  "types": {
    "alert": true,
    "info": true,
    "warning": true,
    "promo": false
  },
  "quiet_hours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00",
    "timezone": "America/New_York"
  }
}
```

#### Response — `200 OK`

```json
{
  "data": {
    "channels": {
      "in_app": true,
      "email": true,
      "push": false,
      "sms": false
    },
    "types": {
      "alert": true,
      "info": true,
      "warning": true,
      "promo": false
    },
    "quiet_hours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00",
      "timezone": "America/New_York"
    },
    "updated_at": "2025-06-03T15:10:00Z"
  }
}
```

---

### 8. `GET /api/v1/notifications/preferences` — Get Preferences

Retrieve the current user's notification preferences.

#### Request

```http
GET /api/v1/notifications/preferences
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Accept: application/json
```

#### Response — `200 OK`

```json
{
  "data": {
    "channels": {
      "in_app": true,
      "email": true,
      "push": false,
      "sms": false
    },
    "types": {
      "alert": true,
      "info": true,
      "warning": true,
      "promo": false
    },
    "quiet_hours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00",
      "timezone": "America/New_York"
    },
    "updated_at": "2025-06-03T15:10:00Z"
  }
}
```

---

## JSON Schemas

### Notification Object (canonical)

```json
{
  "id":          "string (UUID v4)         — unique notification identifier",
  "type":        "string (enum)            — one of: info | warning | alert | promo",
  "title":       "string                   — short notification heading",
  "body":        "string                   — full notification message",
  "read":        "boolean                  — true if the user has read it",
  "created_at":  "string (ISO 8601 UTC)    — when the notification was created",
  "read_at":     "string | null            — when it was marked read; null if unread",
  "action_url":  "string | null            — deep-link URL for CTA; null if none",
  "icon":        "string | null            — icon identifier for UI rendering",
  "metadata":    "object                   — arbitrary key-value pairs for categorisation"
}
```

### Preferences Object (canonical)

```json
{
  "channels": {
    "in_app":  "boolean — receive notifications in the web/app UI",
    "email":   "boolean — receive email digests",
    "push":    "boolean — receive mobile push notifications",
    "sms":     "boolean — receive SMS alerts"
  },
  "types": {
    "alert":   "boolean — security and action-required notifications",
    "info":    "boolean — informational updates",
    "warning": "boolean — system warnings",
    "promo":   "boolean — promotional and marketing messages"
  },
  "quiet_hours": {
    "enabled":  "boolean       — whether quiet hours are active",
    "start":    "string HH:MM  — local time quiet hours begin",
    "end":      "string HH:MM  — local time quiet hours end",
    "timezone": "string        — IANA timezone (e.g. America/New_York)"
  },
  "updated_at": "string (ISO 8601 UTC)"
}
```

---

## Error Responses

All errors follow a consistent envelope:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable description of the error.",
    "details": [ ]
  }
}
```

### Common Error Codes

| HTTP Status | `code` | Meaning |
|-------------|--------|---------|
| `400` | `BAD_REQUEST` | Malformed JSON or invalid query parameters |
| `401` | `UNAUTHORIZED` | Missing or invalid `Authorization` token |
| `403` | `FORBIDDEN` | Token valid, but insufficient permissions |
| `404` | `NOTIFICATION_NOT_FOUND` | Notification ID not found for this user |
| `422` | `VALIDATION_ERROR` | Request body fails schema validation; `details` array has field-level errors |
| `429` | `RATE_LIMIT_EXCEEDED` | Too many requests; retry after `X-RateLimit-Reset` |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server failure |

#### Example `422 Unprocessable Entity`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body validation failed.",
    "details": [
      {
        "field": "quiet_hours.timezone",
        "issue": "Must be a valid IANA timezone string."
      }
    ]
  }
}
```

---

## Real-Time Notification Mechanism

### Chosen Approach: Server-Sent Events (SSE)

SSE is recommended over WebSockets for this use case because notifications are a **server-to-client, unidirectional** flow. SSE:

- Works natively over HTTP/1.1 and HTTP/2 — no upgrade handshake.
- Is automatically reconnected by the browser's `EventSource` API.
- Is simpler to load-balance and proxy than WebSockets.
- Supports named event types natively.

WebSockets are appropriate if you later need bidirectional communication (e.g., real-time chat). For notifications, SSE is the pragmatic choice.

---

### SSE Endpoint

```
GET /api/v1/notifications/stream
```

#### Request

```http
GET /api/v1/notifications/stream
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Accept: text/event-stream
Cache-Control: no-cache
```

> **Note for front-end:** The native `EventSource` API does not support custom headers. Pass the token as a query parameter for browser-native SSE, or use `fetch()` with a `ReadableStream` to handle the header.

```
GET /api/v1/notifications/stream?token=eyJhbGciOiJSUzI1NiJ9...
```

The server validates the token, then holds the connection open and pushes events as they occur.

#### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

---

### SSE Event Types

#### `notification.new` — A new notification arrived

```
id: evt_01J3KQMXZ7ABCDEF01234567
event: notification.new
data: {
  "id": "a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d",
  "type": "alert",
  "title": "Your password was changed",
  "body": "If this wasn't you, please contact support immediately.",
  "read": false,
  "created_at": "2025-06-03T14:22:00Z",
  "read_at": null,
  "action_url": "https://app.example.com/security",
  "icon": "shield",
  "metadata": { "category": "security", "priority": "high" }
}
```

#### `notification.read` — A notification was marked read (e.g., from another tab)

```
id: evt_01J3KQMXZ7ABCDEF01234568
event: notification.read
data: {
  "id": "a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d",
  "read": true,
  "read_at": "2025-06-03T15:00:45Z"
}
```

#### `notification.deleted` — A notification was deleted

```
id: evt_01J3KQMXZ7ABCDEF01234569
event: notification.deleted
data: {
  "id": "a3f1c2d4-8b7e-4f5a-9c0d-1e2f3a4b5c6d"
}
```

#### `count.updated` — Unread badge count changed

```
id: evt_01J3KQMXZ7ABCDEF01234570
event: count.updated
data: {
  "unread": 4
}
```

#### `ping` — Keepalive heartbeat (sent every 30 seconds)

```
event: ping
data: { "timestamp": "2025-06-03T15:01:00Z" }
```

---

### Front-End Integration Example

```javascript
// Using fetch + ReadableStream to support Authorization header
async function subscribeToNotifications(token) {
  const response = await fetch('/api/v1/notifications/stream', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream',
    },
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const payload = JSON.parse(line.slice(5).trim());
        handleNotificationEvent(payload);
      }
    }
  }
}

function handleNotificationEvent(payload) {
  // Update local notification state / badge count
}
```

---

### Architecture: How Real-Time Events Are Triggered

```
User Action / System Event
        │
        ▼
 Application Service Layer
        │
        ▼
 Notification Service (creates DB record)
        │
        ├──▶ Pub/Sub channel (e.g., Redis, Kafka topic)
        │
        ▼
 SSE Worker / Stream Server
 (subscribes to Pub/Sub)
        │
        ▼
 SSE connection for User ID  ──▶  Browser / Mobile Client
```

- The **notification service** writes to the database and publishes a message to a per-user pub/sub channel.
- A **lightweight SSE worker** holds open connections per authenticated user and subscribes to their channel.
- When a message arrives on the channel, the SSE worker pushes it over the open HTTP connection.
- This architecture is **horizontally scalable** — multiple SSE worker instances can each hold a subset of user connections.

---

### Reconnection & Missed Events

- The `id` field on each SSE event is a monotonic unique event ID.
- On reconnect, the browser sends `Last-Event-ID: <last_id>` automatically.
- The server uses this to **replay any missed events** since that ID from its event log (retain a sliding window of ~5 minutes in Redis or similar).
- If `Last-Event-ID` is absent or too old, the client should call `GET /api/v1/notifications` to re-sync state.

---

## Summary Table

| Method | Endpoint | Action | Auth Required |
|--------|----------|--------|---------------|
| `GET` | `/api/v1/notifications` | List notifications (paginated) | ✅ |
| `GET` | `/api/v1/notifications/:id` | Get single notification | ✅ |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark one notification as read | ✅ |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all notifications as read | ✅ |
| `DELETE` | `/api/v1/notifications/:id` | Delete a notification | ✅ |
| `GET` | `/api/v1/notifications/count` | Get unread count (badge) | ✅ |
| `GET` | `/api/v1/notifications/preferences` | Get notification preferences | ✅ |
| `PUT` | `/api/v1/notifications/preferences` | Update notification preferences | ✅ |
| `GET` | `/api/v1/notifications/stream` | SSE stream for real-time events | ✅ |

---

*Document version: 1.0 — June 2025*

---

# Stage 1

## Priority Inbox — Top-N Notification Ranking

### Problem Statement

The campus notifications application generates a high volume of notifications. Users lose track of important ones. The goal is a **Priority Inbox** that always surfaces the top `n` most important unread notifications (default: top 10, configurable to 10, 15, 20, etc.) as new notifications continuously arrive.

---

### Priority Scoring Model

Priority is determined by two factors combined into a single numeric score:

```
priority_score = type_weight × recency_score
```

#### Type Weight (placement > result > event)

| Notification Type | Weight |
|-------------------|--------|
| `placement`       | 3      |
| `result`          | 2      |
| `event`           | 1      |
| _(unknown)_       | 0      |

#### Recency Score

```
recency_score = 1 / (1 + hours_since_notification)
```

This is a **decay function**: a notification sent 1 hour ago scores higher than one from 24 hours ago, even if they share the same type. The decay is smooth and bounded between 0 and 1.

#### Example

| Type      | Hours ago | Type weight | Recency | Score  |
|-----------|-----------|-------------|---------|--------|
| Placement | 1         | 3           | 0.500   | 1.500  |
| Result    | 0.5       | 2           | 0.667   | 1.334  |
| Event     | 0.2       | 1           | 0.833   | 0.833  |
| Placement | 8         | 3           | 0.111   | 0.333  |

A very recent `event` can outrank a stale `placement` — which is intentional, since a placement notice from 3 days ago is less actionable than an event happening today.

---

### Data Structure: Min-Heap of Size N

To efficiently maintain the top-N items as an unbounded stream of notifications arrives, a **Min-Heap capped at size N** is used.

#### Why a Min-Heap?

A min-heap keeps its **lowest-priority item at the root**, which enables a fast gate check:

```
if new_item.score > heap.peek().score:
    heap.pop()      # evict the weakest item  O(log N)
    heap.push(new)  # insert the stronger one O(log N)
else:
    discard         # O(1) — heap unchanged
```

This is O(log N) per new notification regardless of how many total notifications exist, making it ideal for a live-streaming inbox.

#### Comparison with alternatives

| Approach | Insert | Query Top-N | Notes |
|----------|--------|-------------|-------|
| **Min-Heap (size N)** | O(log N) | O(N log N) | ✅ Used here — best for streaming |
| Sort full array | O(M log M) | O(N) | ❌ Re-sorts entire history every time |
| Max-Heap (unbounded) | O(log M) | O(N log M) | ❌ Grows unboundedly in memory |
| Linear scan | O(M) | O(N) | ❌ Slow for large M |

_M = total notifications seen; N = inbox size_

---

### Handling Continuous Incoming Notifications

New notifications are handled by calling `inbox.add(notification)` on each new item — for example, triggered by an SSE event from the real-time stream endpoint. The heap self-maintains:

- If the new notification is more important than the weakest item currently in the top-N, it replaces it.
- If it is weaker than all current top-N items, it is discarded in O(1).
- Duplicate notifications (same ID) are ignored via a `Set` of seen IDs.

As time passes, scores naturally decay — periodically re-scoring existing heap items (e.g., every few minutes) keeps rankings fresh without re-fetching from the API.

---

### Implementation

**Language:** JavaScript (Node.js)  
**File:** `priorityInbox.js`  
**Dependencies:** `node-fetch` (HTTP), `dotenv` (config)

#### Configuration (environment variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFICATION_API_URL` | `http://4.224.186.213/evaluation-service/notifications` | API endpoint |
| `NOTIFICATION_API_TOKEN` | _(empty)_ | Bearer token for the protected route |
| `TOP_N` | `10` | Number of top notifications to display |

#### Running

```bash
# Install dependencies
npm install

# Run with default settings (top 10)
node priorityInbox.js

# Run with custom top-N and token
TOP_N=15 NOTIFICATION_API_TOKEN=your_token node priorityInbox.js
```

#### Sample Output

```
────────────────────────────────────────────────────────────────────────
  🔔  PRIORITY INBOX  —  Top 10 of 13 notifications
────────────────────────────────────────────────────────────────────────
  # 1  [Placement ]  Score: 1.499892    6/3/2026, 7:47:25 AM
        ID      : p1
        Message : Google on-campus drive – shortlist released

  # 2  [Result    ]  Score: 1.333205    6/3/2026, 8:17:25 AM
        ID      : r1
        Message : mid-sem

  # 3  [Event     ]  Score: 0.833233    6/3/2026, 8:35:25 AM
        ID      : e2
        Message : Cultural fest committee meeting at 5 PM
  ...
```

---

### Architecture Diagram

```
Notification API (GET)
        │
        ▼
  fetchNotifications()
        │  returns []Notification
        ▼
  PriorityInbox.addAll()
        │
        ├── computeScore(n) → type_weight × recency_decay
        │
        └── MinHeap (size N)
              ├── heap.size < N       → push directly
              ├── score > heap.min    → pop min, push new
              └── score ≤ heap.min    → discard
                          │
                          ▼
              getTopN() → sorted highest-first
                          │
                          ▼
              Display / Return to UI
```

---

### Key Design Decisions

**1. Recency decay, not a hard timestamp cutoff.**
A hard cutoff (e.g., "only last 24 hours") would hide critical placement notices that arrive overnight. The decay function keeps older high-priority items visible but de-emphasises them progressively.

**2. Configurable N.**
`TOP_N` is an environment variable so the product team can set 10, 15, or 20 without code changes.

**3. No database.**
As specified, notifications are not stored — everything is computed in-memory from the API response on each fetch.

**4. Deduplication via Set.**
A `Set<id>` guards against the same notification being counted twice if the polling/streaming layer delivers duplicates.

**5. Streaming-ready.**
The `inbox.add(notification)` method accepts a single notification, so it plugs directly into the SSE handler from the real-time stream endpoint defined earlier in this document — no refactoring required when moving from batch to streaming.

---

*Document version: 1.1 — Stage 1 Priority Inbox added — June 2025*
