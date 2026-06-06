import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { numberToWords, formatDate, getFinancialYear } from '../utils/helpers';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// GET /api/invoices
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, clientId, vehicleId, startDate, endDate, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string } },
        { buyerName: { contains: search as string } },
        { buyerGst: { contains: search as string } },
        { vehicle: { vehicleNumber: { contains: search as string } } },
      ];
    }
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { invoiceNumber: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          vehicle: { select: { id: true, vehicleNumber: true } },
          items: true,
          _count: { select: { payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      data: invoices,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

// GET /api/invoices/next-number
router.get('/next-number', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dateStr = req.query.date as string;
    const date = dateStr ? new Date(dateStr) : new Date();
    const fy = getFinancialYear(date);
    const prefix = `VAE/${fy}/`;

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let nextCounter = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('/');
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) {
        nextCounter = lastSeq + 1;
      }
    }
    const nextNumber = `${prefix}${String(nextCounter).padStart(4, '0')}`;
    res.json({ nextNumber });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get next number.' });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id as string },
      include: {
        client: true,
        vehicle: true,
        items: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice.' });
  }
});

// POST /api/invoices
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      invoiceDate, clientId, vehicleId, transportType,
      buyerName, buyerGst, buyerCin, buyerAddress, buyerState, buyerStateCode,
      consigneeName, consigneeGst, consigneeAddress, consigneeState, consigneeStateCode,
      templateType = 'A', items, status = 'DRAFT', checkDuplicate = false,
      isNewClient = false, isNewVehicle = false, newVehicleNumber = ''
    } = req.body;

    if (!invoiceDate || (!clientId && !isNewClient) || !buyerName || !items || items.length === 0) {
      res.status(400).json({ error: 'Invoice date, client, buyer name, and at least one item are required.' });
      return;
    }

    // Process line items
    const processedItems = items.map((item: any) => {
      const quantity = parseFloat(item.quantity) || 0;
      const ratePerTon = parseFloat(item.ratePerTon) || 0;
      const transportRate = parseFloat(item.transportRate) || 0;
      const amount = quantity * ratePerTon;
      const transportAmount = quantity * transportRate;
      return {
        description: item.description || 'Biomass Briquettes',
        hsnCode: item.hsnCode || '4401',
        quantity,
        ratePerTon,
        amount,
        transportRate,
        transportAmount,
        totalAmount: amount + transportAmount,
      };
    });

    const subtotal = processedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const transportTotal = processedItems.reduce((sum: number, item: any) => sum + item.transportAmount, 0);
    const taxableAmount = subtotal + transportTotal;

    // Auto-create new client if requested
    let finalClientId = clientId;
    if (isNewClient) {
      const newClient = await prisma.client.create({
        data: {
          name: buyerName,
          gstNumber: buyerGst || null,
          cinNumber: buyerCin || null,
          address: buyerAddress || '-',
          state: buyerState || 'Maharashtra',
        }
      });
      finalClientId = newClient.id;
    }

    // Auto-create new vehicle if requested
    let finalVehicleId = vehicleId;
    if (isNewVehicle && newVehicleNumber) {
      let existingVehicle = await prisma.vehicle.findUnique({
        where: { vehicleNumber: newVehicleNumber }
      });
      if (!existingVehicle) {
        existingVehicle = await prisma.vehicle.create({
          data: {
            vehicleNumber: newVehicleNumber,
            vehicleType: transportType || 'Truck',
            ownerName: 'Direct'
          }
        });
      }
      finalVehicleId = existingVehicle.id;
    }

    // Check for accidental duplicate invoice prior to saving
    if (checkDuplicate) {
      const duplicate = await prisma.invoice.findFirst({
        where: {
          isActive: true,
          clientId: finalClientId,
          invoiceDate: new Date(invoiceDate),
          vehicleId: finalVehicleId || null,
          subtotal,
        },
      });
      if (duplicate) {
        res.status(409).json({ warning: 'Duplicate invoice detected', duplicateInvoiceNo: duplicate.invoiceNumber });
        return;
      }
    }

    // Automatic GSTswitching CGST+SGST (Maharashtra) vs. IGST (Other States)
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const isMaharashtra = (buyerState || 'Maharashtra').trim().toLowerCase() === 'maharashtra';
    if (isMaharashtra) {
      cgstRate = 2.5;
      sgstRate = 2.5;
      cgstAmount = taxableAmount * 0.025;
      sgstAmount = taxableAmount * 0.025;
    } else {
      igstRate = 5;
      igstAmount = taxableAmount * 0.05;
    }

    const grandTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;
    const amountInWords = numberToWords(grandTotal);

    // Compute Indian Financial Year numbering format: VAE/YY-YY/XXXX
    const fy = getFinancialYear(new Date(invoiceDate));
    const prefix = `VAE/${fy}/`;
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let nextCounter = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('/');
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) {
        nextCounter = lastSeq + 1;
      }
    }
    const invoiceNumber = `${prefix}${String(nextCounter).padStart(4, '0')}`;

    // Create Invoice snapshot record
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        clientId: finalClientId,
        vehicleId: finalVehicleId || null,
        transportType: transportType || 'By Road',
        buyerName,
        buyerGst: buyerGst || null,
        buyerCin: buyerCin || null,
        buyerAddress: buyerAddress || null,
        buyerState: buyerState || 'Maharashtra',
        buyerStateCode: buyerStateCode || '27',
        consigneeName: consigneeName || null,
        consigneeGst: consigneeGst || null,
        consigneeAddress: consigneeAddress || null,
        consigneeState: consigneeState || 'Maharashtra',
        consigneeStateCode: consigneeStateCode || '27',
        templateType,
        subtotal,
        transportTotal,
        taxableAmount,
        cgstRate,
        sgstRate,
        igstRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal,
        amountInWords,
        status,
        createdBy: req.user!.id,
        items: {
          create: processedItems,
        },
      },
      include: { items: true, client: true, vehicle: true },
    });

    // Generate compliant PDF
    try {
      const pdfPath = await generateInvoicePDF({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: formatDate(invoice.invoiceDate),
        transportType: invoice.transportType || 'By Road',
        vehicleNumber: invoice.vehicle?.vehicleNumber || '-',
        buyerName: invoice.buyerName,
        buyerGst: invoice.buyerGst || '',
        buyerCin: invoice.buyerCin || '',
        buyerAddress: invoice.buyerAddress || '',
        buyerState: invoice.buyerState || 'Maharashtra',
        buyerStateCode: invoice.buyerStateCode || '27',
        consigneeName: invoice.consigneeName || '',
        consigneeGst: invoice.consigneeGst || '',
        consigneeAddress: invoice.consigneeAddress || '',
        consigneeState: invoice.consigneeState || 'Maharashtra',
        consigneeStateCode: invoice.consigneeStateCode || '27',
        templateType: invoice.templateType,
        items: processedItems,
        subtotal,
        transportTotal,
        taxableAmount,
        cgstRate,
        sgstRate,
        igstRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal,
        amountInWords,
      });

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfPath },
      });
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'Invoice',
        entityId: invoice.id,
        details: JSON.stringify({ invoiceNumber, grandTotal }),
      },
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Invoice creation error:', error);
    res.status(500).json({ error: 'Failed to create invoice.', details: error.message });
  }
});

