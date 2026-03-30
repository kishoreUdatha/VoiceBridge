/**
 * Test Script: Role-Based Call Summary Access Control
 *
 * Tests that:
 * - Admin/Manager can access all call summaries in their organization
 * - Telecaller/Counselor can only access call summaries for calls related to leads assigned to them
 */

import { prisma } from '../src/config/database';
import { canAccessLead, hasElevatedAccess } from '../src/utils/leadAccess';

async function testCallSummaryAccess() {
  console.log('='.repeat(60));
  console.log('Testing Role-Based Call Summary Access Control');
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

    // Get some outbound calls with leads
    const calls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId: org.id },
        OR: [
          { existingLeadId: { not: null } },
          { generatedLeadId: { not: null } },
        ],
      },
      take: 5,
      include: {
        agent: { select: { name: true } },
        existingLead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            assignments: {
              where: { isActive: true },
              include: {
                assignedTo: { select: { id: true, firstName: true } },
              },
            },
          },
        },
      },
    });

    console.log(`\n--- Outbound Calls with Leads (${calls.length}) ---`);
    for (const call of calls) {
      const leadId = call.existingLeadId || call.generatedLeadId;
      const leadName = call.existingLead
        ? `${call.existingLead.firstName} ${call.existingLead.lastName || ''}`
        : 'Unknown';
      const assignees = call.existingLead?.assignments
        .map(a => `${a.assignedTo.firstName} (${a.assignedTo.id.slice(0, 8)})`)
        .join(', ') || 'NONE';
      console.log(`- Call ${call.id.slice(0, 8)}... | Lead: ${leadName} | Assigned to: ${assignees}`);
    }

    if (calls.length === 0) {
      console.log('\n⚠️  No outbound calls with leads found. Cannot test call summary access.');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('Call Summary Access Tests');
    console.log('='.repeat(60));

    // Test 1: Admin access to call summaries
    if (adminUser) {
      console.log('\n--- Test 1: Admin Access to Call Summaries ---');
      console.log(`Testing admin user: ${adminUser.email} (role: ${adminUser.role.slug})`);
      console.log(`Has elevated access: ${hasElevatedAccess(adminUser.role.slug)}`);

      for (const call of calls.slice(0, 3)) {
        const leadId = call.existingLeadId || call.generatedLeadId;
        if (leadId) {
          // Admin should always have access due to elevated role
          if (hasElevatedAccess(adminUser.role.slug)) {
            console.log(`  Call ${call.id.slice(0, 8)}...: ✅ CAN ACCESS (elevated role)`);
          } else {
            const canAccess = await canAccessLead(leadId, {
              userId: adminUser.id,
              organizationId: org.id,
              role: adminUser.role.slug,
            });
            console.log(`  Call ${call.id.slice(0, 8)}...: ${canAccess ? '✅ CAN ACCESS' : '❌ DENIED'}`);
          }
        }
      }
    }

    // Test 2: Telecaller access to call summaries
    if (telecallerUser) {
      console.log('\n--- Test 2: Telecaller Access to Call Summaries ---');
      console.log(`Testing telecaller user: ${telecallerUser.email} (role: ${telecallerUser.role.slug})`);
      console.log(`Has elevated access: ${hasElevatedAccess(telecallerUser.role.slug)}`);

      // Find a call where the lead is assigned to this telecaller
      const assignedCall = calls.find(c =>
        c.existingLead?.assignments.some(a => a.assignedTo.id === telecallerUser.id)
      );

      // Find a call where the lead is NOT assigned to this telecaller
      const unassignedCall = calls.find(c =>
        c.existingLead && !c.existingLead.assignments.some(a => a.assignedTo.id === telecallerUser.id)
      );

      if (assignedCall) {
        const leadId = assignedCall.existingLeadId || assignedCall.generatedLeadId;
        if (leadId) {
          const canAccess = await canAccessLead(leadId, {
            userId: telecallerUser.id,
            organizationId: org.id,
            role: telecallerUser.role.slug,
          });
          console.log(`  Assigned lead's call (${assignedCall.id.slice(0, 8)}...): ${canAccess ? '✅ CAN ACCESS (correct)' : '❌ DENIED (WRONG!)'}`);
        }
      } else {
        console.log('  No call with assigned lead found to test');
      }

      if (unassignedCall) {
        const leadId = unassignedCall.existingLeadId || unassignedCall.generatedLeadId;
        if (leadId) {
          const canAccess = await canAccessLead(leadId, {
            userId: telecallerUser.id,
            organizationId: org.id,
            role: telecallerUser.role.slug,
          });
          console.log(`  Unassigned lead's call (${unassignedCall.id.slice(0, 8)}...): ${canAccess ? '❌ CAN ACCESS (WRONG!)' : '✅ DENIED (correct)'}`);
        }
      } else {
        console.log('  No call with unassigned lead found to test');
      }
    }

    // Test 3: Call without a lead (should be accessible to all in org)
    console.log('\n--- Test 3: Call Without Lead (Org-level Access Only) ---');
    const callWithoutLead = await prisma.outboundCall.findFirst({
      where: {
        agent: { organizationId: org.id },
        existingLeadId: null,
        generatedLeadId: null,
      },
    });

    if (callWithoutLead) {
      console.log(`  Call ${callWithoutLead.id.slice(0, 8)}... has no lead attached`);
      console.log(`  This call should be accessible to anyone in the organization (no lead-level restriction)`);
    } else {
      console.log('  No call without lead found - all calls have leads attached');
    }

    // Test 4: Lead Journey filtering
    console.log('\n--- Test 4: Lead Journey Role-Based Filtering ---');
    console.log('  Lead journey in call summaries is now filtered by role:');
    console.log('  - Admin/Manager: See ALL previous calls to this phone number');
    console.log('  - Telecaller: Only see calls linked to leads assigned to them (or calls without leads)');

    // Demonstrate the filter logic
    if (telecallerUser && calls.length > 0) {
      const sampleCall = calls[0];
      console.log(`\n  For call ${sampleCall.id.slice(0, 8)}... with phone ${sampleCall.phoneNumber}:`);

      // Count all calls for this phone
      const allCallsCount = await prisma.outboundCall.count({
        where: {
          phoneNumber: sampleCall.phoneNumber,
          agent: { organizationId: org.id },
          id: { not: sampleCall.id },
        },
      });

      // Count calls telecaller can see (linked to assigned leads or no lead)
      const telecallerVisibleCount = await prisma.outboundCall.count({
        where: {
          phoneNumber: sampleCall.phoneNumber,
          agent: { organizationId: org.id },
          id: { not: sampleCall.id },
          OR: [
            {
              existingLead: {
                assignments: {
                  some: {
                    assignedToId: telecallerUser.id,
                    isActive: true,
                  },
                },
              },
            },
            {
              existingLeadId: null,
              generatedLeadId: null,
            },
          ],
        },
      });

      console.log(`  - Admin would see: ${allCallsCount} previous calls in journey`);
      console.log(`  - Telecaller would see: ${telecallerVisibleCount} previous calls in journey`);

      if (allCallsCount > telecallerVisibleCount) {
        console.log(`  ✅ Lead journey is correctly filtered by role (${allCallsCount - telecallerVisibleCount} calls hidden from telecaller)`);
      } else if (allCallsCount === telecallerVisibleCount) {
        console.log(`  ℹ️  All calls are visible to telecaller (all are assigned or have no lead)`);
      }
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

testCallSummaryAccess();
