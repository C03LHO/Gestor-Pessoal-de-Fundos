@echo off
chcp 65001 >nul
title Fundos
cd /d "%~dp0"

echo ===============================================
echo                 F U N D O S
echo ===============================================
echo.

REM Instalar dependencias na primeira execucao
if not exist "node_modules\.modules.yaml" (
    echo Primeira execucao: instalando dependencias...
    call pnpm install || goto :erro
)

REM Garantir Prisma Client gerado e schema aplicado
call pnpm exec prisma generate >nul 2>&1
call pnpm exec prisma db push --skip-generate >nul 2>&1

REM Build de producao se nao existir
if not exist ".next\BUILD_ID" (
    echo Compilando build de producao... isso leva 1-3 minutos.
    echo.
    call pnpm run build || goto :erro
)

echo.
echo  Local:        http://localhost:3000
echo  Tailscale:    http://asusgabriel.tail7a0a40.ts.net:3000
echo  Senha:        5842 (definida em .env)
echo.
echo  Para parar:   feche esta janela ou Ctrl+C
echo ===============================================
echo.

call pnpm start
goto :fim

:erro
echo.
echo *** Erro ao iniciar. Confira a mensagem acima. ***
pause

:fim
