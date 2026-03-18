# Running ShareSpace Application - Complete Guide

## Current Situation

You're on Windows and need to set up the complete application. Here's what you need to do:

## Option 1: Quick Start with Docker (Recommended for Windows)

This is the easiest way to run everything without installing PostgreSQL manually.

### Step 1: Install Docker Desktop

1. Download Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Wait for Docker to fully start (whale icon in system tray)

### Step 2: Run Everything with Docker

```powershell
# Navigate to backend
cd backend

# Start all services (PostgreSQL, Redis, API, Yjs)
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- API Server on port 4000
- Yjs Server on port 3001

### Step 3: Start Frontend

```powershell
# In a new terminal, go back to root
cd ..

# Install frontend dependencies
npm install

# Start frontend
npm run dev
```

### Step 4: Access Application

Open http://localhost:3000 in your browser!

---

## Option 2: Manual Setup (If you prefer not to use Docker)

### Prerequisites to Install

1. **Node.js 18+**
   - Download: https://nodejs.org/
   - Install and verify: `node --version`

2. **PostgreSQL 14+**
   - Download: https://www.postgresql.org/download/windows/
   - During installation:
     - Set password for postgres user (remember it!)
     - Keep default port 5432
     - Install pgAdmin (optional but helpful)

### Step 1: Create Database

```powershell
# Open PowerShell as Administrator
# Navigate to PostgreSQL bin directory (adjust version if needed)
cd "C:\Program Files\PostgreSQL\15\bin"

# Create database
.\createdb.exe -U postgres sharespace

# Or use psql
.\psql.exe -U postgres
# Then in psql:
CREATE DATABASE sharespace;
\q
```

### Step 2: Install Backend Dependencies

```powershell
cd backend
npm install
```

### Step 3: Configure Environment

The `.env` file is already created with default values. If your PostgreSQL password is different, edit `backend/.env`:

```env
DB_PASSWORD=your_postgres_password
```

### Step 4: Start Backend Servers

You need TWO PowerShell windows:

**PowerShell Window 1 - API Server:**
```powershell
cd backend
npm run dev:api
```

**PowerShell Window 2 - Yjs Server:**
```powershell
cd backend
npm run dev:yjs
```

Wait for both to show:
```
🚀 API Server running on http://localhost:4000
🔌 Yjs WebSocket Server running on ws://localhost:3001
```

### Step 5: Start Frontend

**PowerShell Window 3:**
```powershell
# Go to project root
npm install
npm run dev
```

### Step 6: Access Application

Open http://localhost:3000 in your browser!

---

## Option 3: Using PM2 (Process Manager)

If you want to manage all processes easily:

### Install PM2

```powershell
npm install -g pm2
```

### Start All Backend Services

```powershell
cd backend

# Start API server
pm2 start npm --name "sharespace-api" -- run dev:api

# Start Yjs server
pm2 start npm --name "sharespace-yjs" -- run dev:yjs

# View status
pm2 status

# View logs
pm2 logs

# Stop all
pm2 stop all

# Restart all
pm2 restart all
```

### Start Frontend Separately

```powershell
cd ..
npm run dev
```

---

## Verification Steps

### 1. Check Backend Health

```powershell
curl http://localhost:4000/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","service":"sharespace-api"}
```

### 2. Create Test Document

```powershell
curl -X POST http://localhost:4000/documents -H "Content-Type: application/json" -d '{\"title\":\"Test Document\"}'
```

Expected response:
```json
{"publicId":"a3k9m2","title":"Test Document",...}
```

### 3. Test Frontend

1. Open http://localhost:3000
2. You should see the editor
3. Open the same URL in another browser/tab
4. Type in one window
5. See changes appear in the other window instantly!

---

## Troubleshooting

### "Port 4000 already in use"

```powershell
# Find what's using the port
netstat -ano | findstr :4000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### "Cannot connect to database"

1. Check PostgreSQL is running:
   - Open Services (services.msc)
   - Look for "postgresql-x64-15" (or your version)
   - Make sure it's "Running"

2. Check password in `backend/.env` matches your PostgreSQL password

3. Test connection:
```powershell
cd "C:\Program Files\PostgreSQL\15\bin"
.\psql.exe -U postgres -d sharespace
```

### "Module not found"

```powershell
# Clean install
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Docker Issues

1. Make sure Docker Desktop is running
2. Check Docker status: `docker ps`
3. Restart Docker Desktop if needed
4. Check logs: `docker-compose logs`

---

## Current Status Check

Run these commands to see what you have:

```powershell
# Check Node.js
node --version

# Check npm
npm --version

# Check if PostgreSQL is installed
Get-Service | Where-Object {$_.Name -like "*postgres*"}

# Check if Docker is installed
docker --version

# Check if ports are available
netstat -ano | findstr ":4000 :3001 :5432"
```

---

## Recommended Approach for Windows

**For Development:**
→ Use **Option 2 (Manual Setup)** if you want to learn and have full control

**For Quick Testing:**
→ Use **Option 1 (Docker)** - easiest and fastest

**For Production-like Environment:**
→ Use **Option 1 (Docker)** with docker-compose

---

## What to Do Next

1. Choose your preferred option above
2. Follow the steps carefully
3. Verify each step works before moving to the next
4. Once everything is running, test collaboration by opening multiple browser windows

---

## Need Help?

If you encounter issues:

1. Check the error message carefully
2. Look in the Troubleshooting section above
3. Check the logs:
   - Backend: Look at the terminal output
   - Docker: `docker-compose logs -f`
   - PM2: `pm2 logs`

4. Verify services are running:
   - API: http://localhost:4000/health
   - Frontend: http://localhost:3000
   - Database: Check Services in Windows

---

## Quick Commands Reference

### Docker
```powershell
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose logs -f        # View logs
docker-compose ps             # Check status
docker-compose restart        # Restart all
```

### PM2
```powershell
pm2 status                    # Check status
pm2 logs                      # View logs
pm2 restart all               # Restart all
pm2 stop all                  # Stop all
pm2 delete all                # Remove all
```

### Development
```powershell
# Backend API
cd backend
npm run dev:api

# Backend Yjs
cd backend
npm run dev:yjs

# Frontend
npm run dev
```

---

**Choose your option and let's get started! 🚀**
