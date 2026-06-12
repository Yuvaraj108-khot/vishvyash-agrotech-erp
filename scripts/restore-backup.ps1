# ================================================================
# Vishvyash ERP — Database Restore Script
# Restores a SQL backup from D:\ERP_Backups
#
# Usage:
#   PowerShell -ExecutionPolicy Bypass -File scripts\restore-backup.ps1
#
# Or with specific file:
#   PowerShell -ExecutionPolicy Bypass -File scripts\restore-backup.ps1 -BackupFile "vishvyash_erp_backup_2025_01_15_2300.zip"
# ================================================================

param(
    [string]$BackupDir   = "D:\ERP_Backups",
    [string]$BackupFile  = "",       # Leave empty to pick latest backup
    [string]$DbName      = $env:DB_NAME,
    [string]$DbUser      = $env:DB_USER,
    [string]$DbHost      = ($env:DB_HOST ?? "localhost"),
    [string]$DbPort      = ($env:DB_PORT ?? "5432"),
    [switch]$DryRun      = $false    # -DryRun to test without restoring
)

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " VISHVYASH ERP — Database Restore" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# ── Validate params ────────────────────────────────────────────
if (-not $DbName -or -not $DbUser) {
    Write-Host "ERROR: DB_NAME and DB_USER env vars are required." -ForegroundColor Red
    Write-Host "Set them in your .env file or pass as params." -ForegroundColor Red
    exit 1
}

# ── Find psql and pg_restore ───────────────────────────────────
$pgBin = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue |
         Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty DirectoryName

if (-not $pgBin) {
    Write-Host "ERROR: psql.exe not found. Is PostgreSQL installed?" -ForegroundColor Red
    exit 1
}
$psqlExe = Join-Path $pgBin "psql.exe"
Write-Host "Using PostgreSQL tools from: $pgBin" -ForegroundColor Gray

# ── Select backup file ─────────────────────────────────────────
if ($BackupFile) {
    $zipPath = Join-Path $BackupDir $BackupFile
    if (-not (Test-Path $zipPath)) {
        Write-Host "ERROR: Backup file not found: $zipPath" -ForegroundColor Red
        exit 1
    }
} else {
    # Auto-select the latest backup
    $latest = Get-ChildItem $BackupDir -Filter "vishvyash_erp_backup_*.zip" -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Host "ERROR: No backup files found in $BackupDir" -ForegroundColor Red
        exit 1
    }
    $zipPath = $latest.FullName
    $BackupFile = $latest.Name
}

Write-Host "Backup to restore: $BackupFile" -ForegroundColor Yellow
Write-Host "Target database:   $DbUser@$DbHost`:$DbPort/$DbName" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN — no changes will be made." -ForegroundColor Magenta
    Write-Host "Remove -DryRun flag to perform actual restore." -ForegroundColor Magenta
    exit 0
}

# ── Confirm ────────────────────────────────────────────────────
Write-Host "⚠️  WARNING: This will DROP and recreate the database!" -ForegroundColor Red
Write-Host "   All current data will be REPLACED with backup data." -ForegroundColor Red
Write-Host ""
$confirm = Read-Host "Type 'YES' to confirm restore"
if ($confirm -ne 'YES') {
    Write-Host "Restore cancelled." -ForegroundColor Gray
    exit 0
}

# ── Extract ZIP ────────────────────────────────────────────────
$tempDir = Join-Path $env:TEMP "erp_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Host ""
Write-Host "Extracting backup..." -ForegroundColor Cyan
Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

$sqlFile = Get-ChildItem $tempDir -Filter "*.sql" | Select-Object -First 1
if (-not $sqlFile) {
    Write-Host "ERROR: No .sql file found inside backup ZIP." -ForegroundColor Red
    Remove-Item $tempDir -Recurse -Force
    exit 1
}
Write-Host "Extracted: $($sqlFile.Name) ($([Math]::Round($sqlFile.Length/1MB, 2)) MB)" -ForegroundColor Gray

# ── Stop PM2 to prevent active connections ─────────────────────
Write-Host ""
Write-Host "Stopping ERP server (PM2)..." -ForegroundColor Cyan
$pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2) {
    & pm2 stop vishvyash-erp 2>$null
    Write-Host "PM2 process stopped." -ForegroundColor Gray
} else {
    Write-Host "PM2 not found — make sure no active connections exist." -ForegroundColor Yellow
}

# ── Drop and recreate database ─────────────────────────────────
$env:PGPASSWORD = $env:DB_PASS
Write-Host ""
Write-Host "Dropping and recreating database '$DbName'..." -ForegroundColor Cyan

# Terminate all connections first
& $psqlExe -h $DbHost -p $DbPort -U $DbUser -d postgres -c `
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DbName' AND pid <> pg_backend_pid();" `
    2>$null | Out-Null

& $psqlExe -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>$null
& $psqlExe -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>$null

# ── Restore SQL dump ──────────────────────────────────────────
Write-Host "Restoring SQL dump..." -ForegroundColor Cyan
& $psqlExe -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $sqlFile.FullName

if ($LASTEXITCODE -ne 0) {
    $env:PGPASSWORD = ""
    Write-Host ""
    Write-Host "ERROR: Restore failed! Check errors above." -ForegroundColor Red
    Write-Host "NOTE: Your database may be in an incomplete state." -ForegroundColor Red
    Remove-Item $tempDir -Recurse -Force
    exit 1
}

$env:PGPASSWORD = ""

# ── Run Prisma migrate deploy (ensures schema is current) ─────
Write-Host ""
Write-Host "Running Prisma migrate deploy..." -ForegroundColor Cyan
$serverDir = Join-Path $PSScriptRoot "..\server"
Push-Location $serverDir
npx prisma migrate deploy 2>$null
Pop-Location

# ── Restart PM2 ───────────────────────────────────────────────
if ($pm2) {
    Write-Host ""
    Write-Host "Restarting ERP server..." -ForegroundColor Cyan
    & pm2 start vishvyash-erp
}

# ── Cleanup ────────────────────────────────────────────────────
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host " ✅ RESTORE COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "   Restored from: $BackupFile" -ForegroundColor White
Write-Host "   Database:      $DbName" -ForegroundColor White
Write-Host ""
Write-Host "   VERIFICATION STEPS:" -ForegroundColor Yellow
Write-Host "   1. Open http://localhost:5000 and login" -ForegroundColor White
Write-Host "   2. Check that Clients, Invoices, Payments are present" -ForegroundColor White
Write-Host "   3. Generate a test PDF invoice" -ForegroundColor White
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
