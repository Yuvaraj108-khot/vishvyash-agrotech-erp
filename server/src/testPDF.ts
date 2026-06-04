import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { generateInvoicePDF, InvoiceData, getInvoiceHTML } from './utils/pdfGenerator';

const ARTIFACTS_DIR = 'C:/Users/YUVARAJ KHOT/.gemini/antigravity-ide/brain/fae4b94c-ccb3-48bb-b01e-a1641435118b';

const case1Data: InvoiceData = {
  invoiceNumber: "VISH/2026-27/001",
  invoiceDate: "04-Jun-2026",
  transportType: "By Road",
  vehicleNumber: "MH-09-EX-1234",
  buyerName: "Mahindra & Mahindra Ltd.",
  buyerGst: "27AAAAM1234A1Z1",
  buyerAddress: "Gat No. 85, MIDC Area, Pune, Maharashtra - 411019",
  buyerState: "Maharashtra",
  buyerStateCode: "27",
  templateType: "A",
  items: [
    {
      description: "Biomass Briquettes (Grade A)",
      hsnCode: "4401",
      quantity: 15.500,
      ratePerTon: 5200.00,
      amount: 80600.00,
      transportRate: 450.00,
      transportAmount: 6975.00
    }
  ],
  subtotal: 80600.00,
  transportTotal: 6975.00,
  taxableAmount: 87575.00,
  cgstRate: 2.5,
  sgstRate: 2.5,
  cgstAmount: 2189.38,
  sgstAmount: 2189.38,
  igstRate: 0,
  igstAmount: 0,
  grandTotal: 91953.76,
  amountInWords: "Rupees Ninety One Thousand Nine Hundred Fifty Three and Seventy Six Paise Only"
};

const case2Data: InvoiceData = {
  invoiceNumber: "VISH/2026-27/002",
  invoiceDate: "04-Jun-2026",
  transportType: "By Road",
  vehicleNumber: "KA-01-AB-9876",
  buyerName: "Karnataka Power Corporation Ltd.",
  buyerGst: "29AAACK4321B1Z2",
  buyerAddress: "Shakti Bhavan, 82, Race Course Road, Bengaluru, Karnataka - 560001",
  buyerState: "Karnataka",
  buyerStateCode: "29",
  consigneeName: "Raichur Thermal Power Station (RTPS)",
  consigneeGst: "29AAACK4321B1Z2",
  consigneeAddress: "RTPS Site, Raichur District, Karnataka - 584170",
  consigneeState: "Karnataka",
  consigneeStateCode: "29",
  templateType: "B",
  items: [
    {
      description: "Biomass Briquettes (Grade A)",
      hsnCode: "4401",
      quantity: 24.250,
      ratePerTon: 5100.00,
      amount: 123675.00,
      transportRate: 800.00,
      transportAmount: 19400.00
    },
    {
      description: "Biomass Pellets (6mm Premium)",
      hsnCode: "4401",
      quantity: 12.000,
      ratePerTon: 6200.00,
      amount: 74400.00,
      transportRate: 800.00,
      transportAmount: 9600.00
    }
  ],
  subtotal: 198075.00,
  transportTotal: 29000.00,
  taxableAmount: 227075.00,
  cgstRate: 0,
  sgstRate: 0,
  cgstAmount: 0,
  sgstAmount: 0,
  igstRate: 5,
  igstAmount: 11353.75,
  grandTotal: 238428.75,
  amountInWords: "Rupees Two Lakh Thirty Eight Thousand Four Hundred Twenty Eight and Seventy Five Paise Only"
};

// Custom function to render HTML content and take screenshot via Puppeteer
async function captureInvoiceScreenshot(data: InvoiceData, filename: string) {
  // Use same structure as in getInvoiceHTML
  const htmlContent = getInvoiceHTML(data);

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    // A4 dimensions: 794px width x 1123px height at 96 dpi
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2 // High resolution
    });

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any });

    // Save screenshot
    const imagePath = path.join(ARTIFACTS_DIR, filename);
    await page.screenshot({
      path: imagePath,
      fullPage: false // Take only one page viewport size
    });
    console.log(`Saved screenshot to ${imagePath}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  console.log("Generating Case 1 PDF...");
  const pdf1 = await generateInvoicePDF(case1Data);
  console.log(`Saved PDF to ${pdf1}`);
  await captureInvoiceScreenshot(case1Data, 'invoice_case1_maharashtra.png');

  console.log("Generating Case 2 PDF...");
  const pdf2 = await generateInvoicePDF(case2Data);
  console.log(`Saved PDF to ${pdf2}`);
  await captureInvoiceScreenshot(case2Data, 'invoice_case2_interstate.png');

  console.log("All done!");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
