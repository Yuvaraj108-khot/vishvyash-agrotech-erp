@echo off
setlocal enabledelayedexpansion
:: ================================================================
:: Vishvyash ERP — PM2 Windows Service Setup (Robust Version)
:: Run this as Administrator on the office server PC
:: ================================================================

echo.
echo ============================================================
echo  VISHVYASH ERP — PM2 Windows Service Setup
echo ============================================================
echo.

:: ── Check admin rights ────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] Please right-click and "Run as administrator"!
    pause & exit /b 1
)

:: ── Check Node.js ─────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo Node.js %NODE_VER% found. ✓

:: ── Find server directory ─────────────────────────────────────
set "SERVER_DIR=%~dp0..\server"
if not exist "%SERVER_DIR%\package.json" (
    echo [ERROR] server/package.json not found at: %SERVER_DIR%
    pause & exit /b 1
)

:: ── Install PM2 globally ──────────────────────────────────────
echo.
echo [Step 1/6] Installing PM2...
call npm install -g pm2
if %errorlevel% NEQ 0 ( echo [FAIL] PM2 install failed. & pause & exit /b 1 )
echo PM2 installed. ✓

:: ── Install pm2-windows-service ───────────────────────────────
echo.
echo [Step 2/6] Installing pm2-windows-service...
call npm install -g pm2-windows-service
if %errorlevel% NEQ 0 (
    echo [WARN] pm2-windows-service failed to install. Will use alternative method.
    set USE_SCHTASKS=1
) else (
    echo pm2-windows-service installed. ✓
    set USE_SCHTASKS=0
)

:: ── Build the server ──────────────────────────────────────────
echo.
echo [Step 3/6] Building ERP server...
cd /d "%SERVER_DIR%"
call npm install
call npm run build
if %errorlevel% NEQ 0 (
    echo [FAIL] Server build failed. Check for TypeScript errors.
    pause & exit /b 1
)
echo Server built successfully. ✓

:: ── Verify .env exists ───────────────────────────────────────
if not exist ".env" (
    echo.
    echo [ERROR] server\.env not found!
    echo Copy .env.production.template to .env and fill in your credentials.
    pause & exit /b 1
)
echo .env found. ✓

:: ── Register with PM2 ────────────────────────────────────────
echo.
echo [Step 4/6] Starting server with PM2...
call pm2 delete vishvyash-erp 2>nul

:: Create logs directory
if not exist "logs" mkdir logs

:: Use pm2.config.js for proper env loading
if exist "pm2.config.js" (
    call pm2 start pm2.config.js --env production
) else (
    call pm2 start dist/src/index.js --name "vishvyash-erp" --env production --restart-delay=3000 --max-restarts=10
)
if %errorlevel% NEQ 0 ( echo [FAIL] PM2 start failed. & pause & exit /b 1 )
call pm2 save
echo PM2 process saved. ✓


:: ── Install as Windows Service ───────────────────────────────
echo.
echo [Step 5/6] Installing as Windows Service...

if "%USE_SCHTASKS%"=="0" (
    :: Method 1: pm2-windows-service (preferred)
    call pm2-service-install -n "VishvyashERP"
    if %errorlevel% NEQ 0 (
        echo [WARN] pm2-service-install failed, falling back to Task Scheduler method.
        set USE_SCHTASKS=1
    ) else (
        echo PM2 Windows Service installed. ✓
    )
)

if "%USE_SCHTASKS%"=="1" (
    :: Method 2: Task Scheduler fallback (runs PM2 resurrect at startup)
    for /f "tokens=*" %%p in ('where pm2') do set PM2_PATH=%%p
    schtasks /Delete /TN "VishvyashERP_Startup" /F 2>nul
    schtasks /Create ^
        /TN "VishvyashERP_Startup" ^
        /TR "cmd /c \"!PM2_PATH! resurrect\"" ^
        /SC ONSTART ^
        /DELAY 0001:00 ^
        /RU SYSTEM ^
        /RL HIGHEST ^
        /F
    if %errorlevel% EQU 0 (
        echo Task Scheduler startup task created. ✓
    ) else (
        echo [WARN] Task Scheduler also failed. You may need to start PM2 manually after reboot.
    )
)

:: ── Quick health check ────────────────────────────────────────
echo.
echo [Step 6/6] Verifying server is running...
timeout /t 3 /nobreak >nul

curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% EQU 0 (
    echo Server health check: PASSED ✓
    echo http://localhost:5000/health is responding.
) else (
    :: Try port 4000 fallback
    curl -s http://localhost:4000/health >nul 2>&1
    if %errorlevel% EQU 0 (
        echo Server health check: PASSED on port 4000 ✓
        echo NOTE: PORT in your .env may not be set to 5000.
    ) else (
        echo [WARN] Health check failed. Server may still be starting.
        echo Run 'pm2 logs vishvyash-erp' to check for errors.
    )
)

:: ── Find this PC's IP ─────────────────────────────────────────
echo.
echo ============================================================
echo  SETUP COMPLETE
echo.
echo  This server's IP addresses:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do echo    http://%%b:5000
)
echo.
echo  FROM OTHER OFFICE PCs, open a browser to one of those URLs.
echo.
echo  REBOOT TEST (important!):
echo    1. Restart this PC
echo    2. Wait 2 minutes
echo    3. Open http://YOUR_IP:5000/health from another PC
echo    4. If it responds = service is working ✓
echo.
echo  PM2 Commands:
echo    pm2 status              - check running processes
echo    pm2 logs vishvyash-erp  - view live logs
echo    pm2 restart vishvyash-erp
echo ============================================================
echo.
pause
