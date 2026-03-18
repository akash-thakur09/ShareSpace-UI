# How to Run ShareSpace - Complete Guide

## Your Current Setup

✅ Node.js v22.17.0 - Installed
✅ npm 11.4.2 - Installed  
✅ Docker 28.3.2 - Installed
❌ Docker Desktop - Not running
❌ PostgreSQL - Not installed

## 🎯 Recommended: Use Docker (Easiest!)

This is the simplest way to run everything on Windows.

### Step 1: Start Docker Desktop

1. Click Start Menu
2. Search for "Docker Desktop"
3. Click to open
4. Wait 1-2 minutes for Docker to fully start
5. You'll see a whale icon in your system tray when ready

### Step 2: Run the Startup Script

Open PowerShell in the project root and run:

```powershell
.\start-app.ps1
```

This script will:
- ✅ Check your system
- ✅ Start PostgreSQL, Redis, API, and Yjs servers
- ✅ Verify everything is working
- ✅ Give you next steps

### Step 3: Start Frontend

After the script completes:

```powershell
npm run dev
```

### Step 4: Open Application

Open your browser to: **http://localhost:3000**

### Step 5: Test Collaboration

1. Open http://localhost:3000 in Chrome
2. Open http://localhost:3000 in another browser/tab
3. Type in one window
4. See it appear instantly in the other! 🎉

---

## 📋 Manual Docker Commands

If you prefer to run commands manually:

```powershell
# Start Docker Desktop first!

# Navigate to backend
cd backend

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# In a new terminal, start frontend
cd ..
npm install
npm run dev
```

---

## 🛑 Stopping the Application

### Stop Frontend
Press `Ctrl+C` in the terminal running `npm run dev`

### Stop Backend
```powershell
cd backend
docker-compose down
```

---

## 🔍 Verify Everything is Working

### Check Backend Health
```powershell
curl http://localhost:4000/health
```

Expected: `{"status":"ok",...}`

### Check Services
```powershell
cd backend
docker-compose ps
```

All services should show "Up"

### Check Frontend
Open http://localhost:3000 - you should see the editor

---

## 🐛 Troubleshooting

### "Docker is not running"

**Solution:**
1. Open Docker Desktop from Start Menu
2. Wait for it to fully start (whale icon appears)
3. Run the script again

### "Port already in use"

**Solution:**
```powershell
# Find what's using the port
netstat -ano | findstr :4000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or stop Docker services
cd backend
docker-compose down
```

### "Cannot connect to Docker"

**Solution:**
1. Restart Docker Desktop
2. Wait for it to fully start
3. Try again

### Frontend won't start

**Solution:**
```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run dev
```

---

## 📊 What's Running Where

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| API Server | 4000 | http://localhost:4000 |
| Yjs Server | 3001 | ws://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

---

## 🎮 Quick Commands

### Start Everything
```powershell
.\start-app.ps1
npm run dev
```

### Stop Everything
```powershell
# Stop frontend: Ctrl+C
cd backend
docker-compose down
```

### Restart Backend
```powershell
cd backend
docker-compose restart
```

### View Logs
```powershell
cd backend
docker-compose logs -f
```

### Check Status
```powershell
cd backend
docker-compose ps
```

---

## 🚀 Next Steps After Running

1. ✅ Application is running
2. 📝 Test collaboration with multiple browsers
3. 🧪 Try creating documents
4. 📸 Test snapshots/version history
5. 🎨 Customize the frontend
6. 📚 Read the documentation

---

## 📚 Additional Resources

- **Quick Start**: See `QUICK_RUN.md`
- **Detailed Setup**: See `GETTING_STARTED.md`
- **All Options**: See `RUN_APPLICATION.md`
- **Documentation**: See `DOCUMENTATION_INDEX.md`

---

## ✅ Success Checklist

- [ ] Docker Desktop is running
- [ ] Backend services started (docker-compose up -d)
- [ ] API health check passes (curl http://localhost:4000/health)
- [ ] Frontend is running (npm run dev)
- [ ] Can open http://localhost:3000
- [ ] Can type in editor
- [ ] Can see changes in multiple browsers

---

## 💡 Pro Tips

1. **Keep Docker Desktop running** while developing
2. **Use two terminals**: One for backend logs, one for frontend
3. **Check logs** if something doesn't work: `docker-compose logs -f`
4. **Restart services** if needed: `docker-compose restart`
5. **Clean restart**: `docker-compose down && docker-compose up -d`

---

## 🎯 TL;DR - Quickest Way

```powershell
# 1. Start Docker Desktop (from Start Menu)
# 2. Wait for it to start
# 3. Run this:
.\start-app.ps1

# 4. Then run this:
npm run dev

# 5. Open: http://localhost:3000
```

**That's it! 🎉**

---

**Need help? Check the Troubleshooting section above or see the detailed guides in the documentation.**
