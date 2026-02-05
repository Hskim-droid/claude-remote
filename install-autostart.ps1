# Claude Code Remote - Auto-start registration script
# Requires administrator privileges

$ErrorActionPreference = "Stop"

Write-Host "Claude Code Remote - Auto-start Setup" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# Check admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`nAdministrator privileges required." -ForegroundColor Red
    Write-Host "Run PowerShell as Administrator." -ForegroundColor Yellow
    exit 1
}

$taskName = "ClaudeCodeRemote"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $scriptDir "start.ps1"

# Check if start.ps1 exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "`nstart.ps1 not found at: $scriptPath" -ForegroundColor Red
    exit 1
}

# Remove existing task if exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "`nRemoving existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create new task
Write-Host "`nRegistering scheduled task..." -ForegroundColor Yellow

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Claude Code Remote server auto-start"

Write-Host "`nRegistration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Task name: $taskName" -ForegroundColor White
Write-Host "Trigger: At logon" -ForegroundColor White
Write-Host "Script: $scriptPath" -ForegroundColor White
Write-Host ""
Write-Host "To start manually:" -ForegroundColor Gray
Write-Host "  .\start.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "To remove the task:" -ForegroundColor Gray
Write-Host "  Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
