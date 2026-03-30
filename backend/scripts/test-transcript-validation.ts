/**
 * Test script to verify transcript validation logic
 */

// Validation function (same as in the service)
function validateTranscript(
  transcript: string,
  duration: number
): { isValid: boolean; reason: string; suggestedOutcome: string } {
  const cleanTranscript = transcript.trim().toLowerCase();

  // Check 1: Empty or very short transcript
  if (!cleanTranscript || cleanTranscript.length < 10) {
    return {
      isValid: false,
      reason: 'No conversation detected - recording appears to be silent or empty',
      suggestedOutcome: 'NO_ANSWER',
    };
  }

  // Check 2: Very short duration (less than 5 seconds)
  if (duration > 0 && duration < 5) {
    return {
      isValid: false,
      reason: 'Call too short for meaningful conversation',
      suggestedOutcome: 'NO_ANSWER',
    };
  }

  // Check 3: Count actual words
  const words = cleanTranscript
    .split(/\s+/)
    .filter(word => word.length > 1 && !/^[.…,!?]+$/.test(word));

  if (words.length < 5) {
    return {
      isValid: false,
      reason: 'Transcript contains too few words to analyze - likely noise or silence',
      suggestedOutcome: 'NO_ANSWER',
    };
  }

  // Check 4: Noise patterns
  const noisePatterns = [
    /^\.+$/,
    /^\[.*\]$/,
    /^(uh|um|hmm|ah)+$/,
    /^(music|silence|noise|static|background|inaudible)+$/i,
  ];

  for (const pattern of noisePatterns) {
    if (pattern.test(cleanTranscript)) {
      return {
        isValid: false,
        reason: 'Recording contains only background noise or silence markers',
        suggestedOutcome: 'NO_ANSWER',
      };
    }
  }

  // Check 5: Conversation indicators
  const conversationIndicators = [
    /hello/i, /hi/i, /hey/i, /yes/i, /no/i, /okay/i,
    /tell me/i, /speak/i, /calling/i, /sir/i, /ma'?am/i,
    /interested/i, /information/i, /price/i, /cost/i,
    /haan/i, /nahi/i, /kya/i, /bol/i, /baat/i,
  ];

  const hasConversationIndicator = conversationIndicators.some(pattern =>
    pattern.test(cleanTranscript)
  );

  if (!hasConversationIndicator && words.length < 15) {
    return {
      isValid: false,
      reason: 'No recognizable conversation detected in the recording',
      suggestedOutcome: 'NO_ANSWER',
    };
  }

  return {
    isValid: true,
    reason: '',
    suggestedOutcome: 'INTERESTED',
  };
}

// Test cases
console.log('\n========== TRANSCRIPT VALIDATION TESTS ==========\n');

const testCases = [
  { transcript: '', duration: 10, desc: 'Empty transcript' },
  { transcript: '...', duration: 10, desc: 'Just dots' },
  { transcript: '[silence]', duration: 10, desc: 'Silence marker' },
  { transcript: 'uh um hmm', duration: 10, desc: 'Just filler sounds' },
  { transcript: 'background noise static', duration: 10, desc: 'Noise words' },
  { transcript: 'some random words here', duration: 3, desc: 'Very short duration' },
  { transcript: 'ab cd', duration: 10, desc: 'Too few words' },
  { transcript: 'random text without any greeting', duration: 10, desc: 'No conversation indicators (short)' },
  { transcript: 'Hello sir, I am calling about the product', duration: 30, desc: 'Valid conversation' },
  { transcript: 'Haan baat karo mujhe interested hai', duration: 25, desc: 'Valid Hindi conversation' },
  { transcript: 'Yes I am interested in your services please tell me more about the pricing', duration: 45, desc: 'Long valid conversation' },
];

testCases.forEach((test, i) => {
  const result = validateTranscript(test.transcript, test.duration);
  console.log(`Test ${i + 1}: ${test.desc}`);
  console.log(`  Transcript: "${test.transcript.substring(0, 50)}${test.transcript.length > 50 ? '...' : ''}"`);
  console.log(`  Duration: ${test.duration}s`);
  console.log(`  Valid: ${result.isValid ? '✓ YES' : '✗ NO'}`);
  if (!result.isValid) {
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Suggested Outcome: ${result.suggestedOutcome}`);
  }
  console.log('');
});

console.log('========== TESTS COMPLETE ==========\n');