// PUT /api/invoices/:id
router.put('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      invoiceDate, clientId, vehicleId, transportType,
      buyerName, buyerGst, buyerCin, buyerAddress, buyerState, buyerStateCode,
      consigneeName, consigneeGst, consigneeAddress, consigneeState, consigneeStateCode,
      templateType = 'A', items, status,
    } = req.body;

    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id as string },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    // Process line items
    const processedItems = (items || []).map((item: any) => {
      const quantity = parseFloat(item.quantity) || 0;
      const ratePerTon = parseFloat(item.ratePerTon) || 0;
      const transportRate = parseFloat(item.transportRate) || 0;
      const amount = quantity * ratePerTon;
      const transportAmount = quantity * transportRate;
      return {
        description: item.description || 'Biomass Briquettes',
        hsnCode: item.hsnCode || '4401',
        quantity,
        ratePerTon,
        amount,
        transportRate,
        transportAmount,
        totalAmount: amount + transportAmount,
      };
    });

    const subtotal = processedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const transportTotal = processedItems.reduce((sum: number, item: any) => sum + item.transportAmount, 0);
    const taxableAmount = subtotal + transportTotal;

    // Automatic GST switching
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const isMaharashtra = (buyerState || 'Maharashtra').trim().toLowerCase() === 'maharashtra';
    if (isMaharashtra) {
      cgstRate = 2.5;
      sgstRate = 2.5;
      cgstAmount = taxableAmount * 0.025;
      sgstAmount = taxableAmount * 0.025;
    } else {
      igstRate = 5;
      igstAmount = taxableAmount * 0.05;
    }

    const grandTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;
    const amountInWords = numberToWords(grandTotal);

    // Delete old items and save new
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: req.params.id as string } });

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id as string },
      data: {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        clientId,
        vehicleId: vehicleId || null,
        transportType,
        buyerName,
        buyerGst,
        buyerCin,
        buyerAddress,
        buyerState,
        buyerStateCode,
        consigneeName: consigneeName || null,
        consigneeGst: consigneeGst || null,
        consigneeAddress: consigneeAddress || null,
        consigneeState: consigneeState || 'Maharashtra',
        consigneeStateCode: consigneeStateCode || '27',
        templateType,
        subtotal,
        transportTotal,
        taxableAmount,
        cgstRate,
        sgstRate,
        igstRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal,
        amountInWords,
        status: status || undefined,
        items: { create: processedItems },
      },
      include: { items: true, client: true, vehicle: true },
    });

    // Regenerate PDF
    try {
      const pdfPath = await generateInvoicePDF({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: formatDate(invoice.invoiceDate),
        transportType: invoice.transportType || 'By Road',
        vehicleNumber: invoice.vehicle?.vehicleNumber || '-',
        buyerName: invoice.buyerName,
        buyerGst: invoice.buyerGst || '',
        buyerCin: invoice.buyerCin || '',
        buyerAddress: invoice.buyerAddress || '',
        buyerState: invoice.buyerState || 'Maharashtra',
        buyerStateCode: invoice.buyerStateCode || '27',
        consigneeName: invoice.consigneeName || '',
        consigneeGst: invoice.consigneeGst || '',
        consigneeAddress: invoice.consigneeAddress || '',
        consigneeState: invoice.consigneeState || 'Maharashtra',
        consigneeStateCode: invoice.consigneeStateCode || '27',
        templateType: invoice.templateType,
        items: processedItems,
        subtotal,
        transportTotal,
        taxableAmount,
        cgstRate,
        sgstRate,
        igstRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal,
        amountInWords,
      });
      await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfPath } });
    } catch (pdfError) {
      console.error('PDF regeneration failed:', pdfError);
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: invoice.id,
        details: JSON.stringify({ invoiceNumber: invoice.invoiceNumber }),
      },
    });

    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice.' });
  }
});

