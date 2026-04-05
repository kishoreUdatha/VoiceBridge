import { prisma } from '../config/database';

async function main() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { role: true, organization: true },
    take: 15
  });

  console.log('\n============================================');
  console.log('        AVAILABLE LOGIN USERS');
  console.log('============================================\n');

  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email}`);
    console.log(`   Name: ${u.firstName} ${u.lastName}`);
    console.log(`   Role: ${u.role?.name || 'N/A'}`);
    console.log(`   Organization: ${u.organization?.name || 'N/A'}`);
    console.log('');
  });

  console.log('============================================');
  console.log('  Default Password: Check your seed file');
  console.log('  Usually: password123 or admin123');
  console.log('============================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
