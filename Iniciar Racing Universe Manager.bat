@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Racing Universe Manager
cd /d "%~dp0"

echo ===============================================
echo        Racing Universe Manager - Launcher
echo ===============================================
echo.
echo Carpeta del juego:
echo %CD%
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
  echo Python no esta instalado o no esta en el PATH.
  echo.
  echo Instala Python desde:
  echo https://www.python.org/downloads/
  echo.
  echo Importante: durante la instalacion marca "Add Python to PATH".
  echo.
  pause
  exit /b 1
)

set PORT=8000
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
  echo El puerto 8000 esta ocupado. Probando puerto 8010...
  set PORT=8010
)

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
  echo El puerto %PORT% tambien esta ocupado.
  echo Cierra otro servidor local o edita este archivo para usar otro puerto.
  echo.
  pause
  exit /b 1
)

echo Iniciando servidor local en:
echo http://localhost:%PORT%
echo.
echo No cierres esta ventana mientras juegas.
echo Para detener el servidor, presiona CTRL+C.
echo.

start "RUM Server" /min python -m http.server %PORT%
echo Esperando a que el servidor termine de iniciar...
timeout /t 2 /nobreak >nul
start "" "http://localhost:%PORT%"
echo.
echo Si el navegador no abrio, copia esta URL:
echo http://localhost:%PORT%
echo.
echo Presiona una tecla para cerrar este launcher. El servidor queda en una ventana minimizada.
pause >nul
exit /b 0
