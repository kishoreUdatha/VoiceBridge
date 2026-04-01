import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'fieldsales@demo.com' },
    include: {
      organization: { select: { name: true, isActive: true } },
      role: { select: { name: true, slug: true } }
    }
  });

  if (!user) {
    console.log('❌ User NOT FOUND: fieldsales@demo.com');
  } else {
    console.log('✅ User found:', user.email);
    console.log('   Name:', user.firstName, user.lastName);
    console.log('   Active:', user.isActive);
    console.log('   Role:', user.role?.name, '(' + user.role?.slug + ')');
    console.log('   Org:', user.organization?.name, '- Active:', user.organization?.isActive);
  }

  await prisma.$disconnect();
}

check();
