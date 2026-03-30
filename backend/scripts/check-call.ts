import { prisma } from '../src/config/database';

async function checkCall() {
  const callId = '36a37a8d-969d-4273-b235-9a9f01805e80';

  const call = await prisma.outboundCall.findUnique({
    where: { id: callId },
    include: {
      existingLead: {
        include: {
          assignments: {
            where: { isActive: true },
            include: {
              assignedTo: { select: { email: true, firstName: true } }
            }
          }
        }
      },
      agent: { select: { organizationId: true, name: true } }
    }
  });

  if (!call) {
    console.log('❌ Call not found');
    return;
  }

  console.log('=====================================');
  console.log('Call ID:', call.id);
  console.log('Phone:', call.phoneNumber);
  console.log('Outcome:', call.outcome);
  console.log('Agent:', call.agent?.name);
  console.log('=====================================');

  if (call.existingLead) {
    console.log('');
    console.log('Linked Lead:', call.existingLead.firstName, call.existingLead.lastName || '');
    console.log('Lead ID:', call.existingLeadId);
    console.log('');
    console.log('Lead Assignments:');
    for (const a of call.existingLead.assignments) {
      console.log('  ✅ ' + a.assignedTo.email + ' (' + a.assignedTo.firstName + ')');
    }
    if (call.existingLead.assignments.length === 0) {
      console.log('  ❌ No active assignments - this is why telecaller gets 404!');
      console.log('');
      console.log('  Fix: Assign this lead to telecaller2@demo.com');
    }
  } else {
    console.log('');
    console.log('❌ No lead linked to this call');
    console.log('   Calls without leads should be accessible to all org users');
  }

  await prisma.$disconnect();
}

checkCall();
