# Mini Doodle — API Consumption Guide

This guide covers how to exercise the API **without the frontend**. You can use [Swagger UI](http://localhost:8080/swagger-ui.html), [curl](#quick-start-curl), or the [Postman collection](postman/Mini-Doodle-API.postman_collection.json).

## Quick Start

```bash
# 1. Start services (rebuild backend image after code changes)
docker compose up -d --build

# 2. Open interactive docs
# http://localhost:8080/swagger-ui.html
```

| Tool | URL / file |
|------|------------|
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Postman collection | [docs/postman/Mini-Doodle-API.postman_collection.json](postman/Mini-Doodle-API.postman_collection.json) |
| Health check | http://localhost:8080/actuator/health |

## Authentication

Authentication uses **JWT access tokens** plus an **httpOnly refresh cookie**:

1. Call `POST /auth/register` or `POST /auth/login`.
2. Save the `accessToken` from the JSON response.
3. Send `Authorization: Bearer <accessToken>` on protected endpoints.
4. When the access token expires, call `POST /auth/refresh` with the refresh cookie to get a new access token.

In Swagger UI, click **Authorize** and paste the access token (without the `Bearer` prefix if the UI adds it automatically).

## Quick Start (curl)

```bash
# Register a user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"displayName":"Alice","email":"alice@example.com","password":"securePass123"}'

# Login (save accessToken from response)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"alice@example.com","password":"securePass123"}'

# Set TOKEN from the accessToken field in the login/register response
TOKEN="paste-access-token-here"
```

Authenticated requests:

```bash
curl http://localhost:8080/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

Refresh when expired:

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh -b cookies.txt -c cookies.txt
```

Logout invalidates all issued access and refresh tokens for the user and clears the refresh cookie:

```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt
```

After logout, `GET /auth/me` with the same access token returns `401`.

## Create a Time Slot

```bash
curl -X POST http://localhost:8080/api/v1/slots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startAt":"2026-07-15T10:00:00Z","durationMinutes":60,"status":"FREE"}'
```

## Book a Meeting

Book on a **FREE** slot owned by the authenticated user:

```bash
curl -X POST http://localhost:8080/api/v1/slots/{slotId}/meeting \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Team sync","description":"Weekly standup","participantEmails":["bob@example.com"]}'
```

## Cancel a Meeting

Returns the cancelled meeting with `status: CANCELLED` and frees the associated slot:

```bash
curl -X DELETE http://localhost:8080/api/v1/meetings/{meetingId} \
  -H "Authorization: Bearer $TOKEN"
```

## Query Availability

```bash
curl "http://localhost:8080/api/v1/availability?userIds={userId1},{userId2}&from=2026-07-15T00:00:00Z&to=2026-07-22T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"
```

## Suggested Evaluation Flow

1. **Register** two users (organizer + participant).
2. **Login** as the organizer and save the `accessToken`.
3. **Create** a FREE time slot.
4. **Book** a meeting on that slot, inviting the participant by email.
5. **List meetings** and **query availability** for both user IDs.
6. **Cancel** the meeting (DELETE) and verify the slot can be rebooked.
7. **Logout**.

## Interactive Documentation

Open http://localhost:8080/swagger-ui.html for the full OpenAPI specification.

1. Run `POST /auth/register` or `POST /auth/login`.
2. Copy `accessToken` from the response.
3. Click **Authorize** and paste the token.

## Error Handling

Errors follow RFC 9457 Problem Details. Common status codes:

| Status | Meaning |
|--------|---------|
| 400 | Validation error |
| 401 | Missing or expired access token |
| 403 | Not authorized for the resource |
| 404 | Resource not found |
| 409 | Conflict (e.g. slot overlap or slot already booked) |
