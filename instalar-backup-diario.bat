@echo off
chcp 65001 >nul
title Fundos - Instalar Backup Diario
cd /d "%~dp0"

echo Registrando backup automatico todos os dias as 23h00...
schtasks /Create ^
    /TN "Fundos-Backup" ^
    /TR "\"%~dp0backup-fundos.bat\"" ^
    /SC DAILY ^
    /ST 23:00 ^
    /F

if errorlevel 1 (
    echo Falha. Tente rodar como Administrador.
    pause
    exit /b 1
)

echo.
echo Pronto. Toda noite as 23h00 e feito um backup do data.db
echo na pasta "backups\". Mantem os ultimos 14 dias.
echo.
echo Para rodar agora: backup-fundos.bat
echo Para desinstalar:  schtasks /Delete /TN "Fundos-Backup" /F
echo.
pause
