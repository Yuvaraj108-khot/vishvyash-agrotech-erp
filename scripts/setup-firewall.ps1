# ================================================================
# Vishvyash ERP — Windows Firewall Setup
# Run as Administrator in PowerShell
# ================================================================
# This allows other office PCs to access the ERP server on port 5000

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " VISHVYASH ERP — Windows Firewall Configuration" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Check admin
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Run this script as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

$RuleName = "Vishvyash ERP Server (Port 5000)"

# Remove old rule if exists
$existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $RuleName
}

# Add inbound rule for port 5000 (TCP) — LAN only
Write-Host "Adding firewall rule for port 5000 (TCP, inbound)..." -ForegroundColor Cyan
New-NetFirewallRule `
    -DisplayName $RuleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 5000 `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allows LAN office PCs to connect to the Vishvyash ERP Node.js server on port 5000."

Write-Host ""
Write-Host "✅ Firewall rule added successfully!" -ForegroundColor Green
Write-Host ""

# Show current server IP
Write-Host "Your server IP addresses:" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^127\." } | ForEach-Object {
    Write-Host "  → $($_.IPAddress)  (on $($_.InterfaceAlias))" -ForegroundColor White
}

Write-Host ""
Write-Host "Share this with other office PCs:" -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match "^192\.168\." } | Select-Object -First 1).IPAddress
if ($ip) {
    Write-Host "  http://$ip`:5000" -ForegroundColor Green
} else {
    Write-Host "  http://YOUR_IP:5000  (see IPs above)" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
pause
