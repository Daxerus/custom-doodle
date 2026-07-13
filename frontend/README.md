# Mini Doodle Frontend

React + TypeScript + Vite client for the Mini Doodle scheduling API.

## Development

```bash
npm install
npm run dev
```

API requests are proxied to `http://localhost:8080` via Vite. JWT access tokens are sent in the `Authorization` header; refresh cookies are included automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Production build |
| `npm test` | Run Vitest tests |
