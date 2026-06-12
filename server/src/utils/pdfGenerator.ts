import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  transportType: string;
  vehicleNumber: string;
  buyerName: string;
  buyerGst: string;
  buyerCin?: string;
  buyerAddress: string;
  buyerState: string;
  buyerStateCode: string;
  consigneeName?: string;
  consigneeGst?: string;
  consigneeAddress?: string;
  consigneeState?: string;
  consigneeStateCode?: string;
  templateType: string;
  items: {
    description: string;
    hsnCode: string;
    quantity: number;
    ratePerTon: number;
    amount: number;
    transportRate: number;
    transportAmount: number;
  }[];
  subtotal: number;
  transportTotal: number;
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  grandTotal: number;
  amountInWords: string;
}

const STORAGE_DIR = process.env.PDF_DIR || path.join(__dirname, '../../storage/pdfs');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  ensureStorageDir();

  const fileName = data.invoiceNumber.replace(/\//g, '_') + '.pdf';
  const filePath = path.join(STORAGE_DIR, fileName);

  // Fetch settings dynamically from the database
  let settingsMap: Record<string, string> = {};
  try {
    const dbSettings = await prisma.settings.findMany();
    dbSettings.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });
  } catch (err) {
    console.warn('Failed to load settings from DB for PDF generation:', err);
  }

  // Use PDFKit directly — fast, pure Node.js, works on all environments including Render.
  // Puppeteer/Chrome is unreliable on free-tier cloud deployments and causes silent timeouts.
  await generateInvoicePDFWithPDFKit(data, filePath, settingsMap);
  return filePath;
}

