# ShareSpace Application Startup Script
# Run this with: .\start-app.ps1

Write-Host "🚀 ShareSpace Application Startup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js $nodeVersion installed" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
    
    # Check if Docker is running
    docker ps 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is running" -ForegroundColor Green
        $dockerRunning = $true
    } else {
        Write-Host "✗ Docker is not running" -ForegroundColor Red
        Write-Host "  Please start Docker Desktop and run this script again" -ForegroundColor Yellow
        $dockerRunning = $false
    }
} else {
    Write-Host "✗ Docker not found" -ForegroundColor Red
    $dockerRunning = $false
}

Write-Host ""

if ($dockerRunning) {
    Write-Host "Starting application with Docker..." -ForegroundColor Cyan
    Write-Host ""
    
    # Start backend services
    Write-Host "Starting backend services..." -ForegroundColor Yellow
    Set-Location backend
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Backend services started" -ForegroundColor Green
        Write-Host ""
        Write-Host "Services running:" -ForegroundColor Cyan
        Write-Host "  - PostgreSQL: localhost:5432" -ForegroundColor White
        Write-Host "  - Redis: localhost:6379" -ForegroundColor White
        Write-Host "  - API Server: http://localhost:4000" -ForegroundColor White
        Write-Host "  - Yjs Server: ws://localhost:3001" -ForegroundColor White
        Write-Host ""
        
        # Wait for services to be ready
        Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Check API health
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "✓ API Server is healthy" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠ API Server is starting... (this is normal)" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Backend is ready! Now starting frontend..." -ForegroundColor Cyan
        Write-Host ""
        
        # Go back to root
        Set-Location ..
        
        # Check if node_modules exists
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
            npm install
        }
        
        Write-Host ""
        Write-Host "✓ Setup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "To start the frontend, run:" -ForegroundColor Cyan
        Write-Host "  npm run dev" -ForegroundColor White
        Write-Host ""
        Write-Host "Then open: http://localhost:3000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To view backend logs:" -ForegroundColor Cyan
        Write-Host "  cd backend" -ForegroundColor White
        Write-Host "  docker-compose logs -f" -ForegroundColor White
        Write-Host ""
        Write-Host "To stop all services:" -ForegroundColor Cyan
        Write-Host "  cd backend" -ForegroundColor White
        Write-Host "  docker-compose down" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "✗ Failed to start backend services" -ForegroundColor Red
        Write-Host "Check the error messages above" -ForegroundColor Yellow
        Set-Location ..
    }
} else {
    Write-Host "Docker is not running. Please:" -ForegroundColor Yellow
    Write-Host "1. Start Docker Desktop from the Start Menu" -ForegroundColor White
    Write-Host "2. Wait for Docker to fully start (whale icon in system tray)" -ForegroundColor White
    Write-Host "3. Run this script again: .\start-app.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or see QUICK_RUN.md for alternative options" -ForegroundColor Cyan
}
