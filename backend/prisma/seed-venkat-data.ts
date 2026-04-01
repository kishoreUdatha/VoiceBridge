import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedVenkatData() {
  console.log('🌱 Adding data for Venkat Rao (fieldsales@demo.com)...\n');

  // Get Venkat's user record
  const venkat = await prisma.user.findFirst({
    where: { email: 'fieldsales@demo.com' },
    include: { organization: true },
  });

  if (!venkat) {
    console.error('❌ User fieldsales@demo.com not found');
    process.exit(1);
  }

  const orgId = venkat.organizationId;
  console.log(`Found user: ${venkat.firstName} ${venkat.lastName} (${venkat.id})`);

  // Get admin for approvals
  const admin = await prisma.user.findFirst({
    where: {
      organizationId: orgId,
      role: { slug: 'admin' }
    },
    include: { role: true },
  });

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

  // ==================== COLLEGES FOR VENKAT ====================
  const collegesData = [
    {
      name: 'Chaitanya Bharathi Institute of Technology',
      shortName: 'CBIT',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AUTONOMOUS' as const,
      category: 'HOT' as const,
      address: 'Gandipet, Kokapet',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500075',
      latitude: 17.3503,
      longitude: 78.3489,
      studentStrength: 5000,
      annualIntake: 1400,
      coursesOffered: ['B.Tech', 'M.Tech', 'MBA'],
      establishedYear: 1979,
      phone: '+91-40-24193276',
      email: 'principal@cbit.ac.in',
    },
    {
      name: 'Vasavi College of Engineering',
      shortName: 'VCE',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AUTONOMOUS' as const,
      category: 'HOT' as const,
      address: 'Ibrahimbagh',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500031',
      latitude: 17.4239,
      longitude: 78.3833,
      studentStrength: 4000,
      annualIntake: 1200,
      coursesOffered: ['B.Tech', 'M.Tech'],
      establishedYear: 1981,
      phone: '+91-40-23146010',
    },
    {
      name: 'Malla Reddy Engineering College',
      shortName: 'MREC',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AFFILIATED' as const,
      category: 'WARM' as const,
      address: 'Maisammaguda, Dhulapally',
      city: 'Secunderabad',
      state: 'Telangana',
      pincode: '500100',
      latitude: 17.5563,
      longitude: 78.4866,
      studentStrength: 6000,
      annualIntake: 1800,
      coursesOffered: ['B.Tech', 'M.Tech', 'MBA', 'MCA'],
      establishedYear: 2001,
    },
    {
      name: 'CVR College of Engineering',
      shortName: 'CVR',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AUTONOMOUS' as const,
      category: 'WARM' as const,
      address: 'Vastunagar, Mangalpalli',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '501510',
      latitude: 17.2909,
      longitude: 78.6253,
      studentStrength: 3500,
      annualIntake: 1000,
      coursesOffered: ['B.Tech', 'M.Tech'],
      establishedYear: 2001,
    },
    {
      name: 'Geethanjali College of Engineering',
      shortName: 'GCET',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AFFILIATED' as const,
      category: 'COLD' as const,
      address: 'Cheeryal, Keesara',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '501301',
      latitude: 17.5182,
      longitude: 78.6108,
      studentStrength: 2500,
      annualIntake: 800,
      coursesOffered: ['B.Tech', 'M.Tech'],
      establishedYear: 2008,
    },
  ];

  const createdColleges: any[] = [];
  for (let i = 0; i < collegesData.length; i++) {
    const data = collegesData[i];
    const college = await prisma.college.upsert({
      where: { id: `venkat-college-${i + 1}` },
      update: {
        assignedToId: venkat.id,
      },
      create: {
        id: `venkat-college-${i + 1}`,
        organizationId: orgId,
        assignedToId: venkat.id,
        ...data,
        coursesOffered: JSON.stringify(data.coursesOffered),
      },
    });
    createdColleges.push(college);
  }
  console.log(`✅ Created ${createdColleges.length} colleges for Venkat`);

  // ==================== CONTACTS ====================
  const contactsData = [
    // CBIT
    { collegeIndex: 0, name: 'Dr. C. V. Narasimhulu', designation: 'Principal', department: 'Administration', phone: '+91-9848012345', email: 'principal@cbit.ac.in', isPrimary: true, isDecisionMaker: true },
    { collegeIndex: 0, name: 'Mr. Ramesh Babu', designation: 'Placement Officer', department: 'T&P Cell', phone: '+91-9848012346', isPrimary: false, isDecisionMaker: false },
    // VCE
    { collegeIndex: 1, name: 'Dr. Jagannadha Rao', designation: 'Principal', department: 'Administration', phone: '+91-9848012347', isPrimary: true, isDecisionMaker: true },
    { collegeIndex: 1, name: 'Mrs. Sunitha Reddy', designation: 'HOD - CSE', department: 'Computer Science', phone: '+91-9848012348', isPrimary: false, isDecisionMaker: true },
    // MREC
    { collegeIndex: 2, name: 'Dr. Malla Reddy', designation: 'Chairman', department: 'Management', phone: '+91-9848012349', isPrimary: true, isDecisionMaker: true },
    // CVR
    { collegeIndex: 3, name: 'Dr. K. Ravi Kumar', designation: 'Principal', department: 'Administration', phone: '+91-9848012350', isPrimary: true, isDecisionMaker: true },
    // GCET
    { collegeIndex: 4, name: 'Mr. Srinivas', designation: 'Principal', department: 'Administration', phone: '+91-9848012351', isPrimary: true, isDecisionMaker: true },
  ];

  for (const contact of contactsData) {
    const college = createdColleges[contact.collegeIndex];
    await prisma.collegeContact.upsert({
      where: { id: `venkat-contact-${college.id}-${contact.name.replace(/\s/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `venkat-contact-${college.id}-${contact.name.replace(/\s/g, '-').toLowerCase()}`,
        collegeId: college.id,
        name: contact.name,
        designation: contact.designation,
        department: contact.department,
        phone: contact.phone,
        email: contact.email,
        isPrimary: contact.isPrimary,
        isDecisionMaker: contact.isDecisionMaker,
      },
    });
  }
  console.log(`✅ Created ${contactsData.length} contacts`);

  // ==================== VISITS ====================
  const visitsData = [
    // Completed visits
    {
      collegeIndex: 0, // CBIT
      visitDate: threeDaysAgo,
      checkInTime: new Date(new Date(threeDaysAgo).setHours(10, 0, 0)),
      checkOutTime: new Date(new Date(threeDaysAgo).setHours(12, 30, 0)),
      checkInLatitude: 17.3503,
      checkInLongitude: 78.3489,
      locationVerified: true,
      distanceFromCollege: 35.2,
      purpose: 'FIRST_INTRODUCTION' as const,
      outcome: 'POSITIVE' as const,
      summary: 'Had an excellent first meeting with Dr. Narasimhulu. He showed keen interest in our coding assessment platform. They have 1400 students in final year who need placement preparation.',
      actionItems: '1. Send detailed product brochure\n2. Prepare demo for 50 students\n3. Get pricing for 1500 licenses',
      nextAction: 'Product Demo',
    },
    {
      collegeIndex: 1, // VCE
      visitDate: twoDaysAgo,
      checkInTime: new Date(new Date(twoDaysAgo).setHours(14, 30, 0)),
      checkOutTime: new Date(new Date(twoDaysAgo).setHours(17, 0, 0)),
      checkInLatitude: 17.4239,
      checkInLongitude: 78.3833,
      locationVerified: true,
      distanceFromCollege: 22.5,
      purpose: 'PRODUCT_DEMO' as const,
      outcome: 'POSITIVE' as const,
      summary: 'Conducted product demo for CSE department. 30 faculty members attended. Mrs. Sunitha was very impressed with the AI-based assessment feature. Principal wants to proceed with pilot.',
      actionItems: '1. Send pilot proposal for 200 students\n2. Schedule training for faculty\n3. Follow up on budget approval',
      nextAction: 'Proposal Submission',
    },
    {
      collegeIndex: 2, // MREC
      visitDate: yesterday,
      checkInTime: new Date(new Date(yesterday).setHours(11, 0, 0)),
      checkOutTime: new Date(new Date(yesterday).setHours(13, 30, 0)),
      checkInLatitude: 17.5563,
      checkInLongitude: 78.4866,
      locationVerified: true,
      distanceFromCollege: 45.8,
      purpose: 'PROPOSAL_PRESENTATION' as const,
      outcome: 'DECISION_PENDING' as const,
      summary: 'Presented comprehensive proposal to Chairman. He appreciated our pricing but wants to compare with 2 other vendors. Decision expected by next week.',
      actionItems: '1. Send comparison chart with competitors\n2. Offer 10% early bird discount\n3. Call on Thursday for follow-up',
    },
    // Today's visit (ongoing)
    {
      collegeIndex: 3, // CVR
      visitDate: today,
      checkInTime: new Date(new Date(today).setHours(9, 30, 0)),
      checkOutTime: null, // Still at the college
      checkInLatitude: 17.2909,
      checkInLongitude: 78.6253,
      locationVerified: true,
      distanceFromCollege: 18.3,
      purpose: 'NEGOTIATION' as const,
      outcome: null,
      summary: 'Meeting with Principal to finalize deal terms. Discussion ongoing.',
    },
    // Scheduled visits
    {
      collegeIndex: 0, // CBIT - follow up
      visitDate: tomorrow,
      checkInTime: null,
      checkOutTime: null,
      purpose: 'PRODUCT_DEMO' as const,
      outcome: null,
      summary: 'Scheduled: Product demo for T&P cell and 50 students',
    },
    {
      collegeIndex: 4, // GCET
      visitDate: dayAfterTomorrow,
      checkInTime: null,
      checkOutTime: null,
      purpose: 'FIRST_INTRODUCTION' as const,
      outcome: null,
      summary: 'Scheduled: First meeting with Principal',
    },
  ];

  for (let i = 0; i < visitsData.length; i++) {
    const visit = visitsData[i];
    const college = createdColleges[visit.collegeIndex];

    await prisma.collegeVisit.upsert({
      where: { id: `venkat-visit-${i + 1}` },
      update: {},
      create: {
        id: `venkat-visit-${i + 1}`,
        collegeId: college.id,
        organizationId: orgId,
        userId: venkat.id,
        visitDate: visit.visitDate,
        checkInTime: visit.checkInTime,
        checkOutTime: visit.checkOutTime,
        duration: visit.checkOutTime && visit.checkInTime
          ? Math.round((visit.checkOutTime.getTime() - visit.checkInTime.getTime()) / 60000)
          : null,
        checkInLatitude: visit.checkInLatitude || null,
        checkInLongitude: visit.checkInLongitude || null,
        locationVerified: visit.locationVerified || false,
        distanceFromCollege: visit.distanceFromCollege || null,
        purpose: visit.purpose,
        outcome: visit.outcome,
        summary: visit.summary,
        actionItems: visit.actionItems || null,
        nextAction: visit.nextAction || null,
        photos: JSON.stringify([]),
        documents: JSON.stringify([]),
        contactsMet: JSON.stringify([]),
      },
    });
  }
  console.log(`✅ Created ${visitsData.length} visits`);

  // ==================== DEALS ====================
  const dealsData = [
    {
      collegeIndex: 0, // CBIT
      dealName: 'CBIT - Placement Training Platform',
      description: 'Comprehensive placement training solution for 1500 final year students including aptitude, coding, and soft skills.',
      products: ['Aptitude Module', 'Coding Platform', 'Soft Skills', 'Mock Interviews'],
      dealValue: 1200000,
      stage: 'NEEDS_ANALYSIS' as const,
      probability: 30,
      expectedCloseDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      collegeIndex: 1, // VCE
      dealName: 'VCE - CSE Department AI Assessment',
      description: 'AI-based coding assessment platform for CSE department with 800 students.',
      products: ['AI Assessment', 'Coding Platform', 'Analytics Dashboard'],
      dealValue: 650000,
      stage: 'PROPOSAL_SENT' as const,
      probability: 50,
      expectedCloseDate: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000),
    },
    {
      collegeIndex: 2, // MREC
      dealName: 'MREC - Campus Wide LMS',
      description: 'Learning Management System for all departments with 6000 students.',
      products: ['LMS Enterprise', 'Mobile App', 'Content Library'],
      dealValue: 2500000,
      stage: 'NEGOTIATION' as const,
      probability: 60,
      expectedCloseDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      collegeIndex: 3, // CVR
      dealName: 'CVR - Technical Training Partnership',
      description: 'Annual technical training partnership for emerging technologies.',
      products: ['AI/ML Workshop', 'Cloud Computing', 'DevOps Training'],
      dealValue: 800000,
      stage: 'NEGOTIATION' as const,
      probability: 80,
      expectedCloseDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  ];

  for (let i = 0; i < dealsData.length; i++) {
    const deal = dealsData[i];
    const college = createdColleges[deal.collegeIndex];

    await prisma.collegeDeal.upsert({
      where: { collegeId: college.id },
      update: {
        dealName: deal.dealName,
        description: deal.description,
        dealValue: deal.dealValue,
        stage: deal.stage,
        probability: deal.probability,
        expectedCloseDate: deal.expectedCloseDate,
      },
      create: {
        id: `venkat-deal-${i + 1}`,
        collegeId: college.id,
        organizationId: orgId,
        ownerId: venkat.id,
        dealName: deal.dealName,
        description: deal.description,
        products: JSON.stringify(deal.products),
        dealValue: deal.dealValue,
        stage: deal.stage,
        probability: deal.probability,
        expectedCloseDate: deal.expectedCloseDate,
        stageHistory: JSON.stringify([
          { stage: 'PROSPECTING', changedAt: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), changedBy: venkat.id },
          { stage: deal.stage, changedAt: new Date().toISOString(), changedBy: venkat.id },
        ]),
      },
    });
  }
  console.log(`✅ Created ${dealsData.length} deals`);

  // ==================== EXPENSES ====================
  const expensesData = [
    // CBIT visit expenses (3 days ago) - PAID
    {
      collegeIndex: 0,
      visitIndex: 0,
      category: 'TRAVEL_FUEL' as const,
      amount: 650,
      expenseDate: threeDaysAgo,
      description: 'Petrol - Bike to CBIT Gandipet (round trip 45km)',
      status: 'PAID' as const,
    },
    {
      collegeIndex: 0,
      visitIndex: 0,
      category: 'FOOD_MEALS' as const,
      amount: 280,
      expenseDate: threeDaysAgo,
      description: 'Lunch at CBIT canteen during meeting',
      status: 'PAID' as const,
    },
    // VCE visit expenses (2 days ago) - APPROVED
    {
      collegeIndex: 1,
      visitIndex: 1,
      category: 'TRAVEL_TAXI' as const,
      amount: 450,
      expenseDate: twoDaysAgo,
      description: 'Ola to VCE Ibrahimbagh (carrying demo equipment)',
      status: 'APPROVED' as const,
    },
    {
      collegeIndex: 1,
      visitIndex: 1,
      category: 'FOOD_ENTERTAINMENT' as const,
      amount: 1200,
      expenseDate: twoDaysAgo,
      description: 'Tea & snacks for 30 faculty during demo',
      status: 'APPROVED' as const,
    },
    // MREC visit expenses (yesterday) - SUBMITTED
    {
      collegeIndex: 2,
      visitIndex: 2,
      category: 'TRAVEL_FUEL' as const,
      amount: 520,
      expenseDate: yesterday,
      description: 'Petrol - Bike to MREC Secunderabad',
      status: 'SUBMITTED' as const,
    },
    {
      collegeIndex: 2,
      visitIndex: 2,
      category: 'TRAVEL_PARKING' as const,
      amount: 50,
      expenseDate: yesterday,
      description: 'Parking at MREC campus',
      status: 'SUBMITTED' as const,
    },
    {
      collegeIndex: 2,
      visitIndex: 2,
      category: 'FOOD_MEALS' as const,
      amount: 350,
      expenseDate: yesterday,
      description: 'Lunch during MREC meeting',
      status: 'SUBMITTED' as const,
    },
    // Today's expenses - DRAFT
    {
      collegeIndex: 3,
      visitIndex: 3,
      category: 'TRAVEL_FUEL' as const,
      amount: 480,
      expenseDate: today,
      description: 'Petrol - Bike to CVR College (ongoing visit)',
      status: 'DRAFT' as const,
    },
    {
      collegeIndex: 3,
      visitIndex: 3,
      category: 'TRAVEL_PARKING' as const,
      amount: 30,
      expenseDate: today,
      description: 'Parking at CVR',
      status: 'DRAFT' as const,
    },
  ];

  for (let i = 0; i < expensesData.length; i++) {
    const expense = expensesData[i];
    const college = createdColleges[expense.collegeIndex];

    const expenseRecord: any = {
      id: `venkat-expense-${i + 1}`,
      collegeId: college.id,
      visitId: expense.visitIndex !== undefined ? `venkat-visit-${expense.visitIndex + 1}` : null,
      organizationId: orgId,
      userId: venkat.id,
      category: expense.category,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      description: expense.description,
      status: expense.status,
    };

    if (expense.status === 'APPROVED' || expense.status === 'PAID') {
      expenseRecord.approvedById = admin?.id;
      expenseRecord.approvedAt = new Date(expense.expenseDate.getTime() + 24 * 60 * 60 * 1000);
    }

    if (expense.status === 'PAID') {
      expenseRecord.paidAt = new Date(expense.expenseDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      expenseRecord.paymentRef = `PAY-VENKAT-${Date.now()}-${i}`;
    }

    await prisma.collegeExpense.upsert({
      where: { id: expenseRecord.id },
      update: {},
      create: expenseRecord,
    });
  }
  console.log(`✅ Created ${expensesData.length} expenses`);

  // ==================== SUMMARY ====================
  console.log('\n🎉 Data for Venkat Rao (fieldsales@demo.com) created successfully!\n');
  console.log('Summary:');
  console.log('  📍 5 colleges assigned (CBIT, VCE, MREC, CVR, GCET)');
  console.log('  👥 7 contacts added');
  console.log('  📋 6 visits (3 completed, 1 ongoing, 2 scheduled)');
  console.log('  💼 4 deals in pipeline (₹51.5L total value)');
  console.log('  💰 9 expenses (2 paid, 2 approved, 3 submitted, 2 draft)');
  console.log('\n📱 Login: fieldsales@demo.com / admin123');
  console.log('\nToday\'s Schedule:');
  console.log('  • CVR College - Currently checked in (Negotiation meeting)');
  console.log('  • Tomorrow: CBIT - Product Demo');
  console.log('  • Day after: GCET - First Introduction');
}

seedVenkatData()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
