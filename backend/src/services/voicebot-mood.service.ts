/**
 * Voicebot Mood Detection Service - Single Responsibility Principle
 * Handles user mood detection and mood-appropriate response styling
 */

import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface MoodDetectionResult {
  mood: string;
  intensity: 'low' | 'medium' | 'high';
  indicators: string[];
}

// Quick keyword-based mood detection patterns
const MOOD_KEYWORDS: Record<string, string[]> = {
  angry: ['angry', 'frustrated', 'annoyed', 'irritated', 'gussa', 'pagal', 'stupid', 'useless', 'worst', 'terrible', 'hate'],
  sad: ['sad', 'upset', 'disappointed', 'unhappy', 'dukhi', 'problem', 'issue', 'not working', 'failed', 'loss'],
  happy: ['happy', 'great', 'wonderful', 'excellent', 'perfect', 'amazing', 'love', 'thank you', 'thanks', 'awesome', 'khush', 'bahut acha'],
  confused: ['confused', 'dont understand', 'what do you mean', 'unclear', 'samajh nahi', 'kya matlab', 'how', 'why'],
  frustrated: ['again', 'still', 'not solved', 'same problem', 'how many times', 'phir se', 'abhi tak'],
  excited: ['wow', 'really', 'amazing', 'cant wait', 'excited', 'awesome', 'great news'],
  worried: ['worried', 'concerned', 'afraid', 'scared', 'tension', 'chinta', 'dar'],
};

// Mood-appropriate response styles
const MOOD_STYLES: Record<string, Record<string, string>> = {
  happy: {
    low: 'Match their positive energy. Be friendly and warm.',
    medium: 'Be enthusiastic! Share in their happiness. Use positive affirmations.',
    high: 'Celebrate with them! Be very upbeat and excited. Use expressions like "That\'s fantastic!"',
  },
  sad: {
    low: 'Be gentle and understanding. Show you care.',
    medium: 'Express genuine empathy. Slow down your pace. Say things like "I understand how you feel".',
    high: 'Be very compassionate and supportive. Listen more, talk less. Offer reassurance. Say "I\'m here to help you through this".',
  },
  angry: {
    low: 'Stay calm and professional. Acknowledge their concern.',
    medium: 'Apologize if appropriate. Focus on solutions. Say "I completely understand your frustration".',
    high: 'Remain very calm. Let them vent. Apologize sincerely. Focus on immediate resolution. Say "I\'m so sorry for this experience. Let me fix this right now."',
  },
  frustrated: {
    low: 'Be patient and clear. Simplify your explanations.',
    medium: 'Acknowledge the difficulty. Provide step-by-step guidance. Say "I know this has been difficult".',
    high: 'Show deep understanding. Take ownership. Promise resolution. Say "I completely understand. This has taken too long. Let me personally ensure this gets resolved."',
  },
  confused: {
    low: 'Be clear and simple. Use examples.',
    medium: 'Slow down. Explain step by step. Check understanding frequently.',
    high: 'Be very patient. Use simple language. Offer to explain in a different way. Say "Let me explain this more simply".',
  },
  excited: {
    low: 'Match their enthusiasm lightly.',
    medium: 'Be energetic and positive. Share their excitement.',
    high: 'Be very enthusiastic! Use exclamations. Say things like "This is so exciting!"',
  },
  worried: {
    low: 'Be reassuring and calm.',
    medium: 'Provide comfort and clear information. Address concerns directly.',
    high: 'Be very reassuring. Provide concrete solutions. Say "Don\'t worry, I\'ll take care of everything".',
  },
  neutral: {
    low: 'Be professional and friendly.',
    medium: 'Be professional and friendly.',
    high: 'Be professional and friendly.',
  },
};

/**
 * Detect user's mood from their message
 * Analyzes text for emotional cues and returns mood with confidence
 */
