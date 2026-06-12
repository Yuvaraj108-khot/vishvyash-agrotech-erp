import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const router = Router();

// When running inside Electron: Electron main.js sets BACKUP_DIR/PDF_DIR to AppData paths
// When running standalone (dev / LAN): falls back to relative storage path
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../storage/backups');
const PDF_DIR    = process.env.PDF_DIR    || path.join(__dirname, '../../storage/pdfs');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// POST /api/backup/create
router.post('/create', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    ensureBackupDir();

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Create backup filename format: backup_2026_06_01.zip
    const backupName = `backup_${year}_${month}_${day}.zip`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Fetch all database records using Prisma
    const dbData = {
      users: await req.prisma!.user.findMany(),
      clients: await req.prisma!.client.findMany(),
      drivers: await req.prisma!.driver.findMany(),
      vehicles: await req.prisma!.vehicle.findMany(),
      invoices: await req.prisma!.invoice.findMany({ include: { items: true } }),
      payments: await req.prisma!.payment.findMany(),
      auditLogs: await req.prisma!.auditLog.findMany(),
      settings: await req.prisma!.settings.findMany()
    };

    // Zip database JSON data and pdf folder content
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));
      
      archive.pipe(output);

      // Append database JSON string as data.json
      archive.append(JSON.stringify(dbData, null, 2), { name: 'data.json' });

      // Add PDFs directory if it exists
      if (fs.existsSync(PDF_DIR)) {
        archive.directory(PDF_DIR, 'pdfs');
      }

      archive.finalize();
    });

    res.json({
      message: 'Database backup archive created successfully.',
      fileName: backupName,
      size: fs.statSync(backupPath).size,
    });
  } catch (error) {
    console.error('Backup failed:', error);
    res.status(500).json({ error: 'Backup failed.' });
  }
});

// GET /api/backup/download/:fileName
router.get('/download/:fileName', authenticate, authorize('ADMIN'), (req: AuthRequest, res: Response): void => {
  const filePath = path.join(BACKUP_DIR, req.params.fileName as string);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Backup file not found.' });
    return;
  }
  res.download(filePath);
});

// GET /api/backup/list
router.get('/list', authenticate, authorize('ADMIN'), (_req: AuthRequest, res: Response): void => {
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.zip'))
      .map((f) => ({
        fileName: f,
        size: fs.statSync(path.join(BACKUP_DIR, f)).size,
        createdAt: fs.statSync(path.join(BACKUP_DIR, f)).mtime,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list backups.' });
  }
});

export default router;
