@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run check
if errorlevel 1 (
  pause
  exit /b 1
)
call npm run build
pause
