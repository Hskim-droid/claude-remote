# Claude Code Remote - 자동 시작 등록 스크립트
# 관리자 권한으로 실행 필요

$ErrorActionPreference = "Stop"

Write-Host "Claude Code Remote - 자동 시작 등록" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 관리자 권한 확인
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`n관리자 권한이 필요합니다." -ForegroundColor Red
    Write-Host "PowerShell을 관리자 권한으로 실행하세요." -ForegroundColor Yellow
    exit 1
}

$taskName = "ClaudeCodeRemote"
$scriptPath = "D:\tools\claude-remote\start.ps1"

# 기존 작업 확인 및 삭제
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "`n기존 작업 삭제 중..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# 새 작업 생성
Write-Host "`n작업 스케줄러 등록 중..." -ForegroundColor Yellow

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Claude Code Remote 서버 자동 시작"

Write-Host "`n등록 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "작업 이름: $taskName" -ForegroundColor White
Write-Host "트리거: 로그온 시" -ForegroundColor White
Write-Host ""
Write-Host "수동으로 시작하려면:" -ForegroundColor Gray
Write-Host "  .\start.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "작업을 제거하려면:" -ForegroundColor Gray
Write-Host "  Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
