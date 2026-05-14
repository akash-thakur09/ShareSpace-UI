# ShareSpace — Real-Time Collaborative Document Editor

A production-grade, offline-first collaborative document editor built with React, NestJS, and Yjs. Multiple users can edit documents simultaneously with live cursor presence, role-based access control, and automatic offline sync.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker (Recommended)](#running-with-docker-recommended)
  - [Running Locally (Manual)](#running-locally-manual)
- [API Reference](#api-reference)
- [Role-Based Access Control](#role-based-access-control)
- [AI Assistant](#ai-assistant) *(coming soon)*
- [Offline Support](#offline-support)
- [Horizontal Scaling](#horizontal-scaling)
- [Observability](#observability)
- [Scripts](#scripts)

---

## Features

### Real-Time Collaboration
- Multiple users edit the same document simultaneously using **CRDT-based sync** (Yjs)
- Live cursor positions and user presence with color-coded avatars
- Changes are merged automatically — no conflicts, no overwriting

### Offline-First
- Documents are persisted locally in **IndexedDB** before the WebSocket connects
- Continue editing while offline; changes sync automatically when reconnected
- Permanent auth errors (close code 1008) stop retry loops cleanly

### Document Management
- Create, rename, pin, and delete documents
- Dashboard shows **owned** and **shared** documents separately
- Short public IDs (6-character nanoid) for easy sharing

### Role-Based Access Control
- Four roles: **Owner**, **Editor**, **Commenter**, **Viewer**
- Owners can invite collaborators by email and change or revoke their roles
- Role is enforced at both the REST API and the WebSocket server level
- Role changes take effect within 30 seconds without a page reload

### Document Snapshots & History
- Automatic snapshots saved to PostgreSQL on a configurable interval
- Manual snapshot creation by editors and owners
- Restore any previous snapshot

### Comments
- Thread-based comments on documents
- Commenters and above can post; viewers can read
- Relative timestamps and user avatars

### AI Writing Assistant *(Coming Soon)*
- AI-powered writing assistance is planned but not yet implemented
- Intended actions: **Improve writing**, **Summarize**, **Fix grammar**, and free-form custom prompts
- Will be powered by OpenAI and integrated directly into the editor sidebar

### Health Monitoring
- `/health` endpoint checks PostgreSQL, Redis, Yjs WebSocket, and heap memory
- Alerts if heap exceeds 512 MB

### Observability
- Structured JSON logging via **Pino**
- **Prometheus** metrics endpoint (`/metrics`)
- Correlation IDs on every HTTP request
- Global exception filter with consistent error shapes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + TypeScript + Vite |
| Rich text editor | TipTap 3 (StarterKit + Collaboration extensions) |
| Real-time sync | Yjs, y-websocket, y-indexeddb |
| Routing | React Router 7 |
| Styling | Tailwind CSS |
| Backend framework | NestJS 10 |
| Database ORM | TypeORM + PostgreSQL 15 |
| Authentication | JWT (access + refresh tokens), bcrypt, Passport |
| Caching / Pub-Sub | Redis 7 (ioredis) |
| Logging | Pino + nestjs-pino |
| Metrics | prom-client (Prometheus) |
| Validation | class-validator + class-transformer |
| Rate limiting | @nestjs/throttler |
| AI | OpenAI API *(planned — not yet implemented)* |
| Containerisation | Docker + Docker Compose |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Frontend  (React + Vite)                    │
│                                                              │
│  EditorCanvas ── TipTap + Yjs Collaboration extensions       │
│  useOfflineEditor ── IndexedDB persistence + WS provider     │
│  AiAssistantPanel ── AI sidebar (coming soon)                │
│  CommentsPanel ── Thread-based comments                      │
│  ShareModal ── Permission management                         │
│  PresenceAvatars ── Live collaborator display                │
└──────────────────────┬───────────────────────────────────────┘
                       │  HTTP (port 4000)  +  WS (port 3001)
┌──────────────────────▼───────────────────────────────────────┐
│                  Backend  (NestJS)                           │
│                                                              │
│  REST API (port 4000)                                        │
│  ├── AuthModule      — register, login, refresh, logout      │
│  ├── DocumentModule  — CRUD, snapshots, comments, perms      │
│  ├── AiModule        — AI integration (coming soon)          │
│  ├── HealthModule    — DB / Redis / WS / memory checks       │
│  └── ObservabilityModule — Pino, Prometheus, correlation     │
│                                                              │
│  Yjs WebSocket Server (port 3001)                            │
│  ├── JWT auth on every connection                            │
│  ├── Incremental update persistence → Redis list             │
│  ├── Debounced snapshots → PostgreSQL                        │
│  └── Redis Pub/Sub for cross-instance fan-out                │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                  Data Layer                                  │
│                                                              │
│  PostgreSQL 15                    Redis 7                    │
│  ├── users                        ├── Yjs update lists       │
│  ├── documents                    ├── Pub/Sub channels       │
│  ├── document_permissions         └── (optional caching)     │
│  ├── document_snapshots                                      │
│  └── document_comments                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
.
├── src/                          # Frontend (React)
│   ├── app/                      # App shell, routes
│   ├── components/
│   │   ├── layout/               # Layout wrappers
│   │   ├── panels/               # AiAssistantPanel (coming soon), CommentsPanel
│   │   └── ui/                   # Modal, ShareModal, ProtectedRoute, etc.
│   ├── contexts/                 # AuthContext, token helpers
│   ├── features/
│   │   ├── auth/                 # LoginPage, RegisterPage
│   │   ├── editor/               # EditorCanvas, EditorHeader, Toolbar, Sidebar
│   │   └── presence/             # PresenceAvatars, useAwareness
│   ├── hooks/                    # useOfflineEditor, useConnectionStatus
│   └── services/                 # API clients (document, comments, permissions)
│
└── backend/                      # Backend (NestJS)
    └── src/
        ├── app.module.ts         # Root module
        ├── main.ts               # REST API bootstrap (port 4000)
        ├── yjs-server.ts         # Yjs WebSocket server (port 3001)
        ├── cluster/              # Redis Pub/Sub bus
        ├── modules/
        │   ├── auth/             # JWT auth, user entity, guards, strategies
        │   ├── document/         # Documents, permissions, snapshots, comments
        │   ├── ai/               # AI module (coming soon)
        │   └── health/           # Health indicators
        └── observability/        # Pino logger, Prometheus metrics, filters
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** 9+
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)

### Environment Variables

Both `.env` files are **git-ignored** and never committed. Example templates are provided — copy them and fill in your values.

#### Frontend

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000` | Backend REST API base URL |
| `VITE_YJS_SERVER_URL` | `ws://localhost:3001` | Yjs WebSocket server URL |

#### Backend

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` or `production` |
| `API_PORT` | `4000` | REST API port |
| `YJS_PORT` | `3001` | Yjs WebSocket server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | *(set this)* | PostgreSQL password |
| `DB_DATABASE` | `sharespace` | PostgreSQL database name |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password (optional) |
| `REDIS_PUBSUB_ENABLED` | `true` | Set `false` for single-instance deployments |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |
| `JWT_SECRET` | *(set this)* | Access token signing secret |
| `JWT_REFRESH_SECRET` | *(set this)* | Refresh token signing secret |
| `OPENAI_API_KEY` | — | OpenAI key *(reserved for future AI feature)* |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model *(reserved for future AI feature)* |
| `SNAPSHOT_INTERVAL_MS` | `30000` | Yjs snapshot interval in milliseconds |
| `LOG_LEVEL` | `debug` | Pino log level |

> **Security:** Never commit `.env` files. Use a secrets manager or CI environment variables in production. JWT secrets must be long, random strings in production.

---

### Running with Docker (Recommended)

The `backend/docker-compose.yml` spins up PostgreSQL, Redis, and the API together.

```bash
# 1. Start infrastructure + API
cd backend
docker-compose up -d

# 2. Start the Yjs WebSocket server (separate process)
npm install
npm run dev:yjs

# 3. Start the frontend (from the project root)
cd ..
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

---

### Running Locally (Manual)

#### 1. Start PostgreSQL and Redis

You can use Docker just for the databases:

```bash
cd backend
docker-compose up -d postgres redis
```

Or install and run PostgreSQL 15 and Redis 7 natively and create a database named `sharespace`.

#### 2. Backend — REST API

```bash
cd backend
npm install
npm run dev:api        # starts on http://localhost:4000
```

#### 3. Backend — Yjs WebSocket Server

Open a second terminal:

```bash
cd backend
npm run dev:yjs        # starts on ws://localhost:3001
```

#### 4. Frontend

Open a third terminal from the project root:

```bash
npm install
npm run dev            # starts on http://localhost:5173
```

#### 5. Verify everything is running

```bash
curl http://localhost:4000/health
```

Expected response includes status for `postgres`, `redis`, `yjs-websocket`, and `memory_heap`.

---

## API Reference

All endpoints (except `/auth/*` and `/health`) require a `Bearer` token in the `Authorization` header.

### Authentication — `/auth`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Create account | No |
| POST | `/auth/login` | Login, returns access token + sets refresh cookie | No |
| POST | `/auth/refresh` | Refresh access token using cookie | No |
| POST | `/auth/logout` | Invalidate tokens | Yes |
| GET | `/auth/me` | Get current user | Yes |

Rate limit: 10 requests/minute for register and login.

### Documents — `/documents`

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| POST | `/documents` | — | Create a new document |
| GET | `/documents` | — | List owned and shared documents |
| GET | `/documents/:id` | Viewer | Get document details |
| PUT | `/documents/:id` | Editor | Update title or metadata |
| DELETE | `/documents/:id` | Owner | Delete document |
| POST | `/documents/:id/pin` | Viewer | Toggle pin status |

### Permissions — `/documents/:id/permissions`

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| GET | `/documents/:id/permissions` | Viewer | List all collaborators |
| POST | `/documents/:id/permissions` | Owner | Invite user by email |
| PUT | `/documents/:id/permissions/:userId` | Owner | Change a user's role |
| DELETE | `/documents/:id/permissions/:userId` | Owner | Revoke access |

### Snapshots — `/documents/:id/snapshots`

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| GET | `/documents/:id/snapshots` | Viewer | List snapshots |
| POST | `/documents/:id/snapshots` | Editor | Create snapshot |
| POST | `/documents/:id/snapshots/:snapshotId/restore` | Editor | Restore snapshot |

### Comments — `/documents/:id/comments`

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| GET | `/documents/:id/comments` | Viewer | List comments |
| POST | `/documents/:id/comments` | Commenter | Add comment |
| DELETE | `/documents/:id/comments/:commentId` | Commenter | Delete own comment |

### AI — `/ai` *(Coming Soon)*

> The AI endpoint exists in the codebase but the feature is not yet fully implemented. The routes below are reserved for the upcoming AI assistant.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/chat` | *(not yet active)* AI writing assistance |

### Health — `/health`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Check PostgreSQL, Redis, Yjs WS, and memory |

---

## Role-Based Access Control

| Permission | Viewer | Commenter | Editor | Owner |
|---|:---:|:---:|:---:|:---:|
| Read document | ✓ | ✓ | ✓ | ✓ |
| Edit document content | | | ✓ | ✓ |
| Post comments | | ✓ | ✓ | ✓ |
| Create snapshots | | | ✓ | ✓ |
| Restore snapshots | | | ✓ | ✓ |
| Manage permissions | | | | ✓ |
| Delete document | | | | ✓ |

Roles are enforced at the REST API level (via `DocumentRoleGuard`) and at the Yjs WebSocket server level. Role changes propagate to active sessions within 60 seconds via periodic re-validation.

---

## AI Assistant *(Coming Soon)*

The AI writing assistant is planned for a future release. The UI panel (`AiAssistantPanel`) and backend module (`AiModule`) are scaffolded in the codebase but the feature is not yet active.

**Planned actions:**
- **Improve writing** — rewrite for clarity and professionalism
- **Summarize** — produce a 2–4 sentence summary
- **Fix grammar** — correct spelling, grammar, and punctuation
- **Custom prompts** — ask anything about the document content

Once implemented, it will be powered by OpenAI and available directly in the editor sidebar.

---

## Offline Support

ShareSpace uses an offline-first architecture:

1. When you open a document, **IndexedDB** loads the last known state immediately — no waiting for the network.
2. The **Yjs WebSocket provider** connects in the background and syncs any missed updates.
3. If you lose connectivity, you can keep editing. Changes are queued locally.
4. When the connection is restored, Yjs merges your offline changes with the server state automatically using CRDT semantics — no conflicts.

The connection status badge in the editor header shows `Connected`, `Connecting`, or `Offline` in real time.

---

## Horizontal Scaling

The Yjs server supports multiple instances behind a load balancer:

- Every Yjs update is appended to a **Redis list** for persistence.
- Updates are also published to a **Redis Pub/Sub channel**.
- Other instances receive the update via Pub/Sub, apply it to their in-memory Yjs doc, and broadcast to their own WebSocket clients.
- Loop prevention: each instance tags its messages with a unique `SERVER_ID` and drops its own messages when received via Pub/Sub.

To disable Pub/Sub for single-instance deployments:

```env
REDIS_PUBSUB_ENABLED=false
```

---

## Observability

| Signal | Tool | Endpoint / Location |
|--------|------|---------------------|
| Structured logs | Pino (JSON) | stdout |
| HTTP request logs | pino-http | stdout |
| Metrics | Prometheus (prom-client) | `GET /metrics` |
| Health checks | @nestjs/terminus | `GET /health` |
| Correlation IDs | Custom middleware | `X-Correlation-Id` header |
| Exception handling | Global exception filter | All unhandled errors |

---

## Scripts

### Frontend (project root)

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + production build
npm run preview    # Preview production build
npm run lint       # ESLint
```

### Backend (`backend/`)

```bash
npm run dev:api          # Start REST API with hot reload (port 4000)
npm run dev:yjs          # Start Yjs WebSocket server with hot reload (port 3001)
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled output (production)
npm run lint             # ESLint
npm run format           # Prettier
npm run migration:generate  # Generate TypeORM migration
npm run migration:run       # Run pending migrations
```

### Docker

```bash
# Start all services (PostgreSQL, Redis, API)
cd backend && docker-compose up -d

# Stop all services
cd backend && docker-compose down

# View logs
cd backend && docker-compose logs -f api
```
