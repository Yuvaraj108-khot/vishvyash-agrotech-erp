import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:', users.map(u => ({ email: u.email, role: u.role })));
}
main().finally(() => prisma.$disconnect());
