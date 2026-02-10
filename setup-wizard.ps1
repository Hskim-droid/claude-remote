# ============================================================
# Claude Code Remote - Setup Wizard
# One-click installer for Windows (WSL2)
# Usage: powershell -ExecutionPolicy Bypass -File setup-wizard.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Load config from .env if it exists, otherwise use defaults
$API_PORT = 8080
$TTYD_PORT = 7681
$WSL_DISTRO = "Ubuntu"

$envPath = Join-Path $SCRIPT_DIR ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.+?)\s*$') {
            $key = $Matches[1]
            $val = $Matches[2]
            switch ($key) {
                "PORT"       { $API_PORT = [int]$val }
                "TTYD_PORT"  { $TTYD_PORT = [int]$val }
                "WSL_DISTRO" { $WSL_DISTRO = $val }
            }
        }
    }
}

# --- Helper functions ---

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host ""
    Write-Host "[$Step]" -ForegroundColor Cyan -NoNewline
    Write-Host " $Message" -ForegroundColor White
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}

function Write-Ok {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Skip {
    param([string]$Message)
    Write-Host "  [SKIP] $Message" -ForegroundColor DarkYellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

# --- Banner ---

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "    Claude Code Remote - Setup Wizard" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Windows (WSL2) + Tailscale" -ForegroundColor DarkGray
Write-Host ""

# ============================================================
# Step 1/7: Environment Detection
# ============================================================

Write-Step "1/7" "Detecting environment..."

# Windows version
$osInfo = [System.Environment]::OSVersion
Write-Ok "Windows $($osInfo.Version)"

# Check WSL feature
$wslCmd = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wslCmd) {
    Write-Fail "WSL is not installed"
    Write-Host ""
    Write-Host "  To install WSL, run as Administrator:" -ForegroundColor Yellow
    Write-Host "    wsl --install" -ForegroundColor White
    Write-Host ""
    Write-Host "  Then restart your PC and run this wizard again." -ForegroundColor Yellow
    exit 1
}
Write-Ok "WSL available"

# ============================================================
# Step 2/7: WSL2 Ubuntu
# ============================================================

Write-Step "2/7" "Checking WSL2 Ubuntu..."

# Check if Ubuntu distro exists
$wslList = wsl --list --quiet 2>$null
$hasUbuntu = $false
if ($wslList) {
    foreach ($line in $wslList) {
        $clean = $line -replace '\x00', '' -replace '\s', ''
        if ($clean -eq $WSL_DISTRO) {
            $hasUbuntu = $true
            break
        }
    }
}

if (-not $hasUbuntu) {
    Write-Fail "$WSL_DISTRO distribution not found"
    Write-Host ""
    Write-Host "  To install Ubuntu, run:" -ForegroundColor Yellow
    Write-Host "    wsl --install -d Ubuntu" -ForegroundColor White
    Write-Host ""
    Write-Host "  Then restart and run this wizard again." -ForegroundColor Yellow
    exit 1
}
Write-Ok "$WSL_DISTRO distribution found"

# Ensure Ubuntu is running
$wslRunning = wsl --list --running 2>$null
$isRunning = $false
if ($wslRunning) {
    foreach ($line in $wslRunning) {
        $clean = $line -replace '\x00', '' -replace '\s', ''
        if ($clean -eq $WSL_DISTRO) {
            $isRunning = $true
            break
        }
    }
}

if (-not $isRunning) {
    Write-Info "Starting $WSL_DISTRO..."
    wsl -d $WSL_DISTRO -- echo "ready" 2>$null | Out-Null
    Write-Ok "$WSL_DISTRO started"
} else {
    Write-Ok "$WSL_DISTRO already running"
}

# ============================================================
# Step 3/7: WSL Dependencies (tmux, ttyd, claude)
# ============================================================

Write-Step "3/7" "Installing WSL dependencies..."

# Check each dependency
$tmuxInstalled = wsl -d $WSL_DISTRO -- which tmux 2>$null
$ttydInstalled = wsl -d $WSL_DISTRO -- which ttyd 2>$null
$claudeInstalled = wsl -d $WSL_DISTRO -- which claude 2>$null
$nodeWslInstalled = wsl -d $WSL_DISTRO -- which node 2>$null

$needsInstall = @()

if ($tmuxInstalled) {
    Write-Ok "tmux already installed"
} else {
    $needsInstall += "tmux"
    Write-Info "tmux not found - will install"
}

if ($ttydInstalled) {
    Write-Ok "ttyd already installed"
} else {
    $needsInstall += "ttyd"
    Write-Info "ttyd not found - will install"
}

if ($claudeInstalled) {
    Write-Ok "claude CLI already installed"
} else {
    $needsInstall += "claude"
    Write-Info "claude CLI not found - will install"
}

if ($needsInstall.Count -gt 0) {
    Write-Host ""
    Write-Info "Installing: $($needsInstall -join ', ')..."
    Write-Info "(This may ask for your WSL sudo password)"
    Write-Host ""

    # Build install script
    $installScript = "set -e; "
    $installScript += "sudo apt update -qq; "

    if ($needsInstall -contains "tmux") {
        $installScript += "sudo apt install -y tmux; "
    }
    if ($needsInstall -contains "ttyd") {
        $installScript += "sudo apt install -y ttyd; "
    }
    if (($needsInstall -contains "claude") -and (-not $nodeWslInstalled)) {
        $installScript += "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; "
        $installScript += "sudo apt install -y nodejs; "
    }
    if ($needsInstall -contains "claude") {
        $installScript += "sudo npm install -g @anthropic-ai/claude-code; "
    }

    wsl -d $WSL_DISTRO -- bash -c $installScript

    if ($LASTEXITCODE -eq 0) {
        Write-Ok "WSL dependencies installed"
    } else {
        Write-Fail "Some dependencies failed to install"
        Write-Host "  Try manually: wsl -d $WSL_DISTRO -- bash install-wsl-deps.sh" -ForegroundColor Yellow
    }
} else {
    Write-Skip "All WSL dependencies already installed"
}

# ============================================================
# Step 4/7: Node.js (Windows)
# ============================================================

Write-Step "4/7" "Checking Node.js (Windows)..."

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Fail "Node.js not found on Windows"
    Write-Host ""
    Write-Host "  Install Node.js 18+ from:" -ForegroundColor Yellow
    Write-Host "    https://nodejs.org/" -ForegroundColor White
    Write-Host ""
    Write-Host "  Then run this wizard again." -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node --version
$majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($majorVersion -lt 18) {
    Write-Fail "Node.js $nodeVersion is too old (need 18+)"
    Write-Host ""
    Write-Host "  Update Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Ok "Node.js $nodeVersion"

# ============================================================
# Step 5/7: npm install
# ============================================================

Write-Step "5/7" "Installing npm packages..."

if (Test-Path "$SCRIPT_DIR\node_modules") {
    Write-Skip "node_modules already exists"
} else {
    Push-Location $SCRIPT_DIR
    npm install --loglevel=warn
    Pop-Location

    if ($LASTEXITCODE -eq 0) {
        Write-Ok "npm packages installed"
    } else {
        Write-Fail "npm install failed"
        exit 1
    }
}

# ============================================================
# Step 6/7: .env Configuration
# ============================================================

Write-Step "6/7" "Configuring .env..."

$envPath = Join-Path $SCRIPT_DIR ".env"
$envExamplePath = Join-Path $SCRIPT_DIR ".env.example"

if (Test-Path $envPath) {
    Write-Skip ".env already exists"
} else {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Ok ".env created from .env.example (default settings)"
    } else {
        # Create minimal .env
        $envContent = @"
HOST=0.0.0.0
PORT=$API_PORT
WSL_DISTRO=$WSL_DISTRO
TTYD_PORT=$TTYD_PORT
"@
        $envContent | Out-File -FilePath $envPath -Encoding utf8
        Write-Ok ".env created with defaults"
    }
    Write-Info "Edit $envPath to customize (port, auth, paths)"
}

# ============================================================
# Step 7/7: Tailscale
# ============================================================

Write-Step "7/7" "Setting up Tailscale..."

$tailscaleCmd = Get-Command tailscale -ErrorAction SilentlyContinue
$tailscaleUrl = ""

if (-not $tailscaleCmd) {
    Write-Skip "Tailscale not installed - skipping remote access"
    Write-Info "Install from: https://tailscale.com/download"
    Write-Info "Then re-run this wizard to auto-configure"
} else {
    $tsVersion = tailscale version 2>$null | Select-Object -First 1
    Write-Ok "Tailscale $tsVersion"

    # Check if logged in
    $tsStatus = tailscale status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Tailscale not logged in"
        Write-Info "Run 'tailscale login' first, then re-run this wizard"
    } else {
        Write-Ok "Tailscale connected"

        # Get hostname
        $tsHostname = (tailscale status --self --json 2>$null | ConvertFrom-Json).Self.DNSName -replace '\.$', ''

        # Set up serve for API (port 8080)
        Write-Info "Configuring tailscale serve (port $API_PORT)..."
        $serveResult = tailscale serve --bg $API_PORT 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "API server exposed via Tailscale"
        } else {
            Write-Info "tailscale serve port $API_PORT may already be configured"
        }

        # Set up TCP proxy for ttyd WebSocket (port 7681)
        Write-Info "Configuring tailscale serve TCP (port $TTYD_PORT)..."
        $tcpResult = tailscale serve --bg --tcp $TTYD_PORT tcp://localhost:$TTYD_PORT 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Terminal WebSocket exposed via Tailscale"
        } else {
            Write-Info "tailscale serve TCP port $TTYD_PORT may already be configured"
        }

        if ($tsHostname) {
            $tailscaleUrl = "https://$tsHostname"
        }
    }
}

