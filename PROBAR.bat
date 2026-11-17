@echo off
chcp 65001 >nul
title QR Pedidos PRO - Pruebas automaticas
cd /d "%~dp0"
echo Ejecutando pruebas (usa una base de datos temporal, no toca tus datos)...
echo.
node pruebas\pruebas.js
echo.
pause
