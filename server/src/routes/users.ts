import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users
router.get('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true, role: true, phone: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// POST /api/users
router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, phone } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'STAFF', phone },
      select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'CREATE', entity: 'User', entityId: user.id, details: JSON.stringify({ email, role }) },
    });

    res.status(201).json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email already exists.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, role, phone, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { name, role, phone, isActive },
      select: { id: true, email: true, name: true, role: true, phone: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'UPDATE', entity: 'User', entityId: user.id },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete yourself.' });
      return;
    }

    // Delete related payments
    await prisma.payment.deleteMany({
      where: { createdBy: userId },
    });

    // Delete related invoices (cascades to invoice items)
    await prisma.invoice.deleteMany({
      where: { createdBy: userId },
    });

    // Delete the user (cascades to auditLogs and passwordResetOtps)
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: 'User and all associated data permanently deleted.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
