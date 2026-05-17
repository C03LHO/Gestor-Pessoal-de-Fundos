@echo off
chcp 65001 >nul
title Fundos - Restart Dev Limpo
cd /d "%~dp0"

echo Matando processos node antigos...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Limpando cache .next...
if exist ".next" rmdir /s /q ".next"

echo Subindo dev limpo na porta 3000...
echo.
call pnpm run dev
