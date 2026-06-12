@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0build-electron.ps1"
if %errorlevel% NEQ 0 (
    echo.
    echo [FAIL] Build failed!
    pause & exit /b 1
)
pause
