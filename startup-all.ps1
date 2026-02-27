# Claude Code Remote - Startup Script (PM2)
# Restores PM2 saved processes on boot

$ErrorActionPreference = "Continue"

$LOG_FILE = "$env:TEMP\claude-startup.log"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line -ForegroundColor $Color
    Add-Content -Path $LOG_FILE -Value $line
}

"" | Set-Content -Path $LOG_FILE
Write-Log "=== Claude Code Remote Startup ===" "Cyan"

# --- 1. WSL Check ---
Write-Log "[1/2] Checking WSL..." "Yellow"
$wslStatus = wsl --list --running 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Log "Starting WSL Ubuntu..." "Yellow"
    wsl -d Ubuntu -- echo "ready" 2>$null
}
Write-Log "WSL Ubuntu OK" "Green"

# --- 2. PM2 resurrect ---
Write-Log "[2/2] Starting PM2 processes..." "Yellow"
pm2 resurrect 2>$null
Write-Log "PM2 resurrect done" "Green"

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
Write-Log "  PM2 status: pm2 status" "Gray"
Write-Log "  PM2 logs:   pm2 logs claude-remote" "Gray"
