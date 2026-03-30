/**
 * Test Script: Telecaller Language Settings
 * Verifies that telecallers inherit language settings from their organization
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTelecallerLanguage(): Promise<void> {
  console.log('='.repeat(60));
  console.log('TELECALLER LANGUAGE SETTINGS TEST');
  console.log('='.repeat(60));

  // Get all telecallers with their organization's language
  const telecallers = await prisma.user.findMany({
    where: { role: { name: 'TELECALLER' } },
    include: {
      organization: {
        select: {
          name: true,
          preferredLanguage: true,
        },
      },
    },
  });

  console.log('\n| Telecaller | Organization | Language |');
  console.log('|' + '-'.repeat(25) + '|' + '-'.repeat(25) + '|' + '-'.repeat(15) + '|');

  for (const t of telecallers) {
    const name = `${t.firstName} ${t.lastName}`.substring(0, 23).padEnd(23);
    const org = (t.organization?.name || 'N/A').substring(0, 23).padEnd(23);
    const lang = (t.organization?.preferredLanguage || 'te-IN').padEnd(13);
    console.log(`| ${name} | ${org} | ${lang} |`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('LANGUAGE FLOW WHEN TELECALLER MAKES A CALL');
  console.log('='.repeat(60));

  console.log(`
1. Telecaller makes a call from the mobile app
2. Call is recorded and ends
3. Backend receives the recording
4. System fetches telecaller's organization
5. Gets preferredLanguage from organization (default: te-IN)
6. Passes language to transcription service (Sarvam STT)
7. AI analyzes transcript in that language
8. Results saved with proper Telugu transcript

Flow:
  TelecallerCall → fetchTelecaller → org.preferredLanguage → Sarvam STT(te-IN) → AI Analysis
`);

  // Get recent calls to see if language is being used
  console.log('\n' + '='.repeat(60));
  console.log('RECENT TELECALLER CALLS');
  console.log('='.repeat(60));

  const recentCalls = await prisma.telecallerCall.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      contactName: true,
      duration: true,
      status: true,
      transcript: true,
      telecaller: {
        select: {
          firstName: true,
          lastName: true,
          organization: {
            select: { preferredLanguage: true },
          },
        },
      },
    },
  });

  if (recentCalls.length === 0) {
    console.log('\nNo recent telecaller calls found.');
  } else {
    for (const call of recentCalls) {
      const lang = call.telecaller?.organization?.preferredLanguage || 'te-IN';
      const hasTranscript = call.transcript ? 'Yes' : 'No';
      console.log(`\nCall ID: ${call.id.substring(0, 8)}...`);
      console.log(`  Contact: ${call.contactName || 'Unknown'}`);
      console.log(`  Telecaller: ${call.telecaller?.firstName} ${call.telecaller?.lastName}`);
      console.log(`  Language: ${lang}`);
      console.log(`  Has Transcript: ${hasTranscript}`);
      if (call.transcript) {
        const preview = call.transcript.substring(0, 100);
        console.log(`  Transcript Preview: ${preview}...`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`
Next Steps:
1. Make a test call from the telecaller app
2. Check backend logs for:
   [TelecallerAI] Using preferred language: te-IN
3. Verify transcript is in Telugu
`);
}

testTelecallerLanguage()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
