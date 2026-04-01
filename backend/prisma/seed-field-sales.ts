import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFieldSales() {
  console.log('🌱 Seeding Field Sales data...\n');

  // Get existing organization and users
  const organization = await prisma.organization.findFirst({
    where: { slug: 'demo-org' },
  });

  if (!organization) {
    console.error('❌ Organization not found. Run main seed first: npx prisma db seed');
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { organizationId: organization.id },
    include: { role: true },
  });

  // Find field sales users (or fallback to managers)
  let fieldReps = users.filter(u =>
    ['field_sales'].includes(u.role?.slug || '')
  );

  // Fallback to managers if no field_sales users exist yet
  if (fieldReps.length === 0) {
    fieldReps = users.filter(u => u.role?.slug === 'manager');
  }

  if (fieldReps.length === 0) {
    console.error('❌ No field reps found. Run main seed first.');
    process.exit(1);
  }

  const admin = users.find(u => u.role?.slug === 'admin');
  if (!admin) {
    console.error('❌ No admin found for approvals.');
    process.exit(1);
  }

  console.log(`Found ${fieldReps.length} field reps and admin for approvals`);

  // ==================== COLLEGES ====================
  const collegeData = [
    {
      name: 'IIT Hyderabad',
      shortName: 'IITH',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AUTONOMOUS' as const,
      category: 'HOT' as const,
      address: 'Kandi, Sangareddy District',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '502285',
      latitude: 17.5915,
      longitude: 78.1234,
      studentStrength: 3500,
      annualIntake: 800,
      coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      establishedYear: 2008,
      phone: '+91-40-23016000',
      email: 'contact@iith.ac.in',
      website: 'https://iith.ac.in',
    },
    {
      name: 'JNTU College of Engineering',
      shortName: 'JNTUH',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'UNIVERSITY' as const,
      category: 'HOT' as const,
      address: 'Kukatpally',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500085',
      latitude: 17.4933,
      longitude: 78.3915,
      studentStrength: 8000,
      annualIntake: 2000,
      coursesOffered: ['B.Tech', 'M.Tech', 'MBA', 'MCA'],
      establishedYear: 1965,
      phone: '+91-40-23158661',
      email: 'info@jntuh.ac.in',
      website: 'https://jntuh.ac.in',
    },
    {
      name: 'Osmania University',
      shortName: 'OU',
      collegeType: 'ARTS' as const,
      institutionStatus: 'UNIVERSITY' as const,
      category: 'WARM' as const,
      address: 'Osmania University Campus',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500007',
      latitude: 17.4156,
      longitude: 78.5203,
      studentStrength: 15000,
      annualIntake: 4000,
      coursesOffered: ['BA', 'BSc', 'BCom', 'MA', 'MSc', 'MCom'],
      establishedYear: 1918,
      phone: '+91-40-27090200',
      email: 'contact@osmania.ac.in',
    },
    {
      name: 'CMR Institute of Technology',
      shortName: 'CMRIT',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AFFILIATED' as const,
      category: 'WARM' as const,
      address: 'Medchal Road, Kandlakoya',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '501401',
      latitude: 17.5449,
      longitude: 78.4386,
      studentStrength: 4000,
      annualIntake: 1200,
      coursesOffered: ['B.Tech', 'M.Tech', 'MBA'],
      establishedYear: 2003,
      phone: '+91-40-25048505',
    },
    {
      name: 'Government Polytechnic Masab Tank',
      shortName: 'GP Masab Tank',
      collegeType: 'POLYTECHNIC' as const,
      institutionStatus: 'STANDALONE' as const,
      category: 'COLD' as const,
      address: 'Masab Tank',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500028',
      latitude: 17.3984,
      longitude: 78.4598,
      studentStrength: 1200,
      annualIntake: 400,
      coursesOffered: ['Diploma EEE', 'Diploma ECE', 'Diploma Mech'],
      establishedYear: 1960,
    },
    {
      name: 'BITS Pilani - Hyderabad Campus',
      shortName: 'BITS Hyd',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'DEEMED' as const,
      category: 'HOT' as const,
      address: 'Jawahar Nagar, Shameerpet',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500078',
      latitude: 17.5469,
      longitude: 78.5726,
      studentStrength: 4500,
      annualIntake: 1000,
      coursesOffered: ['B.E', 'M.E', 'PhD', 'MBA'],
      establishedYear: 2008,
      phone: '+91-40-66303000',
      email: 'admissions@hyderabad.bits-pilani.ac.in',
      website: 'https://www.bits-pilani.ac.in/hyderabad',
    },
    {
      name: 'Gandhi Medical College',
      shortName: 'GMC',
      collegeType: 'MEDICAL' as const,
      institutionStatus: 'AUTONOMOUS' as const,
      category: 'WARM' as const,
      address: 'Musheerabad',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500003',
      latitude: 17.4072,
      longitude: 78.4871,
      studentStrength: 1500,
      annualIntake: 250,
      coursesOffered: ['MBBS', 'MD', 'MS'],
      establishedYear: 1954,
      phone: '+91-40-23437007',
    },
    {
      name: 'NIT Warangal',
      shortName: 'NITW',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AUTONOMOUS' as const,
      category: 'HOT' as const,
      address: 'NIT Campus',
      city: 'Warangal',
      state: 'Telangana',
      pincode: '506004',
      latitude: 17.9784,
      longitude: 79.5300,
      studentStrength: 5500,
      annualIntake: 1200,
      coursesOffered: ['B.Tech', 'M.Tech', 'MCA', 'MBA', 'PhD'],
      establishedYear: 1959,
      phone: '+91-870-2462011',
      email: 'registrar@nitw.ac.in',
      website: 'https://www.nitw.ac.in',
    },
    {
      name: 'Kakatiya University',
      shortName: 'KU',
      collegeType: 'ARTS' as const,
      institutionStatus: 'UNIVERSITY' as const,
      category: 'COLD' as const,
      address: 'Vidyaranyapuri',
      city: 'Warangal',
      state: 'Telangana',
      pincode: '506009',
      latitude: 17.9701,
      longitude: 79.5940,
      studentStrength: 12000,
      annualIntake: 3500,
      coursesOffered: ['BA', 'BSc', 'BCom', 'BBA', 'MA', 'MSc'],
      establishedYear: 1976,
    },
    {
      name: 'Sreenidhi Institute of Science and Technology',
      shortName: 'SNIST',
      collegeType: 'ENGINEERING' as const,
      institutionStatus: 'AUTONOMOUS' as const,
      category: 'WARM' as const,
      address: 'Yamnampet, Ghatkesar',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '501301',
      latitude: 17.4215,
      longitude: 78.6471,
      studentStrength: 6000,
      annualIntake: 1800,
      coursesOffered: ['B.Tech', 'M.Tech', 'MBA', 'MCA'],
      establishedYear: 1997,
      phone: '+91-8418-304000',
    },
  ];

  const createdColleges: any[] = [];

  for (let i = 0; i < collegeData.length; i++) {
    const data = collegeData[i];
    const assignedTo = fieldReps[i % fieldReps.length];

    const college = await prisma.college.upsert({
      where: {
        id: `college-${i + 1}-seed`,
      },
      update: {},
      create: {
        id: `college-${i + 1}-seed`,
        organizationId: organization.id,
        assignedToId: assignedTo.id,
        ...data,
        coursesOffered: JSON.stringify(data.coursesOffered),
      },
    });
    createdColleges.push(college);
  }
  console.log(`✅ Created ${createdColleges.length} colleges`);

  // ==================== CONTACTS ====================
  const contactsPerCollege = [
    // IIT Hyderabad
    [
      { name: 'Dr. Ramesh Iyer', designation: 'Dean - Academics', department: 'Administration', phone: '+91-9876500001', email: 'dean.academics@iith.ac.in', isPrimary: true, isDecisionMaker: true },
      { name: 'Prof. Sanjay Mehta', designation: 'HOD - CSE', department: 'Computer Science', phone: '+91-9876500002', email: 'hod.cse@iith.ac.in', isPrimary: false, isDecisionMaker: true },
    ],
    // JNTUH
    [
      { name: 'Dr. Vijay Reddy', designation: 'Registrar', department: 'Administration', phone: '+91-9876500003', email: 'registrar@jntuh.ac.in', isPrimary: true, isDecisionMaker: true },
      { name: 'Ms. Lakshmi Prasad', designation: 'Purchase Officer', department: 'Administration', phone: '+91-9876500004', isPrimary: false, isDecisionMaker: false },
    ],
    // Osmania
    [
      { name: 'Dr. Anand Kumar', designation: 'Vice Chancellor', department: 'Administration', phone: '+91-9876500005', email: 'vc@osmania.ac.in', isPrimary: true, isDecisionMaker: true },
    ],
    // CMRIT
    [
      { name: 'Mr. Ravi Shankar', designation: 'Principal', department: 'Administration', phone: '+91-9876500006', isPrimary: true, isDecisionMaker: true },
      { name: 'Ms. Priya Kumari', designation: 'Placement Officer', department: 'T&P Cell', phone: '+91-9876500007', isPrimary: false, isDecisionMaker: false },
    ],
    // GP Masab Tank
    [
      { name: 'Mr. Mohammed Ali', designation: 'Principal', department: 'Administration', phone: '+91-9876500008', isPrimary: true, isDecisionMaker: true },
    ],
    // BITS Hyd
    [
      { name: 'Prof. Shrikant Lonikar', designation: 'Director', department: 'Administration', phone: '+91-9876500009', email: 'director@hyderabad.bits-pilani.ac.in', isPrimary: true, isDecisionMaker: true },
      { name: 'Dr. Arun Sharma', designation: 'Associate Dean', department: 'Practice School', phone: '+91-9876500010', isPrimary: false, isDecisionMaker: true },
    ],
    // GMC
    [
      { name: 'Dr. Narendra Singh', designation: 'Dean', department: 'Administration', phone: '+91-9876500011', isPrimary: true, isDecisionMaker: true },
    ],
    // NITW
    [
      { name: 'Prof. N.V. Ramana Rao', designation: 'Director', department: 'Administration', phone: '+91-9876500012', email: 'director@nitw.ac.in', isPrimary: true, isDecisionMaker: true },
      { name: 'Dr. Suresh Babu', designation: 'Dean - Student Welfare', department: 'Administration', phone: '+91-9876500013', isPrimary: false, isDecisionMaker: true },
    ],
    // KU
    [
      { name: 'Prof. Thatikonda Ramesh', designation: 'Vice Chancellor', department: 'Administration', phone: '+91-9876500014', isPrimary: true, isDecisionMaker: true },
    ],
    // SNIST
    [
      { name: 'Dr. T. Ch. Siva Reddy', designation: 'Principal', department: 'Administration', phone: '+91-9876500015', isPrimary: true, isDecisionMaker: true },
      { name: 'Mr. Kiran Kumar', designation: 'Training & Placement Head', department: 'T&P Cell', phone: '+91-9876500016', isPrimary: false, isDecisionMaker: false },
    ],
  ];

  let totalContacts = 0;
  for (let i = 0; i < createdColleges.length; i++) {
    const college = createdColleges[i];
    const contacts = contactsPerCollege[i] || [];

    for (const contact of contacts) {
      await prisma.collegeContact.upsert({
        where: { id: `contact-${college.id}-${contact.name.replace(/\s/g, '-').toLowerCase()}` },
        update: {},
        create: {
          id: `contact-${college.id}-${contact.name.replace(/\s/g, '-').toLowerCase()}`,
          collegeId: college.id,
          ...contact,
        },
      });
      totalContacts++;
    }
  }
  console.log(`✅ Created ${totalContacts} contacts`);

  // ==================== VISITS ====================
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const visitsData = [
    // Completed visits
    {
      collegeIndex: 0, // IIT Hyderabad
      visitDate: weekAgo,
      checkInTime: new Date(weekAgo.setHours(10, 30, 0)),
      checkOutTime: new Date(weekAgo.setHours(12, 45, 0)),
      checkInLatitude: 17.5915,
      checkInLongitude: 78.1234,
      locationVerified: true,
      distanceFromCollege: 25.5,
      purpose: 'FIRST_INTRODUCTION' as const,
      outcome: 'POSITIVE' as const,
      summary: 'Had a very productive first meeting with the Dean. They are interested in our EdTech solutions for their new computer lab. Scheduled a product demo for next week.',
      actionItems: 'Prepare customized proposal for 200 seats. Send company profile via email.',
      nextAction: 'Product Demo',
    },
    {
      collegeIndex: 1, // JNTUH
      visitDate: twoDaysAgo,
      checkInTime: new Date(twoDaysAgo.setHours(14, 0, 0)),
      checkOutTime: new Date(twoDaysAgo.setHours(16, 30, 0)),
      checkInLatitude: 17.4933,
      checkInLongitude: 78.3915,
      locationVerified: true,
      distanceFromCollege: 45.2,
      purpose: 'PRODUCT_DEMO' as const,
      outcome: 'POSITIVE' as const,
      summary: 'Demonstrated our LMS platform to 15 faculty members. Great feedback received. Principal expressed interest in a pilot program.',
      actionItems: 'Send pilot proposal for 500 students. Follow up on budget approval timeline.',
      nextAction: 'Proposal Submission',
    },
    {
      collegeIndex: 5, // BITS Hyd
      visitDate: yesterday,
      checkInTime: new Date(yesterday.setHours(11, 0, 0)),
      checkOutTime: new Date(yesterday.setHours(13, 0, 0)),
      checkInLatitude: 17.5469,
      checkInLongitude: 78.5726,
      locationVerified: true,
      distanceFromCollege: 15.8,
      purpose: 'PROPOSAL_PRESENTATION' as const,
      outcome: 'DECISION_PENDING' as const,
      summary: 'Presented detailed proposal to the Director and Associate Dean. They need to discuss with the Board. Decision expected in 2 weeks.',
      actionItems: 'Send revised pricing with academic discount. Prepare reference list from other IITs.',
    },
    // Today's ongoing visit
    {
      collegeIndex: 7, // NITW
      visitDate: today,
      checkInTime: new Date(today.setHours(9, 30, 0)),
      checkOutTime: null,
      checkInLatitude: 17.9784,
      checkInLongitude: 79.5300,
      locationVerified: true,
      distanceFromCollege: 120.5,
      purpose: 'NEGOTIATION' as const,
      outcome: null,
      summary: 'Currently in meeting with Director to finalize pricing and terms.',
      actionItems: null,
      nextAction: null,
    },
    // Scheduled for tomorrow
    {
      collegeIndex: 3, // CMRIT
      visitDate: tomorrow,
      checkInTime: null,
      checkOutTime: null,
      purpose: 'RELATIONSHIP_BUILDING' as const,
      outcome: null,
      summary: 'Scheduled quarterly review meeting with Principal.',
    },
  ];

  for (let i = 0; i < visitsData.length; i++) {
    const visitData = visitsData[i];
    const college = createdColleges[visitData.collegeIndex];
    const user = fieldReps[i % fieldReps.length];

    await prisma.collegeVisit.upsert({
      where: { id: `visit-${i + 1}-seed` },
      update: {},
      create: {
        id: `visit-${i + 1}-seed`,
        collegeId: college.id,
        organizationId: organization.id,
        userId: user.id,
        visitDate: visitData.visitDate,
        checkInTime: visitData.checkInTime || null,
        checkOutTime: visitData.checkOutTime || null,
        duration: visitData.checkOutTime && visitData.checkInTime
          ? Math.round((visitData.checkOutTime.getTime() - visitData.checkInTime.getTime()) / 60000)
          : null,
        checkInLatitude: visitData.checkInLatitude || null,
        checkInLongitude: visitData.checkInLongitude || null,
        locationVerified: visitData.locationVerified || false,
        distanceFromCollege: visitData.distanceFromCollege || null,
        purpose: visitData.purpose,
        outcome: visitData.outcome || null,
        summary: visitData.summary,
        actionItems: visitData.actionItems || null,
        nextAction: visitData.nextAction || null,
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
      collegeIndex: 0, // IIT Hyderabad
      dealName: 'IIT Hyderabad - Computer Lab Software',
      description: 'Enterprise license for 200 workstations including LMS, coding platform, and virtual labs.',
      products: ['LMS Enterprise', 'Coding Platform', 'Virtual Labs'],
      dealValue: 2500000,
      stage: 'PROPOSAL_SENT' as const,
      probability: 50,
      expectedCloseDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      collegeIndex: 1, // JNTUH
      dealName: 'JNTUH - Campus Wide LMS',
      description: 'Complete LMS deployment for 8000 students across all departments.',
      products: ['LMS Enterprise', 'Mobile App', 'Analytics Dashboard'],
      dealValue: 5000000,
      stage: 'NEEDS_ANALYSIS' as const,
      probability: 30,
      expectedCloseDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000),
    },
    {
      collegeIndex: 5, // BITS Hyd
      dealName: 'BITS Hyderabad - Research Platform',
      description: 'Research collaboration platform with AI/ML tools for PhD students.',
      products: ['Research Platform', 'AI/ML Tools', 'Cloud Computing Credits'],
      dealValue: 3500000,
      stage: 'NEGOTIATION' as const,
      probability: 70,
      expectedCloseDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      collegeIndex: 7, // NITW
      dealName: 'NIT Warangal - Digital Classroom',
      description: 'Smart classroom setup for 50 classrooms with interactive displays and recording.',
      products: ['Smart Boards', 'Recording System', 'Cloud Storage'],
      dealValue: 8000000,
      stage: 'NEGOTIATION' as const,
      probability: 80,
      expectedCloseDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      collegeIndex: 3, // CMRIT
      dealName: 'CMRIT - Placement Training Platform',
      description: 'Aptitude and coding practice platform for placement preparation.',
      products: ['Aptitude Module', 'Coding Practice', 'Mock Interviews'],
      dealValue: 800000,
      stage: 'WON' as const,
      probability: 100,
      actualCloseDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      collegeIndex: 9, // SNIST
      dealName: 'SNIST - Training Partner',
      description: 'Annual training partnership for soft skills and technical training.',
      products: ['Soft Skills Training', 'Technical Workshops'],
      dealValue: 600000,
      stage: 'FIRST_MEETING' as const,
      probability: 20,
      expectedCloseDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
    },
  ];

  for (let i = 0; i < dealsData.length; i++) {
    const dealData = dealsData[i];
    const college = createdColleges[dealData.collegeIndex];
    const owner = fieldReps[i % fieldReps.length];

    await prisma.collegeDeal.upsert({
      where: { collegeId: college.id },
      update: {},
      create: {
        id: `deal-${i + 1}-seed`,
        collegeId: college.id,
        organizationId: organization.id,
        ownerId: owner.id,
        dealName: dealData.dealName,
        description: dealData.description,
        products: JSON.stringify(dealData.products),
        dealValue: dealData.dealValue,
        stage: dealData.stage,
        probability: dealData.probability,
        expectedCloseDate: dealData.expectedCloseDate || null,
        actualCloseDate: dealData.actualCloseDate || null,
        stageHistory: JSON.stringify([
          { stage: 'PROSPECTING', changedAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), changedBy: owner.id },
          { stage: dealData.stage, changedAt: new Date(), changedBy: owner.id },
        ]),
      },
    });
  }
  console.log(`✅ Created ${dealsData.length} deals`);

  // ==================== EXPENSES ====================
  const expensesData = [
    // Approved and paid
    {
      collegeIndex: 0,
      visitIndex: 0,
      category: 'TRAVEL_FUEL' as const,
      amount: 850,
      expenseDate: weekAgo,
      description: 'Petrol for bike - IIT Hyderabad visit',
      status: 'PAID' as const,
    },
    {
      collegeIndex: 0,
      visitIndex: 0,
      category: 'FOOD_MEALS' as const,
      amount: 350,
      expenseDate: weekAgo,
      description: 'Lunch during IIT Hyderabad visit',
      status: 'PAID' as const,
    },
    // Approved pending payment
    {
      collegeIndex: 1,
      visitIndex: 1,
      category: 'TRAVEL_TAXI' as const,
      amount: 1200,
      expenseDate: twoDaysAgo,
      description: 'Ola cab to JNTUH campus',
      status: 'APPROVED' as const,
    },
    {
      collegeIndex: 1,
      visitIndex: 1,
      category: 'FOOD_ENTERTAINMENT' as const,
      amount: 1500,
      expenseDate: twoDaysAgo,
      description: 'Client lunch with JNTUH faculty',
      status: 'APPROVED' as const,
    },
    // Submitted pending approval
    {
      collegeIndex: 5,
      visitIndex: 2,
      category: 'TRAVEL_FUEL' as const,
      amount: 450,
      expenseDate: yesterday,
      description: 'Fuel for BITS visit',
      status: 'SUBMITTED' as const,
    },
    {
      collegeIndex: 5,
      visitIndex: 2,
      category: 'TRAVEL_PARKING' as const,
      amount: 100,
      expenseDate: yesterday,
      description: 'Parking at BITS Hyderabad',
      status: 'SUBMITTED' as const,
    },
    // Draft expenses (not yet submitted)
    {
      collegeIndex: 7,
      visitIndex: 3,
      category: 'TRAVEL_TRAIN' as const,
      amount: 650,
      expenseDate: today,
      description: 'Train ticket Hyderabad to Warangal',
      status: 'DRAFT' as const,
    },
    {
      collegeIndex: 7,
      visitIndex: 3,
      category: 'TRAVEL_AUTO' as const,
      amount: 250,
      expenseDate: today,
      description: 'Auto from Warangal station to NITW',
      status: 'DRAFT' as const,
    },
    // Rejected expense
    {
      collegeIndex: 3,
      category: 'ACCOMMODATION' as const,
      amount: 4500,
      expenseDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      description: 'Hotel stay - claimed but trip was within city',
      status: 'REJECTED' as const,
      rejectionReason: 'Hotel stay not applicable for same-city visits',
    },
  ];

  for (let i = 0; i < expensesData.length; i++) {
    const expenseData = expensesData[i];
    const college = createdColleges[expenseData.collegeIndex];
    const user = fieldReps[i % fieldReps.length];

    const expense: any = {
      id: `expense-${i + 1}-seed`,
      collegeId: college.id,
      visitId: expenseData.visitIndex !== undefined ? `visit-${expenseData.visitIndex + 1}-seed` : null,
      organizationId: organization.id,
      userId: user.id,
      category: expenseData.category,
      amount: expenseData.amount,
      expenseDate: expenseData.expenseDate,
      description: expenseData.description,
      status: expenseData.status,
    };

    if (expenseData.status === 'APPROVED' || expenseData.status === 'PAID') {
      expense.approvedById = admin.id;
      expense.approvedAt = new Date(expenseData.expenseDate.getTime() + 24 * 60 * 60 * 1000);
    }

    if (expenseData.status === 'PAID') {
      expense.paidAt = new Date(expenseData.expenseDate.getTime() + 3 * 24 * 60 * 60 * 1000);
      expense.paymentRef = `PAY-${Date.now()}-${i}`;
    }

    if (expenseData.status === 'REJECTED') {
      expense.approvedById = admin.id;
      expense.rejectionReason = expenseData.rejectionReason;
    }

    await prisma.collegeExpense.upsert({
      where: { id: expense.id },
      update: {},
      create: expense,
    });
  }
  console.log(`✅ Created ${expensesData.length} expenses`);

  console.log('\n🎉 Field Sales seed completed successfully!');
  console.log('\nSummary:');
  console.log(`  - ${createdColleges.length} colleges (HOT: 4, WARM: 4, COLD: 2)`);
  console.log(`  - ${totalContacts} contacts`);
  console.log(`  - ${visitsData.length} visits (past, today, scheduled)`);
  console.log(`  - ${dealsData.length} deals (various stages)`);
  console.log(`  - ${expensesData.length} expenses (various statuses)`);
  console.log('\nLogin credentials: admin@demo.com / admin123');
}

seedFieldSales()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
