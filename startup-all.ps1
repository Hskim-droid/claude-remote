# Claude Code Remote - Startup Script
# Starts claude-remote server in background (no visible windows)

$ErrorActionPreference = "Continue"

$LOG_FILE = "$env:TEMP\claude-startup.log"
$CLAUDE_REMOTE_DIR = "D:\tools\claude-remote"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line -ForegroundColor $Color
    Add-Content -Path $LOG_FILE -Value $line
}

# Init log
"" | Set-Content -Path $LOG_FILE
Write-Log "=== Claude Code Remote Startup ===" "Cyan"

# --- 1. WSL Check ---
Write-Log "[1/3] Checking WSL..." "Yellow"
$wslStatus = wsl --list --running 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Log "Starting WSL Ubuntu..." "Yellow"
    wsl -d Ubuntu -- echo "ready" 2>$null
}
Write-Log "WSL Ubuntu OK" "Green"

# --- 2. Kill existing processes ---
Write-Log "[2/3] Cleaning up old processes..." "Yellow"

$nodeProcs = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    try { $_.CommandLine -like "*claude-remote*" } catch { $false }
}
if ($nodeProcs) {
    $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Log "Killed old node process" "Yellow"
}

Write-Log "Cleanup done" "Green"

# --- 3. Start claude-remote (Node.js, port 8080) ---
Write-Log "[3/3] Starting claude-remote (port 8080)..." "Yellow"

if (Test-Path "$CLAUDE_REMOTE_DIR\server\main.js") {
    Start-Process powershell -ArgumentList "-WindowStyle Hidden -Command `"cd '$CLAUDE_REMOTE_DIR'; node server/main.js`"" -WindowStyle Hidden
    Write-Log "claude-remote started (Hidden)" "Green"
} else {
    Write-Log "ERROR: $CLAUDE_REMOTE_DIR\server\main.js not found!" "Red"
    exit 1
}

# --- Verify ---
Start-Sleep -Seconds 3

try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("localhost", 8080)
    $tcp.Close()
    Write-Log "claude-remote :8080 - OK" "Green"
} catch {
    Write-Log "claude-remote :8080 - NOT READY (may need more time)" "Yellow"
}

Write-Log "" "White"
Write-Log "=== Started ===" "Cyan"
Write-Log "  http://localhost:8080" "White"
Write-Log "  Log: $LOG_FILE" "Gray"
