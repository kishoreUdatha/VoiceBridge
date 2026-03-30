/**
 * Test script for AI data extraction from call transcript
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai').default;

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractCallData(transcript, agentIndustry) {
  const fullText = transcript.map(t => `${t.role}: ${t.content}`).join('\n');

  // Industry-specific prompts
  const industryPrompts = {
    EDUCATION: `Extract education-related data: student name, parent/guardian name, current class/grade, board (CBSE/ICSE/State), course interested in, preferred college/university, entrance exam scores (JEE/NEET/etc), budget range, decision timeline, parent/guardian involvement, other institutions being considered, hostel requirement.`,
    REAL_ESTATE: `Extract real estate data: buyer/renter name, property type (flat/villa/plot), location preference, budget range, number of bedrooms/BHK, timeline to move, current living situation, financing/loan status, preferred amenities, possession timeline.`,
    HEALTHCARE: `Extract healthcare data: patient name, age, symptoms/health issues discussed, preferred appointment date/time, insurance provider, doctor/specialist preference, urgency level, medical history mentioned, current medications.`,
    INSURANCE: `Extract insurance data: prospect name, age, current insurance status, coverage type interested in (life/health/vehicle/home), sum assured needed, premium budget, family members to cover, pre-existing conditions, policy term preference.`,
    FINANCE: `Extract financial data: prospect name, loan type interested in (home/personal/business/vehicle), loan amount needed, income range, employment type (salaried/self-employed), company name, existing loans/EMIs, property details if home loan, CIBIL score if mentioned.`,
    IT_RECRUITMENT: `Extract recruitment data: candidate name, current company, current role/designation, total experience (years), relevant skills/technologies, current CTC, expected CTC, notice period, preferred location, reason for job change, availability for interview.`,
    TECHNICAL_INTERVIEW: `Extract interview data: candidate name, position applied for, technical skills discussed, years of experience, projects mentioned, strengths identified, areas of concern, overall assessment, recommended next steps.`,
    ECOMMERCE: `Extract e-commerce data: customer name, product interested in, order number if mentioned, issue/query type, preferred resolution, delivery address concerns, payment method preference, return/exchange request details.`,
    CUSTOMER_CARE: `Extract support data: customer name, account/order number, issue category, issue description, previous ticket references, resolution provided, escalation needed, satisfaction level, follow-up required.`,
    default: `Extract any mentioned: person's name, contact details, product/service interested in, budget/price range, timeline/urgency, decision makers, competitor mentions, specific requirements, callback preferences.`
  };

  const industryPrompt = industryPrompts[agentIndustry] || industryPrompts.default;
  console.log('Industry:', agentIndustry);
  console.log('Calling OpenAI for extraction...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a data extraction assistant. Extract key information from this education telecaller call transcript.

${industryPrompt}

Return JSON format:
{
  "items": [
    {"label": "Field Name", "value": "extracted value", "category": "contact|interest|timeline|other"}
  ],
  "callbackRequested": true/false,
  "callbackDate": "mentioned date or null",
  "callbackTime": "mentioned time or null",
  "callbackNotes": "any callback-related notes or null"
}

Categories:
- contact: Name, phone, email, address, personal details
- interest: Products, services, features, preferences, budget
- timeline: Deadlines, dates, urgency, decision timeframe
- other: Anything else important

Only extract information that was explicitly mentioned.`
      },
      { role: 'user', content: fullText }
    ],
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

async function main() {
  const callId = process.argv[2] || 'a2e1fdc0-c05a-4428-8be1-717ad541b1b8';

  const call = await prisma.outboundCall.findUnique({
    where: { id: callId },
    include: { agent: true }
  });

  if (!call) {
    console.log('Call not found:', callId);
    return;
  }

  console.log('Processing call:', callId);
  console.log('Agent:', call.agent?.name);
  console.log('Industry:', call.agent?.industry);

  const transcript = call.transcript;
  console.log('Transcript messages:', transcript.length);

  // Extract data using AI
  const extractedData = await extractCallData(transcript, call.agent?.industry);
  console.log('\n=== EXTRACTED DATA ===');
  console.log(JSON.stringify(extractedData, null, 2));

  // Update call with extracted data
  await prisma.outboundCall.update({
    where: { id: call.id },
    data: { extractedData: extractedData }
  });

  console.log('\n✅ Call updated with extracted data!');
  console.log('View at: http://localhost:5174/outbound-calls/calls/' + call.id + '/summary');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
