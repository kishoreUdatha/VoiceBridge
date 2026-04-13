const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMissingCommissions() {
  const orgId = '8bdc5663-c58d-4acd-a981-9038377a7ce1';

  // Get the admission
  const admission = await prisma.admission.findFirst({
    where: { organizationId: orgId },
    include: {
      lead: {
        select: {
          id: true,
          assignments: {
            where: { isActive: true },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            select: {
              assignedToId: true,
              assignedTo: {
                select: { id: true, managerId: true, role: { select: { slug: true } } }
              }
            }
          }
        }
      }
    }
  });

  if (!admission) {
    console.log('No admission found');
    return;
  }

  console.log('Admission:', admission.id, 'Type:', admission.admissionType);
  console.log('ClosedBy:', admission.closedById);

  // Check if commissions already exist
  const existingCommissions = await prisma.commission.count({
    where: { admissionId: admission.id }
  });

  if (existingCommissions > 0) {
    console.log('Commissions already exist for this admission:', existingCommissions);
    return;
  }

  // Get commission config
  const config = await prisma.commissionConfig.findUnique({
    where: {
      organizationId_admissionType: {
        organizationId: orgId,
        admissionType: admission.admissionType
      }
    }
  });

  console.log('Config:', JSON.stringify(config, null, 2));

  if (!config) {
    console.log('No config for admission type');
    return;
  }

  // Get the user who closed it
  const closedByUser = await prisma.user.findUnique({
    where: { id: admission.closedById },
    select: { id: true, firstName: true, lastName: true, managerId: true, role: { select: { slug: true } } }
  });

  console.log('Closed by:', JSON.stringify(closedByUser, null, 2));

  const commissionsToCreate = [];
  const baseValue = Number(admission.donationAmount) || Number(admission.totalFee) || 0;
  const closerRole = closedByUser?.role?.slug?.toLowerCase() || '';
  const commissionedUserIds = new Set();

  console.log('Closer role:', closerRole);
  console.log('Base value:', baseValue);

  // Create commission for the closer based on their role
  if (['telecaller', 'counselor'].includes(closerRole)) {
    const telecallerAmount = Number(config.telecallerAmount) || 0;
    if (telecallerAmount > 0) {
      commissionsToCreate.push({
        organizationId: orgId,
        userId: closedByUser.id,
        leadId: admission.leadId,
        admissionId: admission.id,
        amount: telecallerAmount,
        rate: 0,
        baseValue,
        status: 'PENDING',
        notes: 'Telecaller commission'
      });
      commissionedUserIds.add(closedByUser.id);
    }

    // Team lead commission
    if (closedByUser.managerId && !commissionedUserIds.has(closedByUser.managerId)) {
      const teamLeadAmount = Number(config.teamLeadAmount) || 0;
      if (teamLeadAmount > 0) {
        commissionsToCreate.push({
          organizationId: orgId,
          userId: closedByUser.managerId,
          leadId: admission.leadId,
          admissionId: admission.id,
          amount: teamLeadAmount,
          rate: 0,
          baseValue,
          status: 'PENDING',
          notes: 'Team Lead commission'
        });
        commissionedUserIds.add(closedByUser.managerId);
      }
    }
  } else if (['team_lead', 'teamlead'].includes(closerRole)) {
    const teamLeadAmount = Number(config.teamLeadAmount) || 0;
    if (teamLeadAmount > 0) {
      commissionsToCreate.push({
        organizationId: orgId,
        userId: closedByUser.id,
        leadId: admission.leadId,
        admissionId: admission.id,
        amount: teamLeadAmount,
        rate: 0,
        baseValue,
        status: 'PENDING',
        notes: 'Team Lead commission'
      });
      commissionedUserIds.add(closedByUser.id);
    }

    // Manager commission
    if (closedByUser.managerId && !commissionedUserIds.has(closedByUser.managerId)) {
      const managerAmount = Number(config.managerAmount) || 0;
      if (managerAmount > 0) {
        commissionsToCreate.push({
          organizationId: orgId,
          userId: closedByUser.managerId,
          leadId: admission.leadId,
          admissionId: admission.id,
          amount: managerAmount,
          rate: 0,
          baseValue,
          status: 'PENDING',
          notes: 'Manager commission'
        });
      }
    }
  } else if (['manager', 'admin'].includes(closerRole)) {
    const managerAmount = Number(config.managerAmount) || 0;
    if (managerAmount > 0) {
      commissionsToCreate.push({
        organizationId: orgId,
        userId: closedByUser.id,
        leadId: admission.leadId,
        admissionId: admission.id,
        amount: managerAmount,
        rate: 0,
        baseValue,
        status: 'PENDING',
        notes: 'Manager commission'
      });
    }
  }

  console.log('Commissions to create:', commissionsToCreate.length);
  console.log(JSON.stringify(commissionsToCreate, null, 2));

  if (commissionsToCreate.length > 0) {
    await prisma.commission.createMany({ data: commissionsToCreate });
    console.log('Created', commissionsToCreate.length, 'commission records');
  } else {
    console.log('No commissions to create based on config amounts');
  }

  await prisma.$disconnect();
}

createMissingCommissions().catch(console.error);
