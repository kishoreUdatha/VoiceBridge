/**
 * Show all users created by the E2E test
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showUsers() {
  const org = await prisma.organization.findFirst({
    where: { email: 'admin@smartedu.com' }
  });

  if (!org) {
    console.log('Test organization not found. Run test-comprehensive-e2e.ts first.');
    return;
  }

  const users = await prisma.user.findMany({
    where: { organizationId: org.id },
    include: {
      role: { select: { name: true, slug: true } },
      branch: { select: { id: true, name: true, code: true } },
      manager: { select: { firstName: true, lastName: true, email: true } }
    },
    orderBy: [
      { createdAt: 'asc' }
    ]
  });

  console.log('\n' + '='.repeat(130));
  console.log('                                    USER DETAILS - SmartEdu Academy');
  console.log('='.repeat(130));
  console.log(`\n📊 TOTAL USERS CREATED: ${users.length}\n`);
  console.log('='.repeat(130));

  // Table header
  console.log('');
  console.log('+----+------------------------+-----------------------------------+----------------+---------------------+---------------------+--------------+');
  console.log('| #  | Name                   | Email                             | Role           | Branch              | Reports To          | Phone        |');
  console.log('+----+------------------------+-----------------------------------+----------------+---------------------+---------------------+--------------+');

  users.forEach((user, index) => {
    const num = String(index + 1).padStart(2);
    const name = `${user.firstName} ${user.lastName}`.padEnd(22);
    const email = user.email.padEnd(33);
    const role = (user.role?.name || 'N/A').padEnd(14);
    const branch = (user.branch?.name || 'All Branches').padEnd(19);
    const manager = user.manager
      ? `${user.manager.firstName} ${user.manager.lastName}`.padEnd(19)
      : '-'.padEnd(19);
    const phone = (user.phone || '-').padEnd(12);

    console.log(`| ${num} | ${name} | ${email} | ${role} | ${branch} | ${manager} | ${phone} |`);
  });

  console.log('+----+------------------------+-----------------------------------+----------------+---------------------+---------------------+--------------+');

  // Summary by role
  console.log('\n' + '='.repeat(130));
  console.log('\n👥 USERS BY ROLE:\n');

  const roleGroups: Record<string, typeof users> = {};
  users.forEach(u => {
    const roleName = u.role?.name || 'Unknown';
    if (!roleGroups[roleName]) roleGroups[roleName] = [];
    roleGroups[roleName].push(u);
  });

  for (const [role, roleUsers] of Object.entries(roleGroups)) {
    console.log(`   ${role} (${roleUsers.length}):`);
    roleUsers.forEach(u => {
      const branchInfo = u.branch ? `[${u.branch.code}]` : '[Global]';
      console.log(`      • ${u.firstName} ${u.lastName} ${branchInfo} - ${u.email}`);
    });
    console.log('');
  }

  // Summary by branch
  console.log('='.repeat(130));
  console.log('\n📍 USERS BY BRANCH:\n');

  const branchGroups: Record<string, typeof users> = {};
  users.forEach(u => {
    const branchName = u.branch?.name || 'Global (No Branch)';
    if (!branchGroups[branchName]) branchGroups[branchName] = [];
    branchGroups[branchName].push(u);
  });

  for (const [branch, branchUsers] of Object.entries(branchGroups)) {
    console.log(`   📍 ${branch} (${branchUsers.length} users):`);
    branchUsers.forEach(u => {
      const roleInfo = u.role?.name || 'Unknown';
      const managerInfo = u.manager ? ` → Reports to: ${u.manager.firstName} ${u.manager.lastName}` : '';
      console.log(`      • [${roleInfo}] ${u.firstName} ${u.lastName}${managerInfo}`);
    });
    console.log('');
  }

  // Hierarchy visualization
  console.log('='.repeat(130));
  console.log('\n🏢 ORGANIZATION HIERARCHY:\n');

  // Find super admin
  const admin = users.find(u => u.role?.slug === 'admin');
  if (admin) {
    console.log(`   👑 ${admin.firstName} ${admin.lastName} (Super Admin) - ${admin.email}`);
    console.log('      │');
  }

  // For each branch
  const branches = await prisma.branch.findMany({
    where: { organizationId: org.id },
    orderBy: { code: 'asc' }
  });

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const isLast = i === branches.length - 1;
    const prefix = isLast ? '      └── ' : '      ├── ';
    const childPrefix = isLast ? '          ' : '      │   ';

    console.log(`${prefix}📍 ${branch.name} (${branch.code})${branch.isHeadquarters ? ' [HQ]' : ''}`);

    // Find branch manager
    const branchManager = users.find(u => u.branch?.id === branch.id && u.role?.slug === 'manager');
    if (branchManager) {
      console.log(`${childPrefix}├── 👔 ${branchManager.firstName} ${branchManager.lastName} (Branch Manager)`);

      // Find team lead under manager
      const teamLead = users.find(u => u.branch?.id === branch.id && u.role?.slug === 'team_lead');
      if (teamLead) {
        console.log(`${childPrefix}│   ├── 📋 ${teamLead.firstName} ${teamLead.lastName} (Team Lead)`);

        // Find telecallers under team lead
        const telecallers = users.filter(u => u.branch?.id === branch.id && u.role?.slug === 'telecaller');
        telecallers.forEach((tc, idx) => {
          const tcPrefix = idx === telecallers.length - 1 ? '└── ' : '├── ';
          console.log(`${childPrefix}│   │   ${tcPrefix}📞 ${tc.firstName} ${tc.lastName} (Telecaller)`);
        });
      }

      // Find counselor under manager
      const counselor = users.find(u => u.branch?.id === branch.id && u.role?.slug === 'counselor');
      if (counselor) {
        console.log(`${childPrefix}│   └── 🎓 ${counselor.firstName} ${counselor.lastName} (Counselor)`);
      }
    }
    console.log(`${childPrefix}`);
  }

  // Login credentials
  console.log('='.repeat(130));
  console.log('\n🔐 LOGIN CREDENTIALS:\n');
  console.log('   Password for ALL users: Test@123!');
  console.log('\n   Sample logins:');
  console.log('   • Admin:      admin@smartedu.com');
  console.log('   • Manager:    manager.hyd@smartedu.com');
  console.log('   • Team Lead:  teamlead.hyd@smartedu.com');
  console.log('   • Telecaller: telecaller1.hyd@smartedu.com');
  console.log('   • Counselor:  counselor.hyd@smartedu.com');
  console.log('\n' + '='.repeat(130) + '\n');

  await prisma.$disconnect();
}

showUsers();
