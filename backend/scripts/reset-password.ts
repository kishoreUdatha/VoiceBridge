import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'telecaller@demo.com';
  const newPassword = 'admin123';

  // Find user first
  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true }
  });

  if (!existingUser) {
    console.log('User not found:', email);
    await prisma.$disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { id: existingUser.id },
    data: { password: hashedPassword },
    select: { email: true, firstName: true, lastName: true }
  });

  console.log('\n✅ Password reset successful!');
  console.log('─'.repeat(40));
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.firstName} ${user.lastName}`);
  console.log(`New Password: ${newPassword}`);
  console.log('─'.repeat(40));

  await prisma.$disconnect();
}

resetPassword().catch(console.error);
