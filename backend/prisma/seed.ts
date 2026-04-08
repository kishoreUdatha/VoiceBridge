import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with role-based data...\n');

  // ==================== ORGANIZATION ====================
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Education Institute',
      slug: 'demo-org',
      email: 'info@demo-edu.com',
      phone: '+91-9876543210',
      address: '123 Education Street, Knowledge Park, Mumbai - 400001',
      isActive: true,
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
      },
    },
  });
  console.log('✅ Organization:', organization.name);

  // ==================== ROLES ====================
  const adminRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'admin' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Admin',
      slug: 'admin',
      description: 'Full system access - Can manage users, settings, and all data',
      permissions: ['*'],
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'manager' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Manager',
      slug: 'manager',
      description: 'Team management - Can view reports, manage team leads, and campaigns',
      permissions: ['leads:*', 'users:read', 'campaigns:*', 'reports:*', 'forms:read'],
    },
  });

  const teamLeadRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'team_lead' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Team Lead',
      slug: 'team_lead',
      description: 'Team supervision - Can monitor telecallers, view team reports and analytics',
      permissions: ['leads:*', 'users:read', 'reports:read', 'analytics:read'],
    },
  });

  const counselorRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'counselor' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Counselor',
      slug: 'counselor',
      description: 'Lead counseling - Can manage assigned leads, follow-ups, and notes',
      permissions: ['leads:read', 'leads:update', 'campaigns:read', 'forms:read'],
    },
  });

  const telecallerRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'telecaller' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Telecaller',
      slug: 'telecaller',
      description: 'Initial contact - Can call leads and update basic information',
      permissions: ['leads:read', 'leads:update'],
    },
  });

  const fieldSalesRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'field_sales' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Field Sales',
      slug: 'field_sales',
      description: 'Field sales representative - Visits colleges, manages deals and expenses',
      permissions: ['field_sales:*', 'colleges:*', 'visits:*', 'deals:*', 'expenses:*'],
    },
  });
  console.log('✅ Roles: Admin, Manager, Team Lead, Counselor, Telecaller, Field Sales');

  // ==================== USERS BY ROLE ====================
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // ----- ADMIN USERS -----
  const admin1 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      phone: '+91-9876543210',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'superadmin@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'superadmin@demo.com',
      password: hashedPassword,
      firstName: 'Vikram',
      lastName: 'Malhotra',
      phone: '+91-9876543200',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  // ----- MANAGER USERS -----
  const manager1 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'manager@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'manager@demo.com',
      password: hashedPassword,
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+91-9876543211',
      roleId: managerRole.id,
      isActive: true,
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'manager2@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'manager2@demo.com',
      password: hashedPassword,
      firstName: 'Suresh',
      lastName: 'Menon',
      phone: '+91-9876543201',
      roleId: managerRole.id,
      isActive: true,
    },
  });

  // ----- COUNSELOR USERS -----
  const counselor1 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'counselor@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'counselor@demo.com',
      password: hashedPassword,
      firstName: 'Amit',
      lastName: 'Patel',
      phone: '+91-9876543212',
      roleId: counselorRole.id,
      isActive: true,
    },
  });

  const counselor2 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'counselor2@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'counselor2@demo.com',
      password: hashedPassword,
      firstName: 'Sneha',
      lastName: 'Reddy',
      phone: '+91-9876543213',
      roleId: counselorRole.id,
      isActive: true,
    },
  });

  const counselor3 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'counselor3@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'counselor3@demo.com',
      password: hashedPassword,
      firstName: 'Neha',
      lastName: 'Gupta',
      phone: '+91-9876543202',
      roleId: counselorRole.id,
      isActive: true,
    },
  });

  // ----- TELECALLER USERS -----
  const telecaller1 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'telecaller@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'telecaller@demo.com',
      password: hashedPassword,
      firstName: 'Rahul',
      lastName: 'Singh',
      phone: '+91-9876543214',
      roleId: telecallerRole.id,
      isActive: true,
    },
  });

  const telecaller2 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'telecaller2@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'telecaller2@demo.com',
      password: hashedPassword,
      firstName: 'Pooja',
      lastName: 'Verma',
      phone: '+91-9876543203',
      roleId: telecallerRole.id,
      isActive: true,
    },
  });

  const telecaller3 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'telecaller3@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'telecaller3@demo.com',
      password: hashedPassword,
      firstName: 'Karan',
      lastName: 'Thakur',
      phone: '+91-9876543204',
      roleId: telecallerRole.id,
      isActive: true,
    },
  });

  // ----- FIELD SALES USERS -----
  const fieldSales1 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'fieldsales@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'fieldsales@demo.com',
      password: hashedPassword,
      firstName: 'Venkat',
      lastName: 'Rao',
      phone: '+91-9876543301',
      roleId: fieldSalesRole.id,
      isActive: true,
    },
  });

  const fieldSales2 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'fieldsales2@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'fieldsales2@demo.com',
      password: hashedPassword,
      firstName: 'Lakshmi',
      lastName: 'Naidu',
      phone: '+91-9876543302',
      roleId: fieldSalesRole.id,
      isActive: true,
    },
  });

  const fieldSales3 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'fieldsales3@demo.com' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'fieldsales3@demo.com',
      password: hashedPassword,
      firstName: 'Srikanth',
      lastName: 'Reddy',
      phone: '+91-9876543303',
      roleId: fieldSalesRole.id,
      isActive: true,
    },
  });

  console.log('✅ Users: 2 Admins, 2 Managers, 3 Counselors, 3 Telecallers, 3 Field Sales');

  // ==================== LEAD STAGES ====================
  const stages = [
    { name: 'New', slug: 'new', color: '#3B82F6', order: 1, isDefault: true },
    { name: 'Contacted', slug: 'contacted', color: '#8B5CF6', order: 2 },
    { name: 'Qualified', slug: 'qualified', color: '#10B981', order: 3 },
    { name: 'Proposal', slug: 'proposal', color: '#F59E0B', order: 4 },
    { name: 'Negotiation', slug: 'negotiation', color: '#EF4444', order: 5 },
    { name: 'Enrolled', slug: 'enrolled', color: '#22C55E', order: 6 },
    { name: 'Lost', slug: 'lost', color: '#6B7280', order: 7 },
  ];

  const createdStages: Record<string, any> = {};
  for (const stage of stages) {
    createdStages[stage.slug] = await prisma.leadStage.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: stage.slug } },
      update: {},
      create: { organizationId: organization.id, ...stage },
    });
  }
  console.log('✅ Lead Stages: 7 stages created');

  // ==================== LEAD SUB-STAGES ====================
  const subStages = [
    { stageSlug: 'new', name: 'Fresh Lead', slug: 'fresh-lead', color: '#93C5FD' },
    { stageSlug: 'new', name: 'Callback Requested', slug: 'callback-requested', color: '#60A5FA' },
    { stageSlug: 'contacted', name: 'Call Connected', slug: 'call-connected', color: '#A78BFA' },
    { stageSlug: 'contacted', name: 'Email Sent', slug: 'email-sent', color: '#C4B5FD' },
    { stageSlug: 'contacted', name: 'WhatsApp Sent', slug: 'whatsapp-sent', color: '#DDD6FE' },
    { stageSlug: 'qualified', name: 'Interested', slug: 'interested', color: '#6EE7B7' },
    { stageSlug: 'qualified', name: 'Walk-in Scheduled', slug: 'walkin-scheduled', color: '#34D399' },
    { stageSlug: 'proposal', name: 'Fee Discussion', slug: 'fee-discussion', color: '#FCD34D' },
    { stageSlug: 'proposal', name: 'Documents Pending', slug: 'documents-pending', color: '#FBBF24' },
    { stageSlug: 'negotiation', name: 'Discount Requested', slug: 'discount-requested', color: '#F87171' },
    { stageSlug: 'negotiation', name: 'Payment Plan Discussion', slug: 'payment-plan', color: '#FCA5A5' },
    { stageSlug: 'enrolled', name: 'Partial Payment', slug: 'partial-payment', color: '#86EFAC' },
    { stageSlug: 'enrolled', name: 'Full Payment', slug: 'full-payment', color: '#4ADE80' },
    { stageSlug: 'lost', name: 'Not Interested', slug: 'not-interested', color: '#9CA3AF' },
    { stageSlug: 'lost', name: 'Joined Competitor', slug: 'joined-competitor', color: '#D1D5DB' },
    { stageSlug: 'lost', name: 'Budget Issue', slug: 'budget-issue', color: '#E5E7EB' },
  ];

  for (const subStage of subStages) {
    const parentStage = createdStages[subStage.stageSlug];
    await prisma.leadSubStage.upsert({
      where: { stageId_slug: { stageId: parentStage.id, slug: subStage.slug } },
      update: {},
      create: {
        stageId: parentStage.id,
        name: subStage.name,
        slug: subStage.slug,
        color: subStage.color,
      },
    });
  }
  console.log('✅ Lead Sub-Stages: 16 sub-stages created');

  // ==================== CHANNELS ====================
  const channels = [
    { name: 'Website', slug: 'website', type: 'WEBSITE' as const },
    { name: 'Facebook Ads', slug: 'facebook-ads', type: 'AD' as const },
    { name: 'Instagram Ads', slug: 'instagram-ads', type: 'AD' as const },
    { name: 'Google Ads', slug: 'google-ads', type: 'AD' as const },
    { name: 'LinkedIn', slug: 'linkedin', type: 'SOCIAL' as const },
    { name: 'Referral', slug: 'referral', type: 'REFERRAL' as const },
    { name: 'Walk-in', slug: 'walkin', type: 'DIRECT' as const },
    { name: 'Phone Inquiry', slug: 'phone-inquiry', type: 'DIRECT' as const },
    { name: 'Shiksha.com', slug: 'shiksha', type: 'PARTNER' as const },
    { name: 'CollegeDunia', slug: 'collegedunia', type: 'PARTNER' as const },
    { name: 'Education Fair', slug: 'education-fair', type: 'OTHER' as const },
    { name: 'Newspaper Ad', slug: 'newspaper-ad', type: 'OTHER' as const },
  ];

  const createdChannels: Record<string, any> = {};
  for (const channel of channels) {
    createdChannels[channel.slug] = await prisma.channel.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: channel.slug } },
      update: {},
      create: { organizationId: organization.id, ...channel },
    });
  }
  console.log('✅ Channels: 12 channels created');

  // ==================== TAXONOMIES ====================
  const courseLevels = [
    { name: 'Undergraduate', slug: 'undergraduate' },
    { name: 'Postgraduate', slug: 'postgraduate' },
    { name: 'Diploma', slug: 'diploma' },
    { name: 'Certificate', slug: 'certificate' },
  ];

  const createdLevels: Record<string, any> = {};
  for (const level of courseLevels) {
    createdLevels[level.slug] = await prisma.taxonomy.upsert({
      where: { organizationId_type_slug: { organizationId: organization.id, type: 'COURSE_LEVEL', slug: level.slug } },
      update: {},
      create: { organizationId: organization.id, type: 'COURSE_LEVEL', ...level },
    });
  }

  const courses = [
    { name: 'B.Tech Computer Science', slug: 'btech-cs', parentSlug: 'undergraduate' },
    { name: 'B.Tech Electronics', slug: 'btech-ece', parentSlug: 'undergraduate' },
    { name: 'B.Tech Mechanical', slug: 'btech-mech', parentSlug: 'undergraduate' },
    { name: 'BBA', slug: 'bba', parentSlug: 'undergraduate' },
    { name: 'BCA', slug: 'bca', parentSlug: 'undergraduate' },
    { name: 'B.Com', slug: 'bcom', parentSlug: 'undergraduate' },
    { name: 'MBA', slug: 'mba', parentSlug: 'postgraduate' },
    { name: 'M.Tech', slug: 'mtech', parentSlug: 'postgraduate' },
    { name: 'MCA', slug: 'mca', parentSlug: 'postgraduate' },
    { name: 'M.Com', slug: 'mcom', parentSlug: 'postgraduate' },
    { name: 'Diploma in Engineering', slug: 'diploma-eng', parentSlug: 'diploma' },
    { name: 'Diploma in Management', slug: 'diploma-mgmt', parentSlug: 'diploma' },
    { name: 'Digital Marketing', slug: 'digital-marketing', parentSlug: 'certificate' },
    { name: 'Data Science', slug: 'data-science', parentSlug: 'certificate' },
    { name: 'Web Development', slug: 'web-dev', parentSlug: 'certificate' },
  ];

  const createdCourses: Record<string, any> = {};
  for (const course of courses) {
    createdCourses[course.slug] = await prisma.taxonomy.upsert({
      where: { organizationId_type_slug: { organizationId: organization.id, type: 'COURSE', slug: course.slug } },
      update: {},
      create: {
        organizationId: organization.id,
        type: 'COURSE',
        name: course.name,
        slug: course.slug,
        parentId: createdLevels[course.parentSlug].id,
      },
    });
  }

  const branches = [
    { name: 'Artificial Intelligence', slug: 'ai' },
    { name: 'Machine Learning', slug: 'ml' },
    { name: 'Cyber Security', slug: 'cyber-security' },
    { name: 'Cloud Computing', slug: 'cloud-computing' },
    { name: 'Finance', slug: 'finance' },
    { name: 'Marketing', slug: 'marketing' },
    { name: 'Human Resources', slug: 'hr' },
    { name: 'Operations', slug: 'operations' },
  ];

  for (const branch of branches) {
    await prisma.taxonomy.upsert({
      where: { organizationId_type_slug: { organizationId: organization.id, type: 'BRANCH', slug: branch.slug } },
      update: {},
      create: { organizationId: organization.id, type: 'BRANCH', ...branch },
    });
  }

  const centers = [
    { name: 'Mumbai Campus', slug: 'mumbai' },
    { name: 'Delhi Campus', slug: 'delhi' },
    { name: 'Bangalore Campus', slug: 'bangalore' },
    { name: 'Hyderabad Campus', slug: 'hyderabad' },
    { name: 'Chennai Campus', slug: 'chennai' },
    { name: 'Pune Campus', slug: 'pune' },
  ];

  for (const center of centers) {
    await prisma.taxonomy.upsert({
      where: { organizationId_type_slug: { organizationId: organization.id, type: 'CENTER', slug: center.slug } },
      update: {},
      create: { organizationId: organization.id, type: 'CENTER', ...center },
    });
  }
  console.log('✅ Taxonomies: Course Levels, Courses, Branches, Centers');

  // ==================== CUSTOM FIELDS ====================
  const customFields = [
    { name: 'LinkedIn Profile', slug: 'linkedin-profile', fieldType: 'TEXT' as const },
    { name: 'How did you hear about us?', slug: 'how-heard', fieldType: 'SELECT' as const, options: ['Google', 'Friend', 'Social Media', 'Advertisement', 'Other'] },
    { name: 'Preferred Batch Timing', slug: 'batch-timing', fieldType: 'SELECT' as const, options: ['Morning', 'Afternoon', 'Evening', 'Weekend'] },
    { name: 'Work Experience (Years)', slug: 'work-experience', fieldType: 'NUMBER' as const },
    { name: 'Current Company', slug: 'current-company', fieldType: 'TEXT' as const },
    { name: 'Expected Joining Date', slug: 'joining-date', fieldType: 'DATE' as const },
    { name: 'Scholarship Required', slug: 'scholarship', fieldType: 'CHECKBOX' as const },
    { name: 'Additional Notes', slug: 'additional-notes', fieldType: 'TEXTAREA' as const },
  ];

  for (const field of customFields) {
    await prisma.customField.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: field.slug } },
      update: {},
      create: {
        organizationId: organization.id,
        name: field.name,
        slug: field.slug,
        fieldType: field.fieldType,
        options: field.options || [],
      },
    });
  }
  console.log('✅ Custom Fields: 8 fields created');

  // ==================== LEADS DATA ====================
  // Leads assigned to COUNSELOR 1 (counselor@demo.com)
  const counselor1Leads = [
    { firstName: 'Aarav', lastName: 'Mehta', email: 'aarav.mehta@gmail.com', phone: '+91-9001234501', source: 'WEBSITE' as const, priority: 'HIGH' as const, stageSlug: 'qualified', channelSlug: 'website', courseSlug: 'btech-cs', city: 'Mumbai', state: 'Maharashtra' },
    { firstName: 'Ananya', lastName: 'Sharma', email: 'ananya.sharma@gmail.com', phone: '+91-9001234502', source: 'AD_FACEBOOK' as const, priority: 'URGENT' as const, stageSlug: 'proposal', channelSlug: 'facebook-ads', courseSlug: 'mba', city: 'Delhi', state: 'Delhi' },
    { firstName: 'Vihaan', lastName: 'Patel', email: 'vihaan.patel@gmail.com', phone: '+91-9001234503', source: 'REFERRAL' as const, priority: 'HIGH' as const, stageSlug: 'negotiation', channelSlug: 'referral', courseSlug: 'bca', city: 'Ahmedabad', state: 'Gujarat' },
    { firstName: 'Diya', lastName: 'Reddy', email: 'diya.reddy@gmail.com', phone: '+91-9001234504', source: 'FORM' as const, priority: 'MEDIUM' as const, stageSlug: 'enrolled', channelSlug: 'website', courseSlug: 'digital-marketing', city: 'Hyderabad', state: 'Telangana' },
    { firstName: 'Arjun', lastName: 'Singh', email: 'arjun.singh@gmail.com', phone: '+91-9001234505', source: 'SHIKSHA' as const, priority: 'HIGH' as const, stageSlug: 'qualified', channelSlug: 'shiksha', courseSlug: 'mtech', city: 'Bangalore', state: 'Karnataka' },
    { firstName: 'Ishaan', lastName: 'Kumar', email: 'ishaan.kumar@gmail.com', phone: '+91-9001234506', source: 'WEBSITE' as const, priority: 'LOW' as const, stageSlug: 'contacted', channelSlug: 'google-ads', courseSlug: 'bba', city: 'Chennai', state: 'Tamil Nadu' },
  ];

  // Leads assigned to COUNSELOR 2 (counselor2@demo.com)
  const counselor2Leads = [
    { firstName: 'Saanvi', lastName: 'Gupta', email: 'saanvi.gupta@gmail.com', phone: '+91-9001234507', source: 'MANUAL' as const, priority: 'MEDIUM' as const, stageSlug: 'proposal', channelSlug: 'walkin', courseSlug: 'data-science', city: 'Pune', state: 'Maharashtra' },
    { firstName: 'Reyansh', lastName: 'Joshi', email: 'reyansh.joshi@gmail.com', phone: '+91-9001234508', source: 'COLLEGEDUNIA' as const, priority: 'HIGH' as const, stageSlug: 'qualified', channelSlug: 'collegedunia', courseSlug: 'btech-ece', city: 'Jaipur', state: 'Rajasthan' },
    { firstName: 'Aadya', lastName: 'Verma', email: 'aadya.verma@gmail.com', phone: '+91-9001234509', source: 'LANDING_PAGE' as const, priority: 'URGENT' as const, stageSlug: 'negotiation', channelSlug: 'instagram-ads', courseSlug: 'mca', city: 'Kolkata', state: 'West Bengal' },
    { firstName: 'Kabir', lastName: 'Choudhury', email: 'kabir.c@gmail.com', phone: '+91-9001234510', source: 'AD_INSTAGRAM' as const, priority: 'MEDIUM' as const, stageSlug: 'enrolled', channelSlug: 'instagram-ads', courseSlug: 'web-dev', city: 'Lucknow', state: 'Uttar Pradesh' },
    { firstName: 'Myra', lastName: 'Iyer', email: 'myra.iyer@gmail.com', phone: '+91-9001234511', source: 'WEBSITE' as const, priority: 'HIGH' as const, stageSlug: 'contacted', channelSlug: 'website', courseSlug: 'bcom', city: 'Kochi', state: 'Kerala' },
    { firstName: 'Advait', lastName: 'Nair', email: 'advait.nair@gmail.com', phone: '+91-9001234512', source: 'FORM' as const, priority: 'LOW' as const, stageSlug: 'lost', channelSlug: 'education-fair', courseSlug: 'diploma-eng', city: 'Coimbatore', state: 'Tamil Nadu' },
  ];

  // Leads assigned to COUNSELOR 3 (counselor3@demo.com)
  const counselor3Leads = [
    { firstName: 'Kiara', lastName: 'Menon', email: 'kiara.menon@gmail.com', phone: '+91-9001234513', source: 'REFERRAL' as const, priority: 'MEDIUM' as const, stageSlug: 'proposal', channelSlug: 'referral', courseSlug: 'btech-mech', city: 'Indore', state: 'Madhya Pradesh' },
    { firstName: 'Vivaan', lastName: 'Rao', email: 'vivaan.rao@gmail.com', phone: '+91-9001234514', source: 'WEBSITE' as const, priority: 'HIGH' as const, stageSlug: 'qualified', channelSlug: 'linkedin', courseSlug: 'mba', city: 'Nagpur', state: 'Maharashtra' },
    { firstName: 'Anika', lastName: 'Das', email: 'anika.das@gmail.com', phone: '+91-9001234515', source: 'MANUAL' as const, priority: 'URGENT' as const, stageSlug: 'enrolled', channelSlug: 'phone-inquiry', courseSlug: 'btech-cs', city: 'Bhopal', state: 'Madhya Pradesh' },
    { firstName: 'Rudra', lastName: 'Pillai', email: 'rudra.pillai@gmail.com', phone: '+91-9001234516', source: 'AD_FACEBOOK' as const, priority: 'MEDIUM' as const, stageSlug: 'contacted', channelSlug: 'facebook-ads', courseSlug: 'diploma-mgmt', city: 'Chandigarh', state: 'Chandigarh' },
    { firstName: 'Pari', lastName: 'Saxena', email: 'pari.saxena@gmail.com', phone: '+91-9001234517', source: 'SHIKSHA' as const, priority: 'HIGH' as const, stageSlug: 'negotiation', channelSlug: 'shiksha', courseSlug: 'mcom', city: 'Patna', state: 'Bihar' },
  ];

  // Leads assigned to TELECALLER 1 (telecaller@demo.com) - New leads for calling
  const telecaller1Leads = [
    { firstName: 'Atharv', lastName: 'Bose', email: 'atharv.bose@gmail.com', phone: '+91-9001234518', source: 'LANDING_PAGE' as const, priority: 'HIGH' as const, stageSlug: 'new', channelSlug: 'newspaper-ad', courseSlug: 'bca', city: 'Ranchi', state: 'Jharkhand' },
    { firstName: 'Navya', lastName: 'Agarwal', email: 'navya.agarwal@gmail.com', phone: '+91-9001234519', source: 'WEBSITE' as const, priority: 'MEDIUM' as const, stageSlug: 'new', channelSlug: 'website', courseSlug: 'data-science', city: 'Surat', state: 'Gujarat' },
    { firstName: 'Dhruv', lastName: 'Kapoor', email: 'dhruv.kapoor@gmail.com', phone: '+91-9001234520', source: 'REFERRAL' as const, priority: 'HIGH' as const, stageSlug: 'new', channelSlug: 'referral', courseSlug: 'btech-cs', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { firstName: 'Riya', lastName: 'Malhotra', email: 'riya.m@gmail.com', phone: '+91-9001234521', source: 'AD_FACEBOOK' as const, priority: 'URGENT' as const, stageSlug: 'new', channelSlug: 'facebook-ads', courseSlug: 'mba', city: 'Gurgaon', state: 'Haryana' },
    { firstName: 'Arnav', lastName: 'Chopra', email: 'arnav.c@gmail.com', phone: '+91-9001234522', source: 'WEBSITE' as const, priority: 'MEDIUM' as const, stageSlug: 'new', channelSlug: 'google-ads', courseSlug: 'btech-ece', city: 'Noida', state: 'Uttar Pradesh' },
  ];

  // Leads assigned to TELECALLER 2 (telecaller2@demo.com)
  const telecaller2Leads = [
    { firstName: 'Tara', lastName: 'Bajaj', email: 'tara.b@gmail.com', phone: '+91-9001234523', source: 'SHIKSHA' as const, priority: 'HIGH' as const, stageSlug: 'new', channelSlug: 'shiksha', courseSlug: 'mca', city: 'Ahmedabad', state: 'Gujarat' },
    { firstName: 'Yash', lastName: 'Khanna', email: 'yash.k@gmail.com', phone: '+91-9001234524', source: 'COLLEGEDUNIA' as const, priority: 'MEDIUM' as const, stageSlug: 'new', channelSlug: 'collegedunia', courseSlug: 'bba', city: 'Pune', state: 'Maharashtra' },
    { firstName: 'Anvi', lastName: 'Bhatt', email: 'anvi.b@gmail.com', phone: '+91-9001234525', source: 'FORM' as const, priority: 'HIGH' as const, stageSlug: 'new', channelSlug: 'website', courseSlug: 'digital-marketing', city: 'Jaipur', state: 'Rajasthan' },
    { firstName: 'Veer', lastName: 'Tandon', email: 'veer.t@gmail.com', phone: '+91-9001234526', source: 'LANDING_PAGE' as const, priority: 'LOW' as const, stageSlug: 'new', channelSlug: 'instagram-ads', courseSlug: 'web-dev', city: 'Chandigarh', state: 'Chandigarh' },
    { firstName: 'Ira', lastName: 'Sinha', email: 'ira.s@gmail.com', phone: '+91-9001234527', source: 'WEBSITE' as const, priority: 'MEDIUM' as const, stageSlug: 'new', channelSlug: 'linkedin', courseSlug: 'mtech', city: 'Kolkata', state: 'West Bengal' },
  ];

  // Leads assigned to TELECALLER 3 (telecaller3@demo.com)
  const telecaller3Leads = [
    { firstName: 'Shaurya', lastName: 'Oberoi', email: 'shaurya.o@gmail.com', phone: '+91-9001234528', source: 'AD_INSTAGRAM' as const, priority: 'URGENT' as const, stageSlug: 'new', channelSlug: 'instagram-ads', courseSlug: 'btech-cs', city: 'Mumbai', state: 'Maharashtra' },
    { firstName: 'Aanya', lastName: 'Kapoor', email: 'aanya.k@gmail.com', phone: '+91-9001234529', source: 'REFERRAL' as const, priority: 'HIGH' as const, stageSlug: 'new', channelSlug: 'referral', courseSlug: 'mba', city: 'Delhi', state: 'Delhi' },
    { firstName: 'Aarush', lastName: 'Mehra', email: 'aarush.m@gmail.com', phone: '+91-9001234530', source: 'WEBSITE' as const, priority: 'MEDIUM' as const, stageSlug: 'new', channelSlug: 'website', courseSlug: 'bca', city: 'Bangalore', state: 'Karnataka' },
    { firstName: 'Kavya', lastName: 'Rajan', email: 'kavya.r@gmail.com', phone: '+91-9001234531', source: 'MANUAL' as const, priority: 'HIGH' as const, stageSlug: 'new', channelSlug: 'walkin', courseSlug: 'data-science', city: 'Hyderabad', state: 'Telangana' },
    { firstName: 'Rehan', lastName: 'Ali', email: 'rehan.a@gmail.com', phone: '+91-9001234532', source: 'AD_FACEBOOK' as const, priority: 'LOW' as const, stageSlug: 'new', channelSlug: 'facebook-ads', courseSlug: 'bcom', city: 'Chennai', state: 'Tamil Nadu' },
  ];

  // Create all leads and assignments
  const allLeadsConfig = [
    { leads: counselor1Leads, assignee: counselor1, role: 'Counselor 1' },
    { leads: counselor2Leads, assignee: counselor2, role: 'Counselor 2' },
    { leads: counselor3Leads, assignee: counselor3, role: 'Counselor 3' },
    { leads: telecaller1Leads, assignee: telecaller1, role: 'Telecaller 1' },
    { leads: telecaller2Leads, assignee: telecaller2, role: 'Telecaller 2' },
    { leads: telecaller3Leads, assignee: telecaller3, role: 'Telecaller 3' },
  ];

  const allCreatedLeads: Record<string, any[]> = {};

  for (const config of allLeadsConfig) {
    allCreatedLeads[config.role] = [];
    for (const lead of config.leads) {
      const createdLead = await prisma.lead.create({
        data: {
          organizationId: organization.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          priority: lead.priority,
          stageId: createdStages[lead.stageSlug].id,
          channelId: createdChannels[lead.channelSlug].id,
          courseId: createdCourses[lead.courseSlug].id,
          city: lead.city,
          state: lead.state,
          country: 'India',
        },
      });

      await prisma.leadAssignment.create({
        data: {
          leadId: createdLead.id,
          assignedToId: config.assignee.id,
          assignedById: admin1.id,
        },
      });

      allCreatedLeads[config.role].push(createdLead);
    }
  }
  console.log('✅ Leads: 32 leads created and assigned to users');

  // ==================== FOLLOW-UPS FOR EACH USER ====================
  // Counselor 1 follow-ups
  for (let i = 0; i < 4; i++) {
    await prisma.followUp.create({
      data: {
        leadId: allCreatedLeads['Counselor 1'][i].id,
        assigneeId: counselor1.id,
        createdById: manager1.id,
        scheduledAt: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        message: ['Discuss course curriculum', 'Fee negotiation call', 'Document collection', 'Final enrollment call'][i],
        status: 'UPCOMING',
      },
    });
  }

  // Counselor 2 follow-ups
  for (let i = 0; i < 4; i++) {
    await prisma.followUp.create({
      data: {
        leadId: allCreatedLeads['Counselor 2'][i].id,
        assigneeId: counselor2.id,
        createdById: manager1.id,
        scheduledAt: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        message: ['Schedule campus visit', 'Scholarship discussion', 'Payment plan call', 'Batch confirmation'][i],
        status: 'UPCOMING',
      },
    });
  }

  // Counselor 3 follow-ups
  for (let i = 0; i < 3; i++) {
    await prisma.followUp.create({
      data: {
        leadId: allCreatedLeads['Counselor 3'][i].id,
        assigneeId: counselor3.id,
        createdById: manager2.id,
        scheduledAt: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        message: ['Initial counseling call', 'Faculty introduction', 'Course details discussion'][i],
        status: 'UPCOMING',
      },
    });
  }

  // Telecaller follow-ups (callback requests)
  for (let i = 0; i < 3; i++) {
    await prisma.followUp.create({
      data: {
        leadId: allCreatedLeads['Telecaller 1'][i].id,
        assigneeId: telecaller1.id,
        createdById: manager1.id,
        scheduledAt: new Date(Date.now() + i * 2 * 60 * 60 * 1000), // Every 2 hours
        message: 'First contact call - Introduce institute',
        status: 'UPCOMING',
      },
    });
  }

  for (let i = 0; i < 3; i++) {
    await prisma.followUp.create({
      data: {
        leadId: allCreatedLeads['Telecaller 2'][i].id,
        assigneeId: telecaller2.id,
        createdById: manager1.id,
        scheduledAt: new Date(Date.now() + i * 2 * 60 * 60 * 1000),
        message: 'Initial inquiry call',
        status: 'UPCOMING',
      },
    });
  }

  for (let i = 0; i < 3; i++) {
    await prisma.followUp.create({
      data: {
        leadId: allCreatedLeads['Telecaller 3'][i].id,
        assigneeId: telecaller3.id,
        createdById: manager2.id,
        scheduledAt: new Date(Date.now() + i * 2 * 60 * 60 * 1000),
        message: 'Welcome call - Course inquiry',
        status: 'UPCOMING',
      },
    });
  }
  console.log('✅ Follow-ups: Created for all users');

  // ==================== TASKS FOR EACH USER ====================
  // Counselor tasks
  await prisma.leadTask.create({
    data: {
      leadId: allCreatedLeads['Counselor 1'][0].id,
      assigneeId: counselor1.id,
      createdById: manager1.id,
      title: 'Send B.Tech curriculum',
      description: 'Email detailed curriculum with placement stats',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
    },
  });

  await prisma.leadTask.create({
    data: {
      leadId: allCreatedLeads['Counselor 1'][1].id,
      assigneeId: counselor1.id,
      createdById: manager1.id,
      title: 'Prepare fee quotation',
      description: 'Create customized fee structure with EMI options',
      priority: 'URGENT',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
    },
  });

  await prisma.leadTask.create({
    data: {
      leadId: allCreatedLeads['Counselor 2'][0].id,
      assigneeId: counselor2.id,
      createdById: manager1.id,
      title: 'Arrange faculty meeting',
      description: 'Schedule online meeting with Data Science faculty',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
    },
  });

  await prisma.leadTask.create({
    data: {
      leadId: allCreatedLeads['Counselor 3'][0].id,
      assigneeId: counselor3.id,
      createdById: manager2.id,
      title: 'Process scholarship',
      description: 'Verify documents and process merit scholarship application',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
    },
  });

  // Telecaller tasks
  await prisma.leadTask.create({
    data: {
      leadId: allCreatedLeads['Telecaller 1'][0].id,
      assigneeId: telecaller1.id,
      createdById: manager1.id,
      title: 'Complete 20 calls today',
      description: 'Call all new leads and update status',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
    },
  });

  await prisma.leadTask.create({
    data: {
      leadId: allCreatedLeads['Telecaller 2'][0].id,
      assigneeId: telecaller2.id,
      createdById: manager1.id,
      title: 'Follow up pending callbacks',
      description: 'Call back leads who requested callback',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
    },
  });

  await prisma.leadTask.create({
    data: {
      leadId: allCreatedLeads['Telecaller 3'][0].id,
      assigneeId: telecaller3.id,
      createdById: manager2.id,
      title: 'Update lead information',
      description: 'Verify and update contact details for all leads',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
    },
  });
  console.log('✅ Tasks: Created for all users');

  // ==================== NOTES FOR LEADS ====================
  const notesByUser = [
    { leadRole: 'Counselor 1', leadIndex: 0, userId: counselor1.id, content: 'Very interested in AI/ML specialization. Parents supportive. Budget: 8-10 lakhs.' },
    { leadRole: 'Counselor 1', leadIndex: 1, userId: counselor1.id, content: 'Working professional, 5 years experience. Looking for weekend MBA. Needs 10% discount.' },
    { leadRole: 'Counselor 1', leadIndex: 2, userId: counselor1.id, content: 'Final year student. Wants to start after graduation. Scholarship inquiry.' },
    { leadRole: 'Counselor 2', leadIndex: 0, userId: counselor2.id, content: 'Career changer from IT to Data Science. Has coding background.' },
    { leadRole: 'Counselor 2', leadIndex: 1, userId: counselor2.id, content: 'Referred by batch 2023 student. Eligible for referral discount.' },
    { leadRole: 'Counselor 3', leadIndex: 0, userId: counselor3.id, content: 'Looking for hostel facility. Coming from outstation.' },
    { leadRole: 'Counselor 3', leadIndex: 1, userId: counselor3.id, content: 'MBA aspirant with CAT score 95 percentile. Premium candidate.' },
    { leadRole: 'Telecaller 1', leadIndex: 0, userId: telecaller1.id, content: 'Requested callback at 4 PM. Mother will be on call.' },
    { leadRole: 'Telecaller 2', leadIndex: 0, userId: telecaller2.id, content: 'Interested but busy. Call back next week.' },
    { leadRole: 'Telecaller 3', leadIndex: 0, userId: telecaller3.id, content: 'Hot lead - wants to visit campus this weekend.' },
  ];

  for (const note of notesByUser) {
    await prisma.leadNote.create({
      data: {
        leadId: allCreatedLeads[note.leadRole][note.leadIndex].id,
        userId: note.userId,
        content: note.content,
      },
    });
  }
  console.log('✅ Notes: Created for leads');

  // ==================== CALL LOGS ====================
  // Counselor call logs
  const counselorCalls = [
    { leadRole: 'Counselor 1', leadIndex: 0, callerId: counselor1.id, status: 'COMPLETED' as const, duration: 300, notes: 'Detailed discussion about B.Tech CS. Student very interested.' },
    { leadRole: 'Counselor 1', leadIndex: 1, callerId: counselor1.id, status: 'COMPLETED' as const, duration: 480, notes: 'MBA fee negotiation. Will send revised quote.' },
    { leadRole: 'Counselor 2', leadIndex: 0, callerId: counselor2.id, status: 'COMPLETED' as const, duration: 420, notes: 'Data Science course explained. Scheduling demo class.' },
    { leadRole: 'Counselor 2', leadIndex: 1, callerId: counselor2.id, status: 'NO_ANSWER' as const, duration: 0, notes: 'No answer. Try tomorrow morning.' },
    { leadRole: 'Counselor 3', leadIndex: 0, callerId: counselor3.id, status: 'COMPLETED' as const, duration: 360, notes: 'Discussed hostel and transport facilities.' },
  ];

  // Telecaller call logs (more calls, shorter duration)
  const telecallerCalls = [
    { leadRole: 'Telecaller 1', leadIndex: 0, callerId: telecaller1.id, status: 'COMPLETED' as const, duration: 120, notes: 'Interested. Transferring to counselor.' },
    { leadRole: 'Telecaller 1', leadIndex: 1, callerId: telecaller1.id, status: 'COMPLETED' as const, duration: 90, notes: 'Callback requested for evening.' },
    { leadRole: 'Telecaller 1', leadIndex: 2, callerId: telecaller1.id, status: 'BUSY' as const, duration: 0, notes: 'Line busy. Retry in 1 hour.' },
    { leadRole: 'Telecaller 1', leadIndex: 3, callerId: telecaller1.id, status: 'NO_ANSWER' as const, duration: 0, notes: 'No answer.' },
    { leadRole: 'Telecaller 2', leadIndex: 0, callerId: telecaller2.id, status: 'COMPLETED' as const, duration: 180, notes: 'Good conversation. Interested in MCA.' },
    { leadRole: 'Telecaller 2', leadIndex: 1, callerId: telecaller2.id, status: 'COMPLETED' as const, duration: 60, notes: 'Wrong number. Updated contact.' },
    { leadRole: 'Telecaller 2', leadIndex: 2, callerId: telecaller2.id, status: 'COMPLETED' as const, duration: 150, notes: 'Sent brochure on WhatsApp.' },
    { leadRole: 'Telecaller 3', leadIndex: 0, callerId: telecaller3.id, status: 'COMPLETED' as const, duration: 240, notes: 'Hot lead! Wants campus visit.' },
    { leadRole: 'Telecaller 3', leadIndex: 1, callerId: telecaller3.id, status: 'COMPLETED' as const, duration: 90, notes: 'Initial inquiry. Will call back.' },
    { leadRole: 'Telecaller 3', leadIndex: 2, callerId: telecaller3.id, status: 'NO_ANSWER' as const, duration: 0, notes: 'No answer. Try again.' },
  ];

  for (const call of [...counselorCalls, ...telecallerCalls]) {
    const lead = allCreatedLeads[call.leadRole][call.leadIndex];
    await prisma.callLog.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        callerId: call.callerId,
        phoneNumber: lead.phone || '+91-9000000000',
        direction: 'OUTBOUND',
        status: call.status,
        duration: call.duration,
        notes: call.notes,
        startedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log('✅ Call Logs: Created for all users');

  // ==================== FORMS ====================
  await prisma.customForm.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Course Enquiry Form',
        description: 'General enquiry form for prospective students',
        isPublished: true,
        publishedAt: new Date(),
        fields: [
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'phone', required: true },
          { name: 'course', label: 'Interested Course', type: 'select', required: true, options: ['B.Tech', 'MBA', 'BCA', 'MCA', 'Other'] },
        ],
      },
      {
        organizationId: organization.id,
        name: 'Callback Request Form',
        description: 'Quick callback request',
        isPublished: true,
        publishedAt: new Date(),
        fields: [
          { name: 'name', label: 'Full Name', type: 'text', required: true },
          { name: 'phone', label: 'Phone', type: 'phone', required: true },
          { name: 'time', label: 'Preferred Time', type: 'select', options: ['Morning', 'Afternoon', 'Evening'] },
        ],
      },
      {
        organizationId: organization.id,
        name: 'Admission Application',
        description: 'Complete admission form',
        isPublished: true,
        publishedAt: new Date(),
        fields: [
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'phone', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'course', label: 'Course', type: 'select', required: true, options: ['B.Tech CS', 'MBA', 'BCA', 'MCA'] },
        ],
      },
    ],
  });
  console.log('✅ Forms: 3 forms created');

  // ==================== LANDING PAGES ====================
  await prisma.landingPage.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'MBA Admissions 2024',
        slug: 'mba-2024',
        title: 'Transform Your Career with MBA',
        description: 'Top-ranked MBA program',
        isPublished: true,
        publishedAt: new Date(),
        content: { hero: 'MBA Excellence' },
      },
      {
        organizationId: organization.id,
        name: 'B.Tech Engineering',
        slug: 'btech-2024',
        title: 'Build Your Future in Engineering',
        description: 'World-class engineering',
        isPublished: true,
        publishedAt: new Date(),
        content: { hero: 'Engineering Excellence' },
      },
      {
        organizationId: organization.id,
        name: 'Data Science Program',
        slug: 'data-science-2024',
        title: 'Become a Data Scientist',
        description: 'Industry-ready program',
        isPublished: true,
        publishedAt: new Date(),
        content: { hero: 'Data Science Mastery' },
      },
    ],
  });
  console.log('✅ Landing Pages: 3 pages created');

  // ==================== CAMPAIGNS ====================
  await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      createdById: manager1.id,
      name: 'MBA Early Bird Offer',
      type: 'EMAIL',
      subject: '20% Early Bird Discount!',
      content: 'Exclusive discount on MBA program',
      status: 'COMPLETED',
      stats: { sent: 150, delivered: 145, opened: 89, clicked: 34 },
    },
  });

  await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      createdById: manager1.id,
      name: 'Admission Deadline SMS',
      type: 'SMS',
      content: 'Last date 31st March! Apply now.',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      stats: {},
    },
  });

  await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      createdById: manager2.id,
      name: 'New Batch WhatsApp',
      type: 'WHATSAPP',
      content: 'New batch starting April!',
      status: 'DRAFT',
      stats: {},
    },
  });
  console.log('✅ Campaigns: 3 campaigns created');

  // ==================== VOICE AI AGENTS ====================
  const voiceAgents = [
    {
      name: 'Sarah - Education Counselor',
      industry: 'EDUCATION' as const,
      systemPrompt: `You are a friendly and professional education counselor for a university/college. Your role is to:
- Answer questions about courses, fees, eligibility, and admissions
- Qualify leads by collecting their information
- Schedule campus visits or counselor callbacks
- Be helpful, patient, and encouraging about education opportunities

Always be polite and professional. If you don't know something specific, offer to connect them with a human counselor.`,
      voiceId: 'nova',
      greeting: "Hello! Welcome to our institution. I'm Sarah, your AI counselor. How can I help you today with your education journey?",
      fallbackMessage: "I'm sorry, I didn't quite catch that. Could you please repeat?",
      transferMessage: "I'll connect you with a human counselor who can better assist you.",
      endMessage: "Thank you for your interest! We'll be in touch soon. Have a great day!",
      widgetColor: '#3B82F6',
      widgetTitle: 'Education Counselor',
      widgetSubtitle: 'Ask me about courses & admissions',
      temperature: 0.7,
      maxDuration: 600,
      questions: [
        { id: 'name', question: 'May I know your name?', field: 'firstName', required: true },
        { id: 'course', question: 'Which course or program are you interested in?', field: 'courseInterest', required: true },
        { id: 'qualification', question: 'What is your highest qualification?', field: 'qualification', required: true },
        { id: 'phone', question: 'Can I have your phone number for follow-up?', field: 'phone', required: true },
        { id: 'email', question: 'And your email address?', field: 'email', required: false },
      ],
      faqs: [
        { question: 'What courses do you offer?', answer: 'We offer undergraduate, postgraduate, and diploma programs across various disciplines.' },
        { question: 'What are the fees?', answer: 'Fees vary by program. I can provide specific details once you tell me which course interests you.' },
        { question: 'Do you have placements?', answer: 'Yes, we have excellent placement records with top companies recruiting from our campus.' },
      ],
    },
    {
      name: 'Alex - Java Developer Recruiter',
      industry: 'IT_RECRUITMENT' as const,
      systemPrompt: `You are Alex, a professional IT recruiter specializing in hiring Java Developers. Your role is to:

SCREENING OBJECTIVES:
- Screen candidates for Senior Java Developer positions
- Assess Core Java knowledge (Collections, Multithreading, OOP concepts)
- Evaluate Spring Boot and Microservices experience
- Check database skills (SQL, MySQL, PostgreSQL, MongoDB)
- Understand their experience with REST APIs and system design
- Collect salary expectations and availability

TECHNICAL ASSESSMENT AREAS:
1. Core Java: Collections framework, Streams API, Lambda expressions, Multithreading, Exception handling
2. Spring Framework: Spring Boot, Spring MVC, Spring Security, Spring Data JPA
3. Microservices: Service design, API Gateway, Service Discovery, Circuit Breaker patterns
4. Database: SQL queries, JPA/Hibernate, database optimization
5. Tools: Git, Maven/Gradle, Docker, Jenkins, AWS/Azure basics
6. Design Patterns: Singleton, Factory, Builder, Observer, Strategy

CONVERSATION STYLE:
- Be professional, friendly, and encouraging
- Ask one question at a time and wait for the response
- Provide brief acknowledgment before moving to next question
- If candidate seems nervous, reassure them this is just a preliminary screening
- Keep technical questions practical, not tricky

SCORING CRITERIA:
- 0-2 years: Junior level - focus on Core Java basics
- 3-5 years: Mid level - expect Spring Boot proficiency
- 5+ years: Senior level - expect architecture and design knowledge`,
      voiceId: 'onyx',
      greeting: "Hello! I'm Alex, an AI recruiter from SmartGrow Technologies. Thank you for applying for our Senior Java Developer position. I'll be conducting a brief screening call to understand your background and technical expertise. This should take about 10-15 minutes. Shall we begin?",
      fallbackMessage: "I didn't quite catch that. Could you please repeat your answer?",
      transferMessage: "Based on your profile, I'd like to connect you with our technical hiring manager for the next round. Please hold.",
      endMessage: "Excellent! Thank you for your time today. Your profile looks promising for our Java Developer role. Our HR team will reach out within 2-3 business days with next steps. Have a great day!",
      widgetColor: '#8B5CF6',
      widgetTitle: 'Java Developer Hiring',
      widgetSubtitle: 'Senior Java Developer Position',
      temperature: 0.6,
      maxDuration: 900,
      questions: [
        { id: 'name', question: 'May I have your full name please?', field: 'firstName', required: true },
        { id: 'experience', question: 'How many years of experience do you have working with Java?', field: 'experience', required: true },
        { id: 'current_role', question: 'What is your current job title and company?', field: 'currentRole', required: true },
        { id: 'java_version', question: 'Which versions of Java have you worked with? Are you familiar with Java 8 features like Streams and Lambda expressions?', field: 'javaVersion', required: true },
        { id: 'spring_boot', question: 'Do you have experience with Spring Boot? Can you briefly describe a project where you used it?', field: 'springBoot', required: true },
        { id: 'microservices', question: 'Have you worked with Microservices architecture? What tools did you use for service communication?', field: 'microservices', required: true },
        { id: 'database', question: 'Which databases have you worked with? Are you comfortable writing complex SQL queries?', field: 'database', required: true },
        { id: 'rest_api', question: 'Can you explain your experience building REST APIs? What about API security and authentication?', field: 'restApi', required: true },
        { id: 'devops', question: 'Are you familiar with Docker, Kubernetes, or any CI/CD tools like Jenkins?', field: 'devops', required: false },
        { id: 'current_ctc', question: 'What is your current CTC or salary package?', field: 'currentCtc', required: true },
        { id: 'expected_ctc', question: 'What are your salary expectations for this role?', field: 'expectedCtc', required: true },
        { id: 'notice_period', question: 'What is your notice period? Are you open to early joining if required?', field: 'noticePeriod', required: true },
        { id: 'location', question: 'Are you open to working from our Hyderabad office, or do you prefer remote work?', field: 'location', required: true },
      ],
      faqs: [
        { question: 'What is the job role?', answer: 'We are hiring for a Senior Java Developer position. You will be working on building scalable backend services using Java, Spring Boot, and Microservices architecture.' },
        { question: 'What is the salary range?', answer: 'The salary range for this position is between 12 to 25 LPA, depending on experience and skills.' },
        { question: 'Is remote work available?', answer: 'Yes, we offer a hybrid model with 3 days in office and 2 days remote. Fully remote options may be available for senior candidates.' },
        { question: 'What is the tech stack?', answer: 'Our tech stack includes Java 17, Spring Boot 3, PostgreSQL, MongoDB, Kafka, Docker, Kubernetes, and AWS.' },
        { question: 'What are the interview rounds?', answer: 'There are 4 rounds: This AI screening, followed by a technical coding round, a system design round, and finally an HR discussion.' },
        { question: 'What is the company about?', answer: 'SmartGrow Technologies is a fast-growing product company building AI-powered CRM and automation solutions. We have offices in Hyderabad and Bangalore.' },
      ],
    },
    {
      name: 'Priya - Property Advisor',
      industry: 'REAL_ESTATE' as const,
      systemPrompt: `You are a professional real estate advisor. Your role is to:
- Understand buyer's property requirements
- Collect budget and location preferences
- Qualify leads for property viewings
- Schedule site visits

Be helpful and knowledgeable about properties. Build trust and understand the buyer's needs.`,
      voiceId: 'shimmer',
      greeting: "Hello! Welcome to our property advisory service. I'm Priya, here to help you find your dream home. What type of property are you looking for?",
      fallbackMessage: "I'm sorry, could you please repeat that?",
      transferMessage: "I'll connect you with our property expert for a detailed discussion.",
      endMessage: "Thank you for your interest! Our team will share matching properties with you soon.",
      widgetColor: '#10B981',
      widgetTitle: 'Property Advisor',
      widgetSubtitle: 'Find your dream home',
      temperature: 0.7,
      maxDuration: 600,
      questions: [
        { id: 'name', question: 'May I know your name?', field: 'firstName', required: true },
        { id: 'property_type', question: 'Are you looking for an apartment, villa, or plot?', field: 'propertyType', required: true },
        { id: 'bedrooms', question: 'How many bedrooms do you need?', field: 'bedrooms', required: true },
        { id: 'budget', question: 'What is your budget range?', field: 'budget', required: true },
        { id: 'location', question: 'Which location or area do you prefer?', field: 'location', required: true },
        { id: 'phone', question: 'Can I have your contact number for property updates?', field: 'phone', required: true },
      ],
      faqs: [
        { question: 'Do you have ready-to-move properties?', answer: 'Yes, we have both ready-to-move and under-construction properties.' },
        { question: 'What about home loans?', answer: 'We have tie-ups with major banks for easy home loan processing.' },
      ],
    },
    {
      name: 'Maya - Customer Support',
      industry: 'CUSTOMER_CARE' as const,
      systemPrompt: `You are a helpful customer support agent. Your role is to:
- Listen to customer queries and complaints
- Provide solutions or escalate when needed
- Track order/service status
- Ensure customer satisfaction

Be empathetic, patient, and solution-oriented. Apologize for any inconvenience and focus on resolution.`,
      voiceId: 'alloy',
      greeting: "Thank you for contacting our support team. I'm Maya, your AI assistant. How may I help you today?",
      fallbackMessage: "I apologize, I didn't catch that. Could you please say that again?",
      transferMessage: "I'll connect you with a human agent who can better assist you with this.",
      endMessage: "Thank you for contacting us! Is there anything else I can help you with?",
      widgetColor: '#F59E0B',
      widgetTitle: 'Customer Support',
      widgetSubtitle: "We're here to help",
      temperature: 0.6,
      maxDuration: 480,
      questions: [
        { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
        { id: 'order_id', question: 'Can you provide your order or ticket number?', field: 'orderId', required: false },
        { id: 'issue', question: 'How can I help you today? Please describe your issue.', field: 'issue', required: true },
        { id: 'phone', question: "What's the best number to reach you?", field: 'phone', required: true },
      ],
      faqs: [
        { question: 'Where is my order?', answer: 'I can help track your order. Please provide your order number.' },
        { question: 'How do I return a product?', answer: 'You can initiate a return from your account or I can help you with the process.' },
      ],
    },
    {
      name: 'Dev - Technical Interviewer',
      industry: 'TECHNICAL_INTERVIEW' as const,
      systemPrompt: `You are a technical interviewer conducting a coding/technical interview. Your role is to:
- Ask relevant technical questions
- Evaluate problem-solving approach
- Test theoretical knowledge
- Provide hints when candidate is stuck
- Score responses objectively

Be professional and encouraging. Give candidates time to think. Ask follow-up questions to understand their depth of knowledge.`,
      voiceId: 'echo',
      greeting: "Hello! Welcome to the technical interview. I'm Dev, an AI interviewer, and I'll be assessing your technical skills today. Let's begin with a brief introduction.",
      fallbackMessage: "Take your time. Could you please repeat your answer?",
      transferMessage: "I'll connect you with our technical panel for the next round.",
      endMessage: "Thank you for the interview! Our team will share feedback soon. Best of luck!",
      widgetColor: '#6366F1',
      widgetTitle: 'Tech Interview',
      widgetSubtitle: 'Technical assessment',
      temperature: 0.5,
      maxDuration: 1800,
      questions: [
        { id: 'name', question: 'Before we begin, may I have your name?', field: 'firstName', required: true },
        { id: 'role', question: 'Which role are you interviewing for?', field: 'role', required: true },
        { id: 'experience', question: 'How many years of experience do you have?', field: 'experience', required: true },
      ],
      faqs: [],
    },
    {
      name: 'Dr. Aisha - Healthcare Assistant',
      industry: 'HEALTHCARE' as const,
      systemPrompt: `You are a healthcare appointment assistant. Your role is to:
- Help patients book appointments
- Collect basic health information
- Answer general queries about services
- Provide clinic/hospital information

Be compassionate and professional. Remind patients about emergency services for urgent cases.`,
      voiceId: 'nova',
      greeting: "Hello! Welcome to our healthcare center. I'm Aisha, here to help you with appointments and general inquiries. How can I assist you today?",
      fallbackMessage: "I'm sorry, I didn't understand. Could you please repeat that?",
      transferMessage: "I'll connect you with our medical staff for immediate assistance.",
      endMessage: "Thank you! Your appointment is confirmed. Take care and stay healthy!",
      widgetColor: '#EF4444',
      widgetTitle: 'Healthcare Assistant',
      widgetSubtitle: 'Book appointments easily',
      temperature: 0.6,
      maxDuration: 480,
      questions: [
        { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
        { id: 'concern', question: 'What health concern brings you here today?', field: 'concern', required: true },
        { id: 'doctor_preference', question: 'Do you have a preferred doctor or specialist?', field: 'doctorPreference', required: false },
        { id: 'phone', question: "What's your contact number?", field: 'phone', required: true },
        { id: 'preferred_time', question: 'When would you like to schedule your appointment?', field: 'preferredTime', required: true },
      ],
      faqs: [
        { question: 'What are your working hours?', answer: "We're open Monday to Saturday, 9 AM to 6 PM." },
        { question: 'Do you accept insurance?', answer: 'Yes, we accept most major insurance providers.' },
      ],
    },
    {
      name: 'Rahul - Financial Advisor',
      industry: 'FINANCE' as const,
      systemPrompt: `You are a financial services advisor. Your role is to:
- Understand customer's financial needs
- Explain products (loans, insurance, investments)
- Collect eligibility information
- Schedule meetings with financial advisors

Be professional, trustworthy, and clear about terms. Never give specific financial advice - always recommend speaking with a certified advisor.`,
      voiceId: 'onyx',
      greeting: "Hello! Welcome to our financial services. I'm Rahul, here to help you explore our loan, insurance, and investment options. What brings you here today?",
      fallbackMessage: "I apologize, could you please repeat that?",
      transferMessage: "I'll connect you with our certified financial advisor for detailed guidance.",
      endMessage: "Thank you for your interest! Our advisor will contact you with personalized solutions.",
      widgetColor: '#059669',
      widgetTitle: 'Financial Advisor',
      widgetSubtitle: 'Loans, Insurance & Investments',
      temperature: 0.5,
      maxDuration: 600,
      questions: [
        { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
        { id: 'service', question: 'Are you interested in loans, insurance, or investments?', field: 'service', required: true },
        { id: 'amount', question: 'What amount are you considering?', field: 'amount', required: false },
        { id: 'phone', question: "What's your contact number?", field: 'phone', required: true },
        { id: 'email', question: 'And your email for documentation?', field: 'email', required: false },
      ],
      faqs: [
        { question: 'What are your interest rates?', answer: 'Rates vary based on product and profile. Our advisor can provide exact rates.' },
      ],
    },
    {
      name: 'Zara - Shopping Assistant',
      industry: 'ECOMMERCE' as const,
      systemPrompt: `You are an e-commerce shopping assistant. Your role is to:
- Help customers find products
- Answer product queries
- Handle order and delivery questions
- Process returns and complaints

Be friendly and helpful. Focus on customer satisfaction and quick resolution.`,
      voiceId: 'shimmer',
      greeting: "Hello! Welcome to our store. I'm Zara, your AI shopping assistant. How can I help you today?",
      fallbackMessage: "Sorry, I didn't catch that. Could you please repeat?",
      transferMessage: "I'll connect you with our customer service team for further assistance.",
      endMessage: "Thank you for shopping with us! Have a wonderful day!",
      widgetColor: '#EC4899',
      widgetTitle: 'Shopping Assistant',
      widgetSubtitle: 'Find what you need',
      temperature: 0.7,
      maxDuration: 480,
      questions: [
        { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
        { id: 'query_type', question: 'Are you looking for a product, or do you have a question about an existing order?', field: 'queryType', required: true },
        { id: 'phone', question: "What's your contact number?", field: 'phone', required: false },
      ],
      faqs: [
        { question: 'How long is delivery?', answer: 'Standard delivery takes 3-5 business days. Express delivery is available for select locations.' },
        { question: 'What is your return policy?', answer: 'We offer 30-day returns for most products. Certain items may have different policies.' },
      ],
    },
    {
      name: 'Custom AI Agent',
      industry: 'CUSTOM' as const,
      systemPrompt: `You are a helpful AI assistant. Your role is to:
- Answer questions and help users with their queries
- Collect relevant information
- Provide assistance as needed
- Be friendly and professional

Always be helpful and guide users to the information they need.`,
      voiceId: 'alloy',
      greeting: "Hello! I'm your AI assistant. How can I help you today?",
      fallbackMessage: "I'm sorry, could you please repeat that?",
      transferMessage: "I'll connect you with a team member who can assist you further.",
      endMessage: "Thank you for chatting with me! Have a great day!",
      widgetColor: '#6B7280',
      widgetTitle: 'AI Assistant',
      widgetSubtitle: 'How can I help?',
      temperature: 0.7,
      maxDuration: 600,
      questions: [
        { id: 'name', question: 'May I know your name?', field: 'firstName', required: true },
        { id: 'query', question: 'What can I help you with today?', field: 'query', required: true },
        { id: 'phone', question: "What's your contact number?", field: 'phone', required: false },
      ],
      faqs: [],
    },
    // ==================== SMS AGENTS ====================
    {
      name: 'SMS Sales Agent',
      industry: 'CUSTOM' as const,
      systemPrompt: `You are an SMS sales assistant. Your role is to:
- Respond to SMS inquiries quickly and concisely
- Keep messages under 160 characters when possible
- Qualify leads through text conversation
- Schedule callbacks or meetings
- Be professional and friendly

IMPORTANT: Keep responses SHORT and SMS-friendly. Use abbreviations where appropriate. No emojis unless customer uses them first.`,
      voiceId: 'alloy',
      greeting: "Hi! Thanks for reaching out. How can I help you today?",
      fallbackMessage: "Sorry, didn't get that. Can you rephrase?",
      transferMessage: "I'll have someone call you shortly.",
      endMessage: "Thanks! We'll be in touch soon.",
      widgetColor: '#22C55E',
      widgetTitle: 'SMS Sales',
      widgetSubtitle: 'Quick text support',
      temperature: 0.6,
      maxDuration: 300,
      questions: [
        { id: 'name', question: 'What is your name?', field: 'firstName', required: true },
        { id: 'interest', question: 'What are you interested in?', field: 'interest', required: true },
        { id: 'callback', question: 'Best time to call you?', field: 'callbackTime', required: false },
      ],
      faqs: [
        { question: 'pricing', answer: 'Prices vary by product. Want me to have someone call with details?' },
        { question: 'hours', answer: 'We are open Mon-Sat 9AM-6PM.' },
      ],
    },
    {
      name: 'SMS Support Agent',
      industry: 'CUSTOMER_CARE' as const,
      systemPrompt: `You are an SMS customer support agent. Your role is to:
- Handle customer queries via SMS
- Keep responses brief and clear (under 160 chars ideal)
- Provide quick solutions or escalate
- Track order/ticket numbers
- Be empathetic and helpful

IMPORTANT: SMS messages should be concise. Use short sentences. Avoid long explanations - offer to call if needed.`,
      voiceId: 'alloy',
      greeting: "Hi! This is support. How can I help?",
      fallbackMessage: "Can you clarify that please?",
      transferMessage: "Escalating to a specialist. They'll text you soon.",
      endMessage: "Issue resolved! Text back if you need more help.",
      widgetColor: '#F97316',
      widgetTitle: 'SMS Support',
      widgetSubtitle: 'Quick help via text',
      temperature: 0.5,
      maxDuration: 300,
      questions: [
        { id: 'name', question: 'Your name?', field: 'firstName', required: true },
        { id: 'order', question: 'Order/Ticket number?', field: 'orderId', required: false },
        { id: 'issue', question: 'Describe the issue briefly', field: 'issue', required: true },
      ],
      faqs: [
        { question: 'track order', answer: 'Share your order number and I\'ll check status.' },
        { question: 'refund', answer: 'Refunds take 5-7 days. Need status on one?' },
        { question: 'return', answer: 'Returns accepted within 30 days. Need to start one?' },
      ],
    },
    {
      name: 'SMS Appointment Reminder',
      industry: 'HEALTHCARE' as const,
      systemPrompt: `You are an SMS appointment reminder agent. Your role is to:
- Send appointment reminders
- Handle rescheduling requests
- Confirm appointments
- Answer basic scheduling questions
- Keep messages brief and professional

IMPORTANT: Be concise. Include date/time clearly. Use 24hr or AM/PM format consistently.`,
      voiceId: 'alloy',
      greeting: "Hi! This is your appointment reminder service.",
      fallbackMessage: "Please reply YES to confirm or RESCHEDULE to change.",
      transferMessage: "Connecting you with scheduling team.",
      endMessage: "Appointment confirmed! See you then.",
      widgetColor: '#0EA5E9',
      widgetTitle: 'SMS Reminders',
      widgetSubtitle: 'Appointment alerts',
      temperature: 0.4,
      maxDuration: 180,
      questions: [
        { id: 'confirm', question: 'Reply YES to confirm your appointment', field: 'confirmed', required: true },
        { id: 'reschedule', question: 'Need to reschedule? Reply with preferred date/time', field: 'newTime', required: false },
      ],
      faqs: [
        { question: 'cancel', answer: 'To cancel, reply CANCEL. 24hr notice required.' },
        { question: 'location', answer: 'Address will be sent in confirmation text.' },
      ],
    },
    // ==================== WHATSAPP AGENTS ====================
    {
      name: 'WhatsApp Sales Bot',
      industry: 'ECOMMERCE' as const,
      systemPrompt: `You are a WhatsApp sales assistant. Your role is to:
- Engage customers on WhatsApp with friendly conversation
- Share product information and images
- Handle inquiries and qualify leads
- Guide customers through purchase process
- Use emojis appropriately to be friendly 😊

WhatsApp allows longer messages, so be helpful but not too lengthy. Use bullet points and formatting for clarity.`,
      voiceId: 'shimmer',
      greeting: "Hi there! 👋 Welcome to our WhatsApp store. How can I help you today?",
      fallbackMessage: "I didn't quite understand that. Could you tell me more? 🤔",
      transferMessage: "Let me connect you with our sales team! They'll message you shortly. 📞",
      endMessage: "Thanks for chatting! 🙏 Feel free to message anytime. Have a great day! ✨",
      widgetColor: '#25D366',
      widgetTitle: 'WhatsApp Sales',
      widgetSubtitle: 'Chat with us on WhatsApp',
      temperature: 0.7,
      maxDuration: 600,
      questions: [
        { id: 'name', question: "What's your name? 😊", field: 'firstName', required: true },
        { id: 'interest', question: 'What products are you interested in?', field: 'interest', required: true },
        { id: 'budget', question: 'Do you have a budget in mind?', field: 'budget', required: false },
        { id: 'email', question: 'Email for order updates?', field: 'email', required: false },
      ],
      faqs: [
        { question: 'delivery', answer: '🚚 Standard delivery: 3-5 days\n⚡ Express delivery: 1-2 days\nFree shipping on orders over ₹999!' },
        { question: 'payment', answer: '💳 We accept:\n• Credit/Debit Cards\n• UPI\n• Net Banking\n• Cash on Delivery' },
        { question: 'return', answer: '↩️ Easy 30-day returns!\nJust message us with your order number to start a return.' },
      ],
    },
    {
      name: 'WhatsApp Support Bot',
      industry: 'CUSTOMER_CARE' as const,
      systemPrompt: `You are a WhatsApp customer support bot. Your role is to:
- Provide quick and helpful customer support
- Handle complaints with empathy
- Track orders and resolve issues
- Escalate complex issues to human agents
- Use friendly tone with appropriate emojis

Be conversational but professional. Use formatting (bold, lists) for clarity.`,
      voiceId: 'nova',
      greeting: "Hello! 👋 Welcome to customer support. I'm here to help!\n\nHow can I assist you today?",
      fallbackMessage: "I'm not sure I understood that correctly. Could you please explain in more detail? 🙏",
      transferMessage: "I'm connecting you with a human agent who can better assist you. Please hold! 🔄",
      endMessage: "Glad I could help! 😊 If you have any more questions, feel free to message anytime.\n\n⭐ Please rate your experience!",
      widgetColor: '#25D366',
      widgetTitle: 'WhatsApp Support',
      widgetSubtitle: '24/7 customer support',
      temperature: 0.6,
      maxDuration: 600,
      questions: [
        { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
        { id: 'order', question: 'Do you have an order number? (if applicable)', field: 'orderId', required: false },
        { id: 'issue', question: 'Please describe your issue in detail', field: 'issue', required: true },
      ],
      faqs: [
        { question: 'order status', answer: '📦 To check your order status:\n\n1. Share your order number\n2. I\'ll fetch the latest updates\n\nOr track online: yourstore.com/track' },
        { question: 'refund', answer: '💰 Refund Policy:\n\n• Processing time: 5-7 business days\n• Amount credited to original payment method\n\nShare order number to check refund status!' },
        { question: 'contact', answer: '📞 Contact Us:\n\n• WhatsApp: This chat!\n• Email: support@store.com\n• Phone: 1800-XXX-XXXX (10AM-6PM)' },
      ],
    },
    {
      name: 'WhatsApp Lead Qualifier',
      industry: 'EDUCATION' as const,
      systemPrompt: `You are a WhatsApp lead qualification bot for an educational institution. Your role is to:
- Engage prospective students on WhatsApp
- Collect qualification information naturally
- Answer course and admission queries
- Schedule campus visits or counselor calls
- Be friendly, encouraging, and helpful

Use emojis to be approachable. Send course brochures and links when relevant.`,
      voiceId: 'nova',
      greeting: "Hi! 👋 Welcome to our admissions WhatsApp!\n\n🎓 I'm here to help you explore our courses and guide you through admissions.\n\nWhat would you like to know?",
      fallbackMessage: "I didn't catch that! Could you please rephrase? 😊",
      transferMessage: "Great questions! 🌟 Let me connect you with our admissions counselor who can help you better.",
      endMessage: "Thanks for your interest! 🎓\n\nWe'll reach out soon. Meanwhile, explore our website for more info.\n\nAll the best! ✨",
      widgetColor: '#25D366',
      widgetTitle: 'Admissions WhatsApp',
      widgetSubtitle: 'Chat about courses & admissions',
      temperature: 0.7,
      maxDuration: 900,
      questions: [
        { id: 'name', question: "What's your name? 😊", field: 'firstName', required: true },
        { id: 'course', question: '📚 Which course/program interests you?', field: 'courseInterest', required: true },
        { id: 'qualification', question: '🎓 What is your current qualification?', field: 'qualification', required: true },
        { id: 'phone', question: '📱 Best number to reach you?', field: 'phone', required: true },
        { id: 'email', question: '📧 Email for sending brochures?', field: 'email', required: false },
      ],
      faqs: [
        { question: 'fees', answer: '💰 Fee Structure:\n\nFees vary by program. Our counselor will share detailed fee structure.\n\n📞 Want a callback to discuss fees and scholarships?' },
        { question: 'placements', answer: '🏢 Placement Highlights:\n\n• 95% placement rate\n• 500+ recruiting companies\n• Average package: ₹8 LPA\n• Top recruiters: TCS, Infosys, Google, Amazon' },
        { question: 'eligibility', answer: '✅ General Eligibility:\n\n• UG Programs: 10+2 with 50%\n• PG Programs: Graduation with 50%\n\n📝 Specific requirements vary by course. Which program interests you?' },
      ],
    },
    // ==================== ADDITIONAL SPECIALIZED AGENTS ====================
    // AFTER-HOURS AGENT
    {
      name: 'After-Hours Agent',
      industry: 'CUSTOM' as const,
      systemPrompt: `You are an after-hours AI assistant handling calls outside business hours. Your role is to:
- Inform callers that the office is currently closed
- Collect their information for callback
- Handle urgent matters by noting priority
- Provide basic FAQs and information
- Schedule callbacks for business hours
- Be professional and reassuring

IMPORTANT: Always mention current business hours. Offer to schedule a callback. For emergencies, collect details and mark as urgent.`,
      voiceId: 'nova',
      greeting: "Thank you for calling! Our office is currently closed. I'm an AI assistant and I can help you leave a message or schedule a callback. How may I assist you?",
      fallbackMessage: "I'm sorry, I didn't catch that. Could you please repeat?",
      transferMessage: "I've noted your request as urgent. Our team will contact you as soon as possible.",
      endMessage: "Thank you for calling. We've recorded your message and someone will get back to you during business hours. Have a good night!",
      widgetColor: '#1E3A8A',
      widgetTitle: 'After-Hours Support',
      widgetSubtitle: 'Leave a message 24/7',
      temperature: 0.5,
      maxDuration: 300,
      questions: [
        { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
        { id: 'phone', question: 'What is the best number to reach you?', field: 'phone', required: true },
        { id: 'reason', question: 'How can we help you when we call back?', field: 'reason', required: true },
        { id: 'urgency', question: 'Is this urgent?', field: 'urgency', required: false },
        { id: 'callback_time', question: 'When is the best time to call you back?', field: 'callbackTime', required: false },
      ],
      faqs: [
        { question: 'business hours', answer: 'Our business hours are Monday to Saturday, 9 AM to 6 PM.' },
        { question: 'emergency', answer: 'For emergencies, I will mark your message as urgent and our team will contact you as soon as possible.' },
      ],
    },
    // IVR MENU AGENT
    {
      name: 'IVR Menu Agent',
      industry: 'CUSTOM' as const,
      systemPrompt: `You are an IVR (Interactive Voice Response) menu agent. Your role is to:
- Greet callers professionally
- Present menu options clearly
- Route calls based on selection
- Handle invalid inputs gracefully
- Provide quick access to common departments

MENU OPTIONS:
1 - Sales & New Inquiries
2 - Customer Support
3 - Billing & Payments
4 - Technical Support
5 - Speak to a Representative
0 - Repeat Menu

Always speak clearly and pause between options. Confirm the selection before transferring.`,
      voiceId: 'alloy',
      greeting: "Welcome! Thank you for calling. Please listen to the following options:\n\nPress 1 for Sales\nPress 2 for Customer Support\nPress 3 for Billing\nPress 4 for Technical Support\nPress 5 to speak with a representative\nPress 0 to repeat this menu",
      fallbackMessage: "I didn't recognize that input. Please press a number from 1 to 5, or press 0 to hear the menu again.",
      transferMessage: "Transferring your call now. Please hold.",
      endMessage: "Thank you for calling. Goodbye!",
      widgetColor: '#4B5563',
      widgetTitle: 'Main Menu',
      widgetSubtitle: 'Press a number to continue',
      temperature: 0.3,
      maxDuration: 120,
      questions: [
        { id: 'selection', question: 'Please make a selection by pressing a number', field: 'menuSelection', required: true },
      ],
      faqs: [
        { question: 'sales', answer: 'Transferring to Sales department.' },
        { question: 'support', answer: 'Transferring to Customer Support.' },
        { question: 'billing', answer: 'Transferring to Billing department.' },
      ],
    },
    // SURVEY/FEEDBACK AGENT
    {
      name: 'Survey & Feedback Agent',
      industry: 'CUSTOM' as const,
      systemPrompt: `You are a customer satisfaction survey agent. Your role is to:
- Conduct brief satisfaction surveys
- Collect feedback professionally
- Use rating scales (1-5 or 1-10)
- Thank customers for their time
- Note any specific comments or complaints
- Keep surveys short (under 3 minutes)

Be friendly but efficient. Respect the customer's time. If they decline, thank them and end politely.`,
      voiceId: 'nova',
      greeting: "Hello! This is a brief customer satisfaction survey. It will only take 2 minutes. Your feedback helps us improve. May I proceed?",
      fallbackMessage: "I'm sorry, could you please repeat your response?",
      transferMessage: "Thank you for your feedback. Let me connect you with our team to address your concerns.",
      endMessage: "Thank you for your valuable feedback! We truly appreciate your time. Have a wonderful day!",
      widgetColor: '#7C3AED',
      widgetTitle: 'Quick Survey',
      widgetSubtitle: 'Share your feedback',
      temperature: 0.5,
      maxDuration: 300,
      questions: [
        { id: 'overall', question: 'On a scale of 1 to 5, how satisfied are you with our service?', field: 'overallRating', required: true },
        { id: 'recommend', question: 'Would you recommend us to others? Yes or No?', field: 'wouldRecommend', required: true },
        { id: 'improvement', question: 'What could we do better?', field: 'improvement', required: false },
        { id: 'comments', question: 'Any other comments or feedback?', field: 'comments', required: false },
      ],
      faqs: [],
    },
    // PAYMENT REMINDER AGENT
    {
      name: 'Payment Reminder Agent',
      industry: 'FINANCE' as const,
      systemPrompt: `You are a payment reminder agent. Your role is to:
- Remind customers about pending payments
- Provide payment details and due dates
- Offer payment options and methods
- Handle payment queries professionally
- Set up payment plans if needed
- Be polite but clear about urgency

IMPORTANT: Be respectful and professional. Never be threatening. Offer help and solutions. Comply with debt collection regulations.`,
      voiceId: 'onyx',
      greeting: "Hello, this is a courtesy reminder about your pending payment. I'm calling to help you with payment options. May I speak with you for a moment?",
      fallbackMessage: "I'm sorry, I didn't catch that. Could you please repeat?",
      transferMessage: "Let me connect you with our billing team to discuss payment options.",
      endMessage: "Thank you for your time. If you have any questions, please don't hesitate to contact us. Have a great day!",
      widgetColor: '#DC2626',
      widgetTitle: 'Payment Reminder',
      widgetSubtitle: 'Payment assistance',
      temperature: 0.4,
      maxDuration: 300,
      questions: [
        { id: 'confirm', question: 'Am I speaking with the account holder?', field: 'isAccountHolder', required: true },
        { id: 'aware', question: 'Are you aware of the pending payment?', field: 'isAware', required: true },
        { id: 'payment_date', question: 'When can we expect the payment?', field: 'expectedPaymentDate', required: false },
        { id: 'assistance', question: 'Do you need any assistance with payment options?', field: 'needsAssistance', required: false },
      ],
      faqs: [
        { question: 'payment methods', answer: 'You can pay via credit card, debit card, UPI, net banking, or set up auto-pay.' },
        { question: 'payment plan', answer: 'We offer flexible payment plans. I can connect you with our team to discuss options.' },
      ],
    },
    // ORDER UPDATES AGENT (WhatsApp)
    {
      name: 'WhatsApp Order Updates Bot',
      industry: 'ECOMMERCE' as const,
      systemPrompt: `You are a WhatsApp order updates and tracking bot. Your role is to:
- Provide order status and tracking info
- Send delivery updates
- Handle delivery queries
- Process delivery issues (delays, wrong address)
- Collect delivery feedback
- Use emojis for friendly communication

Be helpful and proactive. Always include order numbers and tracking links when available.`,
      voiceId: 'shimmer',
      greeting: "Hi! 👋 Welcome to Order Tracking!\n\n📦 I can help you with:\n• Track your order\n• Delivery updates\n• Delivery issues\n\nShare your order number to get started!",
      fallbackMessage: "I didn't understand that. Please share your order number or choose an option. 🤔",
      transferMessage: "Let me connect you with our delivery support team! 📞 They'll help you right away.",
      endMessage: "Thanks for using our tracking service! 📦✨\n\nHappy shopping! 🛍️",
      widgetColor: '#F59E0B',
      widgetTitle: 'Order Tracking',
      widgetSubtitle: 'Track your delivery',
      temperature: 0.6,
      maxDuration: 300,
      questions: [
        { id: 'order_id', question: "What's your order number? 📝", field: 'orderId', required: true },
        { id: 'issue', question: 'Any issues with your delivery?', field: 'deliveryIssue', required: false },
      ],
      faqs: [
        { question: 'track', answer: '📦 To track your order:\n\n1. Share your order number\n2. I\'ll fetch the latest status\n\nExample: ORD123456' },
        { question: 'delivery time', answer: '🚚 Delivery Times:\n\n• Standard: 3-5 days\n• Express: 1-2 days\n• Same-day: Select cities only' },
        { question: 'not delivered', answer: '😟 Order not delivered?\n\n1. Check tracking status\n2. Verify delivery address\n3. Contact delivery partner\n\nOr I can connect you with support!' },
      ],
    },
    // ONBOARDING AGENT
    {
      name: 'Customer Onboarding Agent',
      industry: 'CUSTOM' as const,
      systemPrompt: `You are a customer onboarding specialist. Your role is to:
- Welcome new customers warmly
- Guide them through initial setup
- Explain key features and benefits
- Answer getting-started questions
- Schedule training or demo sessions
- Ensure smooth onboarding experience

Be patient and encouraging. Celebrate small wins. Make the customer feel valued and supported.`,
      voiceId: 'nova',
      greeting: "Welcome aboard! Congratulations on joining us. I'm here to help you get started and make the most of our services. How can I assist you today?",
      fallbackMessage: "I'm sorry, I didn't catch that. Could you please repeat?",
      transferMessage: "Let me connect you with your dedicated account manager for personalized assistance.",
      endMessage: "You're all set! Welcome to the family. If you have any questions, we're just a call away. Have a great day!",
      widgetColor: '#10B981',
      widgetTitle: 'Welcome Onboarding',
      widgetSubtitle: "Let's get you started",
      temperature: 0.7,
      maxDuration: 600,
      questions: [
        { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
        { id: 'company', question: 'What company are you from?', field: 'company', required: false },
        { id: 'goals', question: 'What are your main goals with our product?', field: 'goals', required: true },
        { id: 'experience', question: 'Have you used similar products before?', field: 'priorExperience', required: false },
        { id: 'demo', question: 'Would you like to schedule a demo session?', field: 'wantsDemo', required: false },
      ],
      faqs: [
        { question: 'getting started', answer: 'Great! Let me walk you through the basics. First, have you logged into your account?' },
        { question: 'features', answer: 'We have many powerful features! What specific area interests you most?' },
      ],
    },
    // VOICEMAIL HANDLER AGENT
    {
      name: 'Voicemail Handler Agent',
      industry: 'CUSTOM' as const,
      systemPrompt: `You are a voicemail handling agent. Your role is to:
- Prompt callers to leave detailed messages
- Collect name, number, and reason for call
- Confirm message was recorded
- Provide estimated callback time
- Handle urgent messages appropriately

Keep instructions clear and simple. Allow adequate time for message recording.`,
      voiceId: 'alloy',
      greeting: "You've reached our voicemail. We're sorry we missed your call. Please leave your name, phone number, and a brief message after the tone. We'll get back to you as soon as possible.",
      fallbackMessage: "I'm sorry, I couldn't record that. Please try again after the beep.",
      transferMessage: "Your message has been marked as urgent. We'll contact you shortly.",
      endMessage: "Thank you for your message. We'll return your call within 24 hours. Goodbye!",
      widgetColor: '#6B7280',
      widgetTitle: 'Voicemail',
      widgetSubtitle: 'Leave a message',
      temperature: 0.3,
      maxDuration: 180,
      questions: [
        { id: 'name', question: 'Please state your name', field: 'firstName', required: true },
        { id: 'phone', question: 'Your callback number', field: 'phone', required: true },
        { id: 'message', question: 'Your message', field: 'voicemailMessage', required: true },
      ],
      faqs: [],
    },
    // ESCALATION HANDLER AGENT
    {
      name: 'Escalation Handler Agent',
      industry: 'CUSTOMER_CARE' as const,
      systemPrompt: `You are a senior escalation handler for difficult situations. Your role is to:
- Handle escalated and upset customers
- De-escalate tense situations calmly
- Apologize sincerely for any issues
- Offer solutions and compensation when appropriate
- Ensure customer feels heard and valued
- Document complaints thoroughly

IMPORTANT: Stay calm, never argue. Acknowledge feelings. Focus on solutions. Empower the customer. Know when to involve a supervisor.`,
      voiceId: 'onyx',
      greeting: "Hello, I'm a senior customer care specialist. I understand you've had a frustrating experience, and I sincerely apologize. I'm here to personally resolve this for you. Please tell me what happened.",
      fallbackMessage: "I want to make sure I understand you correctly. Could you please repeat that?",
      transferMessage: "I'm connecting you with our management team who has full authority to resolve this immediately.",
      endMessage: "Thank you for your patience. We truly value you as a customer. If there's anything else, please don't hesitate to reach out. Have a better day ahead.",
      widgetColor: '#B91C1C',
      widgetTitle: 'Senior Support',
      widgetSubtitle: "We'll make this right",
      temperature: 0.5,
      maxDuration: 900,
      questions: [
        { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
        { id: 'issue', question: 'Please describe what happened', field: 'issue', required: true },
        { id: 'impact', question: 'How has this affected you?', field: 'impact', required: false },
        { id: 'resolution', question: 'What would be an acceptable resolution for you?', field: 'desiredResolution', required: true },
      ],
      faqs: [
        { question: 'manager', answer: 'I have the authority to resolve most issues, but if needed, I can certainly connect you with my manager.' },
        { question: 'compensation', answer: 'Let me review your case and see what we can offer to make this right for you.' },
      ],
    },
    // WEBSITE CHATBOT AGENT
    {
      name: 'Website Chatbot',
      industry: 'CUSTOM' as const,
      systemPrompt: `You are a website live chat assistant. Your role is to:
- Greet website visitors
- Answer common questions instantly
- Help visitors navigate the site
- Capture leads from interested visitors
- Provide 24/7 instant responses
- Escalate to human agents when needed

Be concise and helpful. Use quick replies where possible. Guide users to relevant pages.`,
      voiceId: 'alloy',
      greeting: "Hi there! 👋 Welcome to our website. How can I help you today?",
      fallbackMessage: "I'm not sure I understood that. Could you rephrase or choose from the options below?",
      transferMessage: "Let me connect you with a live agent who can help you better.",
      endMessage: "Thanks for chatting! Feel free to reach out anytime. Have a great day! 🌟",
      widgetColor: '#3B82F6',
      widgetTitle: 'Live Chat',
      widgetSubtitle: 'Ask me anything',
      temperature: 0.7,
      maxDuration: 600,
      questions: [
        { id: 'name', question: 'What is your name?', field: 'firstName', required: false },
        { id: 'email', question: 'Email address?', field: 'email', required: false },
        { id: 'query', question: 'How can I help you?', field: 'query', required: true },
      ],
      faqs: [
        { question: 'pricing', answer: 'You can view our pricing at the Pricing page. Would you like me to share the link?' },
        { question: 'demo', answer: 'We offer free demos! Would you like to schedule one?' },
        { question: 'contact', answer: 'You can reach us at:\n📧 Email: hello@company.com\n📞 Phone: 1800-XXX-XXXX' },
        { question: 'features', answer: 'We offer many features! What specific area are you interested in?' },
      ],
    },
  ];

  const createdAgents = [];
  for (const agent of voiceAgents) {
    const created = await prisma.voiceAgent.create({
      data: {
        organizationId: organization.id,
        name: agent.name,
        industry: agent.industry,
        systemPrompt: agent.systemPrompt,
        voiceId: agent.voiceId,
        greeting: agent.greeting,
        fallbackMessage: agent.fallbackMessage,
        transferMessage: agent.transferMessage,
        endMessage: agent.endMessage,
        widgetColor: agent.widgetColor,
        widgetTitle: agent.widgetTitle,
        widgetSubtitle: agent.widgetSubtitle,
        temperature: agent.temperature,
        maxDuration: agent.maxDuration,
        questions: agent.questions,
        faqs: agent.faqs,
        isActive: true,
      },
    });
    createdAgents.push(created);
  }
  console.log('✅ AI Agents: 24 agents created (9 Industry + 3 SMS + 3 WhatsApp + 9 Specialized)');

  // ==================== ACTIVITY LOGS ====================
  for (const role of Object.keys(allCreatedLeads)) {
    for (const lead of allCreatedLeads[role].slice(0, 3)) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: admin1.id,
          type: 'LEAD_CREATED',
          title: 'Lead created',
          description: `New lead added from ${lead.source}`,
        },
      });
    }
  }
  console.log('✅ Activity Logs: Created');

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log('✅ DATABASE SEEDING COMPLETED!');
  console.log('='.repeat(60));

  console.log('\n📧 LOGIN CREDENTIALS (Password: admin123 for all)\n');

  console.log('┌─────────────┬────────────────────────┬─────────────────────────────┐');
  console.log('│ Role        │ Email                  │ Assigned Leads              │');
  console.log('├─────────────┼────────────────────────┼─────────────────────────────┤');
  console.log('│ Admin       │ admin@demo.com         │ Can view all (32 leads)     │');
  console.log('│ Admin       │ superadmin@demo.com    │ Can view all (32 leads)     │');
  console.log('├─────────────┼────────────────────────┼─────────────────────────────┤');
  console.log('│ Manager     │ manager@demo.com       │ Can view all (32 leads)     │');
  console.log('│ Manager     │ manager2@demo.com      │ Can view all (32 leads)     │');
  console.log('├─────────────┼────────────────────────┼─────────────────────────────┤');
  console.log('│ Counselor   │ counselor@demo.com     │ 6 leads (Qualified+)        │');
  console.log('│ Counselor   │ counselor2@demo.com    │ 6 leads (Qualified+)        │');
  console.log('│ Counselor   │ counselor3@demo.com    │ 5 leads (Qualified+)        │');
  console.log('├─────────────┼────────────────────────┼─────────────────────────────┤');
  console.log('│ Telecaller  │ telecaller@demo.com    │ 5 leads (New - for calling) │');
  console.log('│ Telecaller  │ telecaller2@demo.com   │ 5 leads (New - for calling) │');
  console.log('│ Telecaller  │ telecaller3@demo.com   │ 5 leads (New - for calling) │');
  console.log('└─────────────┴────────────────────────┴─────────────────────────────┘');

  console.log('\n📊 DATA SUMMARY:');
  console.log('   • 1 Organization');
  console.log('   • 4 Roles (Admin, Manager, Counselor, Telecaller)');
  console.log('   • 10 Users (2 Admins, 2 Managers, 3 Counselors, 3 Telecallers)');
  console.log('   • 32 Leads with role-based assignments');
  console.log('   • 20+ Follow-ups per role');
  console.log('   • 7 Tasks assigned to users');
  console.log('   • 10 Notes on leads');
  console.log('   • 15 Call logs');
  console.log('   • 3 Forms, 3 Landing Pages, 3 Campaigns');
  console.log('   • 24 AI Agents (Complete Setup)');
  console.log('='.repeat(60) + '\n');

  // ==================== SUBSCRIPTION PLANS (Competitive Pricing) ====================
  console.log('\n📦 Creating subscription plans...');

  const starterPlan = await prisma.planDefinition.upsert({
    where: { slug: 'starter' },
    update: {
      name: 'Starter',
      description: 'CRM + Voice AI for small teams getting started',
      monthlyPrice: 1999,
      yearlyPrice: 19188, // ₹1,599/month billed annually
      maxUsers: 5,
      maxLeads: 1000,
      maxPhoneNumbers: 1,
      maxVoiceAgents: 5,
      voiceMinutesIncluded: 100,
      extraMinuteRate: 8.0,
      maxSMS: 100,
      maxEmails: 500,
      maxWhatsapp: 200,
      maxStorage: 1024,
      extraPhoneNumberRate: 499,
      extraAgentRate: 149,
      extraUserRate: 299,
      features: ['basic_crm', 'lead_management', 'ai_voice_agent', 'call_recording', 'call_summary', 'multilingual', 'email_support'],
      isActive: true,
      isPopular: false,
      sortOrder: 1,
    },
    create: {
      slug: 'starter',
      name: 'Starter',
      description: 'CRM + Voice AI for small teams getting started',
      monthlyPrice: 1999,
      yearlyPrice: 19188,
      maxUsers: 5,
      maxLeads: 1000,
      maxPhoneNumbers: 1,
      maxVoiceAgents: 5,
      voiceMinutesIncluded: 100,
      extraMinuteRate: 8.0,
      maxSMS: 100,
      maxEmails: 500,
      maxWhatsapp: 200,
      maxStorage: 1024,
      extraPhoneNumberRate: 499,
      extraAgentRate: 149,
      extraUserRate: 299,
      features: ['basic_crm', 'lead_management', 'ai_voice_agent', 'call_recording', 'call_summary', 'multilingual', 'email_support'],
      isActive: true,
      isPopular: false,
      sortOrder: 1,
    },
  });

  const proPlan = await prisma.planDefinition.upsert({
    where: { slug: 'pro' },
    update: {
      name: 'Pro',
      description: 'CRM + Voice AI for growing teams with advanced needs',
      monthlyPrice: 6999,
      yearlyPrice: 67188, // ₹5,599/month billed annually
      maxUsers: 15,
      maxLeads: 5000,
      maxPhoneNumbers: 3,
      maxVoiceAgents: 15,
      voiceMinutesIncluded: 500,
      extraMinuteRate: 6.0,
      maxSMS: 500,
      maxEmails: 5000,
      maxWhatsapp: 1000,
      maxStorage: 5120,
      extraPhoneNumberRate: 399,
      extraAgentRate: 99,
      extraUserRate: 199,
      features: ['basic_crm', 'lead_management', 'ai_voice_agent', 'call_recording', 'call_summary', 'multilingual', 'advanced_analytics', 'ivr_builder', 'call_queues', 'api_access', 'priority_support'],
      isActive: true,
      isPopular: true,
      sortOrder: 2,
    },
    create: {
      slug: 'pro',
      name: 'Pro',
      description: 'CRM + Voice AI for growing teams with advanced needs',
      monthlyPrice: 6999,
      yearlyPrice: 67188,
      maxUsers: 15,
      maxLeads: 5000,
      maxPhoneNumbers: 3,
      maxVoiceAgents: 15,
      voiceMinutesIncluded: 500,
      extraMinuteRate: 6.0,
      maxSMS: 500,
      maxEmails: 5000,
      maxWhatsapp: 1000,
      maxStorage: 5120,
      extraPhoneNumberRate: 399,
      extraAgentRate: 99,
      extraUserRate: 199,
      features: ['basic_crm', 'lead_management', 'ai_voice_agent', 'call_recording', 'call_summary', 'multilingual', 'advanced_analytics', 'ivr_builder', 'call_queues', 'api_access', 'priority_support'],
      isActive: true,
      isPopular: true,
      sortOrder: 2,
    },
  });

  const businessPlan = await prisma.planDefinition.upsert({
    where: { slug: 'business' },
    update: {
      name: 'Business',
      description: 'CRM + Voice AI for scaling organizations',
      monthlyPrice: 14999,
      yearlyPrice: 143988, // ₹11,999/month billed annually
      maxUsers: 50,
      maxLeads: 25000,
      maxPhoneNumbers: 10,
      maxVoiceAgents: 50,
      voiceMinutesIncluded: 2000,
      extraMinuteRate: 5.0,
      maxSMS: 2000,
      maxEmails: 25000,
      maxWhatsapp: 5000,
      maxStorage: 25600,
      extraPhoneNumberRate: 299,
      extraAgentRate: 79,
      extraUserRate: 149,
      features: ['basic_crm', 'lead_management', 'ai_voice_agent', 'call_recording', 'call_summary', 'multilingual', 'advanced_analytics', 'ivr_builder', 'call_queues', 'api_access', 'sip_trunking', 'sso_saml', 'dedicated_support', 'white_label'],
      isActive: true,
      isPopular: false,
      sortOrder: 3,
    },
    create: {
      slug: 'business',
      name: 'Business',
      description: 'CRM + Voice AI for scaling organizations',
      monthlyPrice: 14999,
      yearlyPrice: 143988,
      maxUsers: 50,
      maxLeads: 25000,
      maxPhoneNumbers: 10,
      maxVoiceAgents: 50,
      voiceMinutesIncluded: 2000,
      extraMinuteRate: 5.0,
      maxSMS: 2000,
      maxEmails: 25000,
      maxWhatsapp: 5000,
      maxStorage: 25600,
      extraPhoneNumberRate: 299,
      extraAgentRate: 79,
      extraUserRate: 149,
      features: ['basic_crm', 'lead_management', 'ai_voice_agent', 'call_recording', 'call_summary', 'multilingual', 'advanced_analytics', 'ivr_builder', 'call_queues', 'api_access', 'sip_trunking', 'sso_saml', 'dedicated_support', 'white_label'],
      isActive: true,
      isPopular: false,
      sortOrder: 3,
    },
  });

  const enterprisePlan = await prisma.planDefinition.upsert({
    where: { slug: 'enterprise' },
    update: {
      name: 'Enterprise',
      description: 'Custom CRM + Voice AI solutions for large organizations',
      monthlyPrice: 0, // Custom pricing
      yearlyPrice: 0,
      maxUsers: 9999,
      maxLeads: 999999,
      maxPhoneNumbers: 9999,
      maxVoiceAgents: 9999,
      voiceMinutesIncluded: 10000,
      extraMinuteRate: 4.0,
      maxSMS: 99999,
      maxEmails: 999999,
      maxWhatsapp: 99999,
      maxStorage: 102400,
      extraPhoneNumberRate: 199,
      extraAgentRate: 49,
      extraUserRate: 99,
      features: [
        'basic_crm',
        'lead_management',
        'ai_voice_agent',
        'call_recording',
        'call_summary',
        'multilingual',
        'advanced_analytics',
        'whatsapp_integration',
        'ivr_builder',
        'call_queues',
        'api_access',
        'priority_support',
        'custom_reports',
        'white_label',
        'dedicated_support',
        'sla_guarantee',
        'custom_integrations',
        'audit_logs',
        'sso_saml',
        'on_premise_deployment'
      ],
      isActive: true,
      isPopular: false,
      sortOrder: 4,
    },
    create: {
      slug: 'enterprise',
      name: 'Enterprise',
      description: 'Custom CRM + Voice AI solutions for large organizations',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxUsers: 9999,
      maxLeads: 999999,
      maxPhoneNumbers: 9999,
      maxVoiceAgents: 9999,
      voiceMinutesIncluded: 10000,
      extraMinuteRate: 4.0,
      maxSMS: 99999,
      maxEmails: 999999,
      maxWhatsapp: 99999,
      maxStorage: 102400,
      extraPhoneNumberRate: 199,
      extraAgentRate: 49,
      extraUserRate: 99,
      features: [
        'basic_crm',
        'lead_management',
        'ai_voice_agent',
        'call_recording',
        'call_summary',
        'multilingual',
        'advanced_analytics',
        'whatsapp_integration',
        'ivr_builder',
        'call_queues',
        'api_access',
        'priority_support',
        'custom_reports',
        'white_label',
        'dedicated_support',
        'sla_guarantee',
        'custom_integrations',
        'audit_logs',
        'sso_saml',
        'on_premise_deployment'
      ],
      isActive: true,
      isPopular: false,
      sortOrder: 4,
    },
  });

  console.log('✅ Plans created: Starter, Pro, Business, Enterprise');

  // ==================== OUTBOUND CAMPAIGNS & CALLS ====================
  // Get first few voice agents for campaigns
  const educationAgent = createdAgents.find(a => a.name.includes('Education'));
  const recruitmentAgent = createdAgents.find(a => a.name.includes('Recruiter'));
  const healthcareAgent = createdAgents.find(a => a.name.includes('Healthcare'));

  if (educationAgent && recruitmentAgent && healthcareAgent) {
    // Campaign 1: Education - Running
    const educationCampaign = await prisma.outboundCallCampaign.create({
      data: {
        organizationId: organization.id,
        agentId: educationAgent.id,
        name: 'Summer Admission Drive 2024',
        description: 'Outreach campaign for prospective students interested in summer intake',
        status: 'RUNNING',
        callingMode: 'AUTOMATIC',
        maxConcurrentCalls: 3,
        callsBetweenHours: { start: 9, end: 18 },
        retryAttempts: 2,
        retryDelayMinutes: 60,
        totalContacts: 150,
        completedCalls: 87,
        successfulCalls: 72,
        failedCalls: 15,
        leadsGenerated: 34,
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    });

    // Campaign 2: Recruitment - Paused
    const recruitmentCampaign = await prisma.outboundCallCampaign.create({
      data: {
        organizationId: organization.id,
        agentId: recruitmentAgent.id,
        name: 'Tech Talent Outreach Q1',
        description: 'Reaching out to potential candidates for tech positions',
        status: 'PAUSED',
        callingMode: 'AUTOMATIC',
        maxConcurrentCalls: 2,
        callsBetweenHours: { start: 10, end: 19 },
        retryAttempts: 3,
        retryDelayMinutes: 120,
        totalContacts: 200,
        completedCalls: 45,
        successfulCalls: 38,
        failedCalls: 7,
        leadsGenerated: 12,
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    });

    // Campaign 3: Healthcare - Draft
    const healthcareCampaign = await prisma.outboundCallCampaign.create({
      data: {
        organizationId: organization.id,
        agentId: healthcareAgent.id,
        name: 'Health Checkup Reminder',
        description: 'Reminder calls for annual health checkup appointments',
        status: 'DRAFT',
        callingMode: 'MANUAL',
        maxConcurrentCalls: 1,
        callsBetweenHours: { start: 9, end: 17 },
        retryAttempts: 2,
        retryDelayMinutes: 30,
        totalContacts: 75,
        completedCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        leadsGenerated: 0,
      },
    });

    // Campaign 4: Completed Campaign
    const completedCampaign = await prisma.outboundCallCampaign.create({
      data: {
        organizationId: organization.id,
        agentId: educationAgent.id,
        name: 'Alumni Feedback Survey',
        description: 'Collecting feedback from recent graduates',
        status: 'COMPLETED',
        callingMode: 'AUTOMATIC',
        maxConcurrentCalls: 2,
        callsBetweenHours: { start: 11, end: 20 },
        retryAttempts: 1,
        retryDelayMinutes: 30,
        totalContacts: 50,
        completedCalls: 50,
        successfulCalls: 43,
        failedCalls: 7,
        leadsGenerated: 28,
        startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });

    // Create contacts for the running campaign
    const contactNames = [
      'Amit Sharma', 'Priya Patel', 'Rahul Singh', 'Neha Gupta', 'Vikram Reddy',
      'Anjali Nair', 'Suresh Kumar', 'Deepika Menon', 'Arjun Verma', 'Kavita Joshi',
      'Ravi Iyer', 'Pooja Saxena', 'Manish Agarwal', 'Shreya Kapoor', 'Nikhil Desai'
    ];

    const contacts = [];
    for (let i = 0; i < contactNames.length; i++) {
      const contact = await prisma.outboundCallContact.create({
        data: {
          campaignId: educationCampaign.id,
          phone: `+91-98765${(43210 + i).toString().slice(-5)}`,
          name: contactNames[i],
          email: `${contactNames[i].toLowerCase().replace(' ', '.')}@example.com`,
          status: i < 10 ? 'COMPLETED' : 'PENDING',
          attempts: i < 10 ? 1 : 0,
          lastAttemptAt: i < 10 ? new Date(Date.now() - (i * 3600000)) : null,
        },
      });
      contacts.push(contact);
    }

    // Create sample calls
    type CallStatus = 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY' | 'IN_PROGRESS';
    type Outcome = 'INTERESTED' | 'NOT_INTERESTED' | 'CALLBACK_REQUESTED' | 'CONVERTED' | null;

    const callStatuses: CallStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED', 'COMPLETED', 'COMPLETED', 'NO_ANSWER', 'COMPLETED', 'BUSY'];
    const outcomes: Outcome[] = ['INTERESTED', 'NOT_INTERESTED', 'CALLBACK_REQUESTED', 'CONVERTED', null, 'INTERESTED', 'CALLBACK_REQUESTED', null, 'NOT_INTERESTED', null];
    const sentiments = ['POSITIVE', 'NEUTRAL', 'POSITIVE', 'POSITIVE', null, 'POSITIVE', 'NEUTRAL', null, 'NEGATIVE', null];
    const durations = [245, 180, 320, 410, 0, 275, 195, 0, 165, 0];

    for (let i = 0; i < 10; i++) {
      await prisma.outboundCall.create({
        data: {
          campaignId: educationCampaign.id,
          contactId: contacts[i].id,
          agentId: educationAgent.id,
          phoneNumber: contacts[i].phone,
          status: callStatuses[i] as any,
          outcome: outcomes[i] as any,
          sentiment: sentiments[i] as any,
          duration: durations[i],
          startedAt: new Date(Date.now() - ((10 - i) * 3600000)),
          answeredAt: durations[i] > 0 ? new Date(Date.now() - ((10 - i) * 3600000) + 5000) : null,
          endedAt: new Date(Date.now() - ((10 - i) * 3600000) + (durations[i] * 1000)),
          summary: durations[i] > 0 ? `Call with ${contacts[i].name}. ${outcomes[i] === 'INTERESTED' ? 'Lead showed interest in summer programs.' : outcomes[i] === 'CONVERTED' ? 'Lead enrolled in the course.' : 'General inquiry about courses.'}` : null,
        },
      });
    }

    // Add more calls from recruitment campaign
    for (let i = 0; i < 5; i++) {
      await prisma.outboundCall.create({
        data: {
          campaignId: recruitmentCampaign.id,
          agentId: recruitmentAgent.id,
          phoneNumber: `+91-87654${(32109 + i).toString().slice(-5)}`,
          status: (i < 4 ? 'COMPLETED' : 'IN_PROGRESS') as any,
          outcome: (i === 0 ? 'INTERESTED' : i === 1 ? 'CALLBACK_REQUESTED' : i === 2 ? 'NOT_INTERESTED' : null) as any,
          sentiment: (i < 3 ? (i === 0 ? 'POSITIVE' : 'NEUTRAL') : null) as any,
          duration: i < 4 ? 150 + (i * 30) : null,
          startedAt: new Date(Date.now() - (i * 7200000)),
          answeredAt: i < 4 ? new Date(Date.now() - (i * 7200000) + 8000) : null,
          endedAt: i < 4 ? new Date(Date.now() - (i * 7200000) + 180000) : null,
        },
      });
    }

    console.log('✅ Outbound Campaigns: 4 campaigns created');
    console.log('✅ Outbound Contacts: 15 contacts created');
    console.log('✅ Outbound Calls: 15 calls created');
  }

  console.log('🤖 AI AGENTS CREATED (24 Total):');
  console.log('');
  console.log('📞 VOICE AGENTS - INDUSTRY (9):');
  console.log('┌────┬──────────────────────────────┬────────────────────┬──────────┐');
  console.log('│ #  │ Agent Name                   │ Industry           │ Voice    │');
  console.log('├────┼──────────────────────────────┼────────────────────┼──────────┤');
  console.log('│ 1  │ Sarah - Education Counselor  │ EDUCATION          │ nova     │');
  console.log('│ 2  │ Alex - IT Recruiter          │ IT_RECRUITMENT     │ onyx     │');
  console.log('│ 3  │ Priya - Property Advisor     │ REAL_ESTATE        │ shimmer  │');
  console.log('│ 4  │ Maya - Customer Support      │ CUSTOMER_CARE      │ alloy    │');
  console.log('│ 5  │ Dev - Technical Interviewer  │ TECHNICAL_INTERVIEW│ echo     │');
  console.log('│ 6  │ Dr. Aisha - Healthcare       │ HEALTHCARE         │ nova     │');
  console.log('│ 7  │ Rahul - Financial Advisor    │ FINANCE            │ onyx     │');
  console.log('│ 8  │ Zara - Shopping Assistant    │ ECOMMERCE          │ shimmer  │');
  console.log('│ 9  │ Custom AI Agent              │ CUSTOM             │ alloy    │');
  console.log('└────┴──────────────────────────────┴────────────────────┴──────────┘');
  console.log('');
  console.log('💬 SMS AGENTS (3):');
  console.log('┌────┬──────────────────────────────┬────────────────────┬──────────┐');
  console.log('│ #  │ Agent Name                   │ Purpose            │ Channel  │');
  console.log('├────┼──────────────────────────────┼────────────────────┼──────────┤');
  console.log('│ 10 │ SMS Sales Agent              │ Lead qualification │ SMS      │');
  console.log('│ 11 │ SMS Support Agent            │ Customer support   │ SMS      │');
  console.log('│ 12 │ SMS Appointment Reminder     │ Scheduling         │ SMS      │');
  console.log('└────┴──────────────────────────────┴────────────────────┴──────────┘');
  console.log('');
  console.log('📱 WHATSAPP AGENTS (4):');
  console.log('┌────┬──────────────────────────────┬────────────────────┬──────────┐');
  console.log('│ #  │ Agent Name                   │ Purpose            │ Channel  │');
  console.log('├────┼──────────────────────────────┼────────────────────┼──────────┤');
  console.log('│ 13 │ WhatsApp Sales Bot           │ E-commerce sales   │ WhatsApp │');
  console.log('│ 14 │ WhatsApp Support Bot         │ Customer support   │ WhatsApp │');
  console.log('│ 15 │ WhatsApp Lead Qualifier      │ Education leads    │ WhatsApp │');
  console.log('│ 16 │ WhatsApp Order Updates Bot   │ Delivery tracking  │ WhatsApp │');
  console.log('└────┴──────────────────────────────┴────────────────────┴──────────┘');
  console.log('');
  console.log('🔧 SPECIALIZED AGENTS (8):');
  console.log('┌────┬──────────────────────────────┬────────────────────┬──────────┐');
  console.log('│ #  │ Agent Name                   │ Purpose            │ Type     │');
  console.log('├────┼──────────────────────────────┼────────────────────┼──────────┤');
  console.log('│ 17 │ After-Hours Agent            │ 24/7 coverage      │ Voice    │');
  console.log('│ 18 │ IVR Menu Agent               │ Call routing       │ Voice    │');
  console.log('│ 19 │ Survey & Feedback Agent      │ Customer feedback  │ Voice    │');
  console.log('│ 20 │ Payment Reminder Agent       │ Payment follow-up  │ Voice    │');
  console.log('│ 21 │ Customer Onboarding Agent    │ New customer setup │ Voice    │');
  console.log('│ 22 │ Voicemail Handler Agent      │ Message recording  │ Voice    │');
  console.log('│ 23 │ Escalation Handler Agent     │ Complaint handling │ Voice    │');
  console.log('│ 24 │ Website Chatbot              │ Live chat support  │ Web      │');
  console.log('└────┴──────────────────────────────┴────────────────────┴──────────┘');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
