import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';

async function resetPasswords() {
  try {
    // Hash the password
    const password = 'Demo@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update all users with the new password
    const result = await prisma.user.updateMany({
      where: { isActive: true },
      data: { password: hashedPassword }
    });

    console.log('✅ Reset passwords for ' + result.count + ' users');
    console.log('');
    console.log('========================================');
    console.log('NEW PASSWORD FOR ALL ACCOUNTS: Demo@123');
    console.log('========================================');
    console.log('');
    console.log('Test accounts:');
    console.log('  Admin:      admin@demo.com / Demo@123');
    console.log('  Manager:    manager@demo.com / Demo@123');
    console.log('  Telecaller: telecaller2@demo.com / Demo@123');
    console.log('  Counselor:  counselor@demo.com / Demo@123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPasswords();