// POST /api/invoices/:id/cancel
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.delete({
      where: { id: req.params.id as string },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE',
        entity: 'Invoice',
        entityId: req.params.id as string,
        details: JSON.stringify({ action: 'DELETE', invoiceNumber: invoice.invoiceNumber }),
      },
    });

    res.json({ message: 'Invoice permanently deleted.', invoice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.invoice.delete({
      where: { id: req.params.id as string },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'DELETE', entity: 'Invoice', entityId: req.params.id as string },
    });

    res.json({ message: 'Invoice deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id as string },
      include: { items: true, client: true, vehicle: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    const pdfPath = await generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: formatDate(invoice.invoiceDate),
      transportType: invoice.transportType || 'By Road',
      vehicleNumber: invoice.vehicle?.vehicleNumber || '-',
      buyerName: invoice.buyerName,
      buyerGst: invoice.buyerGst || '',
      buyerCin: invoice.buyerCin || '',
      buyerAddress: invoice.buyerAddress || '',
      buyerState: invoice.buyerState || 'Maharashtra',
      buyerStateCode: invoice.buyerStateCode || '27',
      consigneeName: invoice.consigneeName || '',
      consigneeGst: invoice.consigneeGst || '',
      consigneeAddress: invoice.consigneeAddress || '',
      consigneeState: invoice.consigneeState || 'Maharashtra',
      consigneeStateCode: invoice.consigneeStateCode || '27',
      templateType: invoice.templateType,
      items: invoice.items.map((item) => ({
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        ratePerTon: item.ratePerTon,
        amount: item.amount,
        transportRate: item.transportRate,
        transportAmount: item.transportAmount,
      })),
      subtotal: invoice.subtotal,
      transportTotal: invoice.transportTotal,
      taxableAmount: invoice.taxableAmount,
      cgstRate: invoice.cgstRate,
      sgstRate: invoice.sgstRate,
      igstRate: invoice.igstRate,
      cgstAmount: invoice.cgstAmount,
      sgstAmount: invoice.sgstAmount,
      igstAmount: invoice.igstAmount,
      grandTotal: invoice.grandTotal,
      amountInWords: invoice.amountInWords || '',
    });
    
    // Update path if needed
    if (invoice.pdfPath !== pdfPath) {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfPath } });
    }

    res.download(pdfPath, `${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
  } catch (error: any) {
    console.error('Download PDF error:', error);
    res.status(500).json({ error: 'Failed to download PDF.', message: error.message || String(error), stack: error.stack });
  }
});

export default router;
