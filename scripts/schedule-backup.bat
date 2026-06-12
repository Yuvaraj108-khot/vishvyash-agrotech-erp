@echo off
:: ================================================================
:: Vishvyash ERP — Schedule Daily Backup via Windows Task Scheduler
:: Run as Administrator
:: Backup runs every day at 11:00 PM
:: ================================================================

net session >nul 2>&1
if %errorlevel% NEQ 0 (
    echo ERROR: Run as Administrator!
    pause & exit /b 1
)

set SCRIPT_PATH=%~dp0daily-backup.ps1
set TASK_NAME=VishvyashERP_DailyBackup

:: Delete existing task if present
schtasks /Delete /TN "%TASK_NAME%" /F 2>nul

:: Create daily scheduled task at 11 PM
schtasks /Create ^
    /TN "%TASK_NAME%" ^
    /TR "powershell.exe -NonInteractive -ExecutionPolicy Bypass -File \"%SCRIPT_PATH%\"" ^
    /SC DAILY ^
    /ST 23:00 ^
    /RU SYSTEM ^
    /RL HIGHEST ^
    /F

if %errorlevel% EQU 0 (
    echo.
    echo ✅ Daily backup scheduled at 11:00 PM every day.
    echo    Task name: %TASK_NAME%
    echo    Script:    %SCRIPT_PATH%
    echo.
    echo    Backups saved to: D:\ERP_Backups
) else (
    echo ERROR: Failed to create scheduled task.
)
pause
