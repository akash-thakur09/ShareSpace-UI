# ShareSpace Deployment Guide

## Architecture

```
Frontend (React/Vite)  →  Nginx (port 80)
                       →  API Server (NestJS, port 4000)
                       →  Yjs WebSocket Server (port 3001)
                       →  PostgreSQL (port 5432)
                       →  Redis (port 6379)
```

---

## Quick Start (Docker — recommended)

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set **at minimum**:

```dotenv
JWT_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<different-long-random-string>
OPENAI_API_KEY=<your-key>   # optional — mock responses used if omitted
```

### 2. Start all backend services

```bash
cd backend
docker compose up -d
```

This starts: PostgreSQL, Redis, API server (4000), Yjs WS server (3001).

### 3. Start the frontend

```bash
# from repo root
npm install
npm run dev        # dev server on http://localhost:5173
# or
npm run build && npm run preview   # production preview
```

---

## Production Docker (full stack)

### Backend

```bash
cd backend

# Build images
docker compose build

# Start with required secrets
JWT_SECRET=<secret> JWT_REFRESH_SECRET=<secret> docker compose up -d

# Or use a .env file (recommended)
docker compose --env-file .env up -d
```

### Frontend

```bash
# from repo root
docker build -t sharespace-ui .
docker run -p 80:80 sharespace-ui
```

The frontend Dockerfile builds the Vite app and serves it via Nginx.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | Access token signing secret |
| `JWT_REFRESH_SECRET` | ✅ | — | Refresh token signing secret |
| `DB_HOST` | — | `localhost` | Postgres host |
| `DB_PORT` | — | `5432` | Postgres port |
| `DB_USERNAME` | — | `postgres` | Postgres user |
| `DB_PASSWORD` | — | `postgres` | Postgres password |
| `DB_DATABASE` | — | `sharespace` | Postgres database name |
| `REDIS_HOST` | — | `localhost` | Redis host |
| `REDIS_PORT` | — | `6379` | Redis port |
| `REDIS_PUBSUB_ENABLED` | — | `true` | Enable horizontal scaling |
| `CORS_ORIGIN` | — | `http://localhost:3000` | Allowed frontend origin(s), comma-separated |
| `API_PORT` | — | `4000` | REST API port |
| `YJS_PORT` | — | `3001` | Yjs WebSocket port |
| `OPENAI_API_KEY` | — | — | OpenAI key (mock used if absent) |
| `OPENAI_MODEL` | — | `gpt-4o-mini` | OpenAI model |
| `LOG_LEVEL` | — | `info` | Pino log level |
| `SNAPSHOT_INTERVAL_MS` | — | `30000` | Yjs compaction interval |

### Frontend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000` | Backend REST API URL |
| `VITE_YJS_SERVER_URL` | `ws://localhost:3001` | Yjs WebSocket URL |

---

## Development (hot reload)

```bash
cd backend
docker compose -f docker-compose.dev.yml up -d
```

Source is volume-mounted — changes to `backend/src/` reload automatically.

---

## Health Checks

| Endpoint | Service |
|---|---|
| `GET http://localhost:4000/health` | API + DB + Redis |
| `GET http://localhost:3001/health` | Yjs WS server |

---

## Scaling Horizontally

Run multiple `yjs` containers — they coordinate via Redis Pub/Sub:

```bash
docker compose up -d --scale yjs=3
```

Each instance gets a unique `SERVER_ID` (auto-generated UUID) for loop prevention.

---

## Stopping

```bash
cd backend
docker compose down           # stop, keep volumes
docker compose down --volumes # stop + delete DB/Redis data
```

---

## CI/CD (GitHub Actions example)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build backend image
        run: docker build -t sharespace-api ./backend

      - name: Build frontend image
        run: docker build -t sharespace-ui .

      - name: Push & deploy
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          JWT_REFRESH_SECRET: ${{ secrets.JWT_REFRESH_SECRET }}
        run: |
          # push to your registry and deploy
```

---

## Security Checklist (production)

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are long random strings (32+ chars)
- [ ] `CORS_ORIGIN` is set to your actual frontend domain
- [ ] `NODE_ENV=production` is set
- [ ] Postgres password is changed from default
- [ ] Redis is not exposed publicly (internal network only)
- [ ] HTTPS/WSS termination at load balancer or reverse proxy
- [ ] `OPENAI_API_KEY` stored as a secret, not in version control
