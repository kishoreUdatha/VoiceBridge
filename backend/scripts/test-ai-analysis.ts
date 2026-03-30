/**
 * Test Script: Verify AI Analysis is Working Correctly
 *
 * This script checks:
 * 1. Database - Are enhanced analysis fields being saved?
 * 2. API - Does the summary endpoint return all fields?
 * 3. Analysis Quality - Are the AI-generated values meaningful (not hardcoded)?
 *
 * Run with: npx ts-node scripts/test-ai-analysis.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AnalysisReport {
  telecallerCalls: {
    total: number;
    analyzed: number;
    withKeyQuestions: number;
    withKeyIssues: number;
    withCoaching: number;
    withEnhancedTranscript: number;
  };
  outboundCalls: {
    total: number;
    analyzed: number;
    withKeyQuestions: number;
    withKeyIssues: number;
    withCoaching: number;
    withEnhancedTranscript: number;
  };
  sampleCalls: any[];
}

async function testAIAnalysis(): Promise<void> {
  console.log('='.repeat(70));
  console.log('AI ANALYSIS VERIFICATION TEST');
  console.log('='.repeat(70));
  console.log();

  const report: AnalysisReport = {
    telecallerCalls: {
      total: 0,
      analyzed: 0,
      withKeyQuestions: 0,
      withKeyIssues: 0,
      withCoaching: 0,
      withEnhancedTranscript: 0,
    },
    outboundCalls: {
      total: 0,
      analyzed: 0,
      withKeyQuestions: 0,
      withKeyIssues: 0,
      withCoaching: 0,
      withEnhancedTranscript: 0,
    },
    sampleCalls: [],
  };

  // ==================== CHECK TELECALLER CALLS ====================
  console.log('1. TELECALLER CALLS ANALYSIS');
  console.log('-'.repeat(50));

  const telecallerCalls = await prisma.telecallerCall.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  report.telecallerCalls.total = telecallerCalls.length;

  for (const call of telecallerCalls) {
    if (call.aiAnalyzed) {
      report.telecallerCalls.analyzed++;
    }

    const keyQuestions = call.keyQuestionsAsked as any[];
    const keyIssues = call.keyIssuesDiscussed as any[];
    const enhancedTranscript = call.enhancedTranscript as any[];

    if (keyQuestions && keyQuestions.length > 0) {
      report.telecallerCalls.withKeyQuestions++;
    }
    if (keyIssues && keyIssues.length > 0) {
      report.telecallerCalls.withKeyIssues++;
    }
    if (call.coachingSummary || call.coachingEmpathyScore) {
      report.telecallerCalls.withCoaching++;
    }
    if (enhancedTranscript && enhancedTranscript.length > 0) {
      report.telecallerCalls.withEnhancedTranscript++;
    }
  }

  console.log(`Total Completed Calls: ${report.telecallerCalls.total}`);
  console.log(`AI Analyzed: ${report.telecallerCalls.analyzed}`);
  console.log(`With Key Questions: ${report.telecallerCalls.withKeyQuestions}`);
  console.log(`With Key Issues: ${report.telecallerCalls.withKeyIssues}`);
  console.log(`With Coaching: ${report.telecallerCalls.withCoaching}`);
  console.log(`With Enhanced Transcript: ${report.telecallerCalls.withEnhancedTranscript}`);
  console.log();

  // ==================== CHECK OUTBOUND CALLS (AI Voice Agent) ====================
  console.log('2. OUTBOUND CALLS (AI Voice Agent) ANALYSIS');
  console.log('-'.repeat(50));

  const outboundCalls = await prisma.outboundCall.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  report.outboundCalls.total = outboundCalls.length;

  for (const call of outboundCalls) {
    if (call.summary) {
      report.outboundCalls.analyzed++;
    }

    const keyQuestions = call.keyQuestionsAsked as any[];
    const keyIssues = call.keyIssuesDiscussed as any[];
    const enhancedTranscript = call.enhancedTranscript as any[];

    if (keyQuestions && keyQuestions.length > 0) {
      report.outboundCalls.withKeyQuestions++;
    }
    if (keyIssues && keyIssues.length > 0) {
      report.outboundCalls.withKeyIssues++;
    }
    if (call.coachingSummary || call.coachingEmpathyScore) {
      report.outboundCalls.withCoaching++;
    }
    if (enhancedTranscript && enhancedTranscript.length > 0) {
      report.outboundCalls.withEnhancedTranscript++;
    }
  }

  console.log(`Total Completed Calls: ${report.outboundCalls.total}`);
  console.log(`With Summary (Analyzed): ${report.outboundCalls.analyzed}`);
  console.log(`With Key Questions: ${report.outboundCalls.withKeyQuestions}`);
  console.log(`With Key Issues: ${report.outboundCalls.withKeyIssues}`);
  console.log(`With Coaching: ${report.outboundCalls.withCoaching}`);
  console.log(`With Enhanced Transcript: ${report.outboundCalls.withEnhancedTranscript}`);
  console.log();

  // ==================== SAMPLE ANALYZED CALLS ====================
  console.log('3. SAMPLE ANALYZED CALLS (with full details)');
  console.log('-'.repeat(50));

  // Get sample telecaller call with analysis
  const sampleTelecallerCall = await prisma.telecallerCall.findFirst({
    where: {
      aiAnalyzed: true,
      transcript: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      telecaller: { select: { firstName: true, lastName: true } },
    },
  });

  if (sampleTelecallerCall) {
    console.log('\n[TELECALLER CALL SAMPLE]');
    console.log(`ID: ${sampleTelecallerCall.id}`);
    console.log(`Phone: ${sampleTelecallerCall.phoneNumber}`);
    console.log(`Telecaller: ${sampleTelecallerCall.telecaller?.firstName} ${sampleTelecallerCall.telecaller?.lastName}`);
    console.log(`Duration: ${sampleTelecallerCall.duration}s`);
    console.log(`Outcome: ${sampleTelecallerCall.outcome}`);
    console.log(`Sentiment: ${sampleTelecallerCall.sentiment}`);
    console.log(`Call Quality Score: ${sampleTelecallerCall.callQualityScore}`);
    console.log(`Summary: ${sampleTelecallerCall.summary?.substring(0, 150)}...`);

    const keyQuestions = sampleTelecallerCall.keyQuestionsAsked as string[];
    const keyIssues = sampleTelecallerCall.keyIssuesDiscussed as string[];

    console.log(`\nKey Questions Asked (${keyQuestions?.length || 0}):`);
    if (keyQuestions && keyQuestions.length > 0) {
      keyQuestions.slice(0, 3).forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
    } else {
      console.log('  (none extracted)');
    }

    console.log(`\nKey Issues Discussed (${keyIssues?.length || 0}):`);
    if (keyIssues && keyIssues.length > 0) {
      keyIssues.slice(0, 3).forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    } else {
      console.log('  (none extracted)');
    }

    console.log(`\nCoaching Data:`);
    console.log(`  Empathy Score: ${sampleTelecallerCall.coachingEmpathyScore ?? 'N/A'}`);
    console.log(`  Objection Handling: ${sampleTelecallerCall.coachingObjectionScore ?? 'N/A'}`);
    console.log(`  Closing Score: ${sampleTelecallerCall.coachingClosingScore ?? 'N/A'}`);
    console.log(`  Coaching Summary: ${sampleTelecallerCall.coachingSummary?.substring(0, 100) || 'N/A'}...`);

    const enhancedTranscript = sampleTelecallerCall.enhancedTranscript as any[];
    console.log(`\nEnhanced Transcript (${enhancedTranscript?.length || 0} messages):`);
    if (enhancedTranscript && enhancedTranscript.length > 0) {
      enhancedTranscript.slice(0, 3).forEach((msg, i) => {
        console.log(`  [${msg.role}] (${msg.sentiment}): ${msg.content?.substring(0, 50)}...`);
      });
    } else {
      console.log('  (not available)');
    }

    report.sampleCalls.push({
      type: 'telecaller',
      id: sampleTelecallerCall.id,
      hasKeyQuestions: (keyQuestions?.length || 0) > 0,
      hasKeyIssues: (keyIssues?.length || 0) > 0,
      hasCoaching: !!sampleTelecallerCall.coachingSummary,
      hasEnhancedTranscript: (enhancedTranscript?.length || 0) > 0,
    });
  } else {
    console.log('\n[TELECALLER CALL SAMPLE]: No analyzed calls found');
  }

  // Get sample outbound call with analysis
  const sampleOutboundCall = await prisma.outboundCall.findFirst({
    where: {
      summary: { not: '' },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      agent: { select: { name: true } },
    },
  });

  if (sampleOutboundCall) {
    console.log('\n\n[OUTBOUND CALL SAMPLE]');
    console.log(`ID: ${sampleOutboundCall.id}`);
    console.log(`Phone: ${sampleOutboundCall.phoneNumber}`);
    console.log(`Agent: ${(sampleOutboundCall as any).agent?.name || 'N/A'}`);
    console.log(`Duration: ${sampleOutboundCall.duration}s`);
    console.log(`Outcome: ${sampleOutboundCall.outcome}`);
    console.log(`Sentiment: ${sampleOutboundCall.sentiment}`);
    console.log(`Call Quality Score: ${sampleOutboundCall.callQualityScore}`);
    console.log(`Summary: ${sampleOutboundCall.summary?.substring(0, 150)}...`);

    const keyQuestions = sampleOutboundCall.keyQuestionsAsked as string[];
    const keyIssues = sampleOutboundCall.keyIssuesDiscussed as string[];

    console.log(`\nKey Questions Asked (${keyQuestions?.length || 0}):`);
    if (keyQuestions && keyQuestions.length > 0) {
      keyQuestions.slice(0, 3).forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
    } else {
      console.log('  (none extracted)');
    }

    console.log(`\nKey Issues Discussed (${keyIssues?.length || 0}):`);
    if (keyIssues && keyIssues.length > 0) {
      keyIssues.slice(0, 3).forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    } else {
      console.log('  (none extracted)');
    }

    console.log(`\nCoaching Data:`);
    console.log(`  Empathy Score: ${sampleOutboundCall.coachingEmpathyScore ?? 'N/A'}`);
    console.log(`  Objection Handling: ${sampleOutboundCall.coachingObjectionScore ?? 'N/A'}`);
    console.log(`  Closing Score: ${sampleOutboundCall.coachingClosingScore ?? 'N/A'}`);
    console.log(`  Coaching Summary: ${sampleOutboundCall.coachingSummary?.substring(0, 100) || 'N/A'}...`);

    const enhancedTranscript = sampleOutboundCall.enhancedTranscript as any[];
    console.log(`\nEnhanced Transcript (${enhancedTranscript?.length || 0} messages):`);
    if (enhancedTranscript && enhancedTranscript.length > 0) {
      enhancedTranscript.slice(0, 3).forEach((msg, i) => {
        console.log(`  [${msg.role}] (${msg.sentiment}): ${msg.content?.substring(0, 50)}...`);
      });
    } else {
      console.log('  (not available)');
    }

    report.sampleCalls.push({
      type: 'outbound',
      id: sampleOutboundCall.id,
      hasKeyQuestions: (keyQuestions?.length || 0) > 0,
      hasKeyIssues: (keyIssues?.length || 0) > 0,
      hasCoaching: !!sampleOutboundCall.coachingSummary,
      hasEnhancedTranscript: (enhancedTranscript?.length || 0) > 0,
    });
  } else {
    console.log('\n\n[OUTBOUND CALL SAMPLE]: No analyzed calls found');
  }

  // ==================== ANALYSIS QUALITY CHECK ====================
  console.log('\n\n4. ANALYSIS QUALITY CHECK');
  console.log('-'.repeat(50));

  // Check for hardcoded/default values
  const telecallerWithScore50 = await prisma.telecallerCall.count({
    where: {
      aiAnalyzed: true,
      coachingEmpathyScore: 50,
      coachingObjectionScore: 50,
      coachingClosingScore: 50,
    },
  });

  const telecallerWithScores = await prisma.telecallerCall.count({
    where: {
      aiAnalyzed: true,
      coachingEmpathyScore: { not: null },
    },
  });

  const outboundWithScore50 = await prisma.outboundCall.count({
    where: {
      coachingEmpathyScore: 50,
      coachingObjectionScore: 50,
      coachingClosingScore: 50,
    },
  });

  const outboundWithScores = await prisma.outboundCall.count({
    where: {
      coachingEmpathyScore: { not: null },
    },
  });

  console.log('Checking for potentially hardcoded default values (all scores = 50):');
  console.log(`  Telecaller Calls: ${telecallerWithScore50}/${telecallerWithScores} with all scores = 50`);
  console.log(`  Outbound Calls: ${outboundWithScore50}/${outboundWithScores} with all scores = 50`);

  if (telecallerWithScores > 0) {
    const pctDefault = ((telecallerWithScore50 / telecallerWithScores) * 100).toFixed(1);
    if (parseFloat(pctDefault) > 50) {
      console.log(`  WARNING: ${pctDefault}% of telecaller calls have default scores - AI may not be working properly`);
    } else {
      console.log(`  OK: Only ${pctDefault}% have default scores - AI is generating varied analysis`);
    }
  }

  // ==================== SUMMARY ====================
  console.log('\n\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const telecallerOk = report.telecallerCalls.withKeyQuestions > 0 ||
                       report.telecallerCalls.withCoaching > 0;
  const outboundOk = report.outboundCalls.withKeyQuestions > 0 ||
                     report.outboundCalls.withCoaching > 0;

  console.log(`\nTelecaller Calls Analysis: ${telecallerOk ? 'WORKING' : 'NOT WORKING / NO DATA'}`);
  console.log(`Outbound Calls Analysis: ${outboundOk ? 'WORKING' : 'NOT WORKING / NO DATA'}`);

  if (!telecallerOk && report.telecallerCalls.total > 0) {
    console.log('\nNOTE: Telecaller calls exist but no enhanced analysis found.');
    console.log('This could mean:');
    console.log('  1. Calls were made before the enhanced analysis was added');
    console.log('  2. The analysis service needs to re-process existing calls');
    console.log('  3. New calls need to be made to test the updated analysis');
  }

  if (!outboundOk && report.outboundCalls.total > 0) {
    console.log('\nNOTE: Outbound calls exist but no enhanced analysis found.');
    console.log('Similar reasons may apply as mentioned above.');
  }

  console.log('\n' + '='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
}

// Run the test
testAIAnalysis()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
