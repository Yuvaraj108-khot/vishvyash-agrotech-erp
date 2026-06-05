import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

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

  try {
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote'
      ]
    });

    try {
      const page = await browser.newPage();
      const htmlContent = getInvoiceHTML(data);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any });
      
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        }
      });

      return filePath;
    } finally {
      await browser.close();
    }
  } catch (puppeteerError) {
    console.warn('Puppeteer PDF generation failed. Falling back to native PDFKit:', puppeteerError);
    try {
      await generateInvoicePDFWithPDFKit(data, filePath);
      return filePath;
    } catch (pdfkitError) {
      console.error('PDFKit fallback generation also failed:', pdfkitError);
      throw pdfkitError;
    }
  }
}

function generateInvoicePDFWithPDFKit(data: InvoiceData, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header - Company Name
      doc.fillColor('#006400').fontSize(22).font('Helvetica-Bold').text('Vishvyash Agrotech Energy', { align: 'center' });
      doc.fillColor('#333333').fontSize(10).font('Helvetica-Oblique').text('Biomass Briquettes Manufacturer & Supplier', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text('Gat No. 1696/A, Sujata Apartment, Galli No. 12, Sujata Park, Jaysingpur, Kolhapur, Maharashtra - 416101', { align: 'center' });
      doc.font('Helvetica-Bold').text('GST No: 27GHYPM9702C1Z5', { align: 'center' });
      doc.moveDown(1);

      // Divider Line
      doc.strokeColor('#006400').lineWidth(2).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Title Bar
      doc.fillColor('#006400').rect(40, doc.y, 515, 20).fill();
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('TAX INVOICE', 40, doc.y + 5, { align: 'center' });
      doc.fillColor('#000000').moveDown(1.5);

      // Metadata Info
      const startY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').text('Invoice No: ', 45, startY);
      doc.font('Helvetica').text(data.invoiceNumber, 110, startY);
      doc.font('Helvetica-Bold').text('Invoice Date: ', 300, startY);
      doc.font('Helvetica').text(data.invoiceDate, 370, startY);

      doc.moveDown(0.5);
      const nextY = doc.y;
      doc.font('Helvetica-Bold').text('Vehicle No: ', 45, nextY);
      doc.font('Helvetica').text(data.vehicleNumber || '-', 110, nextY);
      doc.font('Helvetica-Bold').text('Transport: ', 300, nextY);
      doc.font('Helvetica').text(data.transportType || 'By Road', 370, nextY);
      doc.moveDown(1);

      // Buyer Box
      doc.strokeColor('#CCCCCC').lineWidth(1).rect(40, doc.y, 515, 75).stroke();
      const buyerY = doc.y + 8;
      doc.fontSize(10).font('Helvetica-Bold').text('Buyer (Bill To):', 50, buyerY);
      doc.fontSize(10).font('Helvetica-Bold').text(data.buyerName, 50, buyerY + 14);
      doc.fontSize(8).font('Helvetica').text(`Address: ${data.buyerAddress}`, 50, buyerY + 28, { width: 495 });
      doc.text(`State: ${data.buyerState} (Code: ${data.buyerStateCode})    GSTIN: ${data.buyerGst || '-'}`, 50, buyerY + 52);
      
      doc.y = buyerY + 75;
      doc.moveDown(1);

      // Items Table Header
      const tableY = doc.y;
      doc.fillColor('#006400').rect(40, tableY, 515, 18).fill();
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('Product Description', 45, tableY + 5, { width: 200 });
      doc.text('HSN', 250, tableY + 5, { width: 50, align: 'center' });
      doc.text('Qty', 310, tableY + 5, { width: 60, align: 'right' });
      doc.text('Rate/Ton', 380, tableY + 5, { width: 70, align: 'right' });
      doc.text('Amount', 460, tableY + 5, { width: 90, align: 'right' });

      doc.fillColor('#000000').font('Helvetica');
      let currentY = tableY + 18;

      data.items.forEach((item) => {
        // Draw item row
        doc.text(item.description, 45, currentY + 5, { width: 200 });
        doc.text(item.hsnCode || '-', 250, currentY + 5, { width: 50, align: 'center' });
        doc.text(`${item.quantity.toFixed(3)} MT`, 310, currentY + 5, { width: 60, align: 'right' });
        doc.text(`Rs. ${item.ratePerTon.toFixed(2)}`, 380, currentY + 5, { width: 70, align: 'right' });
        doc.text(`Rs. ${item.amount.toFixed(2)}`, 460, currentY + 5, { width: 90, align: 'right' });
        
        currentY += 18;
        doc.strokeColor('#EEEEEE').lineWidth(0.5).moveTo(40, currentY).lineTo(555, currentY).stroke();

        // Draw transport row if applicable
        if (item.transportRate > 0) {
          doc.font('Helvetica-Oblique').text('Transport Charges', 45, currentY + 5, { width: 200 });
          doc.font('Helvetica').text('-', 250, currentY + 5, { width: 50, align: 'center' });
          doc.text(`${item.quantity.toFixed(3)} MT`, 310, currentY + 5, { width: 60, align: 'right' });
          doc.text(`Rs. ${item.transportRate.toFixed(2)}`, 380, currentY + 5, { width: 70, align: 'right' });
          doc.text(`Rs. ${item.transportAmount.toFixed(2)}`, 460, currentY + 5, { width: 90, align: 'right' });
          currentY += 18;
          doc.strokeColor('#EEEEEE').lineWidth(0.5).moveTo(40, currentY).lineTo(555, currentY).stroke();
        }
      });

      // Total details
      currentY += 10;
      doc.fontSize(9).font('Helvetica-Bold');
      
      const drawTotalRow = (label: string, val: string) => {
        doc.text(label, 300, currentY, { width: 140, align: 'right' });
        doc.text(val, 450, currentY, { width: 100, align: 'right' });
        currentY += 14;
      };

      drawTotalRow('Subtotal:', `Rs. ${data.subtotal.toFixed(2)}`);
      drawTotalRow('Taxable Amount:', `Rs. ${data.taxableAmount.toFixed(2)}`);

      if (data.igstRate > 0) {
        drawTotalRow(`IGST @${data.igstRate}%:`, `Rs. ${data.igstAmount.toFixed(2)}`);
      } else {
        drawTotalRow(`CGST @${data.cgstRate}%:`, `Rs. ${data.cgstAmount.toFixed(2)}`);
        drawTotalRow(`SGST @${data.sgstRate}%:`, `Rs. ${data.sgstAmount.toFixed(2)}`);
      }

      doc.fontSize(11).font('Helvetica-Bold');
      drawTotalRow('Grand Total:', `Rs. ${data.grandTotal.toFixed(2)}`);

      doc.fontSize(8).font('Helvetica-Oblique').text(`Amount in Words: ${data.amountInWords}`, 45, currentY + 10, { width: 500 });

      // Signatory Box
      const sigY = currentY + 50;
      doc.fontSize(9).font('Helvetica-Bold').text('Authorized Signatory', 380, sigY, { width: 170, align: 'right' });
      doc.fontSize(8).font('Helvetica').text('For Vishvyash Agrotech Energy', 380, sigY + 12, { width: 170, align: 'right' });

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}


export function getInvoiceHTML(data: InvoiceData): string {
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
          <div class="company-name">Vishvyash Agrotech Energy</div>
          <div class="company-subtitle">Biomass Briquettes Manufacturer & Supplier</div>
          <div class="company-info">
            Gat No. 1696/A, Sujata Apartment, Galli No. 12, Sujata Park, Jaysingpur, Kolhapur, Maharashtra &ndash; 416101<br/>
            <b>GST No.:</b> 27GHYPM9702C1Z5
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
            <div>For Vishvyash Agrotech Energy</div>
          </div>
          <div style="clear: both;"></div>
        </div>
      </div>

    </body>
    </html>
  `;
}

