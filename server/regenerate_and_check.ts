import { PrismaClient } from '@prisma/client';
import { generateInvoicePDF } from './src/utils/pdfGenerator';
import { formatDate } from './src/utils/helpers';
import fs from 'fs';

const prisma = new PrismaClient();

function extractPdfText(pdfPath: string): string {
  const buffer = fs.readFileSync(pdfPath);
  const pdfStr = buffer.toString('ascii');
  const matches: string[] = [];
  const tjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(pdfStr)) !== null) {
    matches.push(Buffer.from(match[1], 'hex').toString('ascii'));
  }
  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(pdfStr)) !== null) {
    const arrayContent = match[1];
    const hexRegex = /<([0-9a-fA-F]+)>/g;
    let hexMatch;
    let decodedWord = '';
    while ((hexMatch = hexRegex.exec(arrayContent)) !== null) {
      decodedWord += Buffer.from(hexMatch[1], 'hex').toString('ascii');
    }
    matches.push(decodedWord);
  }
  return matches.join('\n');
}

async function main() {
  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: 'VAE/26-27/0003' },
    include: { items: true, vehicle: true }
  });

  if (!invoice) {
    console.error("Invoice VAE/26-27/0003 not found in database.");
    return;
  }

  console.log("Found invoice in database:", invoice.invoiceNumber);
  console.log("Saved templateType:", invoice.templateType);
  console.log("Consignee Name:", invoice.consigneeName);

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

  console.log("Regenerated PDF to:", pdfPath);
  const text = extractPdfText(pdfPath);
  console.log("Contains 'Consignee (Ship To)':", text.includes('Consignee (Ship To)'));
  console.log("Contains Consignee name:", text.includes(invoice.consigneeName || ''));
}

main().catch(console.error).finally(() => prisma.$disconnect());
