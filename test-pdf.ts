import { generateInvoicePDF } from './server/src/utils/pdfGenerator';
generateInvoicePDF({
  invoiceNumber: 'VAE/INV/001',
  invoiceDate: '29/05/2026',
  transportType: 'Truck',
  vehicleNumber: 'MH11M6966',
  buyerName: 'SHRI DUTT INDIA PVT. LTD.',
  buyerAddress: 'Sadashivnagar, Nipani - Devagadh State\nHighway No. 116, Hamidwada\nTal. Kagal 416235 Kolhapur',
  buyerGst: '27AARCS9172P1Z5',
  buyerCin: 'U15100WB2012PTC184651',
  buyerState: 'Maharashtra',
  buyerStateCode: '27',
  templateType: 'A',
  items: [
    { description: 'Biomass Briquettes', hsnCode: '4401', quantity: 13.410, ratePerTon: 6000.00, amount: 80460.00, transportRate: 0, transportAmount: 0 }
  ],
  subtotal: 80460.00,
  transportTotal: 0,
  taxableAmount: 80460.00,
  cgstRate: 2.5,
  sgstRate: 2.5,
  cgstAmount: 2011.50,
  sgstAmount: 2011.50,
  igstRate: 0,
  igstAmount: 0,
  grandTotal: 84483.00,
  amountInWords: 'Eighty Four Thousand Four Hundred Eighty Three Rupees Only'
}).then(console.log).catch(console.error);
