import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all roles
  const roles = await prisma.role.findMany({
    orderBy: [{ organizationId: 'asc' }, { slug: 'asc' }, { createdAt: 'asc' }],
    include: {
      organization: { select: { name: true } },
      _count: { select: { users: true } }
    }
  });

  console.log('\n📋 All roles in database:\n');

  let currentOrg = '';
  for (const role of roles) {
    const orgName = role.organization?.name || 'System (no org)';
    if (orgName !== currentOrg) {
      currentOrg = orgName;
      console.log(`\n🏢 ${orgName} (${role.organizationId || 'null'}):`);
    }
    console.log(`   - ${role.name} (${role.slug}) | Users: ${role._count.users} | ID: ${role.id}`);
  }

  // Find duplicates
  console.log('\n\n🔍 Checking for duplicates...\n');

  const seen = new Map<string, any[]>();
  for (const role of roles) {
    const key = `${role.organizationId}-${role.slug}`;
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(role);
  }

  let hasDuplicates = false;
  for (const [key, dupes] of seen.entries()) {
    if (dupes.length > 1) {
      hasDuplicates = true;
      console.log(`⚠️  Duplicate found: ${key}`);
      for (const d of dupes) {
        console.log(`    - ID: ${d.id}, Name: ${d.name}, Users: ${d._count.users}`);
      }
    }
  }

  if (!hasDuplicates) {
    console.log('✅ No duplicates found!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
