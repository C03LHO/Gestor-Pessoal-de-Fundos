@echo off
chcp 65001 >nul
title Fundos - Restaurar backup
cd /d "%~dp0"

echo === Restaurar backup ===
echo.
echo Lista de backups locais disponiveis:
echo.
dir /b /o-d "backups\data-*.db" 2>nul
echo.
set /p ARQUIVO=Digite o nome do arquivo (ex: data-2026-05-15_2300.db):
if "%ARQUIVO%"=="" exit /b 0

if not exist "backups\%ARQUIVO%" (
    echo Arquivo nao existe em backups\
    pause
    exit /b 1
)

echo ATENCAO: isso vai sobrescrever o data.db atual.
set /p CONFIRMA=Tem certeza? (S/N):
if /i not "%CONFIRMA%"=="S" exit /b 0

REM Para o servidor se estiver rodando
echo Verificando se o servidor esta rodando...
taskkill /F /IM node.exe 2>nul

REM Backup do atual (just in case)
if exist data.db copy /Y data.db "backups\data-antes-restore-%RANDOM%.db" >nul

copy /Y "backups\%ARQUIVO%" data.db >nul
echo Banco restaurado. Suba o servidor com start-fundos.bat
pause
