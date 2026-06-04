import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate queries (FINALized invoices only for financial graphs)
    const [
      totalRevenue,
      monthlyRevenue,
      totalInvoices,
      totalClients,
      totalVehicles,
      invoicesByStatus,
      recentInvoices,
      monthlyData,
      topClients,
    ] = await Promise.all([
      // Total revenue from finalized invoices
      prisma.invoice.aggregate({
        where: { isActive: true, status: { in: ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'] } },
        _sum: { grandTotal: true },
      }),
      // Monthly revenue from finalized invoices
      prisma.invoice.aggregate({
        where: { isActive: true, status: { in: ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'] }, invoiceDate: { gte: startOfMonth } },
        _sum: { grandTotal: true },
      }),
      // Total invoices (active only)
      prisma.invoice.count({ where: { isActive: true } }),
      // Total active clients
      prisma.client.count({ where: { isActive: true } }),
      // Total active vehicles
      prisma.vehicle.count({ where: { isActive: true } }),
      // Invoices grouped by DRAFT | FINAL | CANCELLED
      prisma.invoice.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: true,
        _sum: { grandTotal: true },
      }),
      // Recent invoices
      prisma.invoice.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          client: { select: { name: true } },
          vehicle: { select: { vehicleNumber: true } },
        },
      }),
      // Monthly data (last 12 months, finalized only)
      (async () => {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0,0,0,0);
        
        const invs = await prisma.invoice.findMany({
          where: { isActive: true, status: { in: ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'] }, invoiceDate: { gte: twelveMonthsAgo } },
          select: { invoiceDate: true, grandTotal: true, paidAmount: true }
        });
        
        const map = new Map<string, any>();
        for (let i = 0; i < 12; i++) {
          const d = new Date(twelveMonthsAgo);
          d.setMonth(d.getMonth() + i);
          const mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
          map.set(mk, { month: mk, revenue: 0, invoiceCount: 0, collected: 0 });
        }
        
        invs.forEach(inv => {
          const d = new Date(inv.invoiceDate);
          const mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
          if (map.has(mk)) {
            const m = map.get(mk);
            m.revenue += inv.grandTotal;
            m.invoiceCount += 1;
            m.collected += inv.paidAmount;
          }
        });
        return Array.from(map.values());
      })(),
      // Top clients by finalized purchase amounts
      prisma.$queryRawUnsafe<any[]>(`
        SELECT
          c.id, c.name,
          COUNT(i.id) as "invoiceCount",
          COALESCE(SUM(i."grandTotal"), 0) as "totalAmount"
        FROM clients c
        LEFT JOIN invoices i ON i."clientId" = c.id AND i."isActive" = true AND i.status IN ('FINAL', 'PAID', 'PARTIAL', 'UNPAID')
        WHERE c."isActive" = true
        GROUP BY c.id, c.name
        ORDER BY "totalAmount" DESC
        LIMIT 5
      `),
    ]);

    // Calculate tons sold (finalized only)
    const totalTonsResult = await prisma.invoiceItem.aggregate({
      where: { invoice: { isActive: true, status: { in: ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'] } } },
      _sum: { quantity: true },
    });

    const monthlyTonsResult = await prisma.invoiceItem.aggregate({
      where: {
        invoice: { isActive: true, status: { in: ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'] }, invoiceDate: { gte: startOfMonth } },
      },
      _sum: { quantity: true },
    });

    // Outstanding balances from finalized invoices
    const outstanding = invoicesByStatus
      .filter((s) => ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'].includes(s.status))
      .reduce((sum, s) => sum + (s._sum.grandTotal || 0), 0);

    const totalPaidResult = await prisma.invoice.aggregate({
      where: { isActive: true, status: { in: ['FINAL', 'PAID', 'PARTIAL', 'UNPAID'] } },
      _sum: { paidAmount: true },
    });

    res.json({
      cards: {
        totalRevenue: totalRevenue._sum.grandTotal || 0,
        monthlyRevenue: monthlyRevenue._sum.grandTotal || 0,
        totalTons: totalTonsResult._sum.quantity || 0,
        monthlyTons: monthlyTonsResult._sum.quantity || 0,
        totalInvoices,
        totalClients,
        totalVehicles,
        outstanding: (totalRevenue._sum.grandTotal || 0) - (totalPaidResult._sum.paidAmount || 0),
        totalPaid: totalPaidResult._sum.paidAmount || 0,
      },
      invoicesByStatus,
      recentInvoices,
      monthlyData: monthlyData.map((m: any) => ({
        month: m.month,
        revenue: Number(m.revenue) || 0,
        invoiceCount: Number(m.invoiceCount) || 0,
        collected: Number(m.collected) || 0,
      })),
      topClients: topClients.map((c: any) => ({
        id: c.id,
        name: c.name,
        invoiceCount: Number(c.invoiceCount) || 0,
        totalAmount: Number(c.totalAmount) || 0,
      })),
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

export default router;
