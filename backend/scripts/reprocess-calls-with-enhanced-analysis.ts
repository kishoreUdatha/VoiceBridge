/**
 * Re-process Existing Calls with Enhanced AI Analysis
 *
 * This script finds telecaller calls that have transcripts but were analyzed
 * with the old system, and re-processes them with the new enhanced analysis.
 *
 * Run with: npx ts-node scripts/reprocess-calls-with-enhanced-analysis.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  analyzeCallEnhanced,
  generateCoachingSuggestions,
  extractCallData,
  EnhancedCallAnalysisResult,
  CoachingSuggestions,
  ExtractedCallData,
} from '../src/services/voicebot-ai.service';

const prisma = new PrismaClient();

/**
 * Parse string transcript to message array format for AI analysis
 */
function parseTranscriptToMessages(transcript: string): Array<{ role: string; content: string }> {
  if (!transcript || transcript.trim().length === 0) {
    return [];
  }

  // Try to detect speaker labels in transcript
  const speakerPattern = /^(Agent|Telecaller|Assistant|Rep|User|Customer|Caller|Lead):\s*/gmi;
  const hasSpeakerLabels = speakerPattern.test(transcript);

  if (hasSpeakerLabels) {
    const messages: Array<{ role: string; content: string }> = [];
    const lines = transcript.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const agentMatch = trimmed.match(/^(Agent|Telecaller|Assistant|Rep):\s*(.+)/i);
      const customerMatch = trimmed.match(/^(User|Customer|Caller|Lead):\s*(.+)/i);

      if (agentMatch) {
        messages.push({ role: 'assistant', content: agentMatch[2] });
      } else if (customerMatch) {
        messages.push({ role: 'user', content: customerMatch[2] });
      } else if (messages.length > 0) {
        messages[messages.length - 1].content += ' ' + trimmed;
      } else {
        messages.push({ role: 'user', content: trimmed });
      }
    }

    return messages;
  }

  // No speaker labels - split by sentences and alternate
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

  if (sentences.length === 1) {
    return [{ role: 'user', content: transcript.trim() }];
  }

  return sentences.map((sentence, index) => ({
    role: index % 2 === 0 ? 'assistant' : 'user',
    content: sentence.trim(),
  }));
}

async function reprocessCalls(): Promise<void> {
  console.log('='.repeat(70));
  console.log('RE-PROCESSING CALLS WITH ENHANCED AI ANALYSIS');
  console.log('='.repeat(70));
  console.log();

  // Find telecaller calls that have transcripts but no enhanced analysis
  const callsToProcess = await prisma.telecallerCall.findMany({
    where: {
      transcript: { not: '' },
      status: 'COMPLETED',
      // Only process calls that don't have coaching yet (indicating old analysis)
      coachingSummary: { equals: null as any },
    },
    orderBy: { createdAt: 'desc' },
    take: 10, // Process 10 at a time to avoid timeout
  });

  console.log(`Found ${callsToProcess.length} calls to re-process\n`);

  if (callsToProcess.length === 0) {
    console.log('No calls need re-processing.');
    console.log('All calls either have enhanced analysis or no transcript to analyze.');
    return;
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const call of callsToProcess) {
    console.log(`\n[${processed + skipped + failed + 1}/${callsToProcess.length}] Processing call ${call.id}...`);

    const transcript = call.transcript as string;

    // Skip if transcript is too short or appears to be noise
    if (!transcript || transcript.trim().length < 20) {
      console.log(`  Skipping: Transcript too short or empty`);
      skipped++;
      continue;
    }

    // Check for "no conversation" indicators
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes('no conversation detected') ||
        lowerTranscript.includes('silent or empty') ||
        lowerTranscript.includes('too short')) {
      console.log(`  Skipping: No meaningful conversation detected`);
      skipped++;
      continue;
    }

    try {
      // Convert transcript to message format
      const transcriptMessages = parseTranscriptToMessages(transcript);

      if (transcriptMessages.length === 0) {
        console.log(`  Skipping: Could not parse transcript into messages`);
        skipped++;
        continue;
      }

      console.log(`  Parsed ${transcriptMessages.length} messages from transcript`);

      // Run enhanced AI analysis
      console.log(`  Running enhanced AI analysis...`);
      const enhancedAnalysis: EnhancedCallAnalysisResult = await analyzeCallEnhanced(
        transcriptMessages,
        [],
        'neutral',
        call.duration || 0
      );

      console.log(`  Analysis complete: Quality=${enhancedAnalysis.callQualityScore}, Questions=${enhancedAnalysis.keyQuestionsAsked.length}, Issues=${enhancedAnalysis.keyIssuesDiscussed.length}`);

      // Generate coaching suggestions
      console.log(`  Generating coaching suggestions...`);
      const coachingSuggestions: CoachingSuggestions = await generateCoachingSuggestions(
        transcriptMessages,
        enhancedAnalysis.outcome,
        enhancedAnalysis.sentiment,
        enhancedAnalysis.agentSpeakingTime,
        enhancedAnalysis.customerSpeakingTime
      );

      console.log(`  Coaching: Empathy=${coachingSuggestions.empathyScore}, Objection=${coachingSuggestions.objectionHandlingScore}, Closing=${coachingSuggestions.closingScore}`);

      // Extract structured data
      console.log(`  Extracting structured data...`);
      const extractedData: ExtractedCallData = await extractCallData(transcriptMessages);

      // Update call with enhanced analysis
      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: {
          // Enhanced analysis fields
          callQualityScore: enhancedAnalysis.callQualityScore,
          keyQuestionsAsked: enhancedAnalysis.keyQuestionsAsked,
          keyIssuesDiscussed: enhancedAnalysis.keyIssuesDiscussed,
          sentimentIntensity: enhancedAnalysis.sentimentIntensity,
          agentSpeakingTime: enhancedAnalysis.agentSpeakingTime,
          customerSpeakingTime: enhancedAnalysis.customerSpeakingTime,
          nonSpeechTime: enhancedAnalysis.nonSpeechTime,
          enhancedTranscript: enhancedAnalysis.enhancedTranscript as any,
          // Update sentiment/summary if better
          sentiment: enhancedAnalysis.sentiment || call.sentiment,
          summary: enhancedAnalysis.summary || call.summary,
          // Coaching fields
          coachingPositiveHighlights: coachingSuggestions.positiveHighlights as any,
          coachingAreasToImprove: coachingSuggestions.areasToImprove as any,
          coachingNextCallTips: coachingSuggestions.nextCallTips,
          coachingSummary: coachingSuggestions.coachingSummary,
          coachingTalkListenFeedback: coachingSuggestions.talkListenFeedback,
          coachingEmpathyScore: coachingSuggestions.empathyScore,
          coachingObjectionScore: coachingSuggestions.objectionHandlingScore,
          coachingClosingScore: coachingSuggestions.closingScore,
          // Extracted data
          extractedData: extractedData as any,
        },
      });

      console.log(`  SUCCESS: Call ${call.id} updated with enhanced analysis`);
      processed++;

    } catch (error) {
      console.log(`  FAILED: ${(error as Error).message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Processed: ${processed}`);
  console.log(`Skipped (no valid transcript): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log();

  if (processed > 0) {
    console.log('SUCCESS: Run the test script again to verify the enhanced analysis:');
    console.log('  npx ts-node scripts/test-ai-analysis.ts');
  }
}

// Run
reprocessCalls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
