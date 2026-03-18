# Getting Started with ShareSpace

## 🎯 What You're Building

A production-grade collaborative document editor like Google Docs or Notion, with:
- Real-time multi-user editing
- Conflict-free collaboration (CRDTs)
- User presence and cursors
- Version history
- Scalable backend

## ⚡ Quick Start (10 minutes)

### Step 1: Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup environment (uses defaults for local dev)
cp .env.example .env

# Create database
createdb sharespace
# Or: psql -U postgres -c "CREATE DATABASE sharespace;"

# Start API server (Terminal 1)
npm run dev:api

# Start Yjs server (Terminal 2)
npm run dev:yjs
```

You should see:
```
🚀 API Server running on http://localhost:4000
🔌 Yjs WebSocket Server running on ws://localhost:3001
```

### Step 2: Frontend Setup (5 minutes)

```bash
# Go back to root
cd ..

# Install dependencies
npm install

# Install Yjs packages
npm install yjs y-websocket @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor

# Remove old Fluid Framework
npm uninstall @fluidframework/azure-client @fluidframework/test-client-utils @fluidframework/test-runtime-utils fluid-framework

# Start frontend
npm run dev
```

### Step 3: Test Collaboration

1. Open http://localhost:3000 in Chrome
2. Open http://localhost:3000 in another browser/tab
3. Type in one window
4. See it appear instantly in the other! 🎉

## 📋 Prerequisites

Before starting, make sure you have:

### Required
- ✅ Node.js 18 or higher
- ✅ PostgreSQL 14 or higher
- ✅ npm or yarn

### Check Your Setup
```bash
# Check Node.js version
node --version  # Should be v18.x.x or higher

# Check PostgreSQL
psql --version  # Should be 14.x or higher
pg_isready      # Should say "accepting connections"

# Check npm
npm --version
```

### Install Missing Prerequisites

**Node.js**:
- macOS: `brew install node`
- Ubuntu: `sudo apt install nodejs npm`
- Windows: Download from https://nodejs.org/

**PostgreSQL**:
- macOS: `brew install postgresql && brew services start postgresql`
- Ubuntu: `sudo apt install postgresql && sudo systemctl start postgresql`
- Windows: Download from https://www.postgresql.org/download/windows/

## 🏗️ Architecture Overview

```
┌─────────────┐
│  Frontend   │  React + TipTap + Yjs
│  Port 3000  │  (What users see)
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
   REST API          WebSocket         WebSocket
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ NestJS API  │   │ Yjs Server  │   │ Yjs Server  │
│  Port 4000  │   │  Port 3001  │   │  Port 3001  │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └────────┬────────┴─────────────────┘
                ▼
         ┌─────────────┐
         │ PostgreSQL  │  Persistent storage
         │  Port 5432  │
         └─────────────┘
```

### What Each Part Does

**Frontend (Port 3000)**:
- User interface
- Rich text editor (TipTap)
- Real-time sync (Yjs)

**API Server (Port 4000)**:
- Create/read/update documents
- Manage snapshots
- Handle metadata

**Yjs Server (Port 3001)**:
- Real-time collaboration
- CRDT synchronization
- User presence/cursors

**PostgreSQL (Port 5432)**:
- Store documents
- Store snapshots
- Persist Yjs state

## 🔄 Data Flow

### Creating a Document

```
1. User clicks "New Document"
   ↓
2. Frontend → POST /documents → API Server
   ↓
3. API creates document with public ID (e.g., "a3k9m2")
   ↓
4. Frontend navigates to /doc/a3k9m2
   ↓
5. Frontend connects to ws://localhost:3001?doc=a3k9m2
   ↓
6. Yjs server loads document from database
   ↓
7. User can start editing!
```

### Real-time Collaboration

```
User A types "Hello"
   ↓
Yjs creates CRDT update
   ↓
Sent via WebSocket to Yjs server
   ↓
Yjs server broadcasts to all connected clients
   ↓
User B receives update
   ↓
User B's editor shows "Hello"
   ↓
No conflicts, no data loss! ✨
```

## 🧪 Verify Your Setup

### Test 1: Backend Health

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "sharespace-api"
}
```

### Test 2: Create Document

```bash
curl -X POST http://localhost:4000/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Document"}'
```