function generateInvoicePDFWithPDFKit(data: InvoiceData, filePath: string, settings: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Resolve logo path (more robust)
      let logoPath = path.resolve(process.cwd(), 'assets/logo.png');
      if (!fs.existsSync(logoPath)) {
        logoPath = path.resolve(process.cwd(), 'server/assets/logo.png');
      }
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(__dirname, '../../assets/logo.png');
      }

      // Draw Logo centered
      let headerTextY = 40;
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 252, 25, { width: 90 });
          headerTextY = 115;
        } catch (logoErr) {
          console.warn('Failed to render logo image in PDFKit:', logoErr);
        }
      }

      // Dynamic Company Settings
      const companyName = (settings['company_name'] || 'VISHVYASH AGROTECH ENERGY').toUpperCase();
      const defaultProd = settings['default_product'] || 'Biomass Briquettes';
      const companySubtitle = `${defaultProd} Manufacturer & Supplier`;
      const companyAddress = settings['company_address'] || 'Survey No. 57, At Post Borgaon (BK), Tal. Walwa, Dist. Sangli, Maharashtra - 415403';
      const companyGst = settings['company_gst'] || '27ABCFV1234A1Z5';

      // Header - Company Details
      doc.y = headerTextY;
      doc.fillColor('#005a36').fontSize(20).font('Helvetica-Bold').text(companyName, { align: 'center' });
      doc.moveDown(0.15);
      doc.fillColor('#333333').fontSize(10).font('Helvetica').text(companySubtitle, { align: 'center' });
      doc.moveDown(0.15);
      doc.fontSize(9).font('Helvetica').fillColor('#555555').text(companyAddress, { align: 'center' });
      doc.moveDown(0.15);
      doc.font('Helvetica-Bold').fillColor('#111111').text(`GST No.: ${companyGst}`, { align: 'center' });
      doc.moveDown(0.5);

      // Thick Green Divider line
      doc.strokeColor('#005a36').lineWidth(2).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Title Bar
      const titleY = doc.y;
      doc.fillColor('#005a36').rect(40, titleY, 515, 20).fill();
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('TAX INVOICE', 40, titleY + 5, { align: 'center' });
      doc.fillColor('#000000');
      
      doc.y = titleY + 20;
      doc.moveDown(0.8);

      // Metadata Grid Table
      const metaY = doc.y;
      const metaRowHeight = 20;
      const metaHeight = metaRowHeight * 2;
      doc.lineWidth(0.5).strokeColor('#888888');

      // Draw background for labels
      doc.fillColor('#f0f0f0').rect(40, metaY, 90, metaHeight).fill();
      doc.fillColor('#f0f0f0').rect(270, metaY, 90, metaHeight).fill();

      // Outer border
      doc.rect(40, metaY, 515, metaHeight).stroke();

      // Divider lines
      doc.moveTo(130, metaY).lineTo(130, metaY + metaHeight).stroke();
      doc.moveTo(270, metaY).lineTo(270, metaY + metaHeight).stroke();
      doc.moveTo(360, metaY).lineTo(360, metaY + metaHeight).stroke();
      doc.moveTo(40, metaY + metaRowHeight).lineTo(555, metaY + metaRowHeight).stroke();

      // Row 1 text
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Invoice No.', 45, metaY + 6);
      doc.font('Helvetica').text(data.invoiceNumber, 135, metaY + 6);
      doc.font('Helvetica-Bold').text('Invoice Date', 275, metaY + 6);
      doc.font('Helvetica').text(data.invoiceDate, 365, metaY + 6);

      // Row 2 text
      doc.font('Helvetica-Bold').text('Vehicle No.', 45, metaY + metaRowHeight + 6);
      doc.font('Helvetica').text(data.vehicleNumber || '-', 135, metaY + metaRowHeight + 6);
      doc.font('Helvetica-Bold').text('Transport', 275, metaY + metaRowHeight + 6);
      doc.font('Helvetica').text(data.transportType || 'Truck', 365, metaY + metaRowHeight + 6);

      doc.y = metaY + metaHeight;
      doc.moveDown(0.8);

      // Buyer & Consignee Box Layout
      const partyY = doc.y;
      const boxHeight = 100;
      const headerHeight = 20;

      if (data.templateType === 'B') {
        // Double boxes
        // Backgrounds for headers
        doc.fillColor('#f0f0f0').rect(40, partyY, 252, headerHeight).fill();
        doc.fillColor('#f0f0f0').rect(303, partyY, 252, headerHeight).fill();

        doc.strokeColor('#888888').lineWidth(0.5).rect(40, partyY, 252, boxHeight).stroke();
        doc.moveTo(40, partyY + headerHeight).lineTo(292, partyY + headerHeight).stroke();
        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold').text('Buyer (Bill To)', 45, partyY + 6);
        doc.fontSize(9).font('Helvetica-Bold').text(data.buyerName, 45, partyY + headerHeight + 6, { width: 242 });
        doc.fontSize(9).font('Helvetica').fillColor('#333333').text(data.buyerAddress, 45, partyY + headerHeight + 18, { width: 242, height: 42 });
        doc.font('Helvetica-Bold').fillColor('#111111').text(`GSTIN: ${data.buyerGst || '-'}`, 45, partyY + 70);
        doc.font('Helvetica').text(`State: ${data.buyerState || '-'} (Code: ${data.buyerStateCode || '-'})`, 45, partyY + 82);
        if (data.buyerCin) {
          doc.font('Helvetica-Bold').text(`CIN No: ${data.buyerCin}`, 45, partyY + 94);
        }

        doc.strokeColor('#888888').rect(303, partyY, 252, boxHeight).stroke();
        doc.moveTo(303, partyY + headerHeight).lineTo(555, partyY + headerHeight).stroke();
        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold').text('Consignee (Ship To)', 308, partyY + 6);
        doc.fontSize(9).font('Helvetica-Bold').text(data.consigneeName || '-', 308, partyY + headerHeight + 6, { width: 242 });
        doc.fontSize(9).font('Helvetica').fillColor('#333333').text(data.consigneeAddress || '-', 308, partyY + headerHeight + 18, { width: 242, height: 42 });
        doc.font('Helvetica-Bold').fillColor('#111111').text(`GSTIN: ${data.consigneeGst || '-'}`, 308, partyY + 70);
        doc.font('Helvetica').text(`State: ${data.consigneeState || '-'} (Code: ${data.consigneeStateCode || '-'})`, 308, partyY + 82);
      } else {
        // Single full-width box (Template A)
        doc.fillColor('#f0f0f0').rect(40, partyY, 515, headerHeight).fill();
        doc.strokeColor('#888888').lineWidth(0.5).rect(40, partyY, 515, boxHeight).stroke();
        doc.moveTo(40, partyY + headerHeight).lineTo(555, partyY + headerHeight).stroke();
        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold').text('Buyer (Bill To)', 45, partyY + 6);
        doc.fontSize(9).font('Helvetica-Bold').text(data.buyerName, 45, partyY + headerHeight + 6, { width: 505 });
        doc.fontSize(9).font('Helvetica').fillColor('#333333').text(data.buyerAddress, 45, partyY + headerHeight + 18, { width: 505, height: 32 });
        doc.font('Helvetica-Bold').fillColor('#111111').text(`GSTIN: ${data.buyerGst || '-'}`, 45, partyY + 70);
        doc.font('Helvetica').text(`State: ${data.buyerState || '-'} (Code: ${data.buyerStateCode || '-'})`, 45, partyY + 82);
        if (data.buyerCin) {
          doc.font('Helvetica-Bold').text(`CIN No: ${data.buyerCin}`, 45, partyY + 94);
        }
      }

      doc.y = partyY + boxHeight;
      doc.moveDown(0.8);

      // Items Table
      const tableY = doc.y;
      const colWidths = {
        desc: 200,   // 40 to 240
        hsn: 50,     // 240 to 290
        qty: 65,     // 290 to 355
        rate: 90,    // 355 to 445
        amount: 110  // 445 to 555
      };

      // Table Header
      doc.fillColor('#005a36').rect(40, tableY, 515, 20).fill();
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('Product', 45, tableY + 5);
      doc.text('HSN Code', 240, tableY + 5, { width: colWidths.hsn, align: 'center' });
      doc.text('Qty', 290, tableY + 5, { width: colWidths.qty, align: 'center' });
      doc.text('Rate/Ton', 355, tableY + 5, { width: colWidths.rate, align: 'center' });
      doc.text('Amount', 445, tableY + 5, { width: colWidths.amount - 5, align: 'right' }); // -5 for padding

      // Determine heights
      const rowHeight = 22;
      
      // Calculate how many tax rows we will have
      let taxRowsCount = 0;
      if (data.transportTotal > 0) taxRowsCount++;
      if (data.igstRate > 0) {
        taxRowsCount++; // IGST
      } else {
        taxRowsCount += 2; // CGST, SGST
      }
      taxRowsCount++; // Grand Total

      const totalRows = Math.max(5, data.items.length + taxRowsCount); // ensure at least 5 rows total
      const minDataRows = Math.max(1, totalRows - taxRowsCount);
      const paddingRowsCount = Math.max(0, minDataRows - data.items.length);

      const itemsAreaHeight = (data.items.length + paddingRowsCount) * rowHeight;
      const taxAreaHeight = taxRowsCount * rowHeight;
      const totalTableHeight = 20 + itemsAreaHeight + taxAreaHeight;
      const tableBottomY = tableY + totalTableHeight;

      // Draw outer table border
      doc.strokeColor('#888888').lineWidth(0.5);
      doc.rect(40, tableY, 515, totalTableHeight).stroke();

      // Vertical dividers ONLY for the items area (not extending into tax rows for the left columns)
      const itemsBottomY = tableY + 20 + itemsAreaHeight;
      doc.moveTo(240, tableY).lineTo(240, itemsBottomY).stroke();
      doc.moveTo(290, tableY).lineTo(290, itemsBottomY).stroke();
      
      // The dividers for Rate and Amount columns continue down through the tax rows
      doc.moveTo(355, tableY).lineTo(355, tableBottomY).stroke();
      doc.moveTo(445, tableY).lineTo(445, tableBottomY).stroke();

      let currentY = tableY + 20;

      // Draw Items rows
      doc.fillColor('#000000').font('Helvetica').fontSize(9);
      
      data.items.forEach((item) => {
        doc.text(item.description, 45, currentY + 6, { width: 190 });
        doc.text(item.hsnCode || '-', 240, currentY + 6, { width: colWidths.hsn, align: 'center' });
        doc.text(`${item.quantity.toFixed(3)} Ton`, 290, currentY + 6, { width: colWidths.qty, align: 'center' });
        doc.text(`Rs. ${item.ratePerTon.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 355, currentY + 6, { width: colWidths.rate, align: 'center' });
        doc.text(`Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 445, currentY + 6, { width: colWidths.amount - 5, align: 'right' });

        currentY += rowHeight;
        doc.moveTo(40, currentY).lineTo(555, currentY).stroke();
      });

      // Padding rows
      for (let i = 0; i < paddingRowsCount; i++) {
        currentY += rowHeight;
        doc.moveTo(40, currentY).lineTo(555, currentY).stroke();
      }

      // Tax Rows (integrated into the grid, blank left side)
      const drawTaxRow = (label: string, value: string, isTotal = false) => {
        if (isTotal) {
          // Fill light green for Grand Total row, ONLY across the last two columns
          doc.fillColor('#f0f0f0').rect(355.5, currentY + 0.5, 199, rowHeight - 1).fill();
          // redraw vertical divider for this row since we filled over them
          doc.strokeColor('#888888');
          doc.moveTo(445, currentY).lineTo(445, currentY + rowHeight).stroke();

          doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
        } else {
          doc.fillColor('#000000').font('Helvetica').fontSize(9);
        }

        doc.text(label, 355, currentY + 6, { width: colWidths.rate - 5, align: 'right' });
        if (isTotal) {
          doc.font('Helvetica-Bold');
        }
        doc.text(value, 445, currentY + 6, { width: colWidths.amount - 5, align: 'right' });
        
        currentY += rowHeight;
        if (currentY < tableBottomY) { 
          // Don't draw the line all the way across! Only across the Rate and Amount columns!
          doc.moveTo(355, currentY).lineTo(555, currentY).stroke();
        }
      };

      if (data.transportTotal > 0) {
        drawTaxRow('Transport Charges', `Rs. ${data.transportTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
      
      if (data.igstRate > 0) {
        drawTaxRow(`Taxable Amount`, `Rs. ${data.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        drawTaxRow(`IGST @${data.igstRate}%`, `Rs. ${data.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        // For CGST and SGST, the user's image shows "Taxable Amount" first if needed, but we can just use the label.
        drawTaxRow(`Taxable Amount`, `Rs. ${data.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        drawTaxRow(`CGST @${data.cgstRate}%`, `Rs. ${data.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        drawTaxRow(`SGST @${data.sgstRate}%`, `Rs. ${data.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }

      drawTaxRow('Grand Total', `Rs. ${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, true);

      // Amount in Words box (Attached to table)
      currentY = tableBottomY;
      doc.strokeColor('#888888').lineWidth(0.5).rect(40, currentY, 515, 24).stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#111111').text('Amount in Words:', 45, currentY + 7);
      doc.font('Helvetica-Oblique').fillColor('#333333').text(`INR ${data.amountInWords}`, 135, currentY + 7, { width: 415 });

      // Signatory Section
      const sigY = currentY + 40;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Authorized Signatory', 380, sigY, { width: 175, align: 'right' });
      doc.fontSize(9).font('Helvetica').fillColor('#555555').text(`For ${companyName}`, 300, sigY + 14, { width: 255, align: 'right' });

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

export function getInvoiceHTML(data: InvoiceData, settings: Record<string, string> = {}): string {
  const companyName = settings['company_name'] || 'Vishvyash Agrotech Energy';
  const defaultProd = settings['default_product'] || 'Biomass Briquettes';
  const companySubtitle = `${defaultProd} Manufacturer & Supplier`;
  const companyAddress = settings['company_address'] || 'Gat No. 1696/A, Sujata Apartment, Galli No. 12, Sujata Park, Jaysingpur, Kolhapur, Maharashtra - 416101';
  const companyGst = settings['company_gst'] || '27GHYPM9702C1Z5';

  let logoBase64 = '';
  try {
    let logoPath = path.join(__dirname, '../../assets/logo.png'); // Development
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(__dirname, '../../../assets/logo.png'); // Production (dist)
    }
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(process.cwd(), 'assets/logo.png'); // Fallback
    }
    logoBase64 = fs.readFileSync(logoPath, 'base64');
  } catch (err) {
    // Graceful error was already handled in generateInvoicePDF, but fallback just in case
    console.warn('Could not load logo.png from assets directory.');
  }

  const logoImg = logoBase64 
    ? `<img class="logo" src="data:image/png;base64,${logoBase64}" />` 
    : '';

  // Generate table rows (items + transport rows)
  const rows: string[] = [];
  data.items.forEach((item) => {
    // Product row
    rows.push(`
      <tr class="item-row">
        <td style="text-align: left;">${item.description}</td>
        <td style="text-align: center;">${item.hsnCode || '-'}</td>
        <td style="text-align: center;">${item.quantity.toFixed(3)} Ton</td>
        <td style="text-align: right;">Rs. ${item.ratePerTon.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right;">Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `);

    // Transport row if transport rate > 0
    if (item.transportRate > 0) {
      rows.push(`
        <tr class="item-row transport-row">
          <td style="text-align: left; font-style: italic; color: #555;">Transport Charges</td>
          <td style="text-align: center;">-</td>
          <td style="text-align: center;">${item.quantity.toFixed(3)} Ton</td>
          <td style="text-align: right;">Rs. ${item.transportRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">Rs. ${item.transportAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `);
    }
  });

  // Empty padding row to add space between items and tax rows
  const emptyRow = `
    <tr class="empty-row">
      <td colspan="5" style="height: 30px; border-left: 1px solid #ccc; border-right: 1px solid #ccc; border-top: none; border-bottom: none;"></td>
    </tr>
  `;

  // Tax and Total Rows integrated into the table grid
  let taxRows = '';
  if (data.igstRate > 0) {
    taxRows = `
      ${emptyRow}
      <tr class="calculation-row">
        <td colspan="3" class="no-border-left-bottom"></td>
        <td class="calc-label">IGST @${data.igstRate}%</td>
        <td class="calc-value">Rs. ${data.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  } else {
    taxRows = `
      ${emptyRow}
      <tr class="calculation-row">
        <td colspan="3" class="no-border-left-bottom"></td>
        <td class="calc-label">CGST @${data.cgstRate}%</td>
        <td class="calc-value">Rs. ${data.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr class="calculation-row">
        <td colspan="3" class="no-border-left-bottom"></td>
        <td class="calc-label">SGST @${data.sgstRate}%</td>
        <td class="calc-value">Rs. ${data.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }

  const grandTotalRow = `
    <tr class="grand-total-row">
      <td colspan="3" class="no-border-left-bottom"></td>
      <td class="calc-label bold grand-total-cell">Grand Total</td>
      <td class="calc-value bold grand-total-cell">Rs. ${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `;

  // Buyer / Consignee Layout
  let buyerConsigneeSection = '';
  if (data.templateType === 'B') {
    buyerConsigneeSection = `
      <table class="buyer-consignee-table">
        <tr>
          <td class="buyer-col">
            <div class="section-title">Buyer (Bill To)</div>
            <div class="party-name">${data.buyerName}</div>
            <div class="party-details">
              ${data.buyerAddress}<br/>
              <b>GSTIN:</b> ${data.buyerGst || '-'}<br/>
              ${data.buyerCin ? `<b>CIN No:</b> ${data.buyerCin}<br/>` : ''}
            </div>
          </td>
          <td class="consignee-col">
            <div class="section-title">Consignee (Ship To)</div>
            <div class="party-name">${data.consigneeName || '-'}</div>
            <div class="party-details">
              ${data.consigneeAddress || '-'}<br/>
              <b>GSTIN:</b> ${data.consigneeGst || '-'}<br/>
            </div>
          </td>
        </tr>
      </table>
    `;
  } else {
    buyerConsigneeSection = `
      <table class="buyer-consignee-table">
        <tr>
          <td class="buyer-col" style="width: 100%; border-right: none;">
            <div class="section-title">Buyer (Bill To)</div>
            <div class="party-name">${data.buyerName}</div>
            <div class="party-details">
              ${data.buyerAddress}<br/>
              <b>GSTIN:</b> ${data.buyerGst || '-'}<br/>
              ${data.buyerCin ? `<b>CIN No:</b> ${data.buyerCin}<br/>` : ''}
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice</title>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          background: #fff;
          font-size: 11px;
          line-height: 1.5;
          padding: 5px;
        }

        .invoice-container {
          width: 100%;
          padding: 18px;
        }

        /* Header Layout: Centered Logo and Text */
        .header {
          text-align: center;
          margin-bottom: 12px;
        }

        .logo {
          max-width: 100px;
          max-height: 80px;
          display: block;
          margin: 0 auto 8px;
        }

        .company-name {
          font-size: 22px;
          font-weight: bold;
          color: #005a36;
          text-transform: uppercase;
          margin-bottom: 3px;
          letter-spacing: 0.5px;
        }

        .company-subtitle {
          font-size: 11px;
          color: #333;
          margin-bottom: 3px;
        }

        .company-info {
          font-size: 10px;
          line-height: 1.5;
          color: #444;
        }

        .green-divider {
          height: 2px;
          background-color: #005a36;
          margin: 10px 0;
        }

        /* Title Bar */
        .title-bar {
          background-color: #005a36;
          color: #fff;
          text-align: center;
          font-weight: bold;
          font-size: 13px;
          padding: 5px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        /* Metadata table */
        .metadata-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          border: 1px solid #999;
        }

        .metadata-table td {
          padding: 5px 10px;
          border: 1px solid #999;
          width: 25%;
          font-size: 11px;
        }

        .meta-label {
          font-weight: bold;
          color: #222;
          background-color: #f5f5f5;
        }

        .meta-value {
          color: #000;
        }

        /* Buyer / Consignee table */
        .buyer-consignee-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          border: 1px solid #ccc;
          background-color: #f9f9f9;
        }

        .buyer-consignee-table td {
          padding: 10px 12px;
          vertical-align: top;
          border: 1px solid #ccc;
        }

        .buyer-col {
          width: 50%;
        }

        .consignee-col {
          width: 50%;
        }

        .section-title {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .party-name {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 3px;
        }

        .party-details {
          line-height: 1.5;
          font-size: 10.5px;
          color: #333;
        }

        /* Product/Items table */
        .product-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #999;
          margin-bottom: 12px;
        }

        .product-table th {
          background-color: #005a36;
          color: #fff;
          font-weight: bold;
          padding: 7px 10px;
          border: 1px solid #005a36;
          font-size: 11px;
          text-align: center;
        }

        .product-table td {
          padding: 7px 10px;
          border: 1px solid #ccc;
          font-size: 11px;
          vertical-align: middle;
        }

        .item-row td {
          font-weight: normal;
          border-left: 1px solid #999;
          border-right: 1px solid #999;
        }

        .empty-row td {
          border-left: 1px solid #999;
          border-right: 1px solid #999;
        }

        /* Calculation / Tax rows integration */
        .calculation-row td {
          padding: 6px 10px;
        }

        .no-border-left-bottom {
          border-left: none !important;
          border-bottom: none !important;
          border-top: none !important;
        }

        .calc-label {
          text-align: right;
          font-weight: normal;
          border: 1px solid #999;
        }

        .calc-value {
          text-align: right;
          border: 1px solid #999;
        }

        .grand-total-row td {
          padding: 7px 10px;
        }

        .grand-total-cell {
          background-color: #e6f2ec !important;
        }

        .bold {
          font-weight: bold !important;
        }

        /* Amount in Words box */
        .amount-in-words-box {
          border: 1px solid #999;
          padding: 8px 12px;
          font-size: 11px;
          margin-bottom: 30px;
        }

        /* Signatory Section */
        .signatory-container {
          width: 100%;
          margin-top: 20px;
        }

        .signatory-box {
          float: right;
          text-align: right;
          font-size: 11px;
        }

        .signatory-title {
          font-weight: bold;
          margin-bottom: 4px;
        }

        .signatory-company {
          font-size: 10px;
          color: #555;
        }
      </style>
    </head>
    <body>

      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          ${logoImg}
          <div class="company-name">${companyName}</div>
          <div class="company-subtitle">${companySubtitle}</div>
          <div class="company-info">
            ${companyAddress}<br/>
            <b>GST No.:</b> ${companyGst}
          </div>
        </div>

        <div class="green-divider"></div>

        <!-- Title -->
        <div class="title-bar">TAX INVOICE</div>

        <!-- Metadata Grid -->
        <table class="metadata-table">
          <tr>
            <td class="meta-label">Invoice No.</td>
            <td class="meta-value">${data.invoiceNumber}</td>
            <td class="meta-label">Invoice Date</td>
            <td class="meta-value">${data.invoiceDate}</td>
          </tr>
          <tr>
            <td class="meta-label">Vehicle No.</td>
            <td class="meta-value">${data.vehicleNumber || '-'}</td>
            <td class="meta-label">Transport</td>
            <td class="meta-value">${data.transportType || 'Truck'}</td>
          </tr>
        </table>

        <!-- Buyer & Consignee -->
        ${buyerConsigneeSection}

        <!-- Product Table -->
        <table class="product-table">
          <thead>
            <tr>
              <th style="width: 45%; text-align: left;">Product</th>
              <th style="width: 12%;">HSN Code</th>
              <th style="width: 13%;">Qty</th>
              <th style="width: 15%; text-align: right;">Rate/Ton</th>
              <th style="width: 15%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
            ${taxRows}
            ${grandTotalRow}
          </tbody>
        </table>

        <!-- Amount in Words -->
        <div class="amount-in-words-box">
          <b>Amount in Words:</b> ${data.amountInWords}
        </div>

        <!-- Signatory -->
        <div class="signatory-container">
          <div class="signatory-box">
            <div class="signatory-title">Authorized Signatory</div>
            <div class="signatory-company">For ${companyName}</div>
          </div>
          <div style="clear: both;"></div>
        </div>
      </div>

    </body>
    </html>
  `;
}
