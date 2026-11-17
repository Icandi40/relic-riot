@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install a current Node.js release, then run this file again.
  pause
  exit /b 1
)
if not exist "node_modules" (
  call npm ci
  if errorlevel 1 (
    echo Dependency installation did not complete. Check the output above.
    pause
    exit /b 1
  )
)
echo RELIC RIOT - local development
echo Open the Local URL printed below. Keep this window open while playing.
call npm run dev
