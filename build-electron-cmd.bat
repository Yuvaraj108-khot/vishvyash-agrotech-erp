@echo off
set PATH=C:\Program Files\nodejs;C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\;%PATH%
set NPM=node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"
set NPX=node "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js"

echo ============================================================
echo  VISHVYASH ERP - Building Electron App (CMD Mode)
echo ============================================================

echo [1/6] Building React client...
cd client || exit /b 1
%NPM% run build || exit /b 1
cd ..

echo [2/6] Copying frontend assets to server public...
if exist server\public rmdir /s /q server\public
mkdir server\public
xcopy /E /I /Y client\dist\* server\public\ || exit /b 1

echo [3/6] Building Server backend...
cd server || exit /b 1
%NPM% run build || exit /b 1
cd ..

echo [4/6] Recreating server_bundle for Electron packaging...
if exist electron\server_bundle rmdir /s /q electron\server_bundle
mkdir electron\server_bundle
mkdir electron\server_bundle\dist
mkdir electron\server_bundle\prisma

xcopy /E /I /Y server\dist\* electron\server_bundle\dist\ || exit /b 1
xcopy /E /I /Y server\public\* electron\server_bundle\public\ || exit /b 1
copy server\package.json electron\server_bundle\package.json || exit /b 1
copy server\prisma\schema.prisma electron\server_bundle\prisma\schema.prisma || exit /b 1

echo [5/6] Installing production dependencies in server_bundle...
cd electron\server_bundle || exit /b 1
%NPM% install --omit=dev || exit /b 1
%NPX% prisma generate || exit /b 1
cd ..\..

echo [6/6] Packaging Electron Installer...
cd electron || exit /b 1
if not exist app.config.json (
  if exist app.config.template.json (
    copy app.config.template.json app.config.json || exit /b 1
  )
)
%NPM% install || exit /b 1
%NPM% run build:installer || exit /b 1
cd ..

echo ============================================================
echo  - ELECTRON BUILD SUCCESSFUL!
echo ============================================================
