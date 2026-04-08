import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const searchTerm = process.argv[2] || 'kavya';

  console.log(`\nSearching for users with "${searchTerm}"...\n`);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
      ]
    },
    include: {
      organization: { select: { name: true } },
      role: { select: { name: true, slug: true } }
    }
  });

  if (users.length === 0) {
    console.log('No users found!');

    // Show all users in bharathbuild.ai
    console.log('\nAll users in bharathbuild.ai organization:\n');
    const bharathUsers = await prisma.user.findMany({
      where: {
        organization: { name: { contains: 'bharath', mode: 'insensitive' } }
      },
      include: {
        organization: { select: { name: true } },
        role: { select: { name: true, slug: true } }
      }
    });

    bharathUsers.forEach(u => {
      console.log(`- ${u.email} | ${u.role?.name} | Active: ${u.isActive}`);
    });
  } else {
    console.log(`Found ${users.length} user(s):\n`);
    users.forEach(u => {
      console.log(`Email: ${u.email}`);
      console.log(`Name: ${u.firstName} ${u.lastName}`);
      console.log(`Org: ${u.organization?.name}`);
      console.log(`Role: ${u.role?.name} (${u.role?.slug})`);
      console.log(`Active: ${u.isActive}`);
      console.log('');
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
