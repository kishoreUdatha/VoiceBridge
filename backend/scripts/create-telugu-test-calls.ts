/**
 * Create Test Telecaller Calls with Telugu Transcripts
 * Generates realistic call records with full AI analysis data
 */

import { PrismaClient, TelecallerCallOutcome } from '@prisma/client';

const prisma = new PrismaClient();

// Sample Telugu conversations for different scenarios
const teluguConversations = [
  {
    // Successful admission inquiry
    transcript: `టెలికాలర్: హలో, నమస్కారం. నేను అమృత యూనివర్సిటీ నుండి మాట్లాడుతున్నాను. మీరు రాజేష్ గారా?
విద్యార్థి: అవును, నేనే రాజేష్ ని.
టెలికాలర్: రాజేష్ గారు, మీరు మా B.Tech కోర్సు గురించి ఆసక్తి చూపించారు. మీకు ఏదైనా సమాచారం కావాలా?
విద్యార్థి: అవును, ఫీజు ఎంత అవుతుంది? హాస్టల్ సదుపాయం ఉంటుందా?
టెలికాలర్: B.Tech ఫీజు సంవత్సరానికి 1.2 లక్షలు. హాస్టల్ సదుపాయం ఉంది, అది అదనంగా 50,000 రూపాయలు.
విద్యార్థి: స్కాలర్షిప్ ఉంటుందా?
టెలికాలర్: అవును, మెరిట్ ఆధారంగా 25% నుండి 50% వరకు స్కాలర్షిప్ అందిస్తాము.
విద్యార్థి: బాగుంది. నేను వచ్చే వారం క్యాంపస్ విజిట్ చేయవచ్చా?
టెలికాలర్: తప్పకుండా! మీకు అనువైన సమయం చెప్పండి, నేను అపాయింట్మెంట్ బుక్ చేస్తాను.
విద్యార్థి: సోమవారం ఉదయం 10 గంటలకు వీలవుతుంది.
టెలికాలర్: సరే, సోమవారం ఉదయం 10 గంటలకు మీ కోసం అపాయింట్మెంట్ బుక్ చేశాను. ధన్యవాదాలు!`,
    outcome: 'INTERESTED',
    sentiment: 'positive',
    duration: 245,
    contactName: 'రాజేష్ కుమార్',
    contactPhone: '+919876543210',
    analysis: {
      summary: 'విద్యార్థి B.Tech కోర్సు మరియు స్కాలర్షిప్ గురించి ఆసక్తి చూపించారు. క్యాంపస్ విజిట్ అపాయింట్మెంట్ బుక్ చేయబడింది.',
      keyPoints: [
        'B.Tech ఫీజు సంవత్సరానికి 1.2 లక్షలు',
        'హాస్టల్ ఫీజు 50,000 రూపాయలు',
        '25-50% మెరిట్ స్కాలర్షిప్ అందుబాటులో ఉంది',
        'సోమవారం ఉదయం 10 గంటలకు క్యాంపస్ విజిట్'
      ],
      nextSteps: ['సోమవారం క్యాంపస్ టూర్ నిర్వహించండి', 'స్కాలర్షిప్ ఫారం పంపండి'],
      objections: [],
      questions: ['ఫీజు ఎంత?', 'హాస్టల్ ఉందా?', 'స్కాలర్షిప్ ఉందా?']
    }
  },
  {
    // Callback requested
    transcript: `టెలికాలర్: హలో, నమస్కారం. అమృత యూనివర్సిటీ నుండి మాట్లాడుతున్నాను. ప్రియ గారితో మాట్లాడవచ్చా?
విద్యార్థి: చెప్పండి, నేనే ప్రియ ని.
టెలికాలర్: ప్రియ గారు, మీరు MBA కోర్సు కోసం ఎంక్వైరీ చేశారు. ఇప్పుడు మాట్లాడగలరా?
విద్యార్థి: అసలు ఇప్పుడు మీటింగ్ లో ఉన్నాను. తర్వాత కాల్ చేయగలరా?
టెలికాలర్: తప్పకుండా. ఎప్పుడు కాల్ చేయమంటారు?
విద్యార్థి: సాయంత్రం 5 గంటల తర్వాత బాగుంటుంది.
టెలికాలర్: సరే, సాయంత్రం 5:30 కి కాల్ చేస్తాను. ధన్యవాదాలు!
విద్యార్థి: సరే, థాంక్స్!`,
    outcome: 'CALLBACK',
    sentiment: 'neutral',
    duration: 85,
    contactName: 'ప్రియ శర్మ',
    contactPhone: '+919988776655',
    analysis: {
      summary: 'విద్యార్థి మీటింగ్‌లో బిజీగా ఉన్నారు. సాయంత్రం 5:30 కి కాల్‌బ్యాక్ షెడ్యూల్ చేయబడింది.',
      keyPoints: [
        'MBA కోర్సు ఆసక్తి',
        'ప్రస్తుతం మీటింగ్‌లో బిజీ',
        'సాయంత్రం 5:30 కి కాల్‌బ్యాక్'
      ],
      nextSteps: ['సాయంత్రం 5:30 కి కాల్ చేయండి', 'MBA బ్రోచర్ WhatsApp లో పంపండి'],
      objections: [],
      questions: []
    }
  },
  {
    // Not interested - price objection
    transcript: `టెలికాలర్: హలో, నమస్కారం. అమృత యూనివర్సిటీ నుండి మాట్లాడుతున్నాను. సురేష్ గారా?
విద్యార్థి: అవును, చెప్పండి.
టెలికాలర్: సురేష్ గారు, మీరు B.Pharmacy కోర్సు గురించి ఆసక్తి చూపించారు. మీకు వివరాలు చెప్పనా?
విద్యార్థి: ఫీజు ఎంత?
టెలికాలర్: B.Pharmacy ఫీజు సంవత్సరానికి 1.5 లక్షలు.
విద్యార్థి: చాలా ఎక్కువగా ఉంది. ప్రభుత్వ కాలేజీలో 30,000 మాత్రమే.
టెలికాలర్: మా యూనివర్సిటీలో ప్లేస్‌మెంట్ గ్యారెంటీ ఉంది, ప్రాక్టికల్ ల్యాబ్స్ అద్భుతంగా ఉంటాయి.
విద్యార్థి: కానీ నాకు అంత బడ్జెట్ లేదు. ప్రభుత్వ కాలేజీలో ట్రై చేస్తాను.
టెలికాలర్: సరే, ఎప్పుడైనా మీ మనసు మారితే మమ్మల్ని సంప్రదించండి. ధన్యవాదాలు!
విద్యార్థి: సరే, థాంక్స్.`,
    outcome: 'NOT_INTERESTED',
    sentiment: 'negative',
    duration: 156,
    contactName: 'సురేష్ రెడ్డి',
    contactPhone: '+919876123456',
    analysis: {
      summary: 'విద్యార్థి ఫీజు ఎక్కువగా ఉందని, ప్రభుత్వ కాలేజీని ప్రాధాన్యత ఇస్తున్నారు.',
      keyPoints: [
        'B.Pharmacy ఆసక్తి ఉంది',
        'ఫీజు 1.5 లక్షలు చాలా ఎక్కువ అని భావించారు',
        'ప్రభుత్వ కాలేజీ ప్రాధాన్యత'
      ],
      nextSteps: ['ఫైనాన్షియల్ ఎయిడ్ ఆప్షన్స్ తో 2 వారాల తర్వాత ఫాలో అప్'],
      objections: ['ఫీజు చాలా ఎక్కువ', 'బడ్జెట్ లేదు'],
      questions: ['ఫీజు ఎంత?']
    }
  },
  {
    // Successful conversion
    transcript: `టెలికాలర్: హలో, నమస్కారం. అమృత యూనివర్సిటీ నుండి మాట్లాడుతున్నాను. లావణ్య గారా?
విద్యార్థి: అవును, నేనే.
టెలికాలర్: లావణ్య గారు, మీరు BBA కోర్సు కోసం క్యాంపస్ విజిట్ చేశారు. ఎలా అనిపించింది?
విద్యార్థి: చాలా బాగుంది. క్యాంపస్ అద్భుతంగా ఉంది, ఫ్యాకల్టీ కూడా మంచివారు.
టెలికాలర్: ధన్యవాదాలు! మీరు అడ్మిషన్ తీసుకోవాలనుకుంటున్నారా?
విద్యార్థి: అవును, తీసుకోవాలనుకుంటున్నాను. ఏం చేయాలి?
టెలికాలర్: అద్భుతం! మీరు ఆన్‌లైన్‌లో అప్లికేషన్ పూర్తి చేయవచ్చు. రిజిస్ట్రేషన్ ఫీజు 5,000 రూపాయలు.
విద్యార్థి: సరే, ఇప్పుడే చేస్తాను. లింక్ పంపగలరా?
టెలికాలర్: తప్పకుండా! మీ WhatsApp కి లింక్ పంపుతాను. ఏదైనా సహాయం కావాలంటే కాల్ చేయండి.
విద్యార్థి: థాంక్యూ సో మచ్!
టెలికాలర్: మీకు అమృత కుటుంబంలోకి స్వాగతం! ధన్యవాదాలు!`,
    outcome: 'CONVERTED',
    sentiment: 'positive',
    duration: 198,
    contactName: 'లావణ్య కృష్ణ',
    contactPhone: '+919123456789',
    analysis: {
      summary: 'విద్యార్థి క్యాంపస్ విజిట్ తర్వాత BBA కోర్సులో అడ్మిషన్ కోసం నిర్ణయించుకున్నారు. అప్లికేషన్ లింక్ పంపబడింది.',
      keyPoints: [
        'క్యాంపస్ విజిట్ సంతృప్తికరంగా ఉంది',
        'BBA అడ్మిషన్ నిర్ణయించుకున్నారు',
        'రిజిస్ట్రేషన్ ఫీజు 5,000',
        'WhatsApp లో లింక్ పంపబడింది'
      ],
      nextSteps: ['అప్లికేషన్ స్టేటస్ ట్రాక్ చేయండి', 'డాక్యుమెంట్ వెరిఫికేషన్ షెడ్యూల్ చేయండి'],
      objections: [],
      questions: ['ఏం చేయాలి?']
    }
  },
  {
    // Technical course inquiry
    transcript: `టెలికాలర్: హలో, నమస్కారం. అమృత యూనివర్సిటీ నుండి మాట్లాడుతున్నాను. వెంకట్ గారా?
విద్యార్థి: అవును, చెప్పండి.
టెలికాలర్: వెంకట్ గారు, మీరు M.Tech AI & ML కోర్సు గురించి ఎంక్వైరీ చేశారు. మీకు వివరాలు చెప్పనా?
విద్యార్థి: అవును, ఈ కోర్సులో ఏమేం నేర్పిస్తారు?
టెలికాలర్: మెషిన్ లెర్నింగ్, డీప్ లెర్నింగ్, న్యూరల్ నెట్వర్క్స్, NLP, కంప్యూటర్ విజన్ - ఇవన్నీ కవర్ చేస్తాము.
విద్యార్థి: ప్రాక్టికల్ ప్రాజెక్ట్స్ ఉంటాయా?
టెలికాలర్: తప్పకుండా! ప్రతి సెమిస్టర్ లో ఇండస్ట్రీ ప్రాజెక్ట్స్ ఉంటాయి. గూగుల్, మైక్రోసాఫ్ట్ తో కొలాబరేషన్స్ ఉన్నాయి.
విద్యార్థి: ప్లేస్‌మెంట్ ఎలా ఉంటుంది?
టెలికాలర్: గత సంవత్సరం 95% ప్లేస్‌మెంట్ రేట్. యావరేజ్ ప్యాకేజ్ 12 LPA.
విద్యార్థి: బాగుంది. నాకు బ్రోచర్ పంపగలరా? తల్లిదండ్రులతో మాట్లాడి నిర్ణయిస్తాను.
టెలికాలర్: తప్పకుండా! మీ ఈమెయిల్ కి పంపుతాను. ఏదైనా సందేహాలుంటే కాల్ చేయండి.
విద్యార్థి: థాంక్స్!`,
    outcome: 'INTERESTED',
    sentiment: 'positive',
    duration: 278,
    contactName: 'వెంకట్ నాయుడు',
    contactPhone: '+919567891234',
    analysis: {
      summary: 'విద్యార్థి M.Tech AI/ML కోర్సు గురించి వివరాలు అడిగారు. బ్రోచర్ పంపబడింది, తల్లిదండ్రులతో చర్చించి నిర్ణయిస్తారు.',
      keyPoints: [
        'M.Tech AI & ML ఆసక్తి',
        'ప్రాక్టికల్ ప్రాజెక్ట్స్ గురించి అడిగారు',
        '95% ప్లేస్‌మెంట్, 12 LPA యావరేజ్',
        'తల్లిదండ్రులతో చర్చిస్తారు'
      ],
      nextSteps: ['బ్రోచర్ ఈమెయిల్ చేయండి', '3 రోజుల్లో ఫాలో అప్ కాల్'],
      objections: [],
      questions: ['ఏమేం నేర్పిస్తారు?', 'ప్రాక్టికల్ ఉంటుందా?', 'ప్లేస్‌మెంట్ ఎలా?']
    }
  }
];

