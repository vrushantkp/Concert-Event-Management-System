@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\.bin\next.cmd" (
  call npm.cmd ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000
  if errorlevel 1 goto failed
)
if not exist "scripts\windows-runtime\node_modules\embedded-postgres\package.json" (
  call npm.cmd --prefix scripts\windows-runtime install --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000
  if errorlevel 1 goto failed
)
node scripts\windows-runtime\start.mjs
if errorlevel 1 goto failed
exit /b 0
:failed
echo Encore could not start. The error above identifies the failed step.
if /i not "%~1"=="--no-pause" pause
exit /b 1
