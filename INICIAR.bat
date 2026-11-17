@echo off
chcp 65001 >nul
title QR Pedidos PRO - Servidor (no cerrar)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  [ERROR] Node.js no esta instalado.
    echo  Descargalo gratis desde https://nodejs.org , instalalo
    echo  y vuelve a abrir este acceso.
    echo.
    start https://nodejs.org
    pause
    exit /b
)

echo Iniciando el sistema... (deja esta ventana abierta)
start "" http://localhost:3000/admin
node iniciar.js
echo.
echo El servidor se detuvo. Revisa datos\registro.log si fue por un error.
pause
