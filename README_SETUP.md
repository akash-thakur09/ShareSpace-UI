# ShareSpace — Setup & Run Guide

> Complete guide for getting ShareSpace running locally or in production.

---

## 1. Project Overview

ShareSpace is a full-stack, production-grade real-time collaborative document editor — similar to Google Docs or Notion. Multiple users can edit the same document simultaneously, see each other's cursors, leave comments, and manage access through a role-based permission system.

### Key Features

- Real-time multi-user editing via Yjs CRDTs (conflict-free, no data loss)
- Rich text formatting — headings, lists, code blocks, bold/italic, etc.
- User presence with live cursor tracking
- Role-based access control (owner, editor, commenter, viewer)
- Document sharing by email
- Comment threads per document
- Version history with snapshot restore
- Offline-first editing (IndexedDB) — syncs automatically on reconnect
- AI writing assistant (improve, summarize, grammar check)
- Horizontal scaling via Redis Pub/Sub

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19, TypeScript |
| Styling | Tailwind CSS |
| Rich Text Editor | TipTap v3 (ProseMirror) |
| CRDT / Collaboration | Yjs 13.x |
| WebSocket Client | y-websocket |
| Offline Persistence | y-indexeddb |
| Routing | React Router v7 |
| Build Tool | Vite 7 |
| Backend Framework | NestJS 10 (Node.js + TypeScript) |
| WebSocket Server | Custom Yjs WS server (ws library) |
| Database | PostgreSQL 15 via TypeORM |
| Caching / Pub-Sub | Redis 7 via ioredis |
| Authentication | JWT (access + refresh tokens) + bcrypt |
| Logging | Pino |
| Metrics | Prometheus (prom-client) |
| Containerization | Docker + Docker Compose |

---

## 3. Prerequisites

### Required Tools

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| Docker Desktop | 24.x | `docker --version` |
| Git | any | `git --version` |

PostgreSQL and Redis do **not** need to be installed locally — Docker handles them.

### Install Node.js

- macOS: `brew install node`
- Ubuntu: `sudo apt install nodejs npm`
- Windows: download from [nodejs.org](https://nodejs.org/)

### Install Docker Desktop

Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/).

---

## 4. Environment Variables

### Frontend (`.env` at repo root)

```dotenv
VITE_API_URL=http://localhost:4000        # REST API base URL
VITE_YJS_SERVER_URL=ws://localhost:3001   # Yjs WebSocket URL
```

Copy from the example: `cp .env.example .env`

### Backend (`backend/.env`)

```dotenv
# Server
NODE_ENV=development
API_PORT=4000
YJS_PORT=3001

# Database (handled by Docker)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=sharespace

# Redis (handled by Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PUBSUB_ENABLED=true

# Auth — CHANGE THESE IN PRODUCTION
JWT_SECRET=change_me_to_a_long_random_secret
JWT_REFRESH_SECRET=change_me_to_another_long_random_secret

# CORS — comma-separated allowed origins
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# AI Assistant (optional — mock responses used if absent)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Observability
LOG_LEVEL=debug
SNAPSHOT_INTERVAL_MS=30000
```

Copy from the example: `cp backend/.env.example backend/.env`

---

## 5. Installation Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd sharespace

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# 4. Set up environment files
cp .env.example .env
cp backend/.env.example backend/.env
```

---

## 6. Running the Project

### Option A — Docker (recommended, easiest)

Start Docker Desktop, then run:

```bash
# Windows (PowerShell)
.\start-app.ps1

# macOS / Linux
cd backend
docker compose -f docker-compose.dev.yml up -d
cd ..
```

Then start the frontend:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Option B — Manual (without Docker)

You need PostgreSQL and Redis installed locally.

**Terminal 1 — API server:**
```bash
cd backend
npm run dev:api
```

**Terminal 2 — Yjs WebSocket server:**
```bash
cd backend
npm run dev:yjs
```

**Terminal 3 — Frontend:**
```bash
npm run dev
```

---

## 7. Docker Setup

The recommended way to run the full backend stack is Docker Compose.

### Development (hot reload)

```bash
cd backend
docker compose -f docker-compose.dev.yml up -d
```

This starts four containers:

| Container | Port | Description |
|---|---|---|
| `sharespace-db` | 5432 | PostgreSQL 15 |
| `sharespace-redis` | 6379 | Redis 7 |
| `sharespace-api-dev` | 4000 | NestJS REST API (hot reload) |
| `sharespace-yjs-dev` | 3001 | Yjs WebSocket server (hot reload) |

Source code is volume-mounted — changes to `backend/src/` reload automatically.

### Production

```bash
cd backend
docker compose up -d
```

### Useful Docker Commands

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f api
docker compose logs -f yjs

# Stop services (keep data)
docker compose down

# Stop and wipe all data
docker compose down --volumes

# Restart a service
docker compose restart api

# Scale Yjs horizontally (Redis Pub/Sub handles sync)
docker compose up -d --scale yjs=3
```

---

## 8. Port Reference

| Service | Port | Protocol |
|---|---|---|
| Frontend (Vite dev) | 5173 | HTTP |
| REST API | 4000 | HTTP |
| Yjs WebSocket | 3001 | WebSocket |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |

---

## 9. Verify the Setup

```bash
# API health check
curl http://localhost:4000/health
# Expected: {"status":"ok",...}

# Yjs server health
curl http://localhost:3001/health
# Expected: {"status":"ok",...}
```

