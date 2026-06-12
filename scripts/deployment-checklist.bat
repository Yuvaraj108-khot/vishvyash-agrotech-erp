@echo off
:: ================================================================
:: Vishvyash ERP — Deployment Checklist
:: Interactive step-by-step guide for first-time server setup
:: ================================================================

:MENU
cls
echo.
echo ============================================================
echo  VISHVYASH ERP — DEPLOYMENT CHECKLIST
echo  Run each step in order. Mark off as you complete them.
echo ============================================================
echo.
echo  PHASE 1 — PostgreSQL
echo  ─────────────────────────────────────────────
echo  [ ] 1.  Install PostgreSQL 16 (postgresql.org)
echo  [ ] 2.  Create database: vishvyash_erp
echo  [ ] 3.  Create user: erp_user (with strong password)
echo  [ ] 4.  Grant privileges to erp_user
echo.
echo  PHASE 2 — Server Configuration
echo  ─────────────────────────────────────────────
echo  [ ] 5.  Copy server\.env.production.template → server\.env
echo  [ ] 6.  Edit server\.env: set DB_PASS, JWT_SECRET, PORT=5000
echo  [ ] 7.  Run: cd server ^&^& npm install
echo  [ ] 8.  Run: npx prisma migrate deploy
echo  [ ] 9.  Run: npm run seed    (fresh install only)
echo.
echo  PHASE 3 — Local Verification (before PM2)
echo  ─────────────────────────────────────────────
echo  [ ] 10. Run: npm run start:local
echo  [ ] 11. Open http://localhost:5000/health → {"status":"ok"}
echo  [ ] 12. Open http://localhost:5000 → Login page appears
echo  [ ] 13. Login as admin@vishvyash.com / admin123
echo  [ ] 14. Create a test client
echo  [ ] 15. Create a test invoice
echo  [ ] 16. Download PDF invoice → downloads successfully
echo  [ ] 17. Check Backup page → create a backup
echo  [ ] 18. Verify backup .zip in D:\ERP_Backups
echo  [ ] 19. RESTORE TEST: run scripts\restore-backup.ps1
echo  [ ] 20. Verify test client reappears after restore
echo  [ ] 21. Stop the manual server (Ctrl+C)
echo.
echo  PHASE 4 — PM2 Windows Service
echo  ─────────────────────────────────────────────
echo  [ ] 22. Run scripts\setup-pm2-service.bat as Administrator
echo  [ ] 23. pm2 status → vishvyash-erp shows 'online'
echo  [ ] 24. http://localhost:5000/health responds ✓
echo  [ ] 25. REBOOT this PC
echo  [ ] 26. Wait 2 minutes after reboot
echo  [ ] 27. http://localhost:5000/health still responds ✓
echo.
echo  PHASE 5 — Firewall and LAN Access
echo  ─────────────────────────────────────────────
echo  [ ] 28. Run scripts\setup-firewall.ps1 as Administrator
echo  [ ] 29. Run ipconfig → note IPv4 address (e.g. 192.168.1.100)
echo  [ ] 30. From ANOTHER office PC: http://192.168.1.100:5000/health ✓
echo  [ ] 31. Login from another PC ✓
echo  [ ] 32. Create invoice from another PC ✓
echo.
echo  PHASE 6 — Electron Desktop App
echo  ─────────────────────────────────────────────
echo  [ ] 33. Edit electron\config.json: set apiUrl to server IP
echo  [ ] 34. cd electron ^&^& npm install
echo  [ ] 35. Test dev: npm start  → Electron opens ERP ✓
echo  [ ] 36. CONFIG TEST: change apiUrl to wrong IP → "Cannot Connect" error ✓
echo  [ ] 37. CONFIG TEST: change back to correct IP → ERP loads ✓
echo  [ ] 38. Build installer: npm run build:installer
echo  [ ] 39. Copy dist\Vishvyash ERP Setup 1.0.0.exe to client PCs
echo  [ ] 40. Install on client PC → test login ✓
echo.
echo  PHASE 7 — Backup Automation
echo  ─────────────────────────────────────────────
echo  [ ] 41. Create D:\ERP_Backups folder
echo  [ ] 42. Run scripts\schedule-backup.bat as Administrator
echo  [ ] 43. Test manual backup: PowerShell -File scripts\daily-backup.ps1
echo  [ ] 44. Verify .zip appears in D:\ERP_Backups ✓
echo  [ ] 45. RESTORE TEST again with fresh backup ✓
echo.
echo  PHASE 8 — Neon Data Migration (after Phase 7 verified)
echo  ─────────────────────────────────────────────
echo  [ ] 46. Add NEON_DATABASE_URL and LOCAL_DATABASE_URL to server\.env
echo  [ ] 47. Run: npx tsx scripts\migrate-from-neon.ts
echo  [ ] 48. Verify all row counts match (Users, Clients, Invoices, etc.)
echo  [ ] 49. Run: SELECT COUNT(*) FROM invoices; on BOTH databases
echo  [ ] 50. Confirm counts are equal
echo  [ ] 51. Keep Neon active for 1 week as safety net
echo  [ ] 52. After 1 week: retire Render + Neon (cancel billing)
echo.
echo ============================================================
echo  When ALL boxes are checked: ✅ DEPLOYMENT COMPLETE
echo  Monthly cost: ₹0
echo ============================================================
echo.
pause
