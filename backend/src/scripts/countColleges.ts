import { prisma } from '../config/database';

async function main() {
  const total = await prisma.college.count();
  console.log('============================================');
  console.log('          COLLEGE DATABASE STATS');
  console.log('============================================');
  console.log(`Total Colleges: ${total}`);

  const byState = await prisma.college.groupBy({
    by: ['state'],
    _count: { state: true },
    orderBy: { _count: { state: 'desc' } }
  });

  console.log('\nBy State (Top 20):');
  for (const s of byState.slice(0, 20)) {
    console.log(`  ${s.state}: ${s._count.state}`);
  }

  const byType = await prisma.college.groupBy({
    by: ['collegeType'],
    _count: { collegeType: true },
    orderBy: { _count: { collegeType: 'desc' } }
  });

  console.log('\nBy Type:');
  for (const t of byType) {
    console.log(`  ${t.collegeType}: ${t._count.collegeType}`);
  }
  console.log('============================================');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
