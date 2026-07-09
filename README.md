# Mini Doodle

A mini meeting scheduling platform. Users manage time slots, book meetings, and query availability across users.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 21, Spring Boot 3.4, PostgreSQL |
| Frontend | React, TypeScript, Vite, shadcn/ui |
| Auth | HTTP sessions (JSESSIONID cookie) |

## Prerequisites

- Java 21+
- Node.js 20+
- Docker (for PostgreSQL and backend via docker-compose)

## Quick Start

```bash
# Start database and backend
docker compose up -d

# Backend tests (without Docker)
cd backend
./mvnw verify

# Frontend (development)
cd frontend
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |

## Documentation

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [API Guide](docs/api-guide.md)
- [UI Design Brief](docs/views/design-brief.md)

## Development Workflow

- Feature branches merge into `develop`
- `main` receives release-ready versions only
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`

## License

Private — coding challenge project.
