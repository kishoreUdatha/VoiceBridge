/**
 * Show COMPLETE test data - Leads, Activities, Assignments, Payments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showCompleteData() {
  const org = await prisma.organization.findFirst({
    where: { email: 'admin@smartedu.com' }
  });

  if (!org) {
    console.log('Test organization not found. Run test-comprehensive-e2e.ts first.');
    return;
  }

  console.log('\n' + '='.repeat(140));
  console.log('                                    COMPLETE E2E TEST DATA - SmartEdu Academy');
  console.log('='.repeat(140));

  // ==================== LEADS ====================
  console.log('\n' + '━'.repeat(140));
  console.log('📋 LEADS DATA');
  console.log('━'.repeat(140));

  const leads = await prisma.lead.findMany({
    where: { organizationId: org.id },
    include: {
      stage: { select: { name: true, slug: true } },
      orgBranch: { select: { name: true, code: true } },
      assignments: {
        include: {
          assignedTo: { select: { firstName: true, lastName: true, role: { select: { name: true } } } },
          assignedBy: { select: { firstName: true, lastName: true } }
        },
        orderBy: { assignedAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\nTotal Leads: ${leads.length}\n`);

  for (const lead of leads) {
    const statusIcon = lead.isConverted ? '✅' : lead.admissionStatus === 'DROPPED' ? '❌' : '🔄';
    console.log(`${statusIcon} LEAD: ${lead.firstName} ${lead.lastName}`);
    console.log(`   ├── ID: ${lead.id}`);
    console.log(`   ├── Phone: ${lead.phone} | Email: ${lead.email}`);
    console.log(`   ├── Branch: ${lead.orgBranch?.name || 'N/A'} (${lead.orgBranch?.code || 'N/A'})`);
    console.log(`   ├── Source: ${lead.source}`);
    console.log(`   ├── Stage: ${lead.stage?.name || 'N/A'}`);
    console.log(`   ├── Admission Status: ${lead.admissionStatus}`);
    console.log(`   ├── Total Calls: ${lead.totalCalls}`);
    console.log(`   ├── Fee: ₹${lead.totalFees || 0} | Paid: ₹${lead.paidAmount || 0}`);
    console.log(`   ├── Converted: ${lead.isConverted ? 'YES' : 'NO'}`);

    // Current assignment
    const currentAssignment = lead.assignments.find(a => a.isActive);
    if (currentAssignment) {
      console.log(`   ├── Currently Assigned To: ${currentAssignment.assignedTo.firstName} ${currentAssignment.assignedTo.lastName} (${currentAssignment.assignedTo.role?.name})`);
    }

    // Assignment history
    if (lead.assignments.length > 0) {
      console.log(`   └── Assignment History (${lead.assignments.length} assignments):`);
      lead.assignments.forEach((assignment, idx) => {
        const prefix = idx === lead.assignments.length - 1 ? '       └──' : '       ├──';
        const status = assignment.isActive ? '[ACTIVE]' : '[PAST]';
        const assignedBy = assignment.assignedBy ? `by ${assignment.assignedBy.firstName}` : 'by System';
        console.log(`${prefix} ${status} ${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName} (${assignment.assignedTo.role?.name}) - ${assignedBy}`);
      });
    }
    console.log('');
  }

  // ==================== ACTIVITIES ====================
  console.log('\n' + '━'.repeat(140));
  console.log('📞 LEAD ACTIVITIES (Who Did What & When)');
  console.log('━'.repeat(140));

  for (const lead of leads) {
    const activities = await prisma.leadActivity.findMany({
      where: { leadId: lead.id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
            branch: { select: { code: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (activities.length === 0) continue;

    const statusIcon = lead.isConverted ? '✅' : lead.admissionStatus === 'DROPPED' ? '❌' : '🔄';
    console.log(`\n${statusIcon} ${lead.firstName} ${lead.lastName} - ${activities.length} activities:`);
    console.log('   ' + '-'.repeat(130));

    activities.forEach((activity, idx) => {
      const time = activity.createdAt.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      const userName = activity.user
        ? `${activity.user.firstName} ${activity.user.lastName} [${activity.user.role?.name || 'N/A'}]`
        : 'System';

      const typeEmoji: Record<string, string> = {
        'LEAD_CREATED': '🆕',
        'CALL_MADE': '📞',
        'STAGE_CHANGED': '📊',
        'ASSIGNMENT_CHANGED': '👤',
        'NOTE_ADDED': '📝',
        'DOCUMENT_UPLOADED': '📎',
        'FOLLOWUP_SCHEDULED': '📅',
        'FOLLOWUP_COMPLETED': '✅',
      };

      const emoji = typeEmoji[activity.type] || '•';
      const prefix = idx === activities.length - 1 ? '   └──' : '   ├──';

      console.log(`${prefix} ${emoji} [${time}] ${userName.padEnd(35)} | ${activity.type}`);
      console.log(`   │      Title: ${activity.title}`);
      if (activity.description) {
        console.log(`   │      Details: ${activity.description.substring(0, 100)}${activity.description.length > 100 ? '...' : ''}`);
      }
      if (activity.metadata && Object.keys(activity.metadata as object).length > 0) {
        const meta = activity.metadata as Record<string, any>;
        const metaStr = Object.entries(meta)
          .filter(([k, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        if (metaStr) {
          console.log(`   │      Metadata: ${metaStr.substring(0, 100)}`);
        }
      }
    });
  }

  // ==================== NOTES ====================
  console.log('\n' + '━'.repeat(140));
  console.log('📝 LEAD NOTES (Telecaller/Counselor Notes)');
  console.log('━'.repeat(140));

  const notes = await prisma.leadNote.findMany({
    where: { lead: { organizationId: org.id } },
    include: {
      lead: { select: { firstName: true, lastName: true } },
      user: {
        select: {
          firstName: true,
          lastName: true,
          role: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\nTotal Notes: ${notes.length}\n`);

  notes.forEach((note, idx) => {
    const time = note.createdAt.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    const pinnedIcon = note.isPinned ? '📌' : '';
    console.log(`${idx + 1}. [${time}] ${note.user.firstName} ${note.user.lastName} (${note.user.role?.name}) → ${note.lead.firstName} ${note.lead.lastName} ${pinnedIcon}`);
    console.log(`   "${note.content}"`);
    console.log('');
  });

  // ==================== FOLLOW-UPS ====================
  console.log('\n' + '━'.repeat(140));
  console.log('📅 FOLLOW-UPS (Scheduled Tasks)');
  console.log('━'.repeat(140));

  const followUps = await prisma.followUp.findMany({
    where: { lead: { organizationId: org.id } },
    include: {
      lead: { select: { firstName: true, lastName: true } },
      assignee: { select: { firstName: true, lastName: true, role: { select: { name: true } } } },
      createdBy: { select: { firstName: true, lastName: true } }
    },
    orderBy: { scheduledAt: 'asc' }
  });

  console.log(`\nTotal Follow-ups: ${followUps.length}\n`);

  followUps.forEach((fu, idx) => {
    const scheduledTime = fu.scheduledAt.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    const statusIcon = fu.status === 'COMPLETED' ? '✅' : fu.status === 'MISSED' ? '❌' : '⏳';
    console.log(`${statusIcon} Follow-up #${idx + 1}: ${fu.lead.firstName} ${fu.lead.lastName}`);
    console.log(`   ├── Scheduled: ${scheduledTime}`);
    console.log(`   ├── Assigned To: ${fu.assignee.firstName} ${fu.assignee.lastName} (${fu.assignee.role?.name})`);
    console.log(`   ├── Created By: ${fu.createdBy.firstName} ${fu.createdBy.lastName}`);
    console.log(`   ├── Status: ${fu.status}`);
    console.log(`   └── Message: ${fu.message || 'N/A'}`);
    console.log('');
  });

  // ==================== PAYMENTS ====================
  console.log('\n' + '━'.repeat(140));
  console.log('💰 PAYMENTS');
  console.log('━'.repeat(140));

  const payments = await prisma.payment.findMany({
    where: { organizationId: org.id },
    include: {
      studentProfile: {
        include: {
          lead: { select: { firstName: true, lastName: true } }
        }
      },
      createdBy: { select: { firstName: true, lastName: true, role: { select: { name: true } } } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\nTotal Payments: ${payments.length}\n`);

  let totalCollected = 0;
  payments.forEach((payment, idx) => {
    const statusIcon = payment.status === 'COMPLETED' ? '✅' : payment.status === 'PENDING' ? '⏳' : '❌';
    const amount = Number(payment.amount);
    totalCollected += payment.status === 'COMPLETED' ? amount : 0;

    console.log(`${statusIcon} Payment #${idx + 1}`);
    console.log(`   ├── Order ID: ${payment.orderId}`);
    console.log(`   ├── Student: ${payment.studentProfile?.lead?.firstName || 'N/A'} ${payment.studentProfile?.lead?.lastName || ''}`);
    console.log(`   ├── Amount: ₹${amount.toLocaleString('en-IN')}`);
    console.log(`   ├── Method: ${payment.paymentMethod || 'N/A'}`);
    console.log(`   ├── Status: ${payment.status}`);
    console.log(`   ├── Received By: ${payment.createdBy.firstName} ${payment.createdBy.lastName} (${payment.createdBy.role?.name})`);
    console.log(`   └── Description: ${payment.description || 'N/A'}`);
    console.log('');
  });

  console.log(`💵 Total Amount Collected: ₹${totalCollected.toLocaleString('en-IN')}`);

  // ==================== SUMMARY BY ROLE ====================
  console.log('\n' + '━'.repeat(140));
  console.log('📊 ACTIVITY SUMMARY BY ROLE');
  console.log('━'.repeat(140));

  const allActivities = await prisma.leadActivity.findMany({
    where: { lead: { organizationId: org.id } },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          role: { select: { name: true, slug: true } }
        }
      }
    }
  });

  const activityByRole: Record<string, { count: number; types: Record<string, number>; users: Set<string> }> = {};

  allActivities.forEach(activity => {
    const role = activity.user?.role?.name || 'System';
    if (!activityByRole[role]) {
      activityByRole[role] = { count: 0, types: {}, users: new Set() };
    }
    activityByRole[role].count++;
    activityByRole[role].types[activity.type] = (activityByRole[role].types[activity.type] || 0) + 1;
    if (activity.user) {
      activityByRole[role].users.add(`${activity.user.firstName} ${activity.user.lastName}`);
    }
  });

  console.log('');
  for (const [role, data] of Object.entries(activityByRole)) {
    console.log(`👤 ${role} (${data.users.size} users, ${data.count} activities):`);
    console.log(`   Users: ${Array.from(data.users).join(', ') || 'System'}`);
    console.log(`   Activity Types:`);
    for (const [type, count] of Object.entries(data.types)) {
      console.log(`      • ${type}: ${count}`);
    }
    console.log('');
  }

  // ==================== TELECALLER PERFORMANCE ====================
  console.log('\n' + '━'.repeat(140));
  console.log('📞 TELECALLER PERFORMANCE');
  console.log('━'.repeat(140));

  const telecallers = await prisma.user.findMany({
    where: {
      organizationId: org.id,
      role: { slug: 'telecaller' }
    },
    include: {
      role: { select: { name: true } },
      branch: { select: { name: true, code: true } }
    }
  });

  console.log('');
  for (const tc of telecallers) {
    const tcActivities = allActivities.filter(a => a.user?.firstName === tc.firstName && a.user?.lastName === tc.lastName);
    const calls = tcActivities.filter(a => a.type === 'CALL_MADE').length;
    const notes = await prisma.leadNote.count({ where: { userId: tc.id } });
    const assignments = await prisma.leadAssignment.count({ where: { assignedToId: tc.id } });

    if (tcActivities.length === 0 && tc.firstName === 'Rahul') continue; // Skip student user

    console.log(`📞 ${tc.firstName} ${tc.lastName} [${tc.branch?.code || 'N/A'}]`);
    console.log(`   ├── Total Activities: ${tcActivities.length}`);
    console.log(`   ├── Calls Made: ${calls}`);
    console.log(`   ├── Notes Added: ${notes}`);
    console.log(`   └── Leads Handled: ${assignments}`);
    console.log('');
  }

  // ==================== MANAGER PERFORMANCE ====================
  console.log('\n' + '━'.repeat(140));
  console.log('👔 MANAGER PERFORMANCE');
  console.log('━'.repeat(140));

  const managers = await prisma.user.findMany({
    where: {
      organizationId: org.id,
      role: { slug: 'manager' }
    },
    include: {
      role: { select: { name: true } },
      branch: { select: { name: true, code: true } }
    }
  });

  console.log('');
  for (const mgr of managers) {
    const mgrActivities = allActivities.filter(a => a.user?.firstName === mgr.firstName && a.user?.lastName === mgr.lastName);
    const approvals = mgrActivities.filter(a => a.title?.toLowerCase().includes('approved')).length;
    const paymentsReceived = await prisma.payment.count({ where: { createdById: mgr.id } });
    const admissionsClosed = await prisma.lead.count({ where: { admissionClosedById: mgr.id } });

    console.log(`👔 ${mgr.firstName} ${mgr.lastName} [${mgr.branch?.code || 'N/A'}]`);
    console.log(`   ├── Total Activities: ${mgrActivities.length}`);
    console.log(`   ├── Approvals Given: ${approvals}`);
    console.log(`   ├── Payments Received: ${paymentsReceived}`);
    console.log(`   └── Admissions Closed: ${admissionsClosed}`);
    console.log('');
  }

  // ==================== FINAL SUMMARY ====================
  console.log('\n' + '='.repeat(140));
  console.log('                                         FINAL SUMMARY');
  console.log('='.repeat(140));

  const convertedLeads = leads.filter(l => l.isConverted).length;
  const droppedLeads = leads.filter(l => l.admissionStatus === 'DROPPED').length;
  const inProgressLeads = leads.filter(l => !l.isConverted && l.admissionStatus !== 'DROPPED').length;

  console.log(`
   📊 LEADS:           ${leads.length} total | ${convertedLeads} converted | ${droppedLeads} dropped | ${inProgressLeads} in progress
   📞 ACTIVITIES:      ${allActivities.length} total activities logged
   📝 NOTES:           ${notes.length} notes added
   📅 FOLLOW-UPS:      ${followUps.length} scheduled
   💰 PAYMENTS:        ${payments.length} payments | ₹${totalCollected.toLocaleString('en-IN')} collected
   👥 USERS INVOLVED:  ${new Set(allActivities.map(a => a.userId).filter(Boolean)).size} active users
  `);

  console.log('='.repeat(140) + '\n');

  await prisma.$disconnect();
}

showCompleteData();
