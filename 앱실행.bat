@echo off
chcp 65001 >nul
echo ==========================================
echo   영어시험 자동 채점 앱 - 모바일 앱 시작
echo ==========================================
echo.

cd /d "%~dp0mobile"

echo [1/2] 의존성 확인 중...
if not exist "node_modules" (
    echo npm 패키지를 설치합니다...
    call npm install
    echo.
)

echo [2/2] Expo 개발 서버를 시작합니다...
echo.
echo  모바일 앱 시작 후 Expo Go 앱에서 QR 코드를 스캔하세요.
echo  종료하려면 Ctrl+C를 누르세요.
echo ==========================================
echo.

npx expo start

pause
