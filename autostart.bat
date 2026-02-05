@echo off
REM Claude Code Remote - Auto-start batch file
REM Used by Task Scheduler

cd /d %~dp0
powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
