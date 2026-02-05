# Claude Code Remote - Start Script
# No admin rights required

$ErrorActionPreference = "Continue"

Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "Claude Code Remote - Starting" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# Config
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$TTYD_PORT = 7681
$API_PORT = 8080

# Check WSL
Write-Host "`n[1/4] Checking WSL..." -ForegroundColor Yellow
$wslStatus = wsl --list --running 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "WSL not running. Starting Ubuntu..." -ForegroundColor Yellow
    wsl -d Ubuntu -- echo "Ubuntu started"
}
Write-Host "Ubuntu running" -ForegroundColor Green

# Check dependencies
Write-Host "`n[2/4] Checking dependencies..." -ForegroundColor Yellow
$tmuxCheck = wsl -d Ubuntu -- which tmux 2>$null
$ttydCheck = wsl -d Ubuntu -- which ttyd 2>$null

if (-not $tmuxCheck) {
    Write-Host "tmux not installed. Run:" -ForegroundColor Red
    Write-Host "  wsl -d Ubuntu -- sudo apt install -y tmux" -ForegroundColor Gray
}

if (-not $ttydCheck) {
    Write-Host "ttyd not installed. Run:" -ForegroundColor Red
    Write-Host "  wsl -d Ubuntu -- sudo apt install -y ttyd" -ForegroundColor Gray
}

if ($tmuxCheck -and $ttydCheck) {
    Write-Host "tmux, ttyd installed" -ForegroundColor Green
}

# Cleanup
Write-Host "`n[3/4] Cleaning up..." -ForegroundColor Yellow
wsl -d Ubuntu -- pkill -f "ttyd.*$TTYD_PORT" 2>$null

# Kill existing Node process
$existingNode = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*claude-remote*"
}
if ($existingNode) {
    $existingNode | Stop-Process -Force
    Write-Host "Killed existing server process" -ForegroundColor Yellow
}
Write-Host "Cleanup done" -ForegroundColor Green

# Check Node.js
Write-Host "`n[4/4] Starting server..." -ForegroundColor Yellow
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "Node.js not installed!" -ForegroundColor Red
    Write-Host "Install from: https://nodejs.org/" -ForegroundColor Gray
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "$SCRIPT_DIR\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Push-Location $SCRIPT_DIR
    npm install
    Pop-Location
}

# Start server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$SCRIPT_DIR'; node server/main.js" -WindowStyle Normal

Write-Host "Server started (port: $API_PORT)" -ForegroundColor Green

# Wait
Start-Sleep -Seconds 2

# Done
Write-Host "`n" + "=" * 50 -ForegroundColor Cyan
Write-Host "Started!" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""
Write-Host "UI:       http://localhost:$API_PORT" -ForegroundColor White
Write-Host "Terminal: http://localhost:$TTYD_PORT (after connecting)" -ForegroundColor White
Write-Host ""

# Open browser
$openBrowser = Read-Host "Open browser? (Y/n)"
if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
    Start-Process "http://localhost:$API_PORT"
}

Write-Host "`nServer running in separate window." -ForegroundColor Gray
Write-Host "Close that window to stop." -ForegroundColor Gray
