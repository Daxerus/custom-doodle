# Mini Doodle — API Consumption Guide

## Quick Start

```bash
# 1. Start services
docker compose up -d

# 2. Register a user (session cookie is set automatically)
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"displayName":"Alice","email":"alice@example.com","password":"securePass123"}'

# 3. Login (or reuse cookies.txt from register)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"alice@example.com","password":"securePass123"}'
```

## Authentication

Authentication uses **server-side HTTP sessions**. After login or register, the backend sets a `JSESSIONID` cookie. Send it on every subsequent request:

```bash
curl -b cookies.txt ...
```

For mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`), also send the CSRF token from the `XSRF-TOKEN` cookie:

```bash
CSRF=$(grep XSRF-TOKEN cookies.txt | awk '{print $7}')
curl -X POST http://localhost:8080/api/v1/slots \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: $CSRF" \
  ...
```

The React frontend handles cookies and CSRF automatically via the Vite dev proxy (`withCredentials: true`).

Logout invalidates the session server-side:

```bash
curl -X POST http://localhost:8080/api/v1/auth/logout -b cookies.txt
```

## Create a Time Slot

```bash
curl -X POST http://localhost:8080/api/v1/slots \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"startAt":"2026-07-15T10:00:00Z","durationMinutes":60,"status":"FREE"}'
```

## Book a Meeting

```bash
curl -X POST http://localhost:8080/api/v1/slots/{slotId}/meeting \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"title":"Team sync","description":"Weekly standup","participantEmails":["bob@example.com"]}'
```

## Query Availability

```bash
curl "http://localhost:8080/api/v1/availability?userIds={userId1},{userId2}&from=2026-07-15T00:00:00Z&to=2026-07-22T00:00:00Z" \
  -b cookies.txt
```

## Interactive Documentation

Open http://localhost:8080/swagger-ui.html for the full OpenAPI specification. Use your browser session or curl with cookies for authenticated endpoints.

## Error Handling

Errors follow RFC 9457 Problem Details. Common status codes:

| Status | Meaning |
|--------|---------|
| 400 | Validation error |
| 401 | Not authenticated (no valid session) |
| 403 | Not authorized for resource |
| 404 | Resource not found |
| 409 | Conflict (e.g. slot overlap) |
