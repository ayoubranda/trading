@echo off
title Elite Trading Intelligence

:: Check if already running
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% == 0 (
    echo Already running - opening browser...
    start http://localhost:3000
    exit /b 0
)

echo.
echo  Starting Elite Trading Intelligence...
echo  Please wait about 10 seconds...
echo.

:: Launch Git Bash with the start script
start "" "%PROGRAMFILES%\Git\git-bash.exe" -c "cd ~/trading && bash start.sh"

:: Wait for servers to boot
timeout /t 10 /nobreak >nul

:: Open browser
start http://localhost:3000

echo  Done! Keep the Git Bash window open while using the app.
echo  Close this window anytime.
timeout /t 3 /nobreak >nul
