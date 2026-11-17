@echo off
setlocal
title IHK Lernplattform
cd /d "%~dp0"

set "TOOLS_NODE=%~dp0.tools\node-v26.13.0"
if exist "%TOOLS_NODE%\node.exe" (
    set "PATH=%TOOLS_NODE%;%~dp0node_modules\.bin;%PATH%"
) else (
    set "PATH=%~dp0node_modules\.bin;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Node.js wurde weder in .tools noch im System-PATH gefunden.
    pause
    exit /b 1
)

echo ====================================================
echo  IHK Lernplattform - Startskript
echo  Portables Node: %TOOLS_NODE%
echo ====================================================
echo.

call npm.cmd run dev -- --open %*
if errorlevel 1 (
    echo.
    echo Server beendet oder Fehler aufgetreten.
    pause
)
