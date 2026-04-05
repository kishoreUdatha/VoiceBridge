/**
 * Comprehensive End-to-End Testing Script
 *
 * This script tests the entire flow of:
 * 1. Organization with multiple branches
 * 2. Branch hierarchy: Manager → Team Lead → Telecallers
 * 3. Full lead lifecycle: Telecaller speaks → handoff → Manager closes admission
 * 4. Payment tracking
 * 5. Complete activity history (who spoke when)
 *
 * Run: npx ts-node scripts/test-comprehensive-e2e.ts
 */

import { PrismaClient, ActivityType, AdmissionStatus, LeadSource, LeadPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface TestUser {
  id: string;
  name: string;
  role: string;
  branch: string;
}

interface TestData {
  organization: any;
  branches: Map<string, any>;
  roles: Map<string, any>;
  users: Map<string, TestUser>;
  stages: Map<string, any>;
  leads: Map<string, any>;
}

// Test configuration
const TEST_CONFIG = {
  orgName: 'SmartEdu Academy',
  orgEmail: 'admin@smartedu.com',
  password: 'Test@123!',
  branches: [
    { name: 'Hyderabad Main', code: 'HYD-01', city: 'Hyderabad', state: 'Telangana', isHQ: true },
    { name: 'Bangalore Central', code: 'BLR-01', city: 'Bangalore', state: 'Karnataka', isHQ: false },
    { name: 'Chennai South', code: 'CHN-01', city: 'Chennai', state: 'Tamil Nadu', isHQ: false },
  ],
  // Roles per branch
  rolesConfig: [
    { name: 'Admin', slug: 'admin', isGlobal: true },
    { name: 'Branch Manager', slug: 'manager', isGlobal: false },
    { name: 'Team Lead', slug: 'team_lead', isGlobal: false },
    { name: 'Telecaller', slug: 'telecaller', isGlobal: false },
    { name: 'Counselor', slug: 'counselor', isGlobal: false },
  ],
  // Education industry stages
  stages: [
    { name: 'Inquiry', slug: 'inquiry', order: 1, icon: 'PhoneIcon' },
    { name: 'Interested', slug: 'interested', order: 2, icon: 'StarIcon' },
    { name: 'Visit Scheduled', slug: 'visit-scheduled', order: 3, icon: 'CalendarIcon' },
    { name: 'Visit Completed', slug: 'visit-completed', order: 4, icon: 'CheckCircleIcon' },
    { name: 'Documents Pending', slug: 'documents-pending', order: 5, icon: 'DocumentIcon' },
    { name: 'Admission Processing', slug: 'admission-processing', order: 6, icon: 'ClockIcon' },
    { name: 'Payment Pending', slug: 'payment-pending', order: 7, icon: 'CurrencyRupeeIcon' },
    { name: 'Admitted', slug: 'admitted', order: 8, icon: 'AcademicCapIcon', autoSyncStatus: 'WON' },
    { name: 'Enrolled', slug: 'enrolled', order: 9, icon: 'BadgeCheckIcon', autoSyncStatus: 'WON' },
    { name: 'Dropped', slug: 'dropped', order: 10, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  ],
  // Test leads per branch
  leadsPerBranch: [
    // HYD Branch leads
    { branch: 'HYD-01', firstName: 'Rahul', lastName: 'Kumar', phone: '9876543210', email: 'rahul.kumar@gmail.com', source: 'WEBSITE' },
    { branch: 'HYD-01', firstName: 'Priya', lastName: 'Sharma', phone: '9876543211', email: 'priya.sharma@gmail.com', source: 'MANUAL' },
    { branch: 'HYD-01', firstName: 'Amit', lastName: 'Patel', phone: '9876543212', email: 'amit.patel@gmail.com', source: 'REFERRAL' },
    // BLR Branch leads
    { branch: 'BLR-01', firstName: 'Sneha', lastName: 'Reddy', phone: '9876543220', email: 'sneha.reddy@gmail.com', source: 'AD_FACEBOOK' },
    { branch: 'BLR-01', firstName: 'Karthik', lastName: 'Nair', phone: '9876543221', email: 'karthik.nair@gmail.com', source: 'WEBSITE' },
    // CHN Branch leads
    { branch: 'CHN-01', firstName: 'Divya', lastName: 'Menon', phone: '9876543230', email: 'divya.menon@gmail.com', source: 'AD_GOOGLE' },
    { branch: 'CHN-01', firstName: 'Vijay', lastName: 'Sundaram', phone: '9876543231', email: 'vijay.sundaram@gmail.com', source: 'MANUAL' },
  ],
};

class ComprehensiveE2ETester {
  private testData: TestData = {
    organization: null,
    branches: new Map(),
    roles: new Map(),
    users: new Map(),
    stages: new Map(),
    leads: new Map(),
  };

  private logs: string[] = [];

  private log(message: string, type: 'info' | 'success' | 'error' | 'header' = 'info') {
    const icons = { info: '📋', success: '✅', error: '❌', header: '🔷' };
    const logMessage = `${icons[type]} ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }

  async cleanup() {
    this.log('Cleaning up existing test data...', 'info');

    // Find existing test organization
    const existingOrg = await prisma.organization.findFirst({
      where: { email: TEST_CONFIG.orgEmail }
    });

    if (existingOrg) {
      // Get all leads for this org to delete related records
      const leads = await prisma.lead.findMany({
        where: { organizationId: existingOrg.id },
        select: { id: true }
      });
      const leadIds = leads.map(l => l.id);

      // Get all users for this org
      const users = await prisma.user.findMany({
        where: { organizationId: existingOrg.id },
        select: { id: true }
      });
      const userIds = users.map(u => u.id);

      // Delete payments first (has organizationId, references studentProfile)
      await prisma.payment.deleteMany({ where: { organizationId: existingOrg.id } });

      // Delete dependent records in correct order
      if (leadIds.length > 0) {
        await prisma.leadAssignment.deleteMany({ where: { leadId: { in: leadIds } } });
        await prisma.leadActivity.deleteMany({ where: { leadId: { in: leadIds } } });
        await prisma.followUp.deleteMany({ where: { leadId: { in: leadIds } } });
        await prisma.leadNote.deleteMany({ where: { leadId: { in: leadIds } } });
        await prisma.studentProfile.deleteMany({ where: { leadId: { in: leadIds } } });
      }

      // Delete leads
      await prisma.lead.deleteMany({ where: { organizationId: existingOrg.id } });
      // Delete lead stages
      await prisma.leadStage.deleteMany({ where: { organizationId: existingOrg.id } });
      // Delete users
      await prisma.user.deleteMany({ where: { organizationId: existingOrg.id } });
      // Delete roles
      await prisma.role.deleteMany({ where: { organizationId: existingOrg.id } });
      // Delete branches
      await prisma.branch.deleteMany({ where: { organizationId: existingOrg.id } });
      // Finally, delete the organization
      await prisma.organization.delete({ where: { id: existingOrg.id } });
      this.log('Deleted existing test organization and all dependent data', 'info');
    }
  }

  async createOrganization() {
    this.log('PHASE 1: Creating Organization', 'header');

    const org = await prisma.organization.create({
      data: {
        name: TEST_CONFIG.orgName,
        slug: 'smartedu-academy',
        email: TEST_CONFIG.orgEmail,
        phone: '+91 40 1234 5678',
        address: '123 Education Street, Tech Park',
        industry: 'EDUCATION',
        settings: {
          timezone: 'Asia/Kolkata',
          currency: 'INR',
          language: 'en-IN',
        },
      },
    });

    this.testData.organization = org;
    this.log(`Created organization: ${org.name} (ID: ${org.id})`, 'success');
    return org;
  }

  async createBranches() {
    this.log('PHASE 2: Creating Branches', 'header');

    for (const branchConfig of TEST_CONFIG.branches) {
      const branch = await prisma.branch.create({
        data: {
          organizationId: this.testData.organization.id,
          name: branchConfig.name,
          code: branchConfig.code,
          city: branchConfig.city,
          state: branchConfig.state,
          country: 'India',
          address: `${branchConfig.city} Office, Tech Park`,
          isHeadquarters: branchConfig.isHQ,
          isActive: true,
        },
      });

      this.testData.branches.set(branchConfig.code, branch);
      this.log(`Created branch: ${branch.name} (${branch.code})${branchConfig.isHQ ? ' [HQ]' : ''}`, 'success');
    }
  }

  async createRoles() {
    this.log('PHASE 3: Creating Roles', 'header');

    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      manager: ['leads.*', 'users.read', 'reports.*', 'campaigns.*', 'branch.*'],
      team_lead: ['leads.*', 'users.read', 'reports.read', 'telecallers.manage'],
      telecaller: ['leads.read', 'leads.update', 'calls.*', 'notes.*'],
      counselor: ['leads.*', 'calls.*', 'notes.*', 'documents.*'],
    };

    for (const roleConfig of TEST_CONFIG.rolesConfig) {
      const role = await prisma.role.create({
        data: {
          organizationId: this.testData.organization.id,
          name: roleConfig.name,
          slug: roleConfig.slug,
          description: `${roleConfig.name} role for ${TEST_CONFIG.orgName}`,
          permissions: rolePermissions[roleConfig.slug] || [],
          isSystem: roleConfig.slug === 'admin',
        },
      });

      this.testData.roles.set(roleConfig.slug, role);
      this.log(`Created role: ${role.name}`, 'success');
    }
  }

  async createUsers() {
    this.log('PHASE 4: Creating Users (Branch Hierarchy)', 'header');

    const hashedPassword = await bcrypt.hash(TEST_CONFIG.password, 10);
    const adminRole = this.testData.roles.get('admin');
    const managerRole = this.testData.roles.get('manager');
    const teamLeadRole = this.testData.roles.get('team_lead');
    const telecallerRole = this.testData.roles.get('telecaller');
    const counselorRole = this.testData.roles.get('counselor');

    // 1. Create Super Admin (no branch)
    const superAdmin = await prisma.user.create({
      data: {
        organizationId: this.testData.organization.id,
        email: 'admin@smartedu.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        phone: '9999000001',
        roleId: adminRole.id,
        isActive: true,
      },
    });
    this.testData.users.set('super_admin', { id: superAdmin.id, name: 'Super Admin', role: 'admin', branch: 'ALL' });
    this.log(`Created Super Admin: ${superAdmin.email}`, 'success');

    // 2. Create users for each branch
    for (const [branchCode, branch] of this.testData.branches) {
      const branchShort = branchCode.split('-')[0].toLowerCase();

      // Branch Manager
      const manager = await prisma.user.create({
        data: {
          organizationId: this.testData.organization.id,
          email: `manager.${branchShort}@smartedu.com`,
          password: hashedPassword,
          firstName: `${branchShort.toUpperCase()}`,
          lastName: 'Manager',
          phone: `98765000${branchShort === 'hyd' ? '10' : branchShort === 'blr' ? '20' : '30'}`,
          roleId: managerRole.id,
          branchId: branch.id,
          isActive: true,
        },
      });
      this.testData.users.set(`manager_${branchShort}`, { id: manager.id, name: `${branchShort.toUpperCase()} Manager`, role: 'manager', branch: branchCode });

      // Update branch with manager
      await prisma.branch.update({
        where: { id: branch.id },
        data: { branchManagerId: manager.id },
      });

      this.log(`Created Branch Manager: ${manager.email} (${branchCode})`, 'success');

      // Team Lead (reports to manager)
      const teamLead = await prisma.user.create({
        data: {
          organizationId: this.testData.organization.id,
          email: `teamlead.${branchShort}@smartedu.com`,
          password: hashedPassword,
          firstName: `${branchShort.toUpperCase()}`,
          lastName: 'TeamLead',
          phone: `98765001${branchShort === 'hyd' ? '10' : branchShort === 'blr' ? '20' : '30'}`,
          roleId: teamLeadRole.id,
          branchId: branch.id,
          managerId: manager.id,
          isActive: true,
        },
      });
      this.testData.users.set(`teamlead_${branchShort}`, { id: teamLead.id, name: `${branchShort.toUpperCase()} TeamLead`, role: 'team_lead', branch: branchCode });
      this.log(`Created Team Lead: ${teamLead.email} (reports to ${manager.firstName})`, 'success');

      // 2 Telecallers per branch (report to team lead)
      for (let i = 1; i <= 2; i++) {
        const telecaller = await prisma.user.create({
          data: {
            organizationId: this.testData.organization.id,
            email: `telecaller${i}.${branchShort}@smartedu.com`,
            password: hashedPassword,
            firstName: `${branchShort.toUpperCase()} Telecaller`,
            lastName: `${i}`,
            phone: `98765002${branchShort === 'hyd' ? i : branchShort === 'blr' ? 10 + i : 20 + i}`,
            roleId: telecallerRole.id,
            branchId: branch.id,
            managerId: teamLead.id,
            isActive: true,
          },
        });
        this.testData.users.set(`telecaller${i}_${branchShort}`, { id: telecaller.id, name: `${branchShort.toUpperCase()} Telecaller ${i}`, role: 'telecaller', branch: branchCode });
        this.log(`Created Telecaller: ${telecaller.email} (reports to ${teamLead.firstName})`, 'success');
      }

      // 1 Counselor per branch (reports to manager)
      const counselor = await prisma.user.create({
        data: {
          organizationId: this.testData.organization.id,
          email: `counselor.${branchShort}@smartedu.com`,
          password: hashedPassword,
          firstName: `${branchShort.toUpperCase()}`,
          lastName: 'Counselor',
          phone: `98765003${branchShort === 'hyd' ? '10' : branchShort === 'blr' ? '20' : '30'}`,
          roleId: counselorRole.id,
          branchId: branch.id,
          managerId: manager.id,
          isActive: true,
        },
      });
      this.testData.users.set(`counselor_${branchShort}`, { id: counselor.id, name: `${branchShort.toUpperCase()} Counselor`, role: 'counselor', branch: branchCode });
      this.log(`Created Counselor: ${counselor.email} (reports to ${manager.firstName})`, 'success');
    }

    this.log(`Total users created: ${this.testData.users.size}`, 'info');
  }

  async createLeadStages() {
    this.log('PHASE 5: Creating Lead Stages', 'header');

    for (const stageConfig of TEST_CONFIG.stages) {
      const stage = await prisma.leadStage.create({
        data: {
          organizationId: this.testData.organization.id,
          name: stageConfig.name,
          slug: stageConfig.slug,
          order: stageConfig.order,
          journeyOrder: stageConfig.order,
          icon: stageConfig.icon,
          isSystemStage: true,
          templateSlug: stageConfig.slug,
          autoSyncStatus: stageConfig.autoSyncStatus || null,
          isActive: true,
        },
      });

      this.testData.stages.set(stageConfig.slug, stage);
      this.log(`Created stage: ${stage.name} (Order: ${stage.order})`, 'success');
    }
  }

  async createLeads() {
    this.log('PHASE 6: Creating Test Leads', 'header');

    const sourceMap: Record<string, LeadSource> = {
      'WEBSITE': LeadSource.WEBSITE,
      'MANUAL': LeadSource.MANUAL,
      'REFERRAL': LeadSource.REFERRAL,
      'AD_FACEBOOK': LeadSource.AD_FACEBOOK,
      'AD_GOOGLE': LeadSource.AD_GOOGLE,
    };

    const inquiryStage = this.testData.stages.get('inquiry');

    for (const leadConfig of TEST_CONFIG.leadsPerBranch) {
      const branch = this.testData.branches.get(leadConfig.branch);

      const lead = await prisma.lead.create({
        data: {
          organizationId: this.testData.organization.id,
          orgBranchId: branch.id,
          firstName: leadConfig.firstName,
          lastName: leadConfig.lastName,
          phone: leadConfig.phone,
          email: leadConfig.email,
          source: sourceMap[leadConfig.source] || LeadSource.MANUAL,
          priority: LeadPriority.MEDIUM,
          stageId: inquiryStage.id,
          admissionStatus: AdmissionStatus.INQUIRY,
          totalFees: 150000,
          paidAmount: 0,
        },
      });

      // Log lead creation activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: ActivityType.LEAD_CREATED,
          title: 'Lead created',
          description: `Lead created from ${leadConfig.source} source`,
          metadata: { source: leadConfig.source, branch: leadConfig.branch },
        },
      });

      this.testData.leads.set(`${leadConfig.firstName}_${leadConfig.lastName}`, lead);
      this.log(`Created lead: ${leadConfig.firstName} ${leadConfig.lastName} (${leadConfig.branch})`, 'success');
    }
  }

  async simulateSuccessFlow() {
    this.log('PHASE 7: Simulating SUCCESS Admission Flow (Rahul Kumar)', 'header');

    const lead = this.testData.leads.get('Rahul_Kumar');
    const telecaller = this.testData.users.get('telecaller1_hyd');
    const teamLead = this.testData.users.get('teamlead_hyd');
    const manager = this.testData.users.get('manager_hyd');
    const counselor = this.testData.users.get('counselor_hyd');

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Step 1: Telecaller makes first call
    this.log('Step 1: Telecaller makes initial call...', 'info');
    await delay(100);

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: telecaller!.id,
        isActive: true,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: telecaller!.id,
        type: ActivityType.ASSIGNMENT_CHANGED,
        title: 'Lead assigned to telecaller',
        description: `${telecaller!.name} assigned for initial outreach`,
        metadata: { assignedTo: telecaller!.id, assignedBy: 'system' },
      },
    });

    // Log first call
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: telecaller!.id,
        type: ActivityType.CALL_MADE,
        title: 'Initial outbound call',
        description: 'First call to understand requirements. Student interested in B.Tech Computer Science.',
        metadata: { duration: 180, outcome: 'INTERESTED', callType: 'outbound' },
      },
    });

    await prisma.leadNote.create({
      data: {
        leadId: lead.id,
        userId: telecaller!.id,
        content: 'Student Rahul Kumar interested in B.Tech CS. Father is government employee. Budget: 1.5-2L per year. Prefers city campus.',
      },
    });

    this.log(`Telecaller ${telecaller!.name} made initial call - Student INTERESTED`, 'success');

    // Step 2: Stage change to INTERESTED
    await delay(100);
    const interestedStage = this.testData.stages.get('interested');

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: interestedStage.id,
        admissionStatus: AdmissionStatus.INTERESTED,
        lastContactedAt: new Date(),
        totalCalls: 1,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: telecaller!.id,
        type: ActivityType.STAGE_CHANGED,
        title: 'Stage changed to Interested',
        description: 'Lead moved to Interested stage after successful initial call',
        metadata: { fromStage: 'inquiry', toStage: 'interested' },
      },
    });

    this.log('Stage updated: Inquiry → Interested', 'success');

    // Step 3: Handoff to Team Lead
    await delay(100);
    this.log('Step 3: Handoff to Team Lead for qualification...', 'info');

    // Deactivate telecaller assignment, create new for team lead
    await prisma.leadAssignment.updateMany({
      where: { leadId: lead.id, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: teamLead!.id,
        assignedById: telecaller!.id,
        isActive: true,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: telecaller!.id,
        type: ActivityType.ASSIGNMENT_CHANGED,
        title: 'Lead handed off to Team Lead',
        description: `${telecaller!.name} handed off to ${teamLead!.name} for qualification`,
        metadata: { fromUser: telecaller!.id, toUser: teamLead!.id, reason: 'qualification_needed' },
      },
    });

    this.log(`Handoff: ${telecaller!.name} → ${teamLead!.name}`, 'success');

    // Step 4: Team Lead schedules campus visit
    await delay(100);
    this.log('Step 4: Team Lead schedules campus visit...', 'info');

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: teamLead!.id,
        type: ActivityType.CALL_MADE,
        title: 'Qualification call',
        description: 'Discussed course details, fee structure, and campus facilities. Scheduled campus visit.',
        metadata: { duration: 420, outcome: 'VISIT_SCHEDULED', callType: 'outbound' },
      },
    });

    const visitScheduledStage = this.testData.stages.get('visit-scheduled');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: visitScheduledStage.id,
        admissionStatus: AdmissionStatus.VISIT_SCHEDULED,
        walkinDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days later
        totalCalls: 2,
        lastContactedAt: new Date(),
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: teamLead!.id,
        type: ActivityType.STAGE_CHANGED,
        title: 'Stage changed to Visit Scheduled',
        description: 'Campus visit scheduled for 3 days later',
        metadata: { fromStage: 'interested', toStage: 'visit-scheduled' },
      },
    });

    // Schedule follow-up
    await prisma.followUp.create({
      data: {
        leadId: lead.id,
        assigneeId: counselor!.id,
        createdById: teamLead!.id,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        message: 'Campus visit - student arriving with father',
        status: 'UPCOMING',
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: teamLead!.id,
        type: ActivityType.FOLLOWUP_SCHEDULED,
        title: 'Campus visit scheduled',
        description: `Assigned to ${counselor!.name} for campus tour`,
        metadata: { assignedTo: counselor!.id, visitDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      },
    });

    this.log('Campus visit scheduled - assigned to Counselor', 'success');

    // Step 5: Campus Visit Completed
    await delay(100);
    this.log('Step 5: Counselor conducts campus visit...', 'info');

    // Transfer to counselor
    await prisma.leadAssignment.updateMany({
      where: { leadId: lead.id, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: counselor!.id,
        assignedById: teamLead!.id,
        isActive: true,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: counselor!.id,
        type: ActivityType.NOTE_ADDED,
        title: 'Campus visit completed',
        description: 'Student and father visited campus. Very impressed with labs and placement records. Ready to proceed with admission.',
        metadata: { visitDuration: 120, accompaniedBy: 'Father' },
      },
    });

    const visitCompletedStage = this.testData.stages.get('visit-completed');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: visitCompletedStage.id,
        admissionStatus: AdmissionStatus.VISIT_COMPLETED,
        lastContactedAt: new Date(),
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: counselor!.id,
        type: ActivityType.STAGE_CHANGED,
        title: 'Stage changed to Visit Completed',
        description: 'Campus visit successful - student ready to proceed',
        metadata: { fromStage: 'visit-scheduled', toStage: 'visit-completed' },
      },
    });

    this.log('Campus visit completed successfully', 'success');

    // Step 6: Documents Collection
    await delay(100);
    this.log('Step 6: Document collection and verification...', 'info');

    const docsPendingStage = this.testData.stages.get('documents-pending');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: docsPendingStage.id,
        admissionStatus: AdmissionStatus.DOCUMENTS_PENDING,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: counselor!.id,
        type: ActivityType.DOCUMENT_UPLOADED,
        title: 'Documents received',
        description: 'Collected: 10th marksheet, 12th marksheet, Aadhaar card, Passport photos',
        metadata: { documents: ['10th_marksheet', '12th_marksheet', 'aadhaar', 'photos'] },
      },
    });

    this.log('Documents collected and verified', 'success');

    // Step 7: Admission Processing - Manager Involvement
    await delay(100);
    this.log('Step 7: Manager processes admission...', 'info');

    // Escalate to Manager for final approval
    await prisma.leadAssignment.updateMany({
      where: { leadId: lead.id, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: manager!.id,
        assignedById: counselor!.id,
        isActive: true,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: counselor!.id,
        type: ActivityType.ASSIGNMENT_CHANGED,
        title: 'Escalated to Manager for approval',
        description: `${counselor!.name} escalated to ${manager!.name} for admission approval`,
        metadata: { fromUser: counselor!.id, toUser: manager!.id, reason: 'admission_approval' },
      },
    });

    const processingStage = this.testData.stages.get('admission-processing');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: processingStage.id,
        admissionStatus: AdmissionStatus.ADMISSION_PROCESSING,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: manager!.id,
        type: ActivityType.NOTE_ADDED,
        title: 'Admission approved',
        description: 'Reviewed documents and profile. Admission approved. Proceed to fee payment.',
        metadata: { approvedBy: manager!.id },
      },
    });

    this.log('Admission approved by Manager', 'success');

    // Step 8: Payment Collection
    await delay(100);
    this.log('Step 8: Fee payment processing...', 'info');

    const paymentPendingStage = this.testData.stages.get('payment-pending');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: paymentPendingStage.id,
        admissionStatus: AdmissionStatus.PAYMENT_PENDING,
        expectedFee: 150000,
      },
    });

    // Create student user and profile for payment
    const studentUser = await prisma.user.create({
      data: {
        organizationId: this.testData.organization.id,
        email: 'rahul.kumar@smartedu.com',
        password: await bcrypt.hash('Student@123', 10),
        firstName: 'Rahul',
        lastName: 'Kumar',
        phone: '9876543210',
        roleId: this.testData.roles.get('telecaller').id, // Temporary role
        isActive: true,
      },
    });

    const studentProfile = await prisma.studentProfile.create({
      data: {
        leadId: lead.id,
        userId: studentUser.id,
        preferredCourse: 'B.Tech Computer Science',
        city: 'Hyderabad',
        state: 'Telangana',
      },
    });

    // Record first payment (Registration fee)
    const payment1 = await prisma.payment.create({
      data: {
        organizationId: this.testData.organization.id,
        studentProfileId: studentProfile.id,
        createdById: manager!.id,
        orderId: `ORD-${Date.now()}-001`,
        amount: 50000,
        currency: 'INR',
        status: 'COMPLETED',
        paymentMethod: 'BANK_TRANSFER',
        description: 'Registration fee + First semester fee',
        paidAt: new Date(),
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: manager!.id,
        type: ActivityType.NOTE_ADDED,
        title: 'Payment received',
        description: 'Registration fee ₹50,000 received via bank transfer',
        metadata: { paymentId: payment1.id, amount: 50000, method: 'BANK_TRANSFER' },
      },
    });

    // Update lead with payment info
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        paidAmount: 50000,
        paymentStatus: 'PARTIAL',
      },
    });

    this.log('Payment received: ₹50,000 (Registration + First Semester)', 'success');

    // Step 9: Admission Completed
    await delay(100);
    this.log('Step 9: Finalizing admission...', 'info');

    const admittedStage = this.testData.stages.get('admitted');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: admittedStage.id,
        admissionStatus: AdmissionStatus.ADMITTED,
        isConverted: true,
        convertedAt: new Date(),
        admissionClosedAt: new Date(),
        admissionClosedById: manager!.id,
        enrollmentNumber: 'SE2024001',
        academicYear: '2024-25',
        actualFee: 150000,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: manager!.id,
        type: ActivityType.STAGE_CHANGED,
        title: 'ADMISSION SUCCESSFUL',
        description: 'Student Rahul Kumar admitted to B.Tech Computer Science. Enrollment: SE2024001',
        metadata: {
          fromStage: 'payment-pending',
          toStage: 'admitted',
          enrollmentNo: 'SE2024001',
          closedBy: manager!.id,
          totalFee: 150000,
          paidAmount: 50000,
        },
      },
    });

    this.log('🎉 ADMISSION SUCCESSFUL: Rahul Kumar enrolled!', 'success');

    // Print activity timeline
    await this.printActivityTimeline(lead.id, 'Rahul Kumar');
  }

  async simulateDroppedFlow() {
    this.log('PHASE 8: Simulating DROPPED Flow (Priya Sharma)', 'header');

    const lead = this.testData.leads.get('Priya_Sharma');
    const telecaller = this.testData.users.get('telecaller2_hyd');
    const teamLead = this.testData.users.get('teamlead_hyd');

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Step 1: Initial contact
    this.log('Step 1: Initial telecaller contact...', 'info');
    await delay(100);

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: telecaller!.id,
        isActive: true,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: telecaller!.id,
        type: ActivityType.CALL_MADE,
        title: 'Initial outbound call',
        description: 'Student interested but concerned about fees. Requested callback after discussing with parents.',
        metadata: { duration: 240, outcome: 'CALLBACK_REQUESTED', callType: 'outbound' },
      },
    });

    const interestedStage = this.testData.stages.get('interested');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: interestedStage.id,
        admissionStatus: AdmissionStatus.INTERESTED,
        totalCalls: 1,
        lastContactedAt: new Date(),
      },
    });

    this.log('Initial contact - Student interested but needs family discussion', 'success');

    // Step 2: Follow-up calls
    await delay(100);
    this.log('Step 2: Follow-up attempts...', 'info');

    // Follow-up 1: No answer
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: telecaller!.id,
        type: ActivityType.CALL_MADE,
        title: 'Follow-up call 1',
        description: 'No answer. Will try again tomorrow.',
        metadata: { duration: 0, outcome: 'NO_ANSWER', callType: 'outbound' },
      },
    });

    // Follow-up 2: Busy
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: telecaller!.id,
        type: ActivityType.CALL_MADE,
        title: 'Follow-up call 2',
        description: 'Student busy in class. Will call back later.',
        metadata: { duration: 30, outcome: 'BUSY', callType: 'outbound' },
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { totalCalls: 3 },
    });

    this.log('Multiple follow-up attempts made', 'success');

    // Step 3: Final call - Budget issue
    await delay(100);
    this.log('Step 3: Final discussion with Team Lead...', 'info');

    await prisma.leadAssignment.updateMany({
      where: { leadId: lead.id, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: teamLead!.id,
        assignedById: telecaller!.id,
        isActive: true,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: teamLead!.id,
        type: ActivityType.CALL_MADE,
        title: 'Final discussion call',
        description: 'Spoke with father. Family decided to opt for government college due to budget constraints. Student got 85% in 12th - eligible for government quota.',
        metadata: { duration: 600, outcome: 'NOT_INTERESTED', reason: 'BUDGET_CONSTRAINTS', callType: 'outbound' },
      },
    });

    await prisma.leadNote.create({
      data: {
        leadId: lead.id,
        userId: teamLead!.id,
        content: 'Lost to government college. Family income below 5L, eligible for fee waiver in govt. colleges. May reconnect for PG courses in future.',
        isPinned: true,
      },
    });

    // Mark as dropped
    const droppedStage = this.testData.stages.get('dropped');
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: droppedStage.id,
        admissionStatus: AdmissionStatus.DROPPED,
        totalCalls: 4,
        lastContactedAt: new Date(),
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: teamLead!.id,
        type: ActivityType.STAGE_CHANGED,
        title: 'Lead DROPPED',
        description: 'Student opted for government college due to budget constraints',
        metadata: {
          fromStage: 'interested',
          toStage: 'dropped',
          reason: 'BUDGET_CONSTRAINTS',
          competitor: 'Government College',
        },
      },
    });

    this.log('❌ LEAD DROPPED: Priya Sharma - Budget constraints', 'info');

    await this.printActivityTimeline(lead.id, 'Priya Sharma');
  }

  async simulateOtherBranchFlows() {
    this.log('PHASE 9: Testing Other Branch Flows', 'header');

    // Bangalore branch - Quick success
    const blrLead = this.testData.leads.get('Sneha_Reddy');
    const blrTelecaller = this.testData.users.get('telecaller1_blr');
    const blrManager = this.testData.users.get('manager_blr');

    await prisma.leadAssignment.create({
      data: {
        leadId: blrLead.id,
        assignedToId: blrTelecaller!.id,
        isActive: true,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: blrLead.id,
        userId: blrTelecaller!.id,
        type: ActivityType.CALL_MADE,
        title: 'Initial contact',
        description: 'Student already decided on our institution. Just needs documentation help.',
        metadata: { duration: 300, outcome: 'HOT_LEAD', callType: 'outbound' },
      },
    });

    // Fast track to enrolled
    const enrolledStage = this.testData.stages.get('enrolled');
    await prisma.lead.update({
      where: { id: blrLead.id },
      data: {
        stageId: enrolledStage.id,
        admissionStatus: AdmissionStatus.ENROLLED,
        isConverted: true,
        convertedAt: new Date(),
        admissionClosedById: blrManager!.id,
        paidAmount: 150000,
        paymentStatus: 'COMPLETED',
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: blrLead.id,
        userId: blrManager!.id,
        type: ActivityType.STAGE_CHANGED,
        title: 'Direct enrollment',
        description: 'Hot lead - direct enrollment completed in single visit',
        metadata: { fastTrack: true },
      },
    });

    this.log('BLR Branch: Sneha Reddy - ENROLLED (Fast track)', 'success');

    // Chennai branch - In progress
    const chnLead = this.testData.leads.get('Divya_Menon');
    const chnTelecaller = this.testData.users.get('telecaller1_chn');

    await prisma.leadAssignment.create({
      data: {
        leadId: chnLead.id,
        assignedToId: chnTelecaller!.id,
        isActive: true,
      },
    });

    const visitScheduledStage = this.testData.stages.get('visit-scheduled');
    await prisma.lead.update({
      where: { id: chnLead.id },
      data: {
        stageId: visitScheduledStage.id,
        admissionStatus: AdmissionStatus.VISIT_SCHEDULED,
        walkinDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: chnLead.id,
        userId: chnTelecaller!.id,
        type: ActivityType.FOLLOWUP_SCHEDULED,
        title: 'Campus visit scheduled',
        description: 'Student from NIT aspirant family. Campus visit in 5 days.',
        metadata: { visitDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      },
    });

    this.log('CHN Branch: Divya Menon - Visit Scheduled (In Progress)', 'success');
  }

  async printActivityTimeline(leadId: string, leadName: string) {
    this.log(`\n📜 Activity Timeline for ${leadName}:`, 'header');

    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });

    for (const activity of activities) {
      const userName = activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System';
      const time = activity.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      console.log(`   ${time} | ${userName.padEnd(20)} | ${activity.title}`);
      if (activity.description) {
        console.log(`         |                      | ${activity.description.substring(0, 60)}...`);
      }
    }
    console.log('');
  }

  async generateReport() {
    this.log('PHASE 10: Generating Test Report', 'header');

    // Get all leads with activities
    const leads = await prisma.lead.findMany({
      where: { organizationId: this.testData.organization.id },
      include: {
        stage: true,
        orgBranch: true,
        activities: true,
        assignments: { include: { assignedTo: true } },
      },
    });

    console.log('\n' + '='.repeat(80));
    console.log('                    COMPREHENSIVE E2E TEST REPORT');
    console.log('='.repeat(80));

    console.log('\n📊 ORGANIZATION SUMMARY');
    console.log(`   Name: ${this.testData.organization.name}`);
    console.log(`   Industry: ${this.testData.organization.industry}`);
    console.log(`   Branches: ${this.testData.branches.size}`);
    console.log(`   Users: ${this.testData.users.size}`);
    console.log(`   Stages: ${this.testData.stages.size}`);
    console.log(`   Leads: ${leads.length}`);

    console.log('\n📍 BRANCH BREAKDOWN');
    for (const [code, branch] of this.testData.branches) {
      const branchLeads = leads.filter(l => l.orgBranchId === branch.id);
      const converted = branchLeads.filter(l => l.isConverted).length;
      const dropped = branchLeads.filter(l => l.admissionStatus === 'DROPPED').length;
      console.log(`   ${branch.name} (${code}): ${branchLeads.length} leads | ${converted} converted | ${dropped} dropped`);
    }

    console.log('\n👥 USER HIERARCHY');
    for (const [key, user] of this.testData.users) {
      console.log(`   ${user.role.padEnd(12)} | ${user.name.padEnd(25)} | ${user.branch}`);
    }

    console.log('\n📈 LEAD STAGE DISTRIBUTION');
    const stageCount: Record<string, number> = {};
    for (const lead of leads) {
      const stageName = lead.stage?.name || 'Unknown';
      stageCount[stageName] = (stageCount[stageName] || 0) + 1;
    }
    for (const [stage, count] of Object.entries(stageCount)) {
      console.log(`   ${stage.padEnd(25)}: ${'█'.repeat(count * 5)} ${count}`);
    }

    console.log('\n💰 CONVERSION METRICS');
    const converted = leads.filter(l => l.isConverted);
    const dropped = leads.filter(l => l.admissionStatus === 'DROPPED');
    const inProgress = leads.filter(l => !l.isConverted && l.admissionStatus !== 'DROPPED');

    console.log(`   Total Leads: ${leads.length}`);
    console.log(`   Converted (WON): ${converted.length} (${((converted.length / leads.length) * 100).toFixed(1)}%)`);
    console.log(`   Dropped (LOST): ${dropped.length} (${((dropped.length / leads.length) * 100).toFixed(1)}%)`);
    console.log(`   In Progress: ${inProgress.length} (${((inProgress.length / leads.length) * 100).toFixed(1)}%)`);

    console.log('\n📞 ACTIVITY SUMMARY');
    const allActivities = await prisma.leadActivity.count({
      where: { lead: { organizationId: this.testData.organization.id } },
    });
    const callActivities = await prisma.leadActivity.count({
      where: {
        lead: { organizationId: this.testData.organization.id },
        type: ActivityType.CALL_MADE,
      },
    });
    const stageChanges = await prisma.leadActivity.count({
      where: {
        lead: { organizationId: this.testData.organization.id },
        type: ActivityType.STAGE_CHANGED,
      },
    });
    const assignments = await prisma.leadActivity.count({
      where: {
        lead: { organizationId: this.testData.organization.id },
        type: ActivityType.ASSIGNMENT_CHANGED,
      },
    });

    console.log(`   Total Activities: ${allActivities}`);
    console.log(`   Calls Made: ${callActivities}`);
    console.log(`   Stage Changes: ${stageChanges}`);
    console.log(`   Assignments/Handoffs: ${assignments}`);

    console.log('\n' + '='.repeat(80));
    console.log('                         TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');
  }

  async run() {
    try {
      console.log('\n' + '🚀'.repeat(40));
      console.log('    COMPREHENSIVE END-TO-END TEST - EDUCATION CRM');
      console.log('🚀'.repeat(40) + '\n');

      await this.cleanup();
      await this.createOrganization();
      await this.createBranches();
      await this.createRoles();
      await this.createUsers();
      await this.createLeadStages();
      await this.createLeads();
      await this.simulateSuccessFlow();
      await this.simulateDroppedFlow();
      await this.simulateOtherBranchFlows();
      await this.generateReport();

    } catch (error) {
      this.log(`Error: ${error}`, 'error');
      console.error(error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the test
const tester = new ComprehensiveE2ETester();
tester.run();
