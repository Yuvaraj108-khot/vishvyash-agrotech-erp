import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/clients
// Returns flat array when ?page is not set (for dropdowns/selectors).
// Returns paginated {data, pagination} when ?page is explicitly set.
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page } = req.query;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { gstNumber: { contains: search as string } },
        { phone: { contains: search as string } },
        { email: { contains: search as string } },
        { contactPerson: { contains: search as string } },
      ];
    }

    // If no page param → return all active clients as flat array (for dropdowns)
    if (!page) {
      const clients = await prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
      });
      res.json(clients);
      return;
    }

    // Paginated mode
    const pageNum = parseInt(page as string);
    const limitNum = 20;
    const skip = (pageNum - 1) * limitNum;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { invoices: true, payments: true } },
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      data: clients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

// GET /api/clients/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id as string },
      include: {
        invoices: {
          where: { isActive: true },
          orderBy: { invoiceDate: 'desc' },
          include: { items: true },
        },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found.' });
      return;
    }

    // Calculate aggregates from FINAL invoices only (exclude Draft & Cancelled)
    const finalInvoices = client.invoices.filter((inv) => inv.status === 'FINAL');
    const totalTons = finalInvoices.reduce((sum, inv) =>
      sum + inv.items.reduce((s, item) => s + item.quantity, 0), 0);
    const totalAmount = finalInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = totalAmount - totalPaid;
    const lastPurchaseDate = finalInvoices.length > 0 ? finalInvoices[0].invoiceDate : null;

    res.json({
      ...client,
      stats: {
        totalTons,
        totalAmount,
        totalPaid,
        outstanding,
        totalInvoices: finalInvoices.length,
        lastPurchaseDate,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client.' });
  }
});

// POST /api/clients
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, gstNumber, cinNumber, address, city, state, pincode, phone, email, contactPerson } = req.body;

    if (!name || !address) {
      res.status(400).json({ error: 'Name and address are required.' });
      return;
    }

    const client = await prisma.client.create({
      data: { name, gstNumber, cinNumber, address, city, state, pincode, phone, email, contactPerson },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'Client',
        entityId: client.id,
        details: JSON.stringify({ name }),
      },
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client.' });
  }
});

// PUT /api/clients/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, gstNumber, cinNumber, address, city, state, pincode, phone, email, contactPerson } = req.body;

    const client = await prisma.client.update({
      where: { id: req.params.id as string },
      data: { name, gstNumber, cinNumber, address, city, state, pincode, phone, email, contactPerson },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'Client',
        entityId: client.id,
        details: JSON.stringify({ name }),
      },
    });

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client.' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.client.delete({
      where: { id: req.params.id as string },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE',
        entity: 'Client',
        entityId: req.params.id as string,
      },
    });

    res.json({ message: 'Client deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

export default router;
