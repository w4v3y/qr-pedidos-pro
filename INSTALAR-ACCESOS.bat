@echo off
chcp 65001 >nul
title QR Pedidos PRO - Instalar accesos en el Escritorio
cd /d "%~dp0"
echo Creando accesos directos en el Escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\crear-accesos.ps1"
echo.
pause
