import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { items: true }
  });

  console.log("LAST 5 INVOICES:");
  invoices.forEach(inv => {
    console.log(`ID: ${inv.id}`);
    console.log(`Invoice Number: ${inv.invoiceNumber}`);
    console.log(`Template Type: ${inv.templateType}`);
    console.log(`Buyer: ${inv.buyerName}`);
    console.log(`Consignee: ${inv.consigneeName}`);
    console.log(`Items:`, inv.items.map(i => i.description));
    console.log("---------------------------------------");
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
