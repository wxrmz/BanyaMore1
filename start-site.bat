@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Запускаю сайт... Не закрывайте это окно, пока смотрите сайт.
start "" cmd /c "timeout /t 12 >/dev/null & start http://localhost:3000"
npm run dev
pause
