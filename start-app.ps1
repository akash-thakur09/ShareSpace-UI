# ShareSpace Application Startup Script
# Run with: .\start-app.ps1

Write-Host "ShareSpace Startup" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

# ── Check Node.js ─────────────────────────────────────────────────────────────
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js $nodeVersion" -ForegroundColor Green

# ── Check Docker ──────────────────────────────────────────────────────────────
docker ps 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running. Start Docker Desktop and re-run this script." -ForegroundColor Red
    exit 1
}
Write-Host "Docker running" -ForegroundColor Green
Write-Host ""

# ── Ensure backend/.env exists ────────────────────────────────────────────────
$envFile = "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "Creating backend/.env from example..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" $envFile
    Write-Host "IMPORTANT: Edit backend/.env and set JWT_SECRET and JWT_REFRESH_SECRET before production use." -ForegroundColor Yellow
    Write-Host ""
}

# Warn if JWT secrets are still the dev defaults
$envContent = Get-Content $envFile -Raw
if ($envContent -match "dev_jwt_secret_replace_in_production") {
    Write-Host "WARNING: JWT secrets are using dev defaults. Fine for local dev, not for production." -ForegroundColor Yellow
    Write-Host ""
}

# ── Start backend services ────────────────────────────────────────────────────
Write-Host "Starting backend services (Postgres, Redis, API, Yjs)..." -ForegroundColor Cyan
Set-Location backend
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start backend services." -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  PostgreSQL  -> localhost:5432"
Write-Host "  Redis       -> localhost:6379"
Write-Host "  API         -> http://localhost:4000"
Write-Host "  Yjs WS      -> ws://localhost:3001"
Write-Host ""

# ── Wait for API health ───────────────────────────────────────────────────────
Write-Host "Waiting for API to be ready..." -ForegroundColor Yellow
$maxAttempts = 20
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    Start-Sleep -Seconds 3
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $ready = $true
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor DarkGray
    }
}

if ($ready) {
    Write-Host "API is healthy" -ForegroundColor Green
} else {
    Write-Host "API did not respond in time. Check logs: docker compose logs api" -ForegroundColor Yellow
}

Set-Location ..

# ── Install frontend deps if needed ──────────────────────────────────────────
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Ready. Start the frontend with:" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  docker compose -C backend logs -f          # stream all logs"
Write-Host "  docker compose -C backend logs -f api      # API logs only"
Write-Host "  docker compose -C backend logs -f yjs      # Yjs logs only"
Write-Host "  docker compose -C backend down             # stop services"
Write-Host "  docker compose -C backend down --volumes   # stop + wipe data"
