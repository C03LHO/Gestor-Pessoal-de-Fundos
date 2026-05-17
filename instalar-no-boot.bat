@echo off
chcp 65001 >nul
title Fundos - Instalar no boot
cd /d "%~dp0"

echo Registrando Fundos para iniciar com o Windows...
echo.

schtasks /Create ^
    /TN "Fundos" ^
    /TR "wscript.exe \"%~dp0start-fundos-hidden.vbs\"" ^
    /SC ONLOGON ^
    /DELAY 0000:30 ^
    /F

if errorlevel 1 (
    echo.
    echo Falha ao instalar a tarefa. Tente rodar como Administrador.
    pause
    exit /b 1
)

echo.
echo Pronto. Toda vez que voce fizer login no Windows, o Fundos sobe
echo automaticamente em background, sem janela visivel.
echo.
echo Para desinstalar: rode desinstalar-do-boot.bat
echo Para subir agora sem reiniciar: rode start-fundos.bat
echo.
pause
