import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPassword() {
  const hashedPassword = await bcrypt.hash('admin123', 12);

  // First check if user exists
  const user = await prisma.user.findFirst({
    where: { email: 'kishore.udatha@smartgrowinfotech.com' },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true, role: { select: { name: true } }, organization: { select: { name: true, isActive: true } } }
  });

  if (user) {
    console.log('User found:');
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Email:', user.email);
    console.log('  Active:', user.isActive);
    console.log('  Role:', user.role?.name);
    console.log('  Organization:', user.organization?.name, '- Active:', user.organization?.isActive);

    // Reset password for this user
    const updateResult = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, isActive: true }
    });
    console.log('Password reset to: admin123');
  } else {
    console.log('User NOT FOUND: kishore.udatha@smartgrowinfotech.com');
  }

  // Also reset demo users
  const result = await prisma.user.updateMany({
    where: { email: { in: ['superadmin@demo.com', 'telecaller@demo.com', 'admin@demo.com', 'manager@demo.com', 'counselor@demo.com', 'fieldsales@demo.com', 'fieldsales2@demo.com', 'fieldsales3@demo.com'] } },
    data: { password: hashedPassword }
  });
  console.log('Demo passwords reset for', result.count, 'users');

  await prisma.$disconnect();
}

resetPassword();
