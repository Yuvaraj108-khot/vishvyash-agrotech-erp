@echo off
set PATH=C:\Program Files\nodejs;C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\;%PATH%
set NPM=node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"
set NPX=node "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js"

echo ============================================================
echo  VISHVYASH ERP - Quick Rebuild (bundle + package only)
echo ============================================================

echo [1/3] Recreating server_bundle...
if exist electron\server_bundle rmdir /s /q electron\server_bundle
mkdir electron\server_bundle
mkdir electron\server_bundle\dist
mkdir electron\server_bundle\prisma

xcopy /E /I /Y server\dist\* electron\server_bundle\dist\ || exit /b 1
xcopy /E /I /Y server\public\* electron\server_bundle\public\ || exit /b 1
copy server\package.json electron\server_bundle\package.json || exit /b 1
copy server\prisma\schema.prisma electron\server_bundle\prisma\schema.prisma || exit /b 1

echo [2/3] Installing production dependencies (with nodemailer)...
cd electron\server_bundle || exit /b 1
%NPM% install --omit=dev || exit /b 1
%NPX% prisma generate || exit /b 1
cd ..\..

echo [3/3] Packaging Electron installer...
rem Set a local cache for electron-builder to avoid permission issues
set "ELECTRON_BUILDER_CACHE=%cd%\\electron\\.builderCache"
if not exist "%ELECTRON_BUILDER_CACHE%" mkdir "%ELECTRON_BUILDER_CACHE%"
cd electron || exit /b 1
%NPM% run build:installer || exit /b 1
cd ..

echo ============================================================
echo  - BUILD SUCCESSFUL!
echo ============================================================
