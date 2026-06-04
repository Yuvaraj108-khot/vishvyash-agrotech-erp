import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
}

function getInvoiceHTML(data: InvoiceData): string {
  let logoBase64 = '';
  try {
    logoBase64 = fs.readFileSync(
      path.join(__dirname, '../../assets/logo.png'),
      'base64'
    );
  } catch (err) {
    console.warn('Could not load logo.png from assets directory.');
  }

  const logoImg = logoBase64 
    ? `<img class="logo" src="data:image/png;base64,${logoBase64}" />` 
    : `<div style="text-align:center; font-style:italic; margin-bottom: 20px;">[Logo Image Goes Here]</div>`;

  const activeItems = data.items.map(item => `
    <tr>
      <td style="text-align: left;">${item.description}</td>
      <td style="text-align: center;">${item.hsnCode}</td>
      <td style="text-align: center;">${item.quantity.toFixed(3)} Ton</td>
      <td style="text-align: center;">Rs. ${item.ratePerTon.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: center;">Rs. ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  let taxRowsHTML = '';
  if (data.igstRate > 0) {
    taxRowsHTML = `
      <tr>
        <td rowspan="2"></td>
        <td rowspan="2"></td>
        <td rowspan="2"></td>
        <td class="total-label">IGST @${data.igstRate}%</td>
        <td style="text-align: center;">Rs. ${data.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td class="total-label grand-total-bg">Grand Total</td>
        <td class="grand-total-bg" style="text-align: center;">
          Rs. ${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `;
  } else {
    taxRowsHTML = `
      <tr>
        <td rowspan="3"></td>
        <td rowspan="3"></td>
        <td rowspan="3"></td>
        <td class="total-label">CGST @${data.cgstRate}%</td>
        <td style="text-align: center;">Rs. ${data.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td class="total-label">SGST @${data.sgstRate}%</td>
        <td style="text-align: center;">Rs. ${data.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td class="total-label grand-total-bg">Grand Total</td>
        <td class="grand-total-bg" style="text-align: center;">
            Rs. ${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `;
  }

  let buyerHtml = '';
  if (data.templateType === 'B') {
    buyerHtml = `
      <table class="split-buyer-table">
        <tr>
          <td>
            <div class="buyer-title">Buyer (Bill To)</div>
            <div class="buyer-text">${data.buyerName}</div>
            <div class="buyer-text">${data.buyerAddress}</div>
            <div class="buyer-text">
              <b>GSTIN:</b> ${data.buyerGst || '-'}
            </div>
            ${data.buyerCin ? `<div class="buyer-text"><b>CIN No:</b> ${data.buyerCin}</div>` : ''}
          </td>
          <td>
            <div class="buyer-title">Consignee (Ship To)</div>
            <div class="buyer-text">${data.consigneeName || '-'}</div>
            <div class="buyer-text">${data.consigneeAddress || '-'}</div>
            <div class="buyer-text">
              <b>GSTIN:</b> ${data.consigneeGst || '-'}
            </div>
          </td>
        </tr>
      </table>
    `;
  } else {
    buyerHtml = `
      <div class="single-buyer-box">
        <div class="buyer-title">Buyer (Bill To)</div>
        <div class="buyer-text">${data.buyerName}</div>
        <div class="buyer-text">${data.buyerAddress}</div>
        <div class="buyer-text">
          <b>GSTIN:</b> ${data.buyerGst || '-'}
        </div>
        ${data.buyerCin ? `<div class="buyer-text"><b>CIN No:</b> ${data.buyerCin}</div>` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice</title>
      <style>
        @page {
          size: A4;
          margin: 12mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111;
          background: #fff;
        }

        .header {
           text-align: center;
           margin-bottom: 10px;
        }

        .logo {
          width: 140px;
          height: auto;
          display: block;
          margin: 0 auto 5px;
        }

        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #006400;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .subtitle {
          font-size: 13px;
          margin-bottom: 4px;
          color: #333;
        }

        .address {
          font-size: 11px;
          margin-bottom: 4px;
          color: #333;
        }

        .gst {
          font-size: 12px;
          font-weight: bold;
        }

        .green-line {
          height: 3px;
          background-color: #006400;
          margin: 10px 0 15px 0;
        }

        .tax-invoice-wrapper {
          border: 1px solid #444;
          margin-bottom: 15px;
        }

        .tax-bar {
          background: #006400;
          color: white;
          text-align: center;
          padding: 6px;
          font-size: 16px;
          font-weight: bold;
        }

        .info-table {
          width: 100%;
          border-collapse: collapse;
        }

        .info-table td {
          border-top: 1px solid #444;
          border-right: 1px solid #444;
          padding: 8px 10px;
          font-size: 12px;
        }

        .info-table td:last-child {
          border-right: none;
        }

        .label {
          font-weight: bold;
          background: #f9f9f9;
          width: 15%;
        }

        /* Buyer Tables */
        .split-buyer-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #444;
          margin-bottom: 15px;
        }
        .split-buyer-table td {
          width: 50%;
          padding: 10px;
          vertical-align: top;
          border-right: 1px solid #444;
        }
        .split-buyer-table td:last-child {
          border-right: none;
        }
        .single-buyer-box {
          border: 1px solid #444;
          padding: 10px;
          margin-bottom: 15px;
        }
        .buyer-title {
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .buyer-text {
          font-size: 12px;
          margin-bottom: 4px;
        }

        /* Product table */
        .product-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #444;
          margin-bottom: 15px;
        }

        .product-table th {
          background: #006400;
          color: white;
          border-right: 1px solid #444;
          border-bottom: 1px solid #444;
          padding: 8px 10px;
          font-size: 13px;
        }
        .product-table th:last-child {
          border-right: none;
        }

        .product-table td {
          border-right: 1px solid #444;
          border-bottom: 1px solid #444;
          padding: 8px 10px;
          font-size: 12px;
        }
        .product-table td:last-child {
          border-right: none;
        }

        .product-table tr:last-child td {
          border-bottom: none;
        }

        .empty-row td {
          height: 50px;
        }

        .total-label {
          font-weight: bold;
          text-align: center;
        }

        .grand-total-bg {
          background: #eef5ee;
          font-weight: bold;
        }

        .amount-box {
          border: 1px solid #444;
          padding: 10px;
          font-size: 12px;
          margin-bottom: 40px;
        }

        .signature {
          text-align: right;
          padding-right: 10px;
          font-size: 13px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>

      <div class="header">
         ${logoImg}

         <div class="company-name">
            VISHVYASH AGROTECH ENERGY
         </div>

         <div class="subtitle">
            Biomass Briquettes Manufacturer & Supplier
         </div>

         <div class="address">
            Gat No. 1696/A, Sujata Apartment, Galli No. 12, Sujata Park, Jaysingpur, Kolhapur, Maharashtra &ndash; 416101
         </div>

         <div class="gst">
            GST No.: 27GHYPM9702C1Z5
         </div>
      </div>

      <div class="green-line"></div>

      <div class="tax-invoice-wrapper">
        <div class="tax-bar">TAX INVOICE</div>

        <table class="info-table">
          <tr>
            <td class="label">Invoice No.</td>
            <td>${data.invoiceNumber}</td>
            <td class="label">Invoice Date</td>
            <td>${data.invoiceDate}</td>
          </tr>
          <tr>
            <td class="label">Vehicle No.</td>
            <td>${data.vehicleNumber || '-'}</td>
            <td class="label">Transport</td>
            <td>${data.transportType || 'Truck'}</td>
          </tr>
        </table>
      </div>

      ${buyerHtml}

      <table class="product-table">
        <thead>
          <tr>
            <th style="width: 35%; text-align: left;">Product</th>
            <th style="text-align: center;">HSN Code</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: center;">Rate/Ton</th>
            <th style="text-align: center;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${activeItems}
          ${taxRowsHTML}
        </tbody>
      </table>

      <div class="amount-box">
        <b>Amount in Words:</b> ${data.amountInWords}
      </div>

      <div class="signature">
        <div>Authorized Signatory</div>
        <div style="font-size: 11px; font-weight: normal; margin-top: 5px;">For Vishvyash Agrotech Energy</div>
      </div>

    </body>
    </html>
  `;
}
