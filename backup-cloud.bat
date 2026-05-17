@echo off
chcp 65001 >nul
title Fundos - Backup para nuvem
cd /d "%~dp0"

REM ====== Configuração ======
REM Edite estas variáveis ou defina via .env
if "%RCLONE_REMOTE%"=="" set RCLONE_REMOTE=gdrive:Fundos-Backup
set RETENCAO_DIAS=30

REM ====== Local (mantém os 14 mais recentes) ======
set BACKUP_DIR=%~dp0backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%~dp0data.db" (
    echo data.db nao existe. Nada a fazer.
    exit /b 0
)

for /f "tokens=2 delims==" %%a in ('"wmic OS Get localdatetime /value"') do set ldt=%%a
set STAMP=%ldt:~0,4%-%ldt:~4,2%-%ldt:~6,2%_%ldt:~8,2%%ldt:~10,2%
set DB_OUT=%BACKUP_DIR%\data-%STAMP%.db
set JSON_OUT=%BACKUP_DIR%\export-%STAMP%.json

copy /Y "%~dp0data.db" "%DB_OUT%" >nul
echo Backup local: %DB_OUT%

REM ====== Tenta gerar export JSON via API (se servidor está rodando) ======
curl -s -o "%JSON_OUT%" -H "Cookie: fundos_auth=dummy" http://localhost:3000/api/export 2>nul
if exist "%JSON_OUT%" (
    for %%F in ("%JSON_OUT%") do if %%~zF GTR 100 (
        echo Export JSON: %JSON_OUT%
    ) else (
        del "%JSON_OUT%" 2>nul
    )
)

REM ====== Upload para nuvem via rclone (se instalado e configurado) ======
where rclone >nul 2>&1
if errorlevel 1 (
    echo rclone nao instalado. Backup local OK. Para sync na nuvem:
    echo   1. Baixe rclone em https://rclone.org/downloads/
    echo   2. Rode 'rclone config' e configure um remote ^(ex: gdrive^)
    echo   3. Rode este .bat de novo
    goto :limpa
)

echo Enviando para %RCLONE_REMOTE%...
rclone copy "%DB_OUT%" "%RCLONE_REMOTE%/" --quiet
if exist "%JSON_OUT%" rclone copy "%JSON_OUT%" "%RCLONE_REMOTE%/" --quiet

REM Aplica retencao na nuvem
rclone delete "%RCLONE_REMOTE%/" --min-age %RETENCAO_DIAS%d --quiet 2>nul

echo Backup cloud OK ^(retencao %RETENCAO_DIAS% dias^)

:limpa
REM Retencao local: 14 mais recentes
pushd "%BACKUP_DIR%"
for /f "skip=14 delims=" %%f in ('dir /b /o-d data-*.db 2^>nul') do del "%%f" >nul 2>&1
for /f "skip=14 delims=" %%f in ('dir /b /o-d export-*.json 2^>nul') do del "%%f" >nul 2>&1
popd
