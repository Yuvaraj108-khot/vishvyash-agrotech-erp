import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/settings
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => { settingsMap[s.key] = s.value; });
    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// PUT /api/settings
router.put('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    res.json({ message: 'Settings updated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

export default router;
