# Mini Doodle

A mini meeting scheduling platform. Users manage time slots, book meetings, and query availability across users.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 21, Spring Boot 3.4, PostgreSQL |
| Frontend | React, TypeScript, Vite, shadcn/ui |
| Auth | JWT (access token + refresh cookie) |

## Prerequisites

- Java 21+
- Node.js 20+
- Docker (for PostgreSQL and backend via docker-compose)

## Quick Start

```bash
# Start database and backend (rebuild image after backend changes)
docker compose up -d --build

# Full stack including frontend (single command)
docker compose -f docker-compose.full.yml up -d --build

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
| Frontend (dev) | http://localhost:5173 |
| Frontend (docker full) | http://localhost:3000 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |

## Documentation

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [API Guide](docs/api-guide.md) — curl, Swagger, and Postman
- [Postman Collection](docs/postman/Mini-Doodle-API.postman_collection.json) — import to test the API without the frontend

## Development Workflow

- Feature branches merge into `develop`
- `main` receives release-ready versions only
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`

## License

Private — coding challenge project.
