import { prisma } from '../config/database';

async function main() {
  // Get colleges with district info (complete data)
  const colleges = await prisma.college.findMany({
    where: {
      district: { not: '' }
    },
    take: 20,
    select: {
      name: true,
      collegeType: true,
      state: true,
      district: true,
      city: true,
      address: true,
      pincode: true,
      phone: true,
      email: true,
      website: true
    }
  });

  console.log('\n============================================');
  console.log('      COLLEGES WITH FULL DATA (Sample 20)');
  console.log('============================================\n');

  colleges.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
    console.log(`   Location: ${c.city}, ${c.district}, ${c.state}`);
    console.log(`   Type: ${c.collegeType}`);
    if (c.address) console.log(`   Address: ${c.address}`);
    if (c.pincode) console.log(`   Pincode: ${c.pincode}`);
    if (c.phone) console.log(`   Phone: ${c.phone}`);
    if (c.email) console.log(`   Email: ${c.email}`);
    if (c.website) console.log(`   Website: ${c.website}`);
    console.log('');
  });

  // Count by state
  const byState = await prisma.college.groupBy({
    by: ['state'],
    _count: { state: true },
    orderBy: { _count: { state: 'desc' } },
    take: 10
  });

  console.log('============================================');
  console.log('      TOP 10 STATES');
  console.log('============================================');
  byState.forEach(s => {
    console.log(`  ${s.state}: ${s._count.state} colleges`);
  });

  const total = await prisma.college.count();
  console.log(`\n  TOTAL: ${total} colleges`);
  console.log('============================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