Expected response:
```json
{
  "publicId": "a3k9m2",
  "title": "Test Document",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Test 3: Get Document

```bash
curl http://localhost:4000/documents/a3k9m2
```

### Test 4: WebSocket Connection

Open browser console on http://localhost:3000 and check for:
```
✓ Client connected to document: a3k9m2
```

## 🎨 Frontend Integration

The frontend needs to be updated to use Yjs instead of Fluid Framework.

### Files to Create

1. **src/lib/yjs-provider.ts** - Yjs WebSocket provider
2. **src/services/document.service.ts** - API client

### Files to Update

1. **src/features/editor/EditorCanvas.tsx** - Use Yjs collaboration
2. **src/app/routes.tsx** - Handle document IDs

### Files to Delete

1. **src/fluid/container.ts** - Old Fluid code
2. **src/fluid/schema.ts** - Old Fluid code
3. **src/services/websocket.ts** - Old WebSocket code

**See [backend/FRONTEND_INTEGRATION.md](backend/FRONTEND_INTEGRATION.md) for complete step-by-step guide.**

## 🚀 Using Docker (Alternative)

If you prefer Docker:

```bash
cd backend
docker-compose up -d
```

This starts:
- PostgreSQL
- Redis
- API Server
- Yjs Server

All configured and ready to go!

## 🐛 Common Issues

### "Port 4000 already in use"

```bash
# Find what's using the port
lsof -i :4000

# Kill the process
kill -9 <PID>
```

### "Database connection failed"

```bash
# Check PostgreSQL is running
pg_isready

# If not running:
# macOS: brew services start postgresql
# Ubuntu: sudo systemctl start postgresql
# Windows: Start PostgreSQL service

# Check database exists
psql -U postgres -l | grep sharespace

# Create if missing
createdb sharespace
```

### "Module not found"

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### "WebSocket connection failed"

- Make sure Yjs server is running: `npm run dev:yjs`
- Check browser console for errors
- Verify URL: `ws://localhost:3001`

## 📚 Next Steps

### 1. Read Documentation

- **[BACKEND_SETUP.md](BACKEND_SETUP.md)** - Detailed backend setup
- **[backend/README.md](backend/README.md)** - Complete backend docs
- **[backend/FRONTEND_INTEGRATION.md](backend/FRONTEND_INTEGRATION.md)** - Frontend integration
- **[backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)** - System design

### 2. Understand the Technology

- **[backend/WHY_YJS.md](backend/WHY_YJS.md)** - Why we use Yjs
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What was built

### 3. Customize

- Add authentication
- Add document permissions
- Add user profiles
- Add document sharing
- Add comments

### 4. Deploy

- Deploy backend with Docker
- Deploy frontend to Vercel/Netlify
- Set up production database
- Configure environment variables

## 💡 Tips

### Development Workflow

1. Keep two terminals open for backend:
   - Terminal 1: `npm run dev:api`
   - Terminal 2: `npm run dev:yjs`

2. Use PM2 for easier management:
   ```bash
   npm install -g pm2
   pm2 start npm --name api -- run dev:api
   pm2 start npm --name yjs -- run dev:yjs
   pm2 logs
   ```

3. Use browser DevTools:
   - Network tab: See WebSocket messages
   - Console: See connection status
   - Application tab: See local storage

### Database Management

```bash
# Connect to database
psql -U postgres -d sharespace

# List tables
\dt

# View documents
SELECT public_id, title, created_at FROM documents;

# View snapshots
SELECT document_id, version, created_at FROM document_snapshots;

# Exit
\q
```

### Debugging

```bash
# View API logs
# (in terminal running npm run dev:api)

# View Yjs logs
# (in terminal running npm run dev:yjs)

# View PM2 logs
pm2 logs

# View Docker logs
docker-compose logs -f
```

## 🎯 Success Checklist

- [ ] Backend servers running (ports 4000 and 3001)
- [ ] PostgreSQL running and database created
- [ ] Frontend running (port 3000)
- [ ] Can create documents via API
- [ ] Can open documents in browser
- [ ] Can type and see changes
- [ ] Can open same document in two browsers
- [ ] Changes sync between browsers in real-time

## 🆘 Need Help?

1. Check the error message carefully
2. Review the relevant documentation
3. Check the troubleshooting section
4. Look at the logs (terminal output)
5. Check browser console for errors
6. Verify all services are running

## 🎉 You're Ready!

Once everything is working:
1. Experiment with the editor
2. Test collaboration with multiple browsers
3. Try creating snapshots
4. Explore the API endpoints
5. Read the architecture docs
6. Start customizing!

---

**Welcome to ShareSpace! Happy coding! 🚀**
