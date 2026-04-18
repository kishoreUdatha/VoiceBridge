/**
 * Script to populate a call record with sample data for testing the call summary page
 * Run: npx ts-node scripts/populate-call-summary.ts <callId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateCallSummary(callId: string) {
  // First, check if there's a linked lead and update it with sample data
  const call = await prisma.outboundCall.findUnique({
    where: { id: callId },
    select: { leadId: true, agentId: true },
  });

  if (call?.leadId) {
    await prisma.lead.update({
      where: { id: call.leadId },
      data: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@company.com',
        alternatePhone: '+1-555-987-6543',
        source: 'WEBSITE',
        priority: 'HIGH',
        city: 'San Francisco',
        state: 'California',
        country: 'USA',
      },
    });
    console.log('Updated linked lead with sample data');
  }
  // Sample transcript with timestamps and sentiment
  const enhancedTranscript = [
    { role: 'assistant', content: 'Hello! Thank you for taking my call. This is Sarah from MyLeadX. How are you doing today?', startTimeSeconds: 0, sentiment: 'positive' },
    { role: 'user', content: 'Hi Sarah, I\'m doing well, thanks for asking. What is this call about?', startTimeSeconds: 8, sentiment: 'neutral' },
    { role: 'assistant', content: 'I\'m calling to discuss our new CRM solution that can help streamline your sales process. Do you currently use any CRM software?', startTimeSeconds: 15, sentiment: 'positive' },
    { role: 'user', content: 'Yes, we use Salesforce but we\'re having some issues with it. It\'s quite expensive and complicated.', startTimeSeconds: 28, sentiment: 'negative' },
    { role: 'assistant', content: 'I understand those concerns. Many of our clients switched from Salesforce and found our solution more cost-effective and user-friendly. What specific features are most important to you?', startTimeSeconds: 40, sentiment: 'positive' },
    { role: 'user', content: 'Lead tracking and automated follow-ups are crucial for us. We also need good reporting.', startTimeSeconds: 55, sentiment: 'neutral' },
    { role: 'assistant', content: 'Great news! Those are exactly our strongest features. We have AI-powered lead scoring and automated follow-up sequences. Would you be interested in a demo?', startTimeSeconds: 68, sentiment: 'positive' },
    { role: 'user', content: 'That sounds interesting. Yes, I\'d like to see a demo. Can we schedule something for next week?', startTimeSeconds: 82, sentiment: 'positive' },
    { role: 'assistant', content: 'Absolutely! I have availability on Tuesday at 2 PM or Thursday at 10 AM. Which works better for you?', startTimeSeconds: 92, sentiment: 'positive' },
    { role: 'user', content: 'Thursday at 10 AM works perfectly for me.', startTimeSeconds: 102, sentiment: 'positive' },
    { role: 'assistant', content: 'Excellent! I\'ll send you a calendar invite with the meeting details. Is there anything specific you\'d like me to cover in the demo?', startTimeSeconds: 108, sentiment: 'positive' },
    { role: 'user', content: 'Yes, please show me the reporting dashboard and the automation features.', startTimeSeconds: 120, sentiment: 'neutral' },
    { role: 'assistant', content: 'Will do! Thank you for your time today. I look forward to speaking with you on Thursday. Have a great day!', startTimeSeconds: 130, sentiment: 'positive' },
    { role: 'user', content: 'Thanks Sarah, you too. Goodbye!', startTimeSeconds: 142, sentiment: 'positive' },
  ];

  // Key questions asked
  const keyQuestionsAsked = [
    'Do you currently use any CRM software?',
    'What specific features are most important to you?',
    'Would you be interested in a demo?',
    'Which time works better for you - Tuesday at 2 PM or Thursday at 10 AM?',
    'Is there anything specific you\'d like me to cover in the demo?',
  ];

  // Key issues discussed
  const keyIssuesDiscussed = [
    'Current CRM (Salesforce) is expensive and complicated',
    'Need for better lead tracking capabilities',
    'Requirement for automated follow-up features',
    'Good reporting functionality is essential',
  ];

  // Coaching data
  const coachingPositiveHighlights = [
    { text: 'Excellent rapport building with friendly greeting', timestamp: 0 },
    { text: 'Good empathy shown when addressing customer concerns about Salesforce', timestamp: 40 },
    { text: 'Effective feature matching to customer needs', timestamp: 68 },
    { text: 'Strong closing with clear next steps and demo scheduled', timestamp: 92 },
  ];

  const coachingAreasToImprove = [
    { issue: 'Could have asked more discovery questions about budget', suggestion: 'Try asking "What budget range are you considering for a CRM solution?" early in the conversation' },
    { issue: 'Missed opportunity to discuss pricing', suggestion: 'Introduce pricing tiers before scheduling demo to qualify the lead better' },
  ];

  const coachingNextCallTips = [
    'Prepare demo focused on reporting dashboard and automation',
    'Have case studies from similar companies ready',
    'Prepare competitive comparison chart vs Salesforce',
    'Be ready to discuss pricing and ROI',
  ];

  // Extracted data from call (Education Telecaller Example)
  const extractedData = {
    items: [
      { label: 'Student Name', value: 'John Smith', category: 'contact' },
      { label: 'Current Class', value: '12th Standard', category: 'contact' },
      { label: 'Board', value: 'CBSE', category: 'contact' },
      { label: 'Course Interested', value: 'B.Tech Computer Science', category: 'interest' },
      { label: 'Preferred College', value: 'VIT Vellore', category: 'interest' },
      { label: 'Budget Range', value: '10-15 Lakhs', category: 'interest' },
      { label: 'JEE Score', value: '85 Percentile', category: 'contact' },
      { label: 'Decision Timeline', value: 'Within 2 weeks', category: 'timeline' },
      { label: 'Parent Involvement', value: 'Father to join next call', category: 'other' },
      { label: 'Other Colleges Considering', value: 'SRM, Manipal', category: 'interest' },
    ],
    callbackRequested: true,
    callbackDate: 'Thursday',
    callbackTime: '10:00 AM',
    callbackNotes: 'Father will be available. Discuss scholarship options and hostel facilities.',
  };

  try {
    const updatedCall = await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        // Basic call info
        duration: 150,
        status: 'COMPLETED',
        outcome: 'CALLBACK_REQUESTED',
        outcomeNotes: 'Demo scheduled for Thursday 10 AM. Customer interested in reporting and automation features.',

        // Recording (sample URL)
        recordingUrl: 'https://api.twilio.com/sample-recording.mp3',
        recordingDuration: 150,

        // Summary
        summary: 'Successful sales call with a prospect currently using Salesforce. Customer expressed frustration with their current CRM being expensive and complicated. Discussed MyLeadX features including AI-powered lead scoring and automated follow-ups. Customer showed strong interest and scheduled a demo for Thursday at 10 AM. Key focus areas for demo: reporting dashboard and automation features.',
        sentiment: 'positive',
        sentimentIntensity: 'high',

        // Call quality
        callQualityScore: 87,

        // Speaking time breakdown (in seconds)
        agentSpeakingTime: 75,
        customerSpeakingTime: 55,
        nonSpeechTime: 20,

        // Enhanced transcript
        enhancedTranscript: enhancedTranscript,

        // Key points
        keyQuestionsAsked: keyQuestionsAsked,
        keyIssuesDiscussed: keyIssuesDiscussed,

        // Coaching
        coachingPositiveHighlights: coachingPositiveHighlights,
        coachingAreasToImprove: coachingAreasToImprove,
        coachingNextCallTips: coachingNextCallTips,
        coachingSummary: 'Overall excellent call performance. Agent demonstrated strong rapport building and effectively addressed customer objections. Successfully scheduled a demo by matching product features to customer needs. Areas for improvement include better budget qualification early in the conversation.',
        coachingTalkListenFeedback: 'Good talk-to-listen ratio of 58/42. Agent allowed customer to express concerns fully before responding.',
        coachingEmpathyScore: 85,
        coachingObjectionScore: 78,
        coachingClosingScore: 92,

        // Extracted Data (captured from conversation)
        extractedData: extractedData,

        // Timestamps
        answeredAt: new Date(Date.now() - 150000),
        endedAt: new Date(),
      },
    });

    console.log('Successfully updated call:', updatedCall.id);
    console.log('Call summary data populated!');
    console.log('\nView at: http://localhost:5174/outbound-calls/calls/' + callId + '/summary');
  } catch (error) {
    console.error('Error updating call:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get call ID from command line argument
const callId = process.argv[2] || 'aff7300a-e48c-40c6-869e-d6968e8fb985';
console.log('Populating call summary for:', callId);
populateCallSummary(callId);