// Coaching suggestions in Telugu
function generateCoachingSuggestions(sentiment: string, outcome: string) {
  const positive = {
    positiveHighlights: [
      'మర్యాదగా మరియు ప్రొఫెషనల్‌గా మాట్లాడారు',
      'విద్యార్థి ప్రశ్నలకు స్పష్టంగా సమాధానాలు ఇచ్చారు',
      'అపాయింట్‌మెంట్/ఫాలో అప్ విజయవంతంగా షెడ్యూల్ చేశారు'
    ],
    areasToImprove: [
      'కొన్ని సందర్భాల్లో మరింత వివరంగా వివరించవచ్చు'
    ],
    nextCallTips: [
      'విద్యార్థి పేరుతో సంబోధించండి',
      'గత సంభాషణను రిఫరెన్స్ చేయండి',
      'స్పష్టమైన కాల్ టు యాక్షన్ ఇవ్వండి'
    ],
    summary: 'మొత్తం మీద మంచి కాల్. విద్యార్థితో మంచి సంబంధం ఏర్పరచుకున్నారు.',
    talkListenFeedback: 'మంచి బ్యాలెన్స్ - 60% మాట్లాడారు, 40% విన్నారు',
    empathyScore: 85,
    objectionScore: 90,
    closingScore: 88
  };

  const negative = {
    positiveHighlights: [
      'ప్రొఫెషనల్‌గా కాల్ హ్యాండిల్ చేశారు',
      'విద్యార్థి అభ్యంతరాలను అర్థం చేసుకున్నారు'
    ],
    areasToImprove: [
      'ధర అభ్యంతరాలను మెరుగ్గా హ్యాండిల్ చేయవచ్చు',
      'ఆల్టర్నేటివ్ ఆప్షన్స్ ప్రతిపాదించండి',
      'ROI మరియు వాల్యూ ప్రపోజిషన్ నొక్కి చెప్పండి'
    ],
    nextCallTips: [
      'ఫైనాన్షియల్ ఎయిడ్ ఆప్షన్స్ ముందుగా తయారు చేయండి',
      'సక్సెస్ స్టోరీస్ షేర్ చేయండి',
      'EMI ఆప్షన్స్ గురించి చెప్పండి'
    ],
    summary: 'ధర అభ్యంతరం వచ్చినప్పుడు మరింత వాల్యూ ప్రపోజిషన్ అందించవచ్చు.',
    talkListenFeedback: 'కొంచెం ఎక్కువ మాట్లాడారు - 70% మాట్లాడారు, 30% విన్నారు',
    empathyScore: 70,
    objectionScore: 55,
    closingScore: 45
  };

  const neutral = {
    positiveHighlights: [
      'సమయం గౌరవించారు',
      'ఫాలో అప్ షెడ్యూల్ చేశారు'
    ],
    areasToImprove: [
      'కాల్‌బ్యాక్ సమయంలో మరింత ఇంగేజింగ్‌గా ఉండండి'
    ],
    nextCallTips: [
      'కాల్‌బ్యాక్ సమయానికి ముందు SMS రిమైండర్ పంపండి',
      'విద్యార్థికి సంబంధిత సమాచారం సిద్ధంగా ఉంచండి'
    ],
    summary: 'షార్ట్ కాల్ - కాల్‌బ్యాక్ షెడ్యూల్ చేయబడింది.',
    talkListenFeedback: 'బ్యాలెన్స్‌డ్ - 50% మాట్లాడారు, 50% విన్నారు',
    empathyScore: 75,
    objectionScore: 80,
    closingScore: 70
  };

  if (sentiment === 'positive') return positive;
  if (sentiment === 'negative') return negative;
  return neutral;
}

