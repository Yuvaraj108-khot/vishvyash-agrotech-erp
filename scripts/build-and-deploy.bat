@echo off
setlocal enabledelayedexpansion
:: ================================================================
:: Vishvyash ERP — One-Click Build and Deploy Script
:: Builds React client → copies to server/public → builds server
:: Run this on the office server PC whenever code is updated.
:: ================================================================

echo.
echo ============================================================
echo  VISHVYASH ERP — Build and Deploy
echo  %date% %time%
echo ============================================================
echo.

set "ROOT_DIR=%~dp0.."
set "CLIENT_DIR=%ROOT_DIR%\client"
set "SERVER_DIR=%ROOT_DIR%\server"
set "PUBLIC_DIR=%SERVER_DIR%\public"

:: ── Step 1: Build React Client ─────────────────────────────────
echo [1/4] Building React client (production mode)...
echo       VITE_API_URL will be empty → /api calls go same-origin
cd /d "%CLIENT_DIR%"
call npm run build
if %errorlevel% NEQ 0 (
    echo.
    echo [FAIL] React client build failed!
    echo        Fix TypeScript/build errors and try again.
    pause & exit /b 1
)
echo       Client built successfully. ✓

:: ── Step 2: Copy to server/public ────────────────────────────
echo.
echo [2/4] Copying dist to server\public...
if exist "%PUBLIC_DIR%" (
    rd /s /q "%PUBLIC_DIR%"
)
mkdir "%PUBLIC_DIR%"
xcopy /E /I /Y /Q "%CLIENT_DIR%\dist\*" "%PUBLIC_DIR%\"
if %errorlevel% NEQ 0 (
    echo [FAIL] Copy failed!
    pause & exit /b 1
)
echo       Copied to %PUBLIC_DIR% ✓

:: ── Step 3: Verify index.html exists ──────────────────────────
if not exist "%PUBLIC_DIR%\index.html" (
    echo [FAIL] index.html not found in %PUBLIC_DIR%
    echo        Something went wrong with the build or copy.
    pause & exit /b 1
)
echo       Verified index.html exists. ✓

:: ── Step 4: Build Server ──────────────────────────────────────
echo.
echo [3/4] Building Node.js server...
cd /d "%SERVER_DIR%"
call npm run build
if %errorlevel% NEQ 0 (
    echo [FAIL] Server build failed!
    pause & exit /b 1
)
echo       Server built. ✓

:: ── Step 5: Restart PM2 ───────────────────────────────────────
echo.
echo [4/4] Restarting ERP server (PM2)...
where pm2 >nul 2>&1
if %errorlevel% EQU 0 (
    pm2 restart vishvyash-erp
    if %errorlevel% EQU 0 (
        echo       PM2 restarted. ✓
    ) else (
        echo       PM2 restart failed. Starting fresh...
        pm2 start "%SERVER_DIR%\dist\src\index.js" --name "vishvyash-erp" --env production
        pm2 save
    )
) else (
    echo       PM2 not found. Start the server manually:
    echo       cd server ^&^& npm run start:local
)

:: ── Final check ────────────────────────────────────────────────
echo.
echo Waiting 3 seconds for server to start...
timeout /t 3 /nobreak >nul

curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% EQU 0 (
    echo.
    echo ============================================================
    echo  ✅ DEPLOYMENT SUCCESSFUL
    echo.
    echo  Server is running at:
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
        for /f "tokens=1" %%b in ("%%a") do (
            echo    http://%%b:5000
        )
    )
    echo.
    echo  Open the above URL in a browser or Electron app to verify.
    echo ============================================================
) else (
    echo.
    echo [WARN] Health check failed. Server may still be starting.
    echo        Run 'pm2 logs vishvyash-erp' to check for errors.
)
echo.
pause
