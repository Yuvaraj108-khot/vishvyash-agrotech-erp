# ================================================================
# Vishvyash ERP - Electron Desktop Installer Build Script (PowerShell)
# Complete standalone build pipeline.
# ================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " VISHVYASH ERP - Building Electron App" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

$ROOT_DIR = (Get-Location).Path
$CLIENT_DIR = "$ROOT_DIR\client"
$SERVER_DIR = "$ROOT_DIR\server"
$ELECTRON_DIR = "$ROOT_DIR\electron"
$BUNDLE_DIR = "$ELECTRON_DIR\server_bundle"

# -- Step 1: Build React Client ---------------------------------
Write-Host "[1/6] Building React client..." -ForegroundColor Cyan
Set-Location $CLIENT_DIR
npm run build
Write-Host "      Client built successfully. `n" -ForegroundColor Green

# -- Step 2: Copy client dist to server public ------------------
Write-Host "[2/6] Copying frontend assets to server public..." -ForegroundColor Cyan
$PUBLIC_DIR = "$SERVER_DIR\public"
if (Test-Path $PUBLIC_DIR) {
    Remove-Item -Recurse -Force $PUBLIC_DIR
}
New-Item -ItemType Directory -Path $PUBLIC_DIR | Out-Null
Copy-Item -Path "$CLIENT_DIR\dist\*" -Destination $PUBLIC_DIR -Recurse -Force
Write-Host "      Frontend assets copied. `n" -ForegroundColor Green

# -- Step 3: Build Server TypeScript ----------------------------
Write-Host "[3/6] Building Server backend..." -ForegroundColor Cyan
Set-Location $SERVER_DIR
npm run build
Write-Host "      Server built. `n" -ForegroundColor Green

# -- Step 4: Recreate server_bundle -----------------------------
Write-Host "[4/6] Recreating server_bundle for Electron packaging..." -ForegroundColor Cyan
if (Test-Path $BUNDLE_DIR) {
    Remove-Item -Recurse -Force $BUNDLE_DIR
}
New-Item -ItemType Directory -Path $BUNDLE_DIR | Out-Null
New-Item -ItemType Directory -Path "$BUNDLE_DIR\dist" | Out-Null
New-Item -ItemType Directory -Path "$BUNDLE_DIR\prisma" | Out-Null

Copy-Item -Path "$SERVER_DIR\dist\*" -Destination "$BUNDLE_DIR\dist\" -Recurse -Force
Copy-Item -Path "$SERVER_DIR\public\*" -Destination "$BUNDLE_DIR\public\" -Recurse -Force
Copy-Item -Path "$SERVER_DIR\package.json" -Destination "$BUNDLE_DIR\package.json" -Force
Copy-Item -Path "$SERVER_DIR\prisma\schema.prisma" -Destination "$BUNDLE_DIR\prisma\schema.prisma" -Force
Write-Host "      server_bundle populated. `n" -ForegroundColor Green

# -- Step 5: Install server production dependencies -------------
Write-Host "[5/6] Installing production dependencies in server_bundle..." -ForegroundColor Cyan
Set-Location $BUNDLE_DIR
npm install --omit=dev

Write-Host "      Generating Prisma client inside server_bundle..." -ForegroundColor Cyan
npx prisma generate
Write-Host "      Production dependencies and Prisma client ready. `n" -ForegroundColor Green

# -- Step 6: Build Electron Installer ---------------------------
Write-Host "[6/6] Packaging Electron Installer..." -ForegroundColor Cyan
Set-Location $ELECTRON_DIR

# Ensure app.config.json exists or guide user
if (-not (Test-Path "app.config.json")) {
    if (Test-Path "app.config.template.json") {
        Write-Host "      [WARN] app.config.json not found in electron/. Creating temporary config from template..." -ForegroundColor Yellow
        Copy-Item -Path "app.config.template.json" -Destination "app.config.json" -Force
    }
}

Write-Host "      Installing Electron build dependencies..." -ForegroundColor Cyan
npm install

npm run build:installer
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " - ELECTRON BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host " Installer is located at:" -ForegroundColor Green
Write-Host " $ELECTRON_DIR\dist\Vishvyash ERP-Setup.exe" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
