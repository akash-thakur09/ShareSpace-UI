# Quick Run Guide - ShareSpace

## Current Situation

You have:
- ✅ Node.js v22.17.0
- ✅ Docker installed (but not running)
- ❌ PostgreSQL not installed

## Easiest Option: Start Docker Desktop

### Step 1: Start Docker Desktop

1. Open Docker Desktop application from Start Menu
2. Wait for it to fully start (you'll see the whale icon in system tray)
3. This may take 1-2 minutes

### Step 2: Run Everything with Docker

Once Docker is running, open PowerShell and run:

```powershell
# Navigate to backend
cd backend

# Start all services
docker-compose up -d

# Wait 30 seconds for services to initialize

# Check if everything is running
docker-compose ps
```

You should see 4 services running:
- sharespace-db (PostgreSQL)
- sharespace-redis (Redis)
- sharespace-api (API Server)
- sharespace-yjs (Yjs Server)

### Step 3: Start Frontend

Open a new PowerShell window:

```powershell
# Install dependencies (first time only)
npm install

# Start frontend
npm run dev
```

### Step 4: Open Application

Open your browser to: http://localhost:3000

---

## Alternative: Run Without Docker (Simplified)

If you don't want to use Docker, here's a simplified version that works without PostgreSQL:

### Step 1: Install Backend Dependencies

```powershell
cd backend
npm install
```

### Step 2: Modify for In-Memory Storage (Temporary)

I can help you create a simplified version that stores data in memory for testing purposes.

Would you like me to:
1. Wait for you to start Docker Desktop (recommended)
2. Create a simplified in-memory version for quick testing

---

## Recommended: Use Docker

Docker is the easiest way because it:
- ✅ Installs PostgreSQL automatically
- ✅ Installs Redis automatically
- ✅ Configures everything correctly
- ✅ One command to start everything
- ✅ Easy to stop and restart

Just start Docker Desktop and run the commands above!

---

## What to Do Right Now

1. **Start Docker Desktop** from your Start Menu
2. Wait for it to fully start (whale icon appears)
3. Run the commands in "Step 2" above
4. Then run the frontend in "Step 3"
5. Open http://localhost:3000

That's it! 🚀
