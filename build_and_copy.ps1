# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   PROLOGUE BUILD & MONOLITH PACKAGER     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Build frontend React static assets
Write-Host "[1/3] Compiling React frontend..." -ForegroundColor Blue
Set-Location -Path "$PSScriptRoot/frontend"
npm run build

# 2. Prepare spring boot static resources directory
Write-Host "[2/3] Preparing backend static folder..." -ForegroundColor Blue
$staticDir = "$PSScriptRoot/backend/src/main/resources/static"
if (Test-Path -Path $staticDir) {
    Remove-Item -Path "$staticDir/*" -Recurse -Force
} else {
    New-Item -Path $staticDir -ItemType Directory -Force
}

# 3. Copy dist assets to static directory
Write-Host "[3/3] Copying assets to backend resources..." -ForegroundColor Blue
Copy-Item -Path "$PSScriptRoot/frontend/dist/*" -Destination $staticDir -Recurse -Force

Write-Host "==========================================" -ForegroundColor Green
Write-Host " SUCCESS: packaged frontend into backend! " -ForegroundColor Green
Write-Host " Ready for deployment to Railway.          " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
