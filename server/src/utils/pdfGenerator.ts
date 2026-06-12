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

const STORAGE_DIR = path.join(__dirname, '../../storage/pdfs');

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
    dbSettings.forEach((s) => {
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

      // Resolve logo path
      let logoPath = path.join(__dirname, '../../assets/logo.png'); // Development / tsx
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(__dirname, '../../../assets/logo.png'); // Compiled production (dist)
      }
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(process.cwd(), 'assets/logo.png'); // Current working directory fallback
      }
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(process.cwd(), 'server/assets/logo.png'); // Root context fallback
      }

      // Draw Logo centered
      let headerTextY = 40;
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 260, 35, { width: 75 });
          headerTextY = 115;
        } catch (logoErr) {
          console.warn('Failed to render logo image in PDFKit:', logoErr);
        }
      }

      // Dynamic Company Settings
      const companyName = (settings['company_name'] || 'Vishvyash Agrotech Energy').toUpperCase();
      const defaultProd = settings['default_product'] || 'Biomass Briquettes';
      const companySubtitle = `${defaultProd} Manufacturer & Supplier`;
      const companyAddress = settings['company_address'] || 'Gat No. 1696/A, Sujata Apartment, Galli No. 12, Sujata Park, Jaysingpur, Kolhapur, Maharashtra - 416101';
      const companyGst = settings['company_gst'] || '27GHYPM9702C1Z5';

      // Header - Company Details
      doc.y = headerTextY;
      doc.fillColor('#005a36').fontSize(18).font('Helvetica-Bold').text(companyName, { align: 'center' });
      doc.fillColor('#333333').fontSize(9).font('Helvetica').text(companySubtitle, { align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#555555').text(companyAddress, { align: 'center' });
      doc.font('Helvetica-Bold').fillColor('#111111').text(`GST No.: ${companyGst}`, { align: 'center' });
      doc.moveDown(0.8);

      // Green Divider Line
      doc.strokeColor('#005a36').lineWidth(2).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Title Bar
      const titleY = doc.y;
      doc.fillColor('#005a36').rect(40, titleY, 515, 20).fill();
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('TAX INVOICE', 40, titleY + 5, { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(1.5);

      // Metadata Grid Table (grey label backgrounds, white values)
      const metaY = doc.y;
      doc.lineWidth(0.8).strokeColor('#888888');

      // Outer border
      doc.rect(40, metaY, 515, 32).stroke();

      // Draw grey background for Col 1 (left label) and Col 3 (middle label)
      doc.fillColor('#f2f2f2').rect(40, metaY, 90, 32).fill();
      doc.fillColor('#f2f2f2').rect(297, metaY, 90, 32).fill();

      // Divider lines
      doc.strokeColor('#888888');
      doc.moveTo(130, metaY).lineTo(130, metaY + 32).stroke();
      doc.moveTo(297, metaY).lineTo(297, metaY + 32).stroke();
      doc.moveTo(387, metaY).lineTo(387, metaY + 32).stroke();
      doc.moveTo(40, metaY + 16).lineTo(555, metaY + 16).stroke(); // Row line

      // Row 1 text
      doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold');
      doc.text('Invoice No.', 45, metaY + 4);
      doc.font('Helvetica').text(data.invoiceNumber, 135, metaY + 4);
      doc.font('Helvetica-Bold').text('Invoice Date', 302, metaY + 4);
      doc.font('Helvetica').text(data.invoiceDate, 392, metaY + 4);

      // Row 2 text
      doc.font('Helvetica-Bold').text('Vehicle No.', 45, metaY + 20);
      doc.font('Helvetica').text(data.vehicleNumber || '-', 135, metaY + 20);
      doc.font('Helvetica-Bold').text('Transport', 302, metaY + 20);
      doc.font('Helvetica').text(data.transportType || 'Truck', 392, metaY + 20);

      doc.y = metaY + 32;
      doc.moveDown(0.8);

      // Buyer & Consignee Box Layout (grey headers, white body)
      const partyY = doc.y;
      const boxHeight = 85;
      const headerHeight = 16;

      if (data.templateType === 'B') {
        // Double boxes
        // Draw Left Box (Buyer)
        doc.fillColor('#f2f2f2').rect(40, partyY, 252, headerHeight).fill();
        doc.strokeColor('#888888').rect(40, partyY, 252, boxHeight).stroke();
        doc.strokeColor('#888888').moveTo(40, partyY + headerHeight).lineTo(292, partyY + headerHeight).stroke();

        doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold').text('Buyer (Bill To)', 45, partyY + 4);
        doc.fontSize(8.5).font('Helvetica-Bold').text(data.buyerName, 45, partyY + 22, { width: 242 });
        doc.fontSize(8).font('Helvetica').fillColor('#333333').text(data.buyerAddress, 45, partyY + 33, { width: 242, height: 32 });
        doc.font('Helvetica-Bold').fillColor('#111111').text(`GSTIN: ${data.buyerGst || '-'}`, 45, partyY + 65);
        doc.font('Helvetica').text(`State: ${data.buyerState} (Code: ${data.buyerStateCode})`, 45, partyY + 74);

        // Draw Right Box (Consignee)
        doc.fillColor('#f2f2f2').rect(303, partyY, 252, headerHeight).fill();
        doc.strokeColor('#888888').rect(303, partyY, 252, boxHeight).stroke();
        doc.strokeColor('#888888').moveTo(303, partyY + headerHeight).lineTo(555, partyY + headerHeight).stroke();

        doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold').text('Consignee (Ship To)', 308, partyY + 4);
        doc.fontSize(8.5).font('Helvetica-Bold').text(data.consigneeName || '-', 308, partyY + 22, { width: 242 });
        doc.fontSize(8).font('Helvetica').fillColor('#333333').text(data.consigneeAddress || '-', 308, partyY + 33, { width: 242, height: 32 });
        doc.font('Helvetica-Bold').fillColor('#111111').text(`GSTIN: ${data.consigneeGst || '-'}`, 308, partyY + 65);
        doc.font('Helvetica').text(`State: ${data.consigneeState || 'Maharashtra'} (Code: ${data.consigneeStateCode || '27'})`, 308, partyY + 74);
      } else {
        // Single full-width box (Template A)
        doc.fillColor('#f2f2f2').rect(40, partyY, 515, headerHeight).fill();
        doc.strokeColor('#888888').rect(40, partyY, 515, boxHeight).stroke();
        doc.strokeColor('#888888').moveTo(40, partyY + headerHeight).lineTo(555, partyY + headerHeight).stroke();

        doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold').text('Buyer (Bill To)', 45, partyY + 4);
        doc.fontSize(8.5).font('Helvetica-Bold').text(data.buyerName, 45, partyY + 22, { width: 505 });
        doc.fontSize(8).font('Helvetica').fillColor('#333333').text(data.buyerAddress, 45, partyY + 33, { width: 505, height: 22 });
        doc.font('Helvetica-Bold').fillColor('#111111').text(`GSTIN: ${data.buyerGst || '-'}`, 45, partyY + 56);
        if (data.buyerCin) {
          doc.font('Helvetica-Bold').text(`CIN No: ${data.buyerCin}`, 300, partyY + 56);
        }
        doc.font('Helvetica').text(`State: ${data.buyerState} (Code: ${data.buyerStateCode})`, 45, partyY + 68);
      }

      doc.y = partyY + boxHeight;
      doc.moveDown(0.8);

      // Items Table
      const tableY = doc.y;
      const colWidths = {
        desc: 230,
        hsn: 60,
        qty: 70,
        rate: 80,
        amount: 75
      };

      // Table Header (Dark Green Background, White Text)
      doc.fillColor('#005a36').rect(40, tableY, 515, 20).fill();
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      doc.text('Product', 45, tableY + 6);
      doc.text('HSN Code', 270, tableY + 6, { width: colWidths.hsn, align: 'center' });
      doc.text('Qty', 330, tableY + 6, { width: colWidths.qty, align: 'center' });
      doc.text('Rate/Ton', 400, tableY + 6, { width: colWidths.rate, align: 'right' });
      doc.text('Amount', 480, tableY + 6, { width: colWidths.amount, align: 'right' });

      // Border lines for header
      doc.strokeColor('#888888').lineWidth(0.8);
      doc.rect(40, tableY, 515, 20).stroke();

      let currentY = tableY + 20;

      // Draw Items rows
      doc.fillColor('#000000').font('Helvetica').fontSize(8);
      
      data.items.forEach((item) => {
        const rowHeight = 22;
        // Draw cells and borders
        doc.rect(40, currentY, 515, rowHeight).stroke();
        
        // Vertical dividers
        doc.moveTo(270, currentY).lineTo(270, currentY + rowHeight).stroke();
        doc.moveTo(330, currentY).lineTo(330, currentY + rowHeight).stroke();
        doc.moveTo(400, currentY).lineTo(400, currentY + rowHeight).stroke();
        doc.moveTo(480, currentY).lineTo(480, currentY + rowHeight).stroke();

        // Row contents
        doc.text(item.description, 45, currentY + 7, { width: 220 });
        doc.text(item.hsnCode || '-', 270, currentY + 7, { width: colWidths.hsn, align: 'center' });
        doc.text(`${item.quantity.toFixed(3)} Ton`, 330, currentY + 7, { width: colWidths.qty, align: 'center' });
        doc.text(`Rs. ${item.ratePerTon.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, currentY + 7, { width: colWidths.rate - 5, align: 'right' });
        doc.text(`Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentY + 7, { width: colWidths.amount - 5, align: 'right' });

        currentY += rowHeight;

        // Draw transport row if applicable
        if (item.transportRate > 0) {
          doc.rect(40, currentY, 515, rowHeight).stroke();
          doc.moveTo(270, currentY).lineTo(270, currentY + rowHeight).stroke();
          doc.moveTo(330, currentY).lineTo(330, currentY + rowHeight).stroke();
          doc.moveTo(400, currentY).lineTo(400, currentY + rowHeight).stroke();
          doc.moveTo(480, currentY).lineTo(480, currentY + rowHeight).stroke();

          doc.font('Helvetica-Oblique').fillColor('#555555').text('Transport Charges', 45, currentY + 7, { width: 220 });
          doc.font('Helvetica').fillColor('#000000').text('-', 270, currentY + 7, { width: colWidths.hsn, align: 'center' });
          doc.text(`${item.quantity.toFixed(3)} Ton`, 330, currentY + 7, { width: colWidths.qty, align: 'center' });
          doc.text(`Rs. ${item.transportRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, currentY + 7, { width: colWidths.rate - 5, align: 'right' });
          doc.text(`Rs. ${item.transportAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentY + 7, { width: colWidths.amount - 5, align: 'right' });

          currentY += rowHeight;
        }
      });

      // Total details grid (CGST, SGST, Grand Total inside the grid layout!)
      const drawTaxRow = (label: string, value: string, isTotal = false) => {
        const rowHeight = 20;
        doc.rect(40, currentY, 515, rowHeight).stroke();

        // Draw vertical dividers only for rate and amount columns
        doc.moveTo(400, currentY).lineTo(400, currentY + rowHeight).stroke();
        doc.moveTo(480, currentY).lineTo(480, currentY + rowHeight).stroke();

        if (isTotal) {
          // Dark green background for Grand Total label and value
          doc.fillColor('#f2f2f2').rect(400, currentY, 80, rowHeight).fill();
          doc.fillColor('#f2f2f2').rect(480, currentY, 75, rowHeight).fill();
          // redraw borders over filled rectangles
          doc.strokeColor('#888888').rect(40, currentY, 515, rowHeight).stroke();
          doc.moveTo(400, currentY).lineTo(400, currentY + rowHeight).stroke();
          doc.moveTo(480, currentY).lineTo(480, currentY + rowHeight).stroke();

          doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
          doc.text(label, 400, currentY + 6, { width: colWidths.rate - 5, align: 'right' });
          doc.text(value, 480, currentY + 6, { width: colWidths.amount - 5, align: 'right' });
        } else {
          doc.fillColor('#000000').font('Helvetica').fontSize(8);
          doc.text(label, 400, currentY + 6, { width: colWidths.rate - 5, align: 'right' });
          doc.text(value, 480, currentY + 6, { width: colWidths.amount - 5, align: 'right' });
        }
        currentY += rowHeight;
      };

      if (data.transportTotal > 0) {
        drawTaxRow('Subtotal', `Rs. ${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        drawTaxRow('Transport Total', `Rs. ${data.transportTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        drawTaxRow('Taxable Amount', `Rs. ${data.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      } else {
        drawTaxRow('Taxable Amount', `Rs. ${data.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      }

      if (data.igstRate > 0) {
        drawTaxRow(`IGST @${data.igstRate}%`, `Rs. ${data.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      } else {
        drawTaxRow(`CGST @${data.cgstRate}%`, `Rs. ${data.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        drawTaxRow(`SGST @${data.sgstRate}%`, `Rs. ${data.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      }

      drawTaxRow('Grand Total', `Rs. ${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true);

      // Amount in Words box
      currentY += 5;
      doc.strokeColor('#888888').lineWidth(0.8).rect(40, currentY, 515, 24).stroke();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#111111').text('Amount in Words: ', 45, currentY + 8);
      doc.font('Helvetica-Oblique').fillColor('#333333').text(data.amountInWords, 125, currentY + 8, { width: 425 });

      // Signatory Section
      const sigY = currentY + 45;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000').text('Authorized Signatory', 380, sigY, { width: 175, align: 'right' });
      doc.fontSize(7.5).font('Helvetica').fillColor('#555555').text(`For ${companyName}`, 380, sigY + 11, { width: 175, align: 'right' });

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

  // Tax and Total Rows integrated into the table grid
  let taxRows = '';
  if (data.igstRate > 0) {
    taxRows = `
      <tr class="calculation-row">
        <td colspan="3" class="no-border-left-bottom"></td>
        <td class="calc-label">IGST @${data.igstRate}%</td>
        <td class="calc-value">Rs. ${data.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  } else {
    taxRows = `
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
      <td class="calc-label bold">Grand Total</td>
      <td class="calc-value bold">Rs. ${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
              Address: ${data.buyerAddress}<br/>
              State: ${data.buyerState} (Code: ${data.buyerStateCode})<br/>
              <b>GSTIN:</b> ${data.buyerGst || '-'}<br/>
              ${data.buyerCin ? `<b>CIN No:</b> ${data.buyerCin}<br/>` : ''}
            </div>
          </td>
          <td class="consignee-col">
            <div class="section-title">Consignee (Ship To)</div>
            <div class="party-name">${data.consigneeName || '-'}</div>
            <div class="party-details">
              Address: ${data.consigneeAddress || '-'}<br/>
              State: ${data.consigneeState || 'Maharashtra'} (Code: ${data.consigneeStateCode || '27'})<br/>
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
              Address: ${data.buyerAddress}<br/>
              State: ${data.buyerState} (Code: ${data.buyerStateCode})<br/>
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
          line-height: 1.4;
          padding: 5px;
        }

        .invoice-container {
          border: 1px solid #777;
          width: 100%;
          padding: 15px;
          border-radius: 4px;
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
          font-size: 24px;
          font-weight: bold;
          color: #006400;
          text-transform: uppercase;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }

        .company-subtitle {
          font-size: 11px;
          color: #333;
          margin-bottom: 4px;
        }

        .company-info {
          font-size: 11px;
          line-height: 1.4;
          color: #222;
        }

        .green-divider {
          height: 2px;
          background-color: #006400;
          margin: 10px 0;
        }

        /* Title Bar */
        .title-bar {
          background-color: #006400;
          color: #fff;
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          padding: 6px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          border-radius: 2px;
        }

        /* Metadata table */
        .metadata-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          border: 1px solid #ccc;
        }

        .metadata-table td {
          padding: 6px 10px;
          border: 1px solid #ccc;
          width: 25%;
        }

        .meta-label {
          font-weight: bold;
          color: #333;
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
          font-size: 12px;
          text-decoration: underline;
          margin-bottom: 6px;
        }

        .party-name {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .party-details {
          line-height: 1.4;
          font-size: 11px;
        }

        /* Product/Items table */
        .product-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ccc;
          margin-bottom: 12px;
        }

        .product-table th {
          background-color: #006400;
          color: #fff;
          font-weight: bold;
          padding: 8px 10px;
          border: 1px solid #ccc;
          font-size: 11px;
          text-align: center;
        }

        .product-table td {
          padding: 8px 10px;
          border: 1px solid #ccc;
          font-size: 11px;
          vertical-align: middle;
        }

        .item-row td {
          font-weight: normal;
        }

        .blank-row td {
          height: 35px;
        }

        /* Calculation / Tax rows integration */
        .calculation-row td {
          padding: 6px 10px;
        }

        .no-border-left-bottom {
          border-left: none !important;
          border-bottom: none !important;
        }

        .calc-label {
          text-align: right;
          font-weight: normal;
          border: 1px solid #ccc;
          background-color: #fafafa;
        }

        .calc-value {
          text-align: right;
          border: 1px solid #ccc;
        }

        .grand-total-row td {
          background-color: #f5f5f5;
          padding: 8px 10px;
        }

        .bold {
          font-weight: bold !important;
        }

        /* Amount in Words box */
        .amount-in-words-box {
          border: 1px solid #ccc;
          padding: 8px 10px;
          font-size: 11px;
          margin-bottom: 25px;
          border-radius: 2px;
        }

        /* Signatory Section */
        .signatory-container {
          width: 100%;
          margin-top: 15px;
        }

        .signatory-box {
          float: right;
          text-align: right;
          font-size: 11px;
        }

        .signatory-title {
          font-weight: bold;
          margin-bottom: 45px;
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
        <div class="title-bar">Tax Invoice</div>

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
            <div>For ${companyName}</div>
          </div>
          <div style="clear: both;"></div>
        </div>
      </div>

    </body>
    </html>
  `;
}

