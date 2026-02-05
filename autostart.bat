@echo off
REM Claude Code Remote - 자동 시작 배치 파일
REM 작업 스케줄러에서 사용

cd /d D:\tools\claude-remote
powershell -ExecutionPolicy Bypass -File "D:\tools\claude-remote\start.ps1"
