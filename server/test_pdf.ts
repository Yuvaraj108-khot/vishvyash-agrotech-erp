import { generateInvoicePDF, InvoiceData } from './src/utils/pdfGenerator';
import fs from 'fs';
import path from 'path';

async function main() {
  const data: InvoiceData = {
    invoiceNumber: 'VAE/INV/001',
    invoiceDate: '28-May-2026',
    transportType: 'Truck',
    vehicleNumber: 'MH10DT5369',
    buyerName: 'Tuljai Enterprises',
    buyerGst: '27AANFT6230G1ZO',
    buyerAddress: 'Parshwanath Nagar, Patangshri Bungalow,\nSangli-Miraj Road, Miraj, Sangli\nMaharashtra - 416410',
    buyerState: 'Maharashtra',
    buyerStateCode: '27',
    consigneeName: 'Hindustan Unilever Limited',
    consigneeGst: '27AAACH1004N1ZU',
    consigneeAddress: 'B-7, MISC, Lote Parshuram,\nKhed Taluk, Ratnagiri - 415722',
    consigneeState: 'Maharashtra',
    consigneeStateCode: '27',
    templateType: 'B',
    items: [
      {
        description: 'Biomass Briquettes',
        hsnCode: '4401',
        quantity: 12.015,
        ratePerTon: 6700,
        amount: 80500.50,
        transportRate: 0,
        transportAmount: 0,
      }
    ],
    subtotal: 80500.50,
    transportTotal: 0,
    taxableAmount: 80500.50,
    cgstRate: 2.5,
    sgstRate: 2.5,
    cgstAmount: 2012.51,
    sgstAmount: 2012.51,
    igstRate: 0,
    igstAmount: 0,
    grandTotal: 84525.52,
    amountInWords: 'INR Eighty Four Thousand Five Hundred Twenty Five Rupees and Fifty Two Paise Only'
  };

  const pdfPath = await generateInvoicePDF(data);
  console.log(`Generated PDF at ${pdfPath}`);
}

main().catch(console.error);
