/**
 * Test Script: Role-Based Lead Access Control
 *
 * Tests that:
 * - Admin/Manager can access all leads in their organization
 * - Telecaller/Counselor can only access leads assigned to them
 */

import { prisma } from '../src/config/database';

async function testRoleBasedAccess() {
  console.log('='.repeat(60));
  console.log('Testing Role-Based Lead Access Control');
  console.log('='.repeat(60));

  try {
    // Get an organization
    const org = await prisma.organization.findFirst({
      where: { isActive: true },
    });

    if (!org) {
      console.log('No organization found. Please create one first.');
      return;
    }

    console.log(`\nOrganization: ${org.name} (${org.id})`);

    // Get users by role
    const adminUser = await prisma.user.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
        role: { slug: 'admin' },
      },
      include: { role: true },
    });

    const telecallerUser = await prisma.user.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
        role: { slug: 'telecaller' },
      },
      include: { role: true },
    });

    console.log('\n--- Users Found ---');
    console.log(`Admin: ${adminUser ? `${adminUser.firstName} ${adminUser.lastName} (${adminUser.role.slug})` : 'NOT FOUND'}`);
    console.log(`Telecaller: ${telecallerUser ? `${telecallerUser.firstName} ${telecallerUser.lastName} (${telecallerUser.role.slug})` : 'NOT FOUND'}`);

    // Get some leads
    const leads = await prisma.lead.findMany({
      where: { organizationId: org.id },
      take: 5,
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    console.log(`\n--- Leads in Organization (${leads.length}) ---`);
    for (const lead of leads) {
      const assignees = lead.assignments.map(a => `${a.assignedTo.firstName} (${a.assignedTo.id.slice(0, 8)})`).join(', ');
      console.log(`- ${lead.firstName} ${lead.lastName || ''} (${lead.id.slice(0, 8)}...) - Assigned to: ${assignees || 'NONE'}`);
    }

    if (!telecallerUser) {
      console.log('\n⚠️  No telecaller user found. Creating one for testing...');

      // Find telecaller role
      let telecallerRole = await prisma.role.findFirst({
        where: { organizationId: org.id, slug: 'telecaller' },
      });

      if (!telecallerRole) {
        telecallerRole = await prisma.role.create({
          data: {
            organizationId: org.id,
            name: 'Telecaller',
            slug: 'telecaller',
            permissions: ['leads:read', 'leads:update'],
          },
        });
      }

      // Create telecaller user
      const newTelecaller = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: `telecaller-test-${Date.now()}@example.com`,
          password: '$2b$10$test', // dummy hash
          firstName: 'Test',
          lastName: 'Telecaller',
          roleId: telecallerRole.id,
          isActive: true,
        },
        include: { role: true },
      });

      console.log(`Created test telecaller: ${newTelecaller.email}`);
    }

    // Import the canAccessLead function
    const { canAccessLead, hasElevatedAccess } = await import('../src/utils/leadAccess');

    console.log('\n' + '='.repeat(60));
    console.log('Access Control Tests');
    console.log('='.repeat(60));

    // Test 1: Admin access
    if (adminUser && leads.length > 0) {
      console.log('\n--- Test 1: Admin Access ---');
      console.log(`Testing admin user: ${adminUser.email} (role: ${adminUser.role.slug})`);
      console.log(`Has elevated access: ${hasElevatedAccess(adminUser.role.slug)}`);

      for (const lead of leads.slice(0, 3)) {
        const canAccess = await canAccessLead(lead.id, {
          userId: adminUser.id,
          organizationId: org.id,
          role: adminUser.role.slug,
        });
        console.log(`  Lead ${lead.firstName}: ${canAccess ? '✅ CAN ACCESS' : '❌ DENIED'}`);
      }
    }

    // Test 2: Telecaller access
    const testTelecaller = telecallerUser || await prisma.user.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
        role: { slug: 'telecaller' },
      },
      include: { role: true },
    });

    if (testTelecaller && leads.length > 0) {
      console.log('\n--- Test 2: Telecaller Access ---');
      console.log(`Testing telecaller user: ${testTelecaller.email} (role: ${testTelecaller.role.slug})`);
      console.log(`Has elevated access: ${hasElevatedAccess(testTelecaller.role.slug)}`);

      // Find a lead assigned to this telecaller
      const assignedLead = leads.find(l =>
        l.assignments.some(a => a.assignedTo.id === testTelecaller.id)
      );

      // Find a lead NOT assigned to this telecaller
      const unassignedLead = leads.find(l =>
        !l.assignments.some(a => a.assignedTo.id === testTelecaller.id)
      );

      if (assignedLead) {
        const canAccess = await canAccessLead(assignedLead.id, {
          userId: testTelecaller.id,
          organizationId: org.id,
          role: testTelecaller.role.slug,
        });
        console.log(`  Assigned lead (${assignedLead.firstName}): ${canAccess ? '✅ CAN ACCESS (correct)' : '❌ DENIED (WRONG!)'}`);
      } else {
        console.log('  No assigned lead found to test');

        // Assign first lead to telecaller for testing
        if (leads[0]) {
          console.log(`  Assigning lead ${leads[0].firstName} to telecaller...`);
          await prisma.leadAssignment.create({
            data: {
              leadId: leads[0].id,
              assignedToId: testTelecaller.id,
              isActive: true,
            },
          });

          const canAccessAfter = await canAccessLead(leads[0].id, {
            userId: testTelecaller.id,
            organizationId: org.id,
            role: testTelecaller.role.slug,
          });
          console.log(`  After assignment (${leads[0].firstName}): ${canAccessAfter ? '✅ CAN ACCESS (correct)' : '❌ DENIED (WRONG!)'}`);
        }
      }

      // Find an unassigned lead (one NOT assigned to this telecaller)
      // Use a different lead than the one we may have just assigned
      const unassignedLeadForTest = leads.find(l =>
        l.id !== leads[0]?.id && // Not the first lead (which we may have assigned)
        !l.assignments.some(a => a.assignedTo.id === testTelecaller.id)
      );

      if (unassignedLeadForTest) {
        const canAccess = await canAccessLead(unassignedLeadForTest.id, {
          userId: testTelecaller.id,
          organizationId: org.id,
          role: testTelecaller.role.slug,
        });
        console.log(`  Unassigned lead (${unassignedLeadForTest.firstName}): ${canAccess ? '❌ CAN ACCESS (WRONG!)' : '✅ DENIED (correct)'}`);
      } else {
        console.log('  No unassigned lead found to test (all leads may be assigned to this user)');
      }
    }

    // Test 3: Non-existent lead
    console.log('\n--- Test 3: Non-existent Lead ---');
    if (adminUser) {
      const fakeLeadId = '00000000-0000-0000-0000-000000000000';
      const canAccess = await canAccessLead(fakeLeadId, {
        userId: adminUser.id,
        organizationId: org.id,
        role: adminUser.role.slug,
      });
      console.log(`  Fake lead ID: ${canAccess ? '❌ CAN ACCESS (WRONG!)' : '✅ DENIED (correct)'}`);
    }

    // Test 4: Lead from different organization
    console.log('\n--- Test 4: Cross-Organization Access ---');
    const otherOrgLead = await prisma.lead.findFirst({
      where: {
        organizationId: { not: org.id },
      },
    });

    if (otherOrgLead && adminUser) {
      const canAccess = await canAccessLead(otherOrgLead.id, {
        userId: adminUser.id,
        organizationId: org.id,
        role: adminUser.role.slug,
      });
      console.log(`  Lead from other org: ${canAccess ? '❌ CAN ACCESS (WRONG!)' : '✅ DENIED (correct)'}`);
    } else {
      console.log('  No lead from other organization to test');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Tests Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRoleBasedAccess();
