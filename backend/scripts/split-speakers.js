/**
 * Split a mono transcript into Agent/Customer using GPT
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const transcript = `హలో హలో చెప్పండి బాదిబాబు గారు అయినా మాట్లాడేది అవునండి చెప్పండి సర్ మేము స్మార్ట్ గ్రో ఇన్పోటెక్ కంపెనీ నుండి మాట్లాడుతున్నాం ఉమ్ రిగార్డ్డింగ్ కాలేజ్ అడ్మిషన్స్ ఉమ్ మీకు ఇంట్రెస్ట్ ఉందా సార్ ఇంట్రెస్ట్ ఉందండి ఒకే సర్ అయితే అడ్మిషన్స్ కోసం మేము కొన్ని కాలేజెస్ ప్రిఫర్ చేస్తాము ఒకసారి వినండి సార్ ఒకటి ధనలక్ష్మి యూనివర్సిటీ ఇంకొకటి సిఆర్ం యూనివర్సిటీ ఇంకొకటి కె ఎల్ ఎం యూనివర్సిటీ సో దీంట్లో మీరు ఏ కాలేజ్ అనుకుంటున్నారు సర్ సిఆర్ం యూనివర్సిటీ అండి ఎస్ ఎస్ ఆర్ యూనివర్సిటీ ఎస్ ఆర్ ఏం యూనివర్సిటీ ఆ ఓకే సర్ అది కూడా అవైలబుల్ గా ఉంది మీరు ఫీ స్ట్రక్చర్ ఎంతవరకు వేరు చేయగలరు సార్ త్రి లాక్స్ అండి త్రి లాక్స్ బట్ ఈ కాలేజ్ యూనివర్సిటీ కదా సార్ మీకు మినిమం ఫైవ్ ఎల్ ఫైవ్ లాక్స్ వరకు ఉంటది సార్ ఎంత తగ్గే అవకాశం ఉంది అండి లైక్ ర్యాంక్ ఏం తెచ్చుకోవాలి లైక్ మీ ఏంసెట్ ర్యాంక్ ను బట్టి మనం ప్రిఫర్ చేయొచ్చు సార్ మాట్లాడొచ్చు అయితే ఇప్పుడు మీరు హెబ్సేటే రాస్తున్నారు సార్ ఎనీ అదర్ కాంపిటేటివ్ ఎగ్జామ్ రాస్తున్నారు నేను కాంపిటేటివ్ ఎగ్జామ్ ఎగ్జామ్ రాస్తున్నారు అండి హెబ్సేటే రాస్తున్నారు ఓకే సర్ మరి విజిట్ ప్లాన్ చేయమంటారా ఆ ప్లాన్ చేయండి ఓకే సర్ థ్యాంక్యూ సో మచ్ థ్యాంక్యూ అండి`;

async function splitSpeakers() {
  console.log('Splitting transcript into Agent/Customer using GPT...\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a speaker diarization assistant for a Telugu phone sales call.
Split the transcript into Agent and Customer turns.

Rules:
- Agent: introduces company, asks questions ending with సార్/సర్?, explains colleges/fees, pitches
- Customer: short answers like అవునండి/ఉందండి/అండి, mentions preferences, asks about fees/discount
- Keep EXACT Telugu words, don't translate
- Each turn on new line with "Agent:" or "Customer:" prefix

Return ONLY the split transcript, no other text.`
      },
      {
        role: 'user',
        content: transcript
      }
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const splitTranscript = response.choices[0].message.content;
  console.log('='.repeat(60));
  console.log('SPLIT TRANSCRIPT');
  console.log('='.repeat(60));
  console.log('');
  console.log(splitTranscript);
  console.log('');

  // Parse into messages
  const lines = splitTranscript.split('\n').filter(l => l.trim());
  const messages = [];

  for (const line of lines) {
    const agentMatch = line.match(/^Agent:\s*(.+)/i);
    const customerMatch = line.match(/^Customer:\s*(.+)/i);

    if (agentMatch) {
      messages.push({ role: 'assistant', content: agentMatch[1].trim(), sentiment: 'neutral' });
    } else if (customerMatch) {
      messages.push({ role: 'user', content: customerMatch[1].trim(), sentiment: 'neutral' });
    }
  }

  const agentMsgs = messages.filter(m => m.role === 'assistant').length;
  const customerMsgs = messages.filter(m => m.role === 'user').length;

  console.log('Agent messages:', agentMsgs);
  console.log('Customer messages:', customerMsgs);
  console.log('');

  // Update the call if --update flag
  const callId = 'ba5ff240-96a4-48e9-8f96-46949397b1dd';

  if (process.argv.includes('--update')) {
    console.log('Updating call record...');

    await prisma.telecallerCall.update({
      where: { id: callId },
      data: {
        transcript: splitTranscript,
        enhancedTranscript: messages,
        customerSpeakingTime: Math.round(customerMsgs * 3), // estimate
        agentSpeakingTime: Math.round(agentMsgs * 5), // estimate
      }
    });

    console.log('✅ Call record updated!');
    console.log('Refresh the page to see both Agent and Customer messages.');
  } else {
    console.log('Run with --update to save:', 'node scripts/split-speakers.js --update');
  }

  await prisma.$disconnect();
}

splitSpeakers().catch(console.error);
