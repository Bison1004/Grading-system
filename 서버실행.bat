@echo off
chcp 65001 >nul
title Exam Grading Server
echo.
echo  ========================================
echo    Exam Grading App - Starting Server
echo  ========================================
echo.

cd /d "%~dp0backend"

:: Node.js check
where node >nul 2>nul
if errorlevel 1 (
    echo  [X] Node.js is not installed!
    echo      Download from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo  [1/3] Node.js version:
node -v
echo.

echo  [2/3] Checking dependencies...
if not exist "node_modules" (
    echo  Installing npm packages (first time only)...
    call npm install
    echo.
)

:: Detect local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "LOCAL_IP=%%a"
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  [3/3] Starting server...
echo.
echo  ----------------------------------------
echo   PC browser:
echo     http://localhost:3001
echo.
echo   Smartphone / other devices:
echo     http://%LOCAL_IP%:3001
echo.
echo   * Must be on the same Wi-Fi network
echo   * If blocked, run firewall setup bat
echo  ----------------------------------------
echo.
echo  Press Ctrl+C to stop the server.
echo.

node src/server.js

pause
