@echo off
title SereneReader - Leitor Ergonomico
:: Garante que o script rode na pasta onde o ficheiro esta localizado
cd /d "%~dp0"

echo ===================================================
echo   SereneReader - Leitor Ergonomico Web/PWA
echo ===================================================
echo.

:: Tentar abrir com Python se disponivel
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Servidor HTTP iniciando via Python na porta 8085...
    start http://localhost:8085/index.html
    python -m http.server 8085
    goto end
)

:: Tentar abrir com Node / npx se disponivel
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Servidor HTTP iniciando via Node/npx na porta 8085...
    start http://localhost:8085/index.html
    npx -y serve -p 8085 .
    goto end
)

:: Fallback nativo do Windows: Abrir o ficheiro HTML direto no navegador padrao
echo [INFO] Abrindo o SereneReader diretamente no navegador...
start "" "%~dp0index.html"

:end
pause
