import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/payments
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { invoiceId, clientId, startDate, endDate, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (invoiceId) where.invoiceId = invoiceId;
    if (clientId) where.clientId = clientId;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(endDate as string);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: { select: { id: true, invoiceNumber: true, grandTotal: true } },
          client: { select: { id: true, name: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data: payments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// POST /api/payments
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { invoiceId, clientId, paymentDate, amount, paymentMode, chequeNumber, utrNumber, referenceNo, bankName, remarks } = req.body;

    if (!invoiceId || !clientId || !paymentDate || !amount || !paymentMode) {
      res.status(400).json({ error: 'Invoice, client, date, amount, and mode are required.' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        clientId,
        paymentDate: new Date(paymentDate),
        amount: parseFloat(amount),
        paymentMode,
        chequeNumber,
        utrNumber,
        referenceNo,
        bankName,
        remarks,
        createdBy: req.user!.id,
      },
    });

    // Update invoice paid amount and status
    const totalPaid = invoice.paidAmount + parseFloat(amount);
    let status = 'UNPAID';
    if (totalPaid >= invoice.grandTotal) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = 'PARTIAL';
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: totalPaid, status },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        details: JSON.stringify({ invoiceId, amount, paymentMode }),
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment.' });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id as string } });
    if (!payment) {
      res.status(404).json({ error: 'Payment not found.' });
      return;
    }

    await prisma.payment.delete({ where: { id: req.params.id as string } });

    // Recalculate invoice
    const remainingPayments = await prisma.payment.aggregate({
      where: { invoiceId: payment.invoiceId },
      _sum: { amount: true },
    });

    const totalPaid = remainingPayments._sum.amount || 0;
    const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId } });

    let status = 'UNPAID';
    if (invoice && totalPaid >= invoice.grandTotal) status = 'PAID';
    else if (totalPaid > 0) status = 'PARTIAL';

    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { paidAmount: totalPaid, status },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'DELETE', entity: 'Payment', entityId: req.params.id as string },
    });

    res.json({ message: 'Payment deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment.' });
  }
});

export default router;
