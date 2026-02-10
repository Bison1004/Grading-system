@echo off
chcp 65001 >nul
title Firewall - Port 3001 Open

:: Check admin privileges
net session >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [!] Administrator privileges required!
    echo      Right-click this file, select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo  ========================================
echo    Firewall Setup - Open Port 3001
echo  ========================================
echo.
echo  Opening port 3001 so other devices
echo  (smartphones, etc.) can connect to the server.
echo.

:: Remove existing rules (cleanup)
netsh advfirewall firewall delete rule name="ExamGradingServer-TCP3001" >nul 2>&1
netsh advfirewall firewall delete rule name=all protocol=TCP localport=3001 >nul 2>&1

:: Add inbound rule (all profiles: domain, private, public)
netsh advfirewall firewall add rule ^
    name="ExamGradingServer-TCP3001" ^
    dir=in ^
    action=allow ^
    protocol=TCP ^
    localport=3001 ^
    profile=any ^
    description="Exam grading app backend server"

if errorlevel 1 (
    echo.
    echo  ❌ 방화벽 규칙 추가에 실패했습니다.
    echo.
    pause
    exit /b 1
)

echo.
echo  [OK] Firewall rule added!
echo.
echo  Other devices on the same Wi-Fi can now connect.
echo  Run the server and use the IP address shown.
echo.

:: Show current IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "LOCAL_IP=%%a"
    goto :show_ip
)
:show_ip
set LOCAL_IP=%LOCAL_IP: =%
echo  Smartphone browser:  http://%LOCAL_IP%:3001
echo.
pause
