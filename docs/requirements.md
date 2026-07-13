# Mini Doodle — Requirements Specification

## 1. Overview

Mini Doodle is a high-performance meeting scheduling platform. Users manage personal time slots, convert available slots into meetings, and query aggregated availability across users.

**Terminology:** The domain concept `Calendar` exists only in the backend service layer. Public APIs and the UI must use "schedule", "time slots", or "availability" instead.

## 2. Functional Requirements

### R1 — Time Slot Management

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R1.1 | Create time slots | User can create a slot with start time and configurable duration (15 min – 8 hours) |
| R1.2 | Modify time slots | User can update start time, duration; blocked if slot has active meeting |
| R1.3 | Delete time slots | User can delete slots; blocked or cascades if slot has active meeting |
| R1.4 | Free / Busy status | User can mark slots as FREE or BUSY; only FREE slots can be booked |
| R1.5 | Overlap prevention | System rejects overlapping slots for the same user |

**API implications:**
- `POST /api/v1/slots` — create with `startAt`, `durationMinutes`
- `PATCH /api/v1/slots/{id}` — update
- `DELETE /api/v1/slots/{id}` — delete
- `PATCH /api/v1/slots/{id}/status` — toggle FREE/BUSY
- Index on `(calendar_id, start_at, end_at)` for range queries

### R2 — Meeting Scheduling

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R2.1 | Book meeting | Convert a FREE slot into a meeting; slot becomes BUSY |
| R2.2 | Meeting details | Title (required), description (optional), participants (0+) |
| R2.3 | View meetings | User sees meetings they organize or participate in |
| R2.4 | Update meeting | Organizer can edit title, description, participants |
| R2.5 | Cancel meeting | Cancelling frees the slot (status → FREE, meeting removed) |

**API implications:**
- `POST /api/v1/slots/{slotId}/meeting` — book
- `GET/PATCH/DELETE /api/v1/meetings/{id}` — manage
- `MeetingParticipant` supports registered users (by userId) and external guests (by email)

### R3 — Availability Querying

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R3.1 | Per-user availability | Return busy intervals for a user in a date range |
| R3.2 | Aggregated view | Return combined availability for multiple users |
| R3.3 | Performance | Support hundreds of users, thousands of slots |
| R3.4 | Bounded queries | Max date range: 90 days |

**API implications:**
- `GET /api/v1/availability?userIds=&from=&to=`
- Pagination on slot list endpoints
- Read-optimized DTOs, no N+1 queries

### R4 — Persistence

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R4.1 | Durable storage | All data survives service restarts |
| R4.2 | Migrations | Schema versioned via Flyway |
| R4.3 | Integrity | FK constraints, at most one scheduled meeting per slot, optimistic locking |

### R5 — Local Runtime

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R5.1 | docker-compose | `docker compose up` starts all dependencies |
| R5.2 | Self-contained | PostgreSQL included; no external services required |

### R6 — API Documentation

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R6.1 | Consumption guide | README with example flows (register → login → slot → meeting → availability) |
| R6.2 | OpenAPI | Interactive Swagger UI |

### R7 — Observability (Plus)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R7.1 | Health check | `/actuator/health` |
| R7.2 | Metrics | `/actuator/prometheus` |

### R8 — Tests (Plus)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R8.1 | Unit tests | Domain services and validation |
| R8.2 | Controller tests | `@WebMvcTest` for REST layer |
| R8.3 | Integration tests | Testcontainers with PostgreSQL |
| R8.4 | Frontend tests | Vitest + React Testing Library for critical flows |

### R9 — Authentication

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R9.1 | Registration | Email, display name, password; auto-creates domain Calendar |
| R9.2 | Login | Server-side HTTP session with httpOnly cookie |
| R9.3 | Protected routes | All slot/meeting endpoints require authentication |
| R9.4 | Availability privacy | MVP: any authenticated user can query any user's availability |

### R10 — Frontend

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| R10.1 | Stack | React, TypeScript, Vite, shadcn/ui, Tailwind CSS |
| R10.2 | State | TanStack Query for server state, React Router for navigation |
| R10.3 | Validation | Zod for form schemas |
| R10.4 | Views | Login, Register, Schedule, Meetings, Availability, Settings |

## 3. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF1 | Simple, maintainable code — thin controllers, rich domain services |
| NF2 | RFC 9457 Problem Details for API errors |
| NF3 | UTC storage; local timezone display in UI |
| NF4 | No secrets in code or logs |
| NF5 | Atomic commits with Conventional Commits format |

## 4. Business Rules (MVP)

1. One `Calendar` per `User`, created on registration.
2. `TimeSlot.status`: `FREE` or `BUSY`.
3. Booking requires a `FREE` slot; after booking, slot is `BUSY` with linked meeting.
4. Overlapping slots are rejected on create/update.
5. Participants: 0 or more; registered users resolved by email, guests stored as email only.
6. Slot duration: 15 minutes to 8 hours.

## 5. Out of Scope (MVP)

- Classic Doodle poll/vote semantics
- Email notifications
- Recurring slots
- OAuth / social login
- Payment processing
- Common free-slot finder (stretch goal for post-MVP)

## 6. Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 21, Spring Boot 3.4.x, Spring Security, Spring Data JPA |
| Database | PostgreSQL 16, Flyway |
| Frontend | React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS |
| Auth | HTTP sessions (JSESSIONID cookie) |
| Infra | Docker, docker-compose |
| API docs | springdoc-openapi |
| Metrics | Spring Actuator, Micrometer |
