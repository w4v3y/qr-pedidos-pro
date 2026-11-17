@echo off
chcp 65001 >nul
title QR Pedidos PRO - Acceso por internet (Cloudflare)
cd /d "%~dp0"

if exist cloudflared.exe goto :tunel
echo.
echo  Se descargara cloudflared.exe (herramienta oficial y gratuita de
echo  Cloudflare, ~60 MB) desde github.com/cloudflare/cloudflared
echo.
set /p RESP="  Escribe S y presiona Enter para descargar: "
if /i not "%RESP%"=="S" exit /b
curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
if errorlevel 1 ( echo  [ERROR] No se pudo descargar. Revisa tu internet. & pause & exit /b )

:tunel
echo.
echo ================================================================
echo  Creando tunel. En unos segundos vera una direccion
echo     https://XXXX.trycloudflare.com
echo  COPIELA y peguela en:  /admin  ^>  Usuarios  ^>  URL publica
echo.
echo  La direccion cambia cada vez que reinicia este tunel.
echo  Deje esta ventana abierta junto con la del servidor.
echo ================================================================
echo.
cloudflared.exe tunnel --url http://localhost:3000
pause