Open the app in two browser windows and type in one — changes should appear instantly in the other.

---

## 10. Common Issues & Fixes

### Docker is not running

Start Docker Desktop from the Start Menu (Windows) or Applications (macOS). Wait for the whale icon to appear in the system tray, then retry.

### Port already in use

```bash
# Find the process (Linux/macOS)
lsof -i :4000

# Find the process (Windows)
netstat -ano | findstr :4000

# Kill it (Linux/macOS)
kill -9 <PID>

# Kill it (Windows)
taskkill /PID <PID> /F
```

### WebSocket connection fails

- Confirm the Yjs server is running: `curl http://localhost:3001/health`
- Check `VITE_YJS_SERVER_URL` in `.env` matches the running port
- Check browser console for CORS or auth errors

### Auth / token refresh issues

- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set in `backend/.env`
- Clear browser cookies and localStorage, then reload
- Confirm the API is reachable: `curl http://localhost:4000/health`

### Database connection failed

```bash
# Check PostgreSQL container is healthy
docker compose ps

# Connect manually
docker exec -it sharespace-db psql -U postgres -d sharespace
```

### Module not found / clean install

```bash
# Frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## 11. Folder Structure

```
sharespace/
├── src/                          # Frontend (React + Vite)
│   ├── app/                      # App entry, routing
│   ├── components/
│   │   ├── layout/               # WorkspaceLayout
│   │   ├── panels/               # AI assistant, comments panels
│   │   └── ui/                   # Modals, badges, guards
│   ├── contexts/                 # Auth context + token management
│   ├── features/
│   │   ├── auth/                 # Login, Register pages
│   │   ├── editor/               # EditorCanvas, toolbar, header, sidebar
│   │   └── presence/             # Awareness avatars + hook
│   ├── hooks/                    # useConnectionStatus, useOfflineEditor
│   ├── services/                 # API clients (document, auth, AI, comments)
│   ├── editor.types.ts
│   ├── index.css
│   └── main.tsx
│
├── backend/                      # Backend (NestJS + Yjs server)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/             # JWT auth, login, register, refresh
│   │   │   ├── document/         # CRUD, permissions, comments, snapshots
│   │   │   ├── ai/               # AI assistant endpoint
│   │   │   └── health/           # Health check endpoints
│   │   ├── observability/        # Logging, metrics, error filter
│   │   ├── cluster/              # Redis Pub/Sub for horizontal scaling
│   │   ├── app.module.ts
│   │   ├── main.ts               # REST API server (port 4000)
│   │   └── yjs-server.ts         # Yjs WebSocket server (port 3001)
│   ├── docker-compose.yml        # Production compose
│   ├── docker-compose.dev.yml    # Development compose (hot reload)
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── .env                          # Frontend env vars
├── .env.example                  # Frontend env template
├── start-app.ps1                 # Windows one-click startup script
├── Dockerfile                    # Frontend Docker image (Nginx)
├── nginx.conf                    # Nginx config for frontend container
├── netlify.toml                  # Netlify deployment config
└── README_SETUP.md               # This file
```

---

## 12. API Overview

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, returns access token + sets refresh cookie |
| POST | `/auth/refresh` | Rotate tokens using httpOnly refresh cookie |
| POST | `/auth/logout` | Revoke tokens |
| GET | `/auth/me` | Get current user |

### Documents

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| GET | `/documents` | — | List owned + shared documents |
| POST | `/documents` | — | Create a new document |
| GET | `/documents/:publicId` | VIEWER | Get document metadata |
| PUT | `/documents/:publicId` | EDITOR | Update title / metadata |
| DELETE | `/documents/:publicId` | OWNER | Delete document |

### Snapshots

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| POST | `/documents/:publicId/snapshots` | EDITOR | Create snapshot |
| GET | `/documents/:publicId/snapshots` | VIEWER | List snapshots |
| POST | `/documents/:publicId/snapshots/:id/restore` | EDITOR | Restore snapshot |

### Permissions

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| GET | `/documents/:publicId/permissions` | VIEWER | List permissions |
| POST | `/documents/:publicId/permissions` | OWNER | Share with user by email |
| PUT | `/documents/:publicId/permissions/:userId` | OWNER | Update user role |
| DELETE | `/documents/:publicId/permissions/:userId` | OWNER | Revoke access |

### Comments

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| GET | `/documents/:publicId/comments` | VIEWER | List comments |
| POST | `/documents/:publicId/comments` | COMMENTER | Add comment |
| DELETE | `/documents/:publicId/comments/:id` | COMMENTER | Delete comment |

### Other

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/chat` | AI writing assistant |
| GET | `/health` | API + DB + Redis health |
| GET | `/metrics` | Prometheus metrics |

### WebSocket

Connect to the Yjs server for real-time collaboration:

```
ws://localhost:3001?doc=<publicId>&token=<accessJwt>
```

Uses the standard y-websocket binary protocol. The server validates the JWT and enforces document roles on every connection.

---

## 13. Production Checklist

- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (32+ random chars)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGIN` to your actual frontend domain
- [ ] Change default PostgreSQL password
- [ ] Keep Redis on an internal network (not publicly exposed)
- [ ] Use HTTPS/WSS (terminate at load balancer or reverse proxy)
- [ ] Store `OPENAI_API_KEY` as a secret, not in version control
- [ ] Run `docker compose up -d` (not the dev compose)
