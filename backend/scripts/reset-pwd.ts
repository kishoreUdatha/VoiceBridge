import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPassword() {
  const hashedPassword = await bcrypt.hash('admin123', 12);

  // Find and update users by email
  const result = await prisma.user.updateMany({
    where: { email: { in: ['telecaller@demo.com', 'admin@demo.com', 'manager@demo.com', 'counselor@demo.com', 'fieldsales@demo.com', 'fieldsales2@demo.com', 'fieldsales3@demo.com'] } },
    data: { password: hashedPassword }
  });
  console.log('Passwords reset for', result.count, 'users');
  
  await prisma.$disconnect();
}

resetPassword();
