@echo off
chcp 65001 >nul
title Fundos - Rebuild
cd /d "%~dp0"

echo Recompilando aplicacao...
if exist ".next" rmdir /s /q ".next"
call pnpm run build
echo.
echo Build pronto. Rode start-fundos.bat para subir.
pause
