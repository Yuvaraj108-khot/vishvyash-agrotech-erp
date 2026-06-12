# ================================================================
# Vishvyash ERP — Automated Daily Backup Script
# Schedule this with Windows Task Scheduler to run daily at 11 PM
# ================================================================
# Backs up to D:\ERP_Backups AND Google Drive sync folder (if configured)

param(
    [string]$BackupDir = "D:\ERP_Backups",
    [string]$GoogleDriveDir = "",  # e.g., "C:\Users\YourName\Google Drive\ERP_Backups"
    [string]$DbName = $env:DB_NAME,
    [string]$DbUser = $env:DB_USER,
    [string]$DbHost = ($env:DB_HOST ?? "localhost"),
    [string]$DbPort = ($env:DB_PORT ?? "5432"),
    [int]$RetentionDays = 30
)

$timestamp = Get-Date -Format "yyyy_MM_dd_HHmm"
$backupFile = "vishvyash_erp_backup_$timestamp.sql"
$zipFile = "vishvyash_erp_backup_$timestamp.zip"

Write-Host "===================================================="
Write-Host " Vishvyash ERP Daily Backup — $(Get-Date)"
Write-Host "===================================================="

# ── Create backup directories ─────────────────────────────────
foreach ($dir in @($BackupDir, $GoogleDriveDir) | Where-Object { $_ }) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created: $dir"
    }
}

# ── pg_dump ──────────────────────────────────────────────────
$pgDumpPath = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
if (-not (Test-Path $pgDumpPath)) {
    # Try other versions
    $pgDumpPath = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "pg_dump.exe" -Recurse -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}

if (-not $pgDumpPath -or -not (Test-Path $pgDumpPath)) {
    Write-Host "ERROR: pg_dump.exe not found. Is PostgreSQL installed?" -ForegroundColor Red
    exit 1
}

$sqlPath = Join-Path $BackupDir $backupFile
$env:PGPASSWORD = $env:DB_PASS

Write-Host "Running pg_dump..."
& $pgDumpPath `
    --host=$DbHost `
    --port=$DbPort `
    --username=$DbUser `
    --dbname=$DbName `
    --format=plain `
    --no-password `
    --file=$sqlPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pg_dump failed!" -ForegroundColor Red
    $env:PGPASSWORD = ""
    exit 1
}

$env:PGPASSWORD = ""
Write-Host "✅ SQL dump created: $sqlPath"

# ── Zip the backup ────────────────────────────────────────────
$zipPath = Join-Path $BackupDir $zipFile
Compress-Archive -Path $sqlPath -DestinationPath $zipPath -Force
Remove-Item $sqlPath -Force  # Remove plain SQL, keep only zip
Write-Host "✅ Compressed: $zipPath ($([Math]::Round((Get-Item $zipPath).Length/1MB, 2)) MB)"

# ── Copy to Google Drive ──────────────────────────────────────
if ($GoogleDriveDir -and (Test-Path $GoogleDriveDir)) {
    Copy-Item $zipPath -Destination $GoogleDriveDir -Force
    Write-Host "✅ Copied to Google Drive: $GoogleDriveDir\$zipFile"
} elseif ($GoogleDriveDir) {
    Write-Host "WARNING: Google Drive path not found: $GoogleDriveDir" -ForegroundColor Yellow
}

# ── Retention: delete old backups ────────────────────────────
$cutoff = (Get-Date).AddDays(-$RetentionDays)
$deleted = 0
Get-ChildItem $BackupDir -Filter "vishvyash_erp_backup_*.zip" |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object { Remove-Item $_.FullName -Force; $deleted++ }

if ($deleted -gt 0) {
    Write-Host "🗑️  Deleted $deleted old backup(s) older than $RetentionDays days"
}

Write-Host ""
Write-Host "✅ Backup complete: $zipFile"
Write-Host "===================================================="