export async function detectUserMood(
  userMessage: string,
  conversationContext: string
): Promise<MoodDetectionResult> {
  const defaultMood: MoodDetectionResult = { mood: 'neutral', intensity: 'low', indicators: [] };

  // Quick keyword-based detection for common moods (avoid API call when possible)
  const lowerMessage = userMessage.toLowerCase();

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    const matchedKeywords = keywords.filter(kw => lowerMessage.includes(kw));
    if (matchedKeywords.length > 0) {
      const intensity = matchedKeywords.length >= 3 ? 'high' : matchedKeywords.length >= 2 ? 'medium' : 'low';
      console.log(`[MoodService] Quick mood detection: ${mood} (${intensity}) - keywords: ${matchedKeywords.join(', ')}`);
      return { mood, intensity, indicators: matchedKeywords };
    }
  }

  // For nuanced detection, use GPT
  if (!openai) {
    return defaultMood;
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at detecting emotions from text. Analyze the user's message and conversation context to determine their current emotional state.

Return JSON:
{
  "mood": "one of: happy, sad, angry, frustrated, confused, excited, worried, neutral",
  "intensity": "low, medium, or high",
  "indicators": ["list of words/phrases that indicate this mood"]
}

Consider:
- Tone and word choice
- Punctuation (!!!, ???, CAPS)
- Context from previous messages
- Cultural expressions (Hindi/Indian expressions of emotion)
- Implicit frustration (repetition, complaints)

Examples:
- "This is the third time I'm calling!" → {"mood": "frustrated", "intensity": "high", "indicators": ["third time", "calling"]}
- "Oh that's wonderful news!" → {"mood": "happy", "intensity": "medium", "indicators": ["wonderful", "!"]}
- "I don't know what to do..." → {"mood": "worried", "intensity": "medium", "indicators": ["don't know", "..."]}
- "Yeh kya ho raha hai??" → {"mood": "confused", "intensity": "medium", "indicators": ["kya ho raha hai", "??"]}`,
        },
        {
          role: 'user',
          content: `Recent conversation:\n${conversationContext}\n\nLatest message: "${userMessage}"`,
        },
      ],
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`[MoodService] GPT mood detection:`, result);

    return {
      mood: result.mood || 'neutral',
      intensity: result.intensity || 'low',
      indicators: result.indicators || [],
    };
  } catch (error) {
    console.error('[MoodService] Mood detection error:', error);
    return defaultMood;
  }
}

/**
 * Get mood-appropriate response style instructions
 */
export function getMoodResponseStyle(mood: string, intensity: string): string {
  return MOOD_STYLES[mood]?.[intensity] || MOOD_STYLES.neutral.low;
}

/**
 * Analyze mood journey throughout a call
 */
export function analyzeMoodJourney(moodHistory: Array<{ mood: string; timestamp: string }>): {
  dominantMood: string;
  moodJourney: string;
  moodImproved: boolean;
} {
  if (moodHistory.length === 0) {
    return {
      dominantMood: 'neutral',
      moodJourney: 'neutral throughout',
      moodImproved: false,
    };
  }

  // Count mood occurrences
  const moodCounts: Record<string, number> = {};
  for (const entry of moodHistory) {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  }

  // Find dominant mood
  let dominantMood = 'neutral';
  let maxCount = 0;
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood;
    }
  }

  // Describe mood journey
  const moodJourney = moodHistory.map(m => m.mood).join(' → ');

  // Check if mood improved (ended on positive note)
  const positiveMoods = ['happy', 'excited', 'neutral'];
  const negativeMoods = ['angry', 'frustrated', 'sad', 'worried'];
  const firstMood = moodHistory[0]?.mood || 'neutral';
  const lastMood = moodHistory[moodHistory.length - 1]?.mood || 'neutral';
  const moodImproved = negativeMoods.includes(firstMood) && positiveMoods.includes(lastMood);

  return {
    dominantMood,
    moodJourney,
    moodImproved,
  };
}

export const voicebotMoodService = {
  detectUserMood,
  getMoodResponseStyle,
  analyzeMoodJourney,
  MOOD_KEYWORDS,
  MOOD_STYLES,
};

export default voicebotMoodService;
