import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up orphan roles (roles with no organization)...\n');

  // Find roles with no organization
  const orphanRoles = await prisma.role.findMany({
    where: { organizationId: null },
    include: {
      _count: { select: { users: true } }
    }
  });

  if (orphanRoles.length === 0) {
    console.log('✅ No orphan roles found!');
    return;
  }

  console.log(`Found ${orphanRoles.length} orphan role(s):\n`);

  for (const role of orphanRoles) {
    console.log(`  - ${role.name} (${role.slug}) | Users: ${role._count.users}`);
  }

  // Check for roles with users
  const rolesWithUsers = orphanRoles.filter(r => r._count.users > 0);

  if (rolesWithUsers.length > 0) {
    console.log('\n⚠️  Some roles have users assigned. Reassigning them first...\n');

    for (const role of rolesWithUsers) {
      // Find users with this role
      const users = await prisma.user.findMany({
        where: { roleId: role.id },
        select: { id: true, organizationId: true, email: true }
      });

      for (const user of users) {
        // Find the equivalent role in the user's organization
        const orgRole = await prisma.role.findFirst({
          where: {
            organizationId: user.organizationId,
            slug: role.slug
          }
        });

        if (orgRole) {
          await prisma.user.update({
            where: { id: user.id },
            data: { roleId: orgRole.id }
          });
          console.log(`  ✅ Reassigned ${user.email} from orphan ${role.slug} to org-specific role`);
        } else {
          console.log(`  ⚠️  Could not find ${role.slug} role for user ${user.email}'s organization`);
        }
      }
    }
  }

  // Delete orphan roles that now have no users
  console.log('\n🗑️  Deleting orphan roles...\n');

  for (const role of orphanRoles) {
    // Re-check user count
    const currentCount = await prisma.user.count({ where: { roleId: role.id } });

    if (currentCount === 0) {
      await prisma.role.delete({ where: { id: role.id } });
      console.log(`  ✅ Deleted: ${role.name} (${role.slug})`);
    } else {
      console.log(`  ⏭️  Skipped: ${role.name} (${role.slug}) - still has ${currentCount} user(s)`);
    }
  }

  console.log('\n✅ Cleanup complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
