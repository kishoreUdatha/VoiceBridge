import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stats = await prisma.rawImportRecord.groupBy({
    by: ['status', 'organizationId'],
    _count: true
  });

  console.log('Records by status and organization:');
  stats.forEach(s => {
    console.log(`  Org: ${s.organizationId.slice(0,8)}... | Status: ${s.status} | Count: ${s._count}`);
  });

  const total = await prisma.rawImportRecord.count();
  console.log('\nTotal records:', total);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
