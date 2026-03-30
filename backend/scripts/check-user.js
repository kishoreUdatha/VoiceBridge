const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const email = 'smartgrowoxrich5@gmail.com';
    const password = 'Smartgrow@123';

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: email },
      include: {
        organization: true,
        role: true
      }
    });

    if (!user) {
      console.log('User NOT FOUND with email:', email);

      // List all users to help debug
      const allUsers = await prisma.user.findMany({
        select: { email: true, firstName: true, lastName: true },
        take: 10
      });
      console.log('\nExisting users (first 10):');
      allUsers.forEach(u => console.log('  -', u.email));
      return;
    }

    console.log('=== User Found ===');
    console.log('Email:', user.email);
    console.log('Name:', user.firstName, user.lastName);
    console.log('Role:', user.role?.name);
    console.log('Organization:', user.organization?.name);
    console.log('Is Active:', user.isActive);
    console.log('Password hash:', user.password.substring(0, 20) + '...');

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('\nPassword verification:', isValidPassword ? 'VALID' : 'INVALID');

    if (!isValidPassword) {
      // Reset password
      console.log('\nResetting password to:', password);
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log('Password reset successfully!');
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
