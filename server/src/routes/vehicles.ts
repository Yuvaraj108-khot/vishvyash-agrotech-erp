import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/vehicles
// Returns flat array when ?page is not set (for dropdowns/selectors).
// Returns paginated {data, pagination} when ?page is explicitly set.
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page } = req.query;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { vehicleNumber: { contains: search as string } },
        { ownerName: { contains: search as string } },
        { vehicleType: { contains: search as string } },
      ];
    }

    // If no page param → return all active vehicles as flat array (for dropdowns)
    if (!page) {
      const vehicles = await prisma.vehicle.findMany({
        where,
        orderBy: { vehicleNumber: 'asc' },
      });
      res.json(vehicles);
      return;
    }

    // Paginated mode with expiry alerts
    const pageNum = parseInt(page as string);
    const limitNum = 20;
    const skip = (pageNum - 1) * limitNum;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { select: { id: true, name: true, phone: true } },
          _count: { select: { invoices: true } },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const vehiclesWithAlerts = vehicles.map((v) => {
      const alerts: string[] = [];
      if (v.insuranceExpiry && new Date(v.insuranceExpiry) <= thirtyDaysFromNow) {
        alerts.push(new Date(v.insuranceExpiry) <= now ? 'Insurance EXPIRED' : 'Insurance expiring soon');
      }
      if (v.fitnessExpiry && new Date(v.fitnessExpiry) <= thirtyDaysFromNow) {
        alerts.push(new Date(v.fitnessExpiry) <= now ? 'Fitness EXPIRED' : 'Fitness expiring soon');
      }
      if (v.permitExpiry && new Date(v.permitExpiry) <= thirtyDaysFromNow) {
        alerts.push(new Date(v.permitExpiry) <= now ? 'Permit EXPIRED' : 'Permit expiring soon');
      }
      return { ...v, alerts };
    });

    res.json({
      data: vehiclesWithAlerts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// GET /api/vehicles/alerts
router.get('/alerts', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const vehicles = await prisma.vehicle.findMany({
      where: {
        isActive: true,
        OR: [
          { insuranceExpiry: { lte: thirtyDays } },
          { fitnessExpiry: { lte: thirtyDays } },
          { permitExpiry: { lte: thirtyDays } },
        ],
      },
      include: { driver: { select: { name: true } } },
    });

    const alerts = vehicles.flatMap((v) => {
      const result: any[] = [];
      if (v.insuranceExpiry && new Date(v.insuranceExpiry) <= thirtyDays) {
        result.push({
          vehicleNumber: v.vehicleNumber,
          type: 'Insurance',
          expiryDate: v.insuranceExpiry,
          expired: new Date(v.insuranceExpiry) <= now,
          driver: v.driver?.name,
        });
      }
      if (v.fitnessExpiry && new Date(v.fitnessExpiry) <= thirtyDays) {
        result.push({
          vehicleNumber: v.vehicleNumber,
          type: 'Fitness',
          expiryDate: v.fitnessExpiry,
          expired: new Date(v.fitnessExpiry) <= now,
          driver: v.driver?.name,
        });
      }
      if (v.permitExpiry && new Date(v.permitExpiry) <= thirtyDays) {
        result.push({
          vehicleNumber: v.vehicleNumber,
          type: 'Permit',
          expiryDate: v.permitExpiry,
          expired: new Date(v.permitExpiry) <= now,
          driver: v.driver?.name,
        });
      }
      return result;
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// GET /api/vehicles/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id as string },
      include: {
        driver: true,
        invoices: {
          where: { isActive: true },
          orderBy: { invoiceDate: 'desc' },
          take: 20,
          include: { client: true, items: true },
        },
      },
    });

    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicle.' });
  }
});

// POST /api/vehicles
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vehicleNumber, vehicleType, ownerName, driverId, insuranceExpiry, fitnessExpiry, permitExpiry } = req.body;

    if (!vehicleNumber) {
      res.status(400).json({ error: 'Vehicle number is required.' });
      return;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber,
        vehicleType,
        ownerName,
        driverId: driverId || null,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        fitnessExpiry: fitnessExpiry ? new Date(fitnessExpiry) : null,
        permitExpiry: permitExpiry ? new Date(permitExpiry) : null,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'CREATE', entity: 'Vehicle', entityId: vehicle.id, details: JSON.stringify({ vehicleNumber }) },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vehicle.' });
  }
});

// PUT /api/vehicles/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vehicleNumber, vehicleType, ownerName, driverId, insuranceExpiry, fitnessExpiry, permitExpiry } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id as string },
      data: {
        vehicleNumber,
        vehicleType,
        ownerName,
        driverId: driverId || null,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        fitnessExpiry: fitnessExpiry ? new Date(fitnessExpiry) : null,
        permitExpiry: permitExpiry ? new Date(permitExpiry) : null,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'UPDATE', entity: 'Vehicle', entityId: vehicle.id, details: JSON.stringify({ vehicleNumber }) },
    });

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vehicle.' });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id as string } });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'DELETE', entity: 'Vehicle', entityId: req.params.id as string },
    });

    res.json({ message: 'Vehicle deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

export default router;
