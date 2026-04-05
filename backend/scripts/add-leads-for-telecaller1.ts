/**
 * Add new leads and assign them to telecaller1.hyd@smartedu.com
 */

import { PrismaClient, ActivityType, LeadSource, LeadPriority, AdmissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function addLeadsForTelecaller1() {
  const org = await prisma.organization.findFirst({
    where: { email: 'admin@smartedu.com' }
  });

  if (!org) {
    console.log('❌ Organization not found!');
    return;
  }

  // Find telecaller1.hyd
  const telecaller1 = await prisma.user.findFirst({
    where: { email: 'telecaller1.hyd@smartedu.com' },
    include: { branch: true }
  });

  if (!telecaller1) {
    console.log('❌ Telecaller not found!');
    return;
  }

  // Get inquiry stage
  const inquiryStage = await prisma.leadStage.findFirst({
    where: { organizationId: org.id, slug: 'inquiry' }
  });

  const interestedStage = await prisma.leadStage.findFirst({
    where: { organizationId: org.id, slug: 'interested' }
  });

  console.log('\n' + '='.repeat(80));
  console.log('ADDING NEW LEADS FOR telecaller1.hyd@smartedu.com');
  console.log('='.repeat(80));

  // New leads to add
  const newLeads = [
    { firstName: 'Sanjay', lastName: 'Verma', phone: '9876543301', email: 'sanjay.verma@gmail.com', source: LeadSource.WEBSITE, stage: inquiryStage },
    { firstName: 'Meera', lastName: 'Joshi', phone: '9876543302', email: 'meera.joshi@gmail.com', source: LeadSource.REFERRAL, stage: inquiryStage },
    { firstName: 'Arjun', lastName: 'Singh', phone: '9876543303', email: 'arjun.singh@gmail.com', source: LeadSource.AD_GOOGLE, stage: interestedStage },
    { firstName: 'Pooja', lastName: 'Rao', phone: '9876543304', email: 'pooja.rao@gmail.com', source: LeadSource.WEBSITE, stage: inquiryStage },
    { firstName: 'Vikram', lastName: 'Desai', phone: '9876543305', email: 'vikram.desai@gmail.com', source: LeadSource.AD_FACEBOOK, stage: interestedStage },
  ];

  for (const leadData of newLeads) {
    // Create lead
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        orgBranchId: telecaller1.branchId!,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        phone: leadData.phone,
        email: leadData.email,
        source: leadData.source,
        priority: LeadPriority.MEDIUM,
        stageId: leadData.stage?.id,
        admissionStatus: leadData.stage?.slug === 'interested' ? AdmissionStatus.INTERESTED : AdmissionStatus.INQUIRY,
        totalFees: 150000,
        paidAmount: 0,
      }
    });

    // Create assignment
    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: telecaller1.id,
        isActive: true
      }
    });

    // Log lead creation
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: ActivityType.LEAD_CREATED,
        title: 'Lead created',
        description: `Lead created from ${leadData.source} source`,
        metadata: { source: leadData.source, branch: 'HYD-01' }
      }
    });

    // Log assignment
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: telecaller1.id,
        type: ActivityType.ASSIGNMENT_CHANGED,
        title: 'Lead assigned to telecaller',
        description: `${telecaller1.firstName} ${telecaller1.lastName} assigned for outreach`,
        metadata: { assignedTo: telecaller1.id }
      }
    });

    console.log(`✅ Created & Assigned: ${leadData.firstName} ${leadData.lastName} (${leadData.stage?.name})`);
  }

  // Show telecaller1's leads now
  console.log('\n' + '='.repeat(80));
  console.log('TELECALLER1.HYD LEADS AFTER UPDATE');
  console.log('='.repeat(80));

  const telecaller1Leads = await prisma.leadAssignment.findMany({
    where: {
      assignedToId: telecaller1.id,
      isActive: true
    },
    include: {
      lead: {
        include: {
          stage: { select: { name: true } }
        }
      }
    }
  });

  console.log(`\n📞 ${telecaller1.firstName} ${telecaller1.lastName} (${telecaller1.email})`);
  console.log(`   Branch: ${telecaller1.branch?.name} (${telecaller1.branch?.code})`);
  console.log(`   Total Active Leads: ${telecaller1Leads.length}\n`);

  telecaller1Leads.forEach((assignment, idx) => {
    const lead = assignment.lead;
    console.log(`   ${idx + 1}. ${lead.firstName} ${lead.lastName}`);
    console.log(`      Phone: ${lead.phone} | Email: ${lead.email}`);
    console.log(`      Stage: ${lead.stage?.name} | Status: ${lead.admissionStatus}`);
    console.log(`      Source: ${lead.source}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('✅ DONE! telecaller1.hyd@smartedu.com now has 5 leads to work with.');
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

addLeadsForTelecaller1();
