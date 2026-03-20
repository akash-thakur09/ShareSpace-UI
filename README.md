# ShareSpace

A production-grade real-time collaborative document editor built with React, TypeScript, and Yjs CRDTs.

## Features

- Real-time multi-user editing with conflict-free CRDTs (Yjs)
- Rich text formatting — headings, lists, code blocks, bold/italic
- User presence with live cursor tracking
- Role-based access control (owner, editor, commenter, viewer)
- Document sharing by email
- Comment threads per document
- Version history with snapshot restore
- Offline-first editing — syncs automatically on reconnect
- AI writing assistant (improve, summarize, grammar check)
- Horizontal scaling via Redis Pub/Sub
- JWT authentication with refresh token rotation

## Tech Stack

**Frontend** — React 19, TypeScript, TipTap, Yjs, y-websocket, Tailwind CSS, Vite, React Router v7

**Backend** — NestJS 10, TypeScript, PostgreSQL 15 (TypeORM), Redis 7, JWT + bcrypt, Pino, Prometheus

**Infrastructure** — Docker, Docker Compose, Nginx

## Quick Start

The easiest way to run everything is Docker + the startup script.

**Prerequisites**: Node.js 18+, Docker Desktop

```bash
# 1. Clone and install
git clone <repo-url> && cd sharespace
npm install
cd backend && npm install && cd ..

# 2. Set up environment files
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Start backend (Docker)
# Windows:
.\start-app.ps1

# macOS / Linux:
cd backend && docker compose -f docker-compose.dev.yml up -d && cd ..

# 4. Start frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

For full setup details, environment variables, and troubleshooting see [README_SETUP.md](README_SETUP.md).

## Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (React + Yjs)              │
│              Port 5173                      │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
   REST API        WebSocket
       │               │
       ▼               ▼
┌────────────┐  ┌────────────┐
│ NestJS API │  │ Yjs Server │
│  Port 4000 │  │  Port 3001 │
└─────┬──────┘  └─────┬──────┘
      │                │
      └───────┬────────┘
              ▼
       ┌────────────┐     ┌────────────┐
       │ PostgreSQL │     │   Redis    │
       │  Port 5432 │     │  Port 6379 │
       └────────────┘     └────────────┘
```

The frontend connects to the REST API for auth, document management, permissions, and comments. It connects to the Yjs WebSocket server for real-time CRDT sync and presence. Redis handles pub/sub for horizontal scaling across multiple Yjs instances.

## Development Commands

```bash
# Frontend
npm run dev        # dev server (port 5173)
npm run build      # production build
npm run lint       # ESLint

# Backend (from backend/)
npm run dev:api    # API server (port 4000)
npm run dev:yjs    # Yjs WebSocket server (port 3001)
npm run build      # compile TypeScript

# Docker
cd backend
docker compose -f docker-compose.dev.yml up -d   # start all services
docker compose logs -f                            # stream logs
docker compose down                               # stop
docker compose down --volumes                     # stop + wipe data
```

## Deployment

```bash
# Backend (production)
cd backend
docker compose up -d

# Frontend — Netlify
netlify deploy --prod

# Frontend — Vercel
vercel --prod

# Frontend — Docker (Nginx)
docker build -t sharespace-ui .
docker run -p 80:80 sharespace-ui
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for environment variable reference and production checklist.

## Documentation

| File | Description |
|---|---|
| [README_SETUP.md](README_SETUP.md) | Full setup guide — env vars, Docker, troubleshooting, API overview |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment and environment variable reference |
| [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) | System design, data flow, scaling strategy |
| [backend/WHY_YJS.md](backend/WHY_YJS.md) | Why Yjs CRDTs over Operational Transformation |
| [backend/FRONTEND_INTEGRATION.md](backend/FRONTEND_INTEGRATION.md) | Frontend ↔ backend integration details |
| [backend/QUICK_REFERENCE.md](backend/QUICK_REFERENCE.md) | Command cheat sheet and API reference |
| [backend/README.md](backend/README.md) | Complete backend documentation |

## License

MIT
