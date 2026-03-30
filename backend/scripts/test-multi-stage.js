/**
 * Test script for multi-stage lead journey
 * Demonstrates: AI Call -> AI Follow-up -> Human Call -> Conversion
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get organization and agents
  const org = await prisma.organization.findFirst();
  const aiAgent = await prisma.voiceAgent.findFirst({ where: { industry: 'EDUCATION' } });

  console.log('Creating multi-stage lead journey...\n');

  // 1. Create Lead
  const lead = await prisma.lead.create({
    data: {
      organizationId: org.id,
      firstName: 'Rahul',
      lastName: 'Verma',
      phone: '+919999888877',
      email: 'rahul.verma@email.com',
      source: 'CHATBOT',
      totalCalls: 0,
      customFields: {},
    }
  });
  console.log('Created Lead:', lead.firstName, lead.lastName);

  // 2. First AI Call - Initial Contact
  const call1 = await prisma.outboundCall.create({
    data: {
      agentId: aiAgent.id,
      phoneNumber: '+919999888877',
      existingLeadId: lead.id,
      status: 'COMPLETED',
      direction: 'OUTBOUND',
      duration: 120,
      outcome: 'INTERESTED',
      sentiment: 'positive',
      summary: 'Student Rahul interested in B.Tech CS. Currently in 12th CBSE.',
      isFollowUpCall: false,
      followUpNumber: 1,
      extractedData: {
        items: [
          { label: 'Student Name', value: 'Rahul Verma', category: 'contact' },
          { label: 'Class', value: '12th Standard', category: 'contact' },
          { label: 'Board', value: 'CBSE', category: 'contact' },
          { label: 'Course Interest', value: 'B.Tech Computer Science', category: 'interest' },
        ],
        callbackRequested: true,
        callbackDate: 'Tomorrow',
        callbackTime: '4 PM'
      },
      transcript: [
        { role: 'assistant', content: 'Hi, this is Sarah from EduCounsel. Am I speaking with Rahul?' },
        { role: 'user', content: 'Yes, this is Rahul Verma.' },
        { role: 'assistant', content: 'I am calling about college admissions. Which course are you interested in?' },
        { role: 'user', content: 'I want to do B.Tech in Computer Science. I am in 12th CBSE.' },
      ],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    }
  });
  console.log('Call 1 (AI - Initial):', 'INTERESTED');

  // 3. Second AI Call - Follow-up
  const call2 = await prisma.outboundCall.create({
    data: {
      agentId: aiAgent.id,
      phoneNumber: '+919999888877',
      existingLeadId: lead.id,
      status: 'COMPLETED',
      direction: 'OUTBOUND',
      duration: 180,
      outcome: 'CALLBACK_REQUESTED',
      sentiment: 'positive',
      summary: 'Got JEE score (89 percentile). Interested in VIT and BITS. Budget 15L. Wants to discuss with father.',
      isFollowUpCall: true,
      followUpNumber: 2,
      extractedData: {
        items: [
          { label: 'JEE Mains Score', value: '89 Percentile', category: 'interest' },
          { label: 'Colleges Interested', value: 'VIT Vellore, BITS Pilani', category: 'interest' },
          { label: 'Budget', value: '15 Lakhs', category: 'interest' },
          { label: 'Decision Maker', value: 'Father', category: 'other' },
        ],
        callbackRequested: true,
        callbackDate: 'Saturday',
        callbackTime: '11 AM',
        callbackNotes: 'Father will be available'
      },
      transcript: [
        { role: 'assistant', content: 'Hi Rahul, this is Sarah again from EduCounsel. How did your JEE exam go?' },
        { role: 'user', content: 'I got 89 percentile. I am looking at VIT and BITS.' },
        { role: 'assistant', content: 'Great score! What is your budget for the course?' },
        { role: 'user', content: 'Around 15 lakhs. I need to discuss with my father before deciding.' },
      ],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    }
  });
  console.log('Call 2 (AI - Follow-up):', 'CALLBACK_REQUESTED');

  // 4. Third Call - Human Telecaller Closing
  const call3 = await prisma.outboundCall.create({
    data: {
      agentId: aiAgent.id,
      phoneNumber: '+919999888877',
      existingLeadId: lead.id,
      status: 'COMPLETED',
      direction: 'OUTBOUND',
      duration: 300,
      outcome: 'CONVERTED',
      sentiment: 'positive',
      summary: 'Spoke with Rahul and father. They confirmed VIT Vellore. Scheduled campus visit for next Saturday.',
      isFollowUpCall: true,
      followUpNumber: 3,
      extractedData: {
        items: [
          { label: 'Final College Choice', value: 'VIT Vellore', category: 'interest' },
          { label: 'Father Name', value: 'Mr. Suresh Verma', category: 'contact' },
          { label: 'Campus Visit', value: 'Next Saturday', category: 'timeline' },
          { label: 'Admission Status', value: 'Confirmed', category: 'other' },
        ],
        callbackRequested: false
      },
      transcript: [
        { role: 'assistant', content: 'Good morning! Am I speaking with Mr. Verma?' },
        { role: 'user', content: 'Yes, I am Suresh Verma, Rahuls father.' },
        { role: 'assistant', content: 'Sir, we discussed VIT with Rahul. Have you made a decision?' },
        { role: 'user', content: 'Yes, we have decided on VIT Vellore. Please help us with the admission process.' },
      ],
      createdAt: new Date(), // Today
    }
  });
  console.log('Call 3 (Human - Closing):', 'CONVERTED');

  // 5. Update Lead with aggregated data from all calls
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      totalCalls: 3,
      lastContactedAt: new Date(),
      customFields: {
        qualification: {
          studentName: 'Rahul Verma',
          class: '12th Standard',
          board: 'CBSE',
          courseInterest: 'B.Tech Computer Science',
          jeeScore: '89 Percentile',
          collegesInterested: ['VIT Vellore', 'BITS Pilani'],
          finalChoice: 'VIT Vellore',
          budget: '15 Lakhs',
          fatherName: 'Mr. Suresh Verma',
          campusVisit: 'Next Saturday',
          status: 'CONVERTED'
        },
        callHistory: [
          { callId: call1.id, outcome: 'INTERESTED', agent: 'AI', data: 'Name, Class, Course' },
          { callId: call2.id, outcome: 'CALLBACK_REQUESTED', agent: 'AI', data: 'JEE Score, Colleges, Budget' },
          { callId: call3.id, outcome: 'CONVERTED', agent: 'Human', data: 'Father consent, Final choice' },
        ]
      }
    }
  });

  // 6. Create activity timeline
  await prisma.leadActivity.createMany({
    data: [
      { leadId: lead.id, type: 'LEAD_CREATED', title: 'Lead created from AI call', createdAt: call1.createdAt },
      { leadId: lead.id, type: 'AI_CALL_COMPLETED', title: 'AI Call: Student showed interest in B.Tech CS', createdAt: call1.createdAt },
      { leadId: lead.id, type: 'DATA_CAPTURED', title: 'Captured: Name, Class, Board, Course Interest', createdAt: new Date(call1.createdAt.getTime() + 1000) },
      { leadId: lead.id, type: 'FOLLOWUP_SCHEDULED', title: 'AI follow-up scheduled for tomorrow', createdAt: new Date(call1.createdAt.getTime() + 2000) },
      { leadId: lead.id, type: 'AI_CALL_COMPLETED', title: 'AI Follow-up: Got JEE scores and college preferences', createdAt: call2.createdAt },
      { leadId: lead.id, type: 'DATA_CAPTURED', title: 'Captured: JEE Score, Colleges, Budget', createdAt: new Date(call2.createdAt.getTime() + 1000) },
      { leadId: lead.id, type: 'FOLLOWUP_SCHEDULED', title: 'Human follow-up scheduled (father involvement needed)', createdAt: new Date(call2.createdAt.getTime() + 2000) },
      { leadId: lead.id, type: 'CALL_MADE', title: 'Human Call: Spoke with father, confirmed VIT admission', createdAt: call3.createdAt },
      { leadId: lead.id, type: 'DATA_CAPTURED', title: 'Captured: Father name, Campus visit date', createdAt: new Date(call3.createdAt.getTime() + 1000) },
      { leadId: lead.id, type: 'STATUS_CHANGED', title: 'Lead CONVERTED - Admission confirmed!', createdAt: new Date() },
    ]
  });

  console.log('\n========================================');
  console.log('MULTI-STAGE LEAD JOURNEY CREATED');
  console.log('========================================');
  console.log('\nLead: Rahul Verma (+919999888877)');
  console.log('Total Calls: 3');
  console.log('\nJOURNEY:');
  console.log('  Day 1: AI Call -> Got basic info -> INTERESTED');
  console.log('  Day 2: AI Follow-up -> Got JEE/Budget -> CALLBACK (needs father)');
  console.log('  Day 3: Human Call -> Father confirmed -> CONVERTED!');
  console.log('\nDATA ACCUMULATED:');
  console.log('  - Student: Rahul Verma, 12th CBSE');
  console.log('  - Course: B.Tech Computer Science');
  console.log('  - JEE Score: 89 Percentile');
  console.log('  - Colleges: VIT Vellore, BITS Pilani');
  console.log('  - Budget: 15 Lakhs');
  console.log('  - Father: Mr. Suresh Verma');
  console.log('  - Final: VIT Vellore - CONFIRMED');
  console.log('\nVIEW CALL SUMMARIES:');
  console.log('  Call 1:', 'http://localhost:5174/outbound-calls/calls/' + call1.id + '/summary');
  console.log('  Call 2:', 'http://localhost:5174/outbound-calls/calls/' + call2.id + '/summary');
  console.log('  Call 3:', 'http://localhost:5174/outbound-calls/calls/' + call3.id + '/summary');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
