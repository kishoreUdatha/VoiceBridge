/**
 * Test Script: Language Preference for Transcription
 *
 * This script:
 * 1. Shows all organizations and their current language preference
 * 2. Allows you to update an organization's language
 * 3. Tests the transcription with the new language setting
 *
 * Run with: npx ts-node scripts/test-language-preference.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English' },
];

async function testLanguagePreference(): Promise<void> {
  console.log('='.repeat(70));
  console.log('LANGUAGE PREFERENCE TEST');
  console.log('='.repeat(70));
  console.log();

  // 1. List all organizations with their language preference
  console.log('1. ORGANIZATIONS & LANGUAGE PREFERENCES');
  console.log('-'.repeat(50));

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      preferredLanguage: true,
      _count: {
        select: { users: true }
      }
    },
    orderBy: { name: 'asc' },
  });

  if (organizations.length === 0) {
    console.log('No organizations found.');
    return;
  }

  console.log('\n| Organization | Language | Users |');
  console.log('|' + '-'.repeat(30) + '|' + '-'.repeat(15) + '|' + '-'.repeat(8) + '|');

  for (const org of organizations) {
    const lang = org.preferredLanguage || 'te-IN (default)';
    const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === org.preferredLanguage);
    const langDisplay = langInfo ? `${langInfo.code} (${langInfo.name})` : lang;
    console.log(`| ${org.name.substring(0, 28).padEnd(28)} | ${langDisplay.padEnd(13)} | ${org._count.users.toString().padEnd(6)} |`);
  }

  // 2. Show supported languages
  console.log('\n\n2. SUPPORTED LANGUAGES');
  console.log('-'.repeat(50));
  console.log('\n| Code | Language | Native Name |');
  console.log('|' + '-'.repeat(8) + '|' + '-'.repeat(20) + '|' + '-'.repeat(15) + '|');

  for (const lang of SUPPORTED_LANGUAGES) {
    console.log(`| ${lang.code.padEnd(6)} | ${lang.name.padEnd(18)} | ${lang.nativeName.padEnd(13)} |`);
  }

  // 3. Update first organization to Telugu (for testing)
  console.log('\n\n3. UPDATE LANGUAGE PREFERENCE');
  console.log('-'.repeat(50));

  const firstOrg = organizations[0];
  console.log(`\nUpdating "${firstOrg.name}" to Telugu (te-IN)...`);

  const updated = await prisma.organization.update({
    where: { id: firstOrg.id },
    data: { preferredLanguage: 'te-IN' },
    select: {
      id: true,
      name: true,
      preferredLanguage: true,
    },
  });

  console.log(`SUCCESS: ${updated.name} now uses ${updated.preferredLanguage}`);

  // 4. Verify the update
  console.log('\n\n4. VERIFICATION');
  console.log('-'.repeat(50));

  const verifyOrg = await prisma.organization.findUnique({
    where: { id: firstOrg.id },
    select: {
      id: true,
      name: true,
      preferredLanguage: true,
    },
  });

  console.log(`\nOrganization: ${verifyOrg?.name}`);
  console.log(`Preferred Language: ${verifyOrg?.preferredLanguage}`);

  // 5. Test with a telecaller
  console.log('\n\n5. TELECALLER LANGUAGE TEST');
  console.log('-'.repeat(50));

  const telecaller = await prisma.user.findFirst({
    where: {
      organizationId: firstOrg.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      organization: {
        select: { preferredLanguage: true }
      }
    },
  });

  if (telecaller) {
    console.log(`\nTelecaller: ${telecaller.firstName} ${telecaller.lastName}`);
    console.log(`Organization Language: ${telecaller.organization?.preferredLanguage || 'te-IN (default)'}`);
    console.log(`\nWhen this telecaller makes a call, the recording will be transcribed in: ${telecaller.organization?.preferredLanguage || 'te-IN'}`);
  } else {
    console.log('No telecallers found in this organization.');
  }

  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('HOW TO TEST');
  console.log('='.repeat(70));
  console.log(`
1. API Endpoints:
   GET  /api/organization/language  - Get current language
   PUT  /api/organization/language  - Update language
        Body: { "language": "te-IN" }

2. Make a telecaller call and record it

3. Check the logs for:
   [TelecallerAI] Using preferred language: te-IN
   [TelecallerAI] Using Sarvam with language hint: te-IN

4. The transcript should now be consistently in Telugu
`);

  console.log('='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
}

// Run the test
testLanguagePreference()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
