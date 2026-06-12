import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkLogin() {
  const users = await prisma.user.findMany();
  console.log('All users in DB:', users.map(u => ({ email: u.email, role: u.role, isActive: u.isActive })));

  const email = '4045yashmule@gmail.com';
  const password = '123456';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }
  
  console.log(`User ${email} found. IsActive: ${user.isActive}`);
  const isValid = await bcrypt.compare(password, user.password);
  console.log(`Password is valid: ${isValid}`);
}

checkLogin().finally(() => prisma.$disconnect());
