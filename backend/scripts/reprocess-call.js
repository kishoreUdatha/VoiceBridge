/**
 * Re-process a telecaller call with Deepgram speaker diarization
 * Usage: node scripts/reprocess-call.js <callId>
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Import the services after setting up the environment
require('dotenv').config();

const prisma = new PrismaClient();

async function reprocessCall(callId) {
  console.log('='.repeat(60));
  console.log('RE-PROCESSING CALL WITH DEEPGRAM SPEAKER DIARIZATION');
  console.log('='.repeat(60));
  console.log('Call ID:', callId);
  console.log('');

  // Get call details
  const call = await prisma.telecallerCall.findUnique({
    where: { id: callId },
    select: {
      id: true,
      recordingUrl: true,
      transcript: true,
      duration: true,
      aiAnalyzed: true,
    }
  });

  if (!call) {
    console.error('Call not found:', callId);
    return;
  }

  console.log('Recording URL:', call.recordingUrl);
  console.log('Duration:', call.duration, 'seconds');
  console.log('Already analyzed:', call.aiAnalyzed);
  console.log('');

  if (!call.recordingUrl) {
    console.error('No recording URL found');
    return;
  }

  // Get the file path
  const filePath = path.join(process.cwd(), call.recordingUrl);
  console.log('File path:', filePath);

  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    console.error('Recording file not found:', filePath);
    return;
  }

  console.log('File size:', fs.statSync(filePath).size, 'bytes');
  console.log('');

  // Import and use Deepgram SDK directly
  console.log('Loading Deepgram SDK...');
  const { createClient } = require('@deepgram/sdk');

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.error('DEEPGRAM_API_KEY not set in environment');
    return;
  }

  const deepgram = createClient(apiKey);
  console.log('Deepgram client created');
  console.log('');
  console.log('Starting transcription with speaker diarization...');
  console.log('(This may take a moment)');
  console.log('');

  try {
    // Read audio file
    const audioBuffer = fs.readFileSync(filePath);

    // Call Deepgram with diarization
    // Use nova-3 model for better Indian language support
    const response = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-3',
        language: 'te',
        smart_format: true,
        diarize: true,
        punctuate: true,
        utterances: true,
        mimetype: 'audio/mp3',
      }
    );

    const result = response.result || response;

    if (!result?.results?.utterances || result.results.utterances.length === 0) {
      console.error('Transcription failed - no utterances returned');
      console.log('Response:', JSON.stringify(result, null, 2).substring(0, 1000));
      return;
    }

    // Process utterances
    const utterances = result.results.utterances;
    const detectedLanguage = result.results.channels?.[0]?.detected_language || 'te';

    console.log('='.repeat(60));
    console.log('TRANSCRIPTION RESULTS');
    console.log('='.repeat(60));
    console.log('');
    console.log('Detected language:', detectedLanguage);
    console.log('Number of utterances:', utterances.length);

    // Get unique speakers
    const speakers = [...new Set(utterances.map(u => u.speaker))].sort();
    console.log('Speakers found:', speakers.join(', '));
    console.log('');

    // Show segment breakdown
    const speakerCounts = {};
    utterances.forEach(u => {
      speakerCounts[u.speaker] = (speakerCounts[u.speaker] || 0) + 1;
    });
    console.log('Utterances per speaker:', speakerCounts);
    console.log('');

    // Convert to messages (Speaker 0 = Agent, others = Customer)
    // First speaker is usually the agent (initiates call)
    const firstSpeaker = utterances[0]?.speaker ?? 0;
    const agentSpeaker = firstSpeaker;

    const messages = [];
    for (const u of utterances) {
      const role = u.speaker === agentSpeaker ? 'assistant' : 'user';
      const last = messages[messages.length - 1];
      if (last && last.role === role) {
        last.content += ' ' + u.transcript;
      } else {
        messages.push({
          role,
          content: u.transcript,
          startTimeSeconds: Math.round(u.start),
          sentiment: 'neutral'
        });
      }
    }

    const agentMsgs = messages.filter(m => m.role === 'assistant').length;
    const customerMsgs = messages.filter(m => m.role === 'user').length;

    console.log('Converted to messages:', messages.length, 'turns');
    console.log('Agent messages:', agentMsgs);
    console.log('Customer messages:', customerMsgs);
    console.log('');

    // Build labeled transcript
    const labeledTranscript = messages
      .map(m => `${m.role === 'assistant' ? 'Agent' : 'Customer'}: ${m.content}`)
      .join('\n');

    console.log('='.repeat(60));
    console.log('LABELED TRANSCRIPT');
    console.log('='.repeat(60));
    console.log('');
    console.log(labeledTranscript);
    console.log('');

    // Ask to update
    console.log('='.repeat(60));
    console.log('');
    console.log('Would you like to update the call record with this transcript?');
    console.log('Run with --update flag to save: node scripts/reprocess-call.js', callId, '--update');

    // Check if --update flag is present
    if (process.argv.includes('--update')) {
      console.log('');
      console.log('Updating call record...');

      // Calculate speaking times
      let agentTime = 0, customerTime = 0;
      for (const u of utterances) {
        const duration = (u.end || 0) - (u.start || 0);
        if (u.speaker === agentSpeaker) {
          agentTime += duration;
        } else {
          customerTime += duration;
        }
      }

      await prisma.telecallerCall.update({
        where: { id: callId },
        data: {
          transcript: labeledTranscript,
          enhancedTranscript: messages,
          agentSpeakingTime: Math.round(agentTime),
          customerSpeakingTime: Math.round(customerTime),
        }
      });

      console.log('✅ Call record updated successfully!');
      console.log('');
      console.log('Refresh the page to see the updated transcript with both speakers.');
    }

  } catch (error) {
    console.error('Error during transcription:', error.message || error);
  }

  await prisma.$disconnect();
}

// Get call ID from command line
const callId = process.argv[2];
if (!callId) {
  console.log('Usage: node scripts/reprocess-call.js <callId> [--update]');
  console.log('');
  console.log('Example: node scripts/reprocess-call.js ba5ff240-96a4-48e9-8f96-46949397b1dd');
  process.exit(1);
}

reprocessCall(callId).catch(console.error);
