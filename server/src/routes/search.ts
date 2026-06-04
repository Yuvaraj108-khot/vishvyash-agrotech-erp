import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/search?q=...
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || (q as string).trim().length < 2) {
      res.json({ invoices: [], clients: [], drivers: [], vehicles: [] });
      return;
    }

    const query = q as string;

    const [invoices, clients, drivers, vehicles] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          isActive: true,
          OR: [
            { invoiceNumber: { contains: query } },
            { buyerName: { contains: query } },
            { buyerGst: { contains: query } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { name: true } } },
      }),
      prisma.client.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query } },
            { gstNumber: { contains: query } },
            { phone: { contains: query } },
            { email: { contains: query } },
          ],
        },
        take: 10,
      }),
      prisma.driver.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
            { licenseNumber: { contains: query } },
          ],
        },
        take: 10,
      }),
      prisma.vehicle.findMany({
        where: {
          isActive: true,
          OR: [
            { vehicleNumber: { contains: query } },
            { ownerName: { contains: query } },
          ],
        },
        take: 10,
        include: { driver: { select: { name: true } } },
      }),
    ]);

    res.json({ invoices, clients, drivers, vehicles });
  } catch (error) {
    res.status(500).json({ error: 'Search failed.' });
  }
});

export default router;
