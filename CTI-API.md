# NFON CTI API Reference

Source: https://github.com/NFON-AG/CTI-API

## Base URL
`https://providersupportdata.cloud-cfg.com/v1`

## Authentication
- JWT Bearer Token via `Authorization: Bearer <token>`
- Access Token expires after **5 minutes**
- Use Refresh Token to get new token pair

### `POST /login` — Create Access Token
- Body: `{ "username": "...", "password": "..." }`
- Returns: `{ "access-token": "...", "refresh-token": "..." }`

### `PUT /login` — Refresh Access Token
- Auth: Bearer with **refresh token**
- Returns: new `access-token` + `refresh-token` pair

### `GET /.well-known/jwks.json` — Public Keys (JWKS)
- Returns public keys for JWT validation

---

## Phone Extension Endpoints

### `GET /extensions/phone/data` — Extension Configuration
- Returns all extensions for a tenant (K-Account)
- Response: `[{ uuid, extension_number, name }]`

### `GET /extensions/phone/states` — Line Status (SSE or Snapshot)
- **Accept: text/event-stream** (default) → SSE stream (bootstraps with full state, then streams changes)
- **Accept: application/json** → one-time JSON snapshot
- Query param: `?extension=1001&extension=1002` (optional, snapshot only)
- Response schema per event:
  ```json
  { "customer": "K9999", "extension": "1001", "presence": "available", "line": "idle", "updated": "..." }
  ```
- **Presence values**: offline, available, away, busy, dnd, null
- **Line values**: unknown, offline, idle, ringing, in-use

### `GET /extensions/phone/calls` — Stream Call Details (SSE)
- Streams all call state events in real-time after connection
- Does NOT return initial state (unlike /states)
- Response schema per event:
  ```json
  {
    "uuid": "...",
    "state": "ring",
    "caller": "0891234567",
    "caller_context": "K9999",
    "callee": "089453000",
    "callee_context": "K9999",
    "direction": "inbound",
    "extension": "1000",
    "updated": "..."
  }
  ```
- **Call states**: start, caller-wait, caller-dial, caller-ring, caller-answer, dial, ring, answer, hangup, end
- **Directions**: inbound, outbound
- **Error values** (on end event): timeout, busy, cancel, reject, unspecified

### `POST /extensions/phone/calls` — Start a Call (Click-to-Dial)
- Body:
  ```json
  {
    "caller": "102",
    "caller_context": "K9999",  // optional, default: K-Account (internal)
    "callee": "49123456789",
    "callee_context": "global", // optional, values: K-Account, global, conference
    "extension": "102",         // optional override
    "timeout": 20               // optional, default 20s, max 120s
  }
  ```
- **Accept: application/json** → 202 with initial start event (uuid)
- **Accept: text/event-stream** → SSE stream of call progress
- Conference support: set `callee_context: "conference"`, provide `callee_conference_uuid`, `caller_role` (user/moderator)
- Header `X-Cloudya-Device-UUID` required for conference moderator

### `DELETE /extensions/phone/calls/{uuid}` — End/Cancel a Call
- Path param: `uuid` (from start call response)
- Returns: 204 No Content

---

## Known Limitations (from NFON docs)
- Only tested for **incoming calls directly received by an extension** with a single device
- **Not officially supported**: group calls, skill-based calls, queue-based calls, forwarded calls, multi-device per extension
- Improvements for additional scenarios are in progress

## Common Error Responses
- 400: Bad Request (validation failed)
- 401: Unauthorized
- 403: Forbidden (no license or not allowed)
- 404: Not Found
- 406: Not Acceptable (wrong MIME type)
- 500: Server Error
- All error responses include `X-Request-Id` header