# ============================================================
# Cleanup existing processes
# ============================================================

Write-Host ""
Write-Info "Cleaning up existing processes..."
wsl -d $WSL_DISTRO -- pkill -f "ttyd.*$TTYD_PORT" 2>$null
$existingNode = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    try { $_.CommandLine -like "*claude-remote*" } catch { $false }
}
if ($existingNode) {
    $existingNode | Stop-Process -Force
    Write-Info "Stopped previous server process"
}

# ============================================================
# Start server
# ============================================================

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Green
Write-Host "    Setup Complete!" -ForegroundColor Green
Write-Host "  ================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Starting server..." -ForegroundColor White

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$SCRIPT_DIR'; node server/main.js" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "  Local:     " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:$API_PORT" -ForegroundColor White

if ($tailscaleUrl) {
    Write-Host "  Remote:    " -NoNewline -ForegroundColor Gray
    Write-Host "$tailscaleUrl" -ForegroundColor White
}

Write-Host "  Terminal:  " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:$TTYD_PORT (after session connect)" -ForegroundColor White
Write-Host ""

# Open browser
$openBrowser = Read-Host "  Open browser? (Y/n)"
if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
    Start-Process "http://localhost:$API_PORT"
}

Write-Host ""
Write-Host "  Server is running in a separate window." -ForegroundColor Gray
Write-Host "  Close that window to stop the server." -ForegroundColor Gray
Write-Host ""
