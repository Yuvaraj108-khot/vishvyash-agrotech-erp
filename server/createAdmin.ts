import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@vishvyash.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@vishvyash.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
      phone: '+91 9876543210',
    },
  });
  console.log('Admin user created successfully');
}

main().finally(() => prisma.$disconnect());
