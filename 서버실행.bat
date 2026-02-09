@echo off
chcp 65001 >nul
echo ==========================================
echo   영어시험 자동 채점 앱 - 서버 시작
echo ==========================================
echo.

cd /d "%~dp0backend"

echo [1/2] 의존성 확인 중...
if not exist "node_modules" (
    echo npm 패키지를 설치합니다...
    call npm install
    echo.
)

echo [2/2] 서버를 시작합니다...
echo.
echo  서버 주소: http://localhost:3001
echo  Health Check: http://localhost:3001/health
echo.
echo  종료하려면 Ctrl+C를 누르세요.
echo ==========================================
echo.

node src/server.js

pause
