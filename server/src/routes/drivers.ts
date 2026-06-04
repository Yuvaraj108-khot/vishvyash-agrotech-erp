import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/drivers
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
        { licenseNumber: { contains: search as string } },
      ];
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { invoices: true, vehicles: true } },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    res.json({
      data: drivers,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drivers.' });
  }
});

// GET /api/drivers/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id as string },
      include: {
        invoices: {
          where: { isActive: true },
          orderBy: { invoiceDate: 'desc' },
          include: { items: true, client: true },
        },
        vehicles: true,
      },
    });

    if (!driver) {
      res.status(404).json({ error: 'Driver not found.' });
      return;
    }

    const totalTrips = driver.invoices.length;
    const totalTons = driver.invoices.reduce((sum, inv) =>
      sum + inv.items.reduce((s, item) => s + item.quantity, 0), 0);
    const totalRevenue = driver.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

    res.json({
      ...driver,
      stats: { totalTrips, totalTons, totalRevenue },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver.' });
  }
});

// POST /api/drivers
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, alternatePhone, address, licenseNumber, aadhaarNumber } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: 'Name and phone are required.' });
      return;
    }

    const driver = await prisma.driver.create({
      data: { name, phone, alternatePhone, address, licenseNumber, aadhaarNumber },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'CREATE', entity: 'Driver', entityId: driver.id, details: JSON.stringify({ name }) },
    });

    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create driver.' });
  }
});

// PUT /api/drivers/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, alternatePhone, address, licenseNumber, aadhaarNumber } = req.body;
    const driver = await prisma.driver.update({
      where: { id: req.params.id as string },
      data: { name, phone, alternatePhone, address, licenseNumber, aadhaarNumber },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'UPDATE', entity: 'Driver', entityId: driver.id, details: JSON.stringify({ name }) },
    });

    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update driver.' });
  }
});

// DELETE /api/drivers/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.driver.delete({
      where: { id: req.params.id as string },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'DELETE', entity: 'Driver', entityId: req.params.id as string },
    });

    res.json({ message: 'Driver deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete driver.' });
  }
});

export default router;
