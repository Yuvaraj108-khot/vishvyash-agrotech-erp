/**
 * Vishvyash ERP — Data Migration Script
 * Copies ALL data from Neon (cloud) PostgreSQL → Local PostgreSQL
 *
 * Usage:
 *   1. Set both DATABASE_URL (Neon source) and LOCAL_DATABASE_URL (destination) in .env
 *   2. Run: npx tsx scripts/migrate-from-neon.ts
 *   3. Verify data, then update .env to only use LOCAL_DATABASE_URL
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// ── Source: Neon Cloud DB ─────────────────────────────────────────────────────
const NEON_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
// ── Destination: Local PostgreSQL ────────────────────────────────────────────
const LOCAL_URL = process.env.LOCAL_DATABASE_URL;

if (!NEON_URL) {
  console.error('❌  Set NEON_DATABASE_URL (or DATABASE_URL) in your .env');
  process.exit(1);
}
if (!LOCAL_URL) {
  console.error('❌  Set LOCAL_DATABASE_URL in your .env');
  console.error('    Example: LOCAL_DATABASE_URL="postgresql://erp_user:password@localhost:5432/vishvyash_erp"');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: NEON_URL } } });
const dest   = new PrismaClient({ datasources: { db: { url: LOCAL_URL } } });

function log(msg: string) { console.log(`  ${msg}`); }
function ok(msg: string)  { console.log(`  ✅ ${msg}`); }
function err(msg: string) { console.log(`  ❌ ${msg}`); }

async function migrateTable<T extends Record<string, any>>(
  label: string,
  fetchFn: () => Promise<T[]>,
  insertFn: (items: T[]) => Promise<void>
) {
  process.stdout.write(`  Migrating ${label}...`);
  const items = await fetchFn();
  process.stdout.write(` (${items.length} rows)`);
  if (items.length === 0) { console.log(' — skipped (empty)'); return; }
  await insertFn(items);
  console.log(' ✅');
}

async function main() {
  console.log('');
  console.log('====================================================');
  console.log('  VISHVYASH ERP — Neon → Local PostgreSQL Migration');
  console.log('====================================================');
  console.log('');
  console.log('Source:', NEON_URL!.replace(/:([^@:]+)@/, ':***@'));
  console.log('Target:', LOCAL_URL.replace(/:([^@:]+)@/, ':***@'));
  console.log('');

  try {
    await source.$connect();
    await dest.$connect();
    log('Connected to both databases ✅');
  } catch (e: any) {
    err('Connection failed: ' + e.message);
    process.exit(1);
  }

  console.log('');
  console.log('Step 1 — Migrating data (order matters for FK constraints)');
  console.log('────────────────────────────────────────────────────────────');

  // 1. Settings
  await migrateTable('Settings', () => source.settings.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.settings.upsert({ where: { key: row.key }, update: { value: row.value }, create: row });
    }
  });

  // 2. Users
  await migrateTable('Users', () => source.user.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.user.upsert({ where: { id: row.id }, update: row, create: row });
    }
  });

  // 3. Clients
  await migrateTable('Clients', () => source.client.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.client.upsert({ where: { id: row.id }, update: row, create: row });
    }
  });

  // 4. Drivers
  await migrateTable('Drivers', () => source.driver.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.driver.upsert({ where: { id: row.id }, update: row, create: row });
    }
  });

  // 5. Vehicles
  await migrateTable('Vehicles', () => source.vehicle.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.vehicle.upsert({ where: { id: row.id }, update: row, create: row }).catch(() =>
        dest.vehicle.upsert({ where: { vehicleNumber: row.vehicleNumber }, update: row, create: row })
      );
    }
  });

  // 6. Invoices (without items first)
  await migrateTable('Invoices', () => source.invoice.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.invoice.upsert({ where: { id: row.id }, update: row, create: row });
    }
  });

  // 7. InvoiceItems
  await migrateTable('InvoiceItems', () => source.invoiceItem.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.invoiceItem.upsert({ where: { id: row.id }, update: row, create: row });
    }
  });

  // 8. Payments
  await migrateTable('Payments', () => source.payment.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.payment.upsert({ where: { id: row.id }, update: row, create: row });
    }
  });

  // 9. Audit Logs
  await migrateTable('AuditLogs', () => source.auditLog.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.auditLog.upsert({ where: { id: row.id }, update: row, create: row });
    }
  });

  // 10. Password Reset OTPs (likely empty/expired — migrate anyway)
  await migrateTable('PasswordResetOtps', () => source.passwordResetOtp.findMany(), async (rows) => {
    for (const row of rows) {
      await dest.passwordResetOtp.upsert({ where: { id: row.id }, update: row, create: row });
    }
  });

  console.log('');
  console.log('Step 2 — Verification');
  console.log('─────────────────────');

  const counts: Record<string, [number, number]> = {};
  const models = ['user', 'client', 'driver', 'vehicle', 'invoice', 'invoiceItem', 'payment'] as const;
  for (const model of models) {
    const src = await (source as any)[model].count();
    const dst = await (dest as any)[model].count();
    counts[model] = [src, dst];
    const match = src === dst ? '✅' : '⚠️ MISMATCH';
    console.log(`  ${model.padEnd(14)} Source: ${String(src).padStart(5)}  Local: ${String(dst).padStart(5)}  ${match}`);
  }

  const allMatch = Object.values(counts).every(([s, d]) => s === d);

  console.log('');
  if (allMatch) {
    console.log('✅ MIGRATION COMPLETE — All row counts match!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Update server/.env: set DATABASE_URL to your LOCAL_DATABASE_URL');
    console.log('  2. Restart the ERP server');
    console.log('  3. Verify login, invoices, and PDF generation');
    console.log('  4. You can now disconnect from Neon');
  } else {
    console.log('⚠️  Some row counts do not match. Check for errors above.');
    console.log('   Do NOT switch to local DB until counts match.');
    process.exit(1);
  }

  await source.$disconnect();
  await dest.$disconnect();
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
