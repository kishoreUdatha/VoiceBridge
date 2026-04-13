const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'info@ghanasyamedu.com';

  const user = await prisma.user.findFirst({
    where: { email },
    include: { role: true, organization: true }
  });

  if (user) {
    console.log('User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Role:', user.role?.name || 'N/A');
    console.log('  Organization:', user.organization?.name || 'N/A');
    console.log('  Active:', user.isActive);
  } else {
    console.log('User not found with email:', email);
  }

  await prisma.$disconnect();
}

checkUser().catch(e => { console.error(e); process.exit(1); });