async function createTeluguTestCalls(): Promise<void> {
  console.log('='.repeat(60));
  console.log('CREATING TELUGU TEST CALL RECORDS');
  console.log('='.repeat(60));

  // Get a telecaller user
  const telecaller = await prisma.user.findFirst({
    where: {
      role: { name: 'TELECALLER' }
    },
    include: {
      organization: true
    }
  });

  if (!telecaller) {
    // Try to find any user with telecaller-like role
    const anyUser = await prisma.user.findFirst({
      include: { organization: true }
    });

    if (!anyUser) {
      console.log('No users found in database. Please create a user first.');
      return;
    }

    console.log(`Using user: ${anyUser.firstName} ${anyUser.lastName}`);

    // Create calls for this user
    await createCallsForUser(anyUser);
  } else {
    console.log(`Using telecaller: ${telecaller.firstName} ${telecaller.lastName}`);
    await createCallsForUser(telecaller);
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST CALLS CREATED SUCCESSFULLY');
  console.log('='.repeat(60));
}

async function createCallsForUser(user: any): Promise<void> {
  for (let i = 0; i < teluguConversations.length; i++) {
    const conv = teluguConversations[i];
    const coaching = generateCoachingSuggestions(conv.sentiment, conv.outcome);

    // Parse name into firstName and lastName
    const nameParts = conv.contactName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || null;

    // Create a lead first
    const lead = await prisma.lead.create({
      data: {
        organizationId: user.organizationId,
        firstName: firstName,
        lastName: lastName,
        phone: conv.contactPhone,
        email: `test.${Date.now()}${i}@example.com`,
        source: 'MANUAL',
      }
    });

    console.log(`\nCreating call ${i + 1}/${teluguConversations.length}: ${conv.contactName}`);

    // Create the telecaller call with all fields
    const call = await prisma.telecallerCall.create({
      data: {
        organizationId: user.organizationId,
        telecallerId: user.id,
        leadId: lead.id,
        phoneNumber: conv.contactPhone,
        contactName: conv.contactName,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - (i + 1) * 3600000), // Stagger by hours
        endedAt: new Date(Date.now() - (i + 1) * 3600000 + conv.duration * 1000),
        duration: conv.duration,
        outcome: conv.outcome as TelecallerCallOutcome,

        // Transcript
        transcript: conv.transcript,

        // AI Analysis fields
        summary: conv.analysis.summary,
        sentiment: conv.sentiment,
        aiAnalyzed: true,
        callQualityScore: coaching.empathyScore,

        // Store key points and next steps in qualification JSON
        qualification: {
          keyPoints: conv.analysis.keyPoints,
          nextSteps: conv.analysis.nextSteps,
          objections: conv.analysis.objections,
          questions: conv.analysis.questions,
        },

        // Enhanced fields
        keyQuestionsAsked: conv.analysis.questions,
        keyIssuesDiscussed: conv.analysis.objections,
        sentimentIntensity: conv.sentiment === 'positive' ? 'high' : conv.sentiment === 'negative' ? 'medium' : 'low',

        // Time analysis
        agentSpeakingTime: Math.floor(conv.duration * 0.6),
        customerSpeakingTime: Math.floor(conv.duration * 0.35),
        nonSpeechTime: Math.floor(conv.duration * 0.05),

        // Coaching
        coachingPositiveHighlights: coaching.positiveHighlights,
        coachingAreasToImprove: coaching.areasToImprove,
        coachingNextCallTips: coaching.nextCallTips,
        coachingSummary: coaching.summary,
        coachingTalkListenFeedback: coaching.talkListenFeedback,
        coachingEmpathyScore: coaching.empathyScore,
        coachingObjectionScore: coaching.objectionScore,
        coachingClosingScore: coaching.closingScore,

        // Extracted data
        extractedData: {
          studentName: conv.contactName,
          courseInterest: conv.transcript.includes('B.Tech') ? 'B.Tech' :
                         conv.transcript.includes('MBA') ? 'MBA' :
                         conv.transcript.includes('BBA') ? 'BBA' :
                         conv.transcript.includes('M.Tech') ? 'M.Tech AI/ML' :
                         conv.transcript.includes('B.Pharmacy') ? 'B.Pharmacy' : 'Unknown',
          location: 'Telangana',
          language: 'Telugu',
          intent: conv.outcome,
          keyPoints: conv.analysis.keyPoints,
          nextSteps: conv.analysis.nextSteps,
        },
      }
    });

    console.log(`  ✓ Created call ID: ${call.id.substring(0, 8)}...`);
    console.log(`    Outcome: ${conv.outcome}, Sentiment: ${conv.sentiment}`);
    console.log(`    Duration: ${conv.duration}s, Contact: ${conv.contactName}`);
  }
}

createTeluguTestCalls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
