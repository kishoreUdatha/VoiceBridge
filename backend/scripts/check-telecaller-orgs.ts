import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const calls = await prisma.telecallerCall.groupBy({
    by: ['telecallerId', 'organizationId'],
    _count: { id: true },
  });
  console.log('Calls grouped by telecaller and org:');
  for (const c of calls) {
    const user = await prisma.user.findUnique({ 
      where: { id: c.telecallerId }, 
      select: { firstName: true, lastName: true, organizationId: true } 
    });
    console.log('  Telecaller:', user?.firstName, user?.lastName);
    console.log('    User Org:', user?.organizationId?.slice(0,8));
    console.log('    Call Org:', c.organizationId?.slice(0,8));
    console.log('    Calls:', c._count.id);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
