@echo off
chcp 65001 >nul
title Fundos - Desinstalar do boot

echo Removendo a tarefa do Windows Task Scheduler...
schtasks /Delete /TN "Fundos" /F

if errorlevel 1 (
    echo.
    echo A tarefa "Fundos" nao estava instalada (ou ja foi removida).
) else (
    echo.
    echo Pronto. O Fundos nao vai mais subir com o Windows.
)
echo.
pause
