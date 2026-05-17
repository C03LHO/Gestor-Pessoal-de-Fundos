@echo off
chcp 65001 >nul
title Fundos - Backup
cd /d "%~dp0"

set BACKUP_DIR=%~dp0backups
set DATA_DB=%~dp0data.db

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%DATA_DB%" (
    echo data.db nao existe. Nada a fazer.
    exit /b 0
)

REM Nome com data ISO + hora
for /f "tokens=2 delims==" %%a in ('"wmic OS Get localdatetime /value"') do set ldt=%%a
set STAMP=%ldt:~0,4%-%ldt:~4,2%-%ldt:~6,2%_%ldt:~8,2%%ldt:~10,2%
set OUT=%BACKUP_DIR%\data-%STAMP%.db

copy /Y "%DATA_DB%" "%OUT%" >nul
if errorlevel 1 (
    echo Erro ao copiar backup.
    exit /b 1
)

echo Backup gerado: %OUT%

REM Manter so os 14 ultimos arquivos
pushd "%BACKUP_DIR%"
for /f "skip=14 delims=" %%f in ('dir /b /o-d data-*.db 2^>nul') do (
    del "%%f" >nul 2>&1
)
popd
