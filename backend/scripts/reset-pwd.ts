import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'kavya@bharatbuil.ai';
  const newPassword = 'Bharatbuild@123';

  const user = await prisma.user.findFirst({
    where: { email },
    include: { organization: { select: { name: true } } }
  });

  if (!user) {
    console.log('User not found:', email);
    return;
  }

  console.log('Resetting password for:', user.email);
  console.log('Organization:', user.organization?.name);

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  console.log('Password reset successfully!');
  console.log('Email:', email);
  console.log('Password:', newPassword);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
