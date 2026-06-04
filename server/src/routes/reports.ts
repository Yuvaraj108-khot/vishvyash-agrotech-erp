import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/reports
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type = 'monthly', startDate, endDate } = req.query;

    let start: Date;
    let end: Date = new Date();

    const now = new Date();

    switch (type) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        start = new Date(startDate as string);
        end = new Date(endDate as string);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // In reports, fetch only FINALized invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        isActive: true,
        status: { in: ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'] },
        invoiceDate: { gte: start, lte: end },
      },
      orderBy: { invoiceDate: 'asc' },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { vehicleNumber: true } },
        items: true,
        payments: true,
      },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalTons = invoices.reduce((sum, inv) =>
      sum + inv.items.reduce((s, item) => s + item.quantity, 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const outstanding = totalRevenue - totalPaid;
    
    const totalCgst = invoices.reduce((sum, inv) => sum + inv.cgstAmount, 0);
    const totalSgst = invoices.reduce((sum, inv) => sum + inv.sgstAmount, 0);
    const totalIgst = invoices.reduce((sum, inv) => sum + (inv.igstAmount || 0), 0);
    const totalTax = totalCgst + totalSgst + totalIgst;

    // Client-wise summary (Final invoices only)
    const clientSummary: Record<string, { name: string; invoices: number; amount: number; tons: number }> = {};
    invoices.forEach((inv) => {
      const clientName = inv.client?.name || 'Unknown';
      if (!clientSummary[clientName]) {
        clientSummary[clientName] = { name: clientName, invoices: 0, amount: 0, tons: 0 };
      }
      clientSummary[clientName].invoices++;
      clientSummary[clientName].amount += inv.grandTotal;
      clientSummary[clientName].tons += inv.items.reduce((s, item) => s + item.quantity, 0);
    });

    res.json({
      period: { start, end, type },
      summary: {
        totalInvoices: invoices.length,
        totalRevenue,
        totalTons,
        totalPaid,
        outstanding,
        totalCgst,
        totalSgst,
        totalIgst,
        totalTax,
      },
      invoices,
      clientSummary: Object.values(clientSummary).sort((a, b) => b.amount - a.amount),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// GET /api/reports/export/excel
router.get('/export/excel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const invoices = await prisma.invoice.findMany({
      where: {
        isActive: true,
        status: { in: ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'] }, // Valid invoices only!
        invoiceDate: { gte: start, lte: end },
      },
      orderBy: { invoiceDate: 'asc' },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { vehicleNumber: true } },
        items: true,
      },
    });

    // Build Excel using xlsx
    const XLSX = await import('xlsx');

    const data = invoices.map((inv) => ({
      'Invoice No': inv.invoiceNumber,
      'Date': new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
      'Client': inv.client?.name || '',
      'Vehicle': inv.vehicle?.vehicleNumber || '',
      'Quantity (MT)': inv.items.reduce((s, i) => s + i.quantity, 0),
      'Product Amount': inv.subtotal,
      'Transport Amount': inv.transportTotal,
      'Taxable Amount': inv.taxableAmount,
      'CGST': inv.cgstAmount,
      'SGST': inv.sgstAmount,
      'IGST': inv.igstAmount || 0,
      'Grand Total': inv.grandTotal,
      'Paid': inv.paidAmount,
      'Outstanding': inv.grandTotal - inv.paidAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=VAE_Report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export Excel.' });
  }
});

export default router;
