/**
 * Call Speech Service - Single Responsibility Principle
 * Handles speech input processing, AI responses, and transfer logic
 */

import OpenAI from 'openai';
import { prisma } from '../config/database';
import { config } from '../config';
import { getLanguageConfig, generateExoML, isHindiLanguage, DEFAULT_TRANSFER_KEYWORDS } from '../config/language.config';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface TransferCheckResult {
  shouldTransfer: boolean;
  config?: any;
}

class CallSpeechService {
  /**
   * Handle speech input from Gather
   */
  async handleSpeechInput(callId: string, speechResult: string, dtmfDigits?: string): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      throw new Error('Call not found');
    }

    // Handle DTMF input
    let userInput = speechResult;
    if (dtmfDigits && !speechResult) {
      switch (dtmfDigits) {
        case '0':
          userInput = 'I want to speak to a human agent';
          break;
        case '9':
          userInput = 'Please repeat that';
          break;
        case '*':
          userInput = 'Go back to the previous question';
          break;
        case '#':
          userInput = 'Skip this question';
          break;
        default:
          userInput = `[User pressed: ${dtmfDigits}]`;
      }
    }

    // Update transcript
    const transcript = (call.transcript as any[]) || [];
    transcript.push({
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
      interruptedAI: !!dtmfDigits || (speechResult && speechResult.length < 20),
    });

    // Check for transfer request
    const transferCheck = await this.checkShouldTransfer(speechResult, transcript, call.agentId);
    if (transferCheck.shouldTransfer) {
      await prisma.outboundCall.update({
        where: { id: callId },
        data: { transcript },
      });
      return this.generateTransferTwiML(callId, transferCheck.config);
    }

    // Get AI response
    const aiResponse = await this.getAIResponse(call.agent, transcript);

    // Add AI response to transcript
    transcript.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    });

    // Extract qualification data
    const qualification = await this.extractQualification(speechResult, call.agent);

    // Update call
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        transcript,
        qualification: {
          ...(call.qualification as object || {}),
          ...qualification,
        },
      },
    });

    // Check if call should end
    const shouldEnd = this.checkShouldEnd(aiResponse, transcript);

    const langConfig = getLanguageConfig(call.agent.language || 'en');
    const baseUrl = config.baseUrl;

    if (shouldEnd) {
      const defaultEndMessage = isHindiLanguage(call.agent.language)
        ? 'Aapke samay ke liye dhanyavaad. Alvida!'
        : 'Thank you for your time. Goodbye!';
      return generateExoML(`
        <Say voice="${langConfig.ttsVoice}">${aiResponse}</Say>
        <Say voice="${langConfig.ttsVoice}">${call.agent.endMessage || defaultEndMessage}</Say>
        <Hangup/>
      `);
    } else {
      const stillThereMessage = isHindiLanguage(call.agent.language)
        ? 'Mujhe kuch sunai nahi diya. Kya aap abhi bhi hain?'
        : "I didn't hear anything. Are you still there?";
      return generateExoML(`
        <Gather input="speech dtmf" action="${baseUrl}/api/outbound-calls/webhook/speech/${callId}" method="POST" timeout="5">
          <Say voice="${langConfig.ttsVoice}">${aiResponse}</Say>
        </Gather>
        <Say voice="${langConfig.ttsVoice}">${stillThereMessage}</Say>
        <Redirect>${baseUrl}/api/outbound-calls/twiml/${callId}</Redirect>
      `);
    }
  }

  /**
   * Get AI response for conversation
   */
  private async getAIResponse(agent: any, transcript: any[]): Promise<string> {
    if (!openai) {
      return agent.fallbackMessage || "I'm sorry, could you please repeat that?";
    }

    const messages: any[] = [
      {
        role: 'system',
        content: this.buildCallSystemPrompt(agent),
      },
    ];

    for (const t of transcript) {
      messages.push({
        role: t.role,
        content: t.content,
      });
    }

    try {
      // Use agent's configured LLM model, fallback to env or default
      const llmModel = agent.llmModel || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

      const completion = await openai.chat.completions.create({
        model: llmModel,
        messages,
        temperature: agent.temperature,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content ||
        agent.fallbackMessage ||
        "I'm sorry, could you please repeat that?";
    } catch (error) {
      console.error('OpenAI error:', error);
      return agent.fallbackMessage || "I'm sorry, could you please repeat that?";
    }
  }

  /**
   * Build system prompt for phone calls
   */
  buildCallSystemPrompt(agent: any): string {
    const questions = agent.questions as any[] || [];
    const isHindi = isHindiLanguage(agent.language);

    let prompt = `You are an AI voice assistant making an outbound phone call. ${agent.systemPrompt}

IMPORTANT PHONE CALL GUIDELINES:
- Keep responses SHORT and conversational (1-2 sentences max)
- Speak naturally as if on a phone call
- Don't use bullet points or lists - speak in sentences
- If the person says they're busy, offer to call back
- If they're not interested, thank them politely and end the call
${isHindi ? `
LANGUAGE INSTRUCTION:
- You MUST respond in Hindi (Hinglish is acceptable)
- Use Roman script Hindi (e.g., "Namaste, main aapki madad kaise kar sakta hoon?")
- Be polite and use respectful Hindi terms (aap, ji, etc.)
- If the user speaks in English, you can respond in a mix of Hindi and English
` : ''}
CRITICAL - YOU MUST ASK THESE QUESTIONS ONE BY ONE:
You MUST proactively ask the following questions during the conversation. Ask them naturally, one at a time, and wait for answers before moving to the next question.
`;

    if (questions.length > 0) {
      prompt += '\n';
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        prompt += `${i + 1}. ASK: "${q.question}" (to collect: ${q.field}${q.required ? ' - REQUIRED' : ' - optional'})\n`;
      }
      prompt += `
After greeting, start by asking Question 1, then proceed through each question.
When you receive an answer, acknowledge it briefly and ask the next question.
Keep track of which questions have been answered and make sure to ask all REQUIRED questions.
If the person provides information before you ask, acknowledge it and skip that question.
`;
    }

    if (agent.faqs && (agent.faqs as any[]).length > 0) {
      prompt += '\n\nIf they ask questions, use these answers:\n';
      for (const faq of agent.faqs as any[]) {
        prompt += `Q: ${faq.question}\nA: ${faq.answer}\n`;
      }
    }

    return prompt;
  }

  /**
   * Extract qualification data from user message with validation
   */
  async extractQualification(userMessage: string, agent: any): Promise<any> {
    const questions = agent.questions as any[];
    if (!questions || questions.length === 0 || !openai) {
      return {};
    }

    try {
      const llmModel = agent.llmModel || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

      // Build field descriptions for better extraction
      const fieldDescriptions = questions.map((q: any) => {
        let desc = `${q.field}: ${q.question}`;
        if (q.type) desc += ` (type: ${q.type})`;
        if (q.required) desc += ' [REQUIRED]';
        return desc;
      }).join('\n');

      const completion = await openai.chat.completions.create({
        model: llmModel,
        messages: [
          {
            role: 'system',
            content: `Extract qualification data from the user's message. Return valid JSON only.

Fields to extract:
${fieldDescriptions}

Rules:
- Only include fields that are explicitly mentioned or can be inferred from the message
- For phone numbers: extract digits only, format as string (e.g., "9876543210")
- For emails: ensure valid email format, lowercase
- For names: capitalize properly
- For dates: use ISO format (YYYY-MM-DD)
- For numbers: use numeric type
- If a field is not mentioned or unclear, DO NOT include it in the output`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const extracted = JSON.parse(content);
        return this.validateAndCleanQualification(extracted, questions);
      }
    } catch (error) {
      console.error('Extraction error:', error);
    }

    return {};
  }

  /**
   * Validate and clean extracted qualification data
   */
  private validateAndCleanQualification(data: any, questions: any[]): any {
    const cleaned: any = {};
    const fieldTypes: Record<string, string> = {};

    // Build field type map
    for (const q of questions) {
      fieldTypes[q.field] = q.type || 'text';
    }

    for (const [field, value] of Object.entries(data)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      const fieldType = fieldTypes[field] || 'text';

      switch (fieldType) {
        case 'email':
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const emailStr = String(value).toLowerCase().trim();
          if (emailRegex.test(emailStr)) {
            cleaned[field] = emailStr;
          }
          break;

        case 'phone':
          // Clean phone number - keep only digits
          const phoneStr = String(value).replace(/\D/g, '');
          // Validate Indian phone (10 digits) or international
          if (phoneStr.length >= 10 && phoneStr.length <= 15) {
            cleaned[field] = phoneStr;
          }
          break;

        case 'number':
          const num = Number(value);
          if (!isNaN(num)) {
            cleaned[field] = num;
          }
          break;

        case 'date':
          // Try to parse as date
          const date = new Date(String(value));
          if (!isNaN(date.getTime())) {
            cleaned[field] = date.toISOString().split('T')[0];
          }
          break;

        case 'boolean':
          cleaned[field] = Boolean(value);
          break;

        default:
          // Text fields - just trim and sanitize
          const textValue = String(value).trim();
          if (textValue.length > 0 && textValue.length < 1000) {
            cleaned[field] = textValue;
          }
      }
    }

    return cleaned;
  }

  /**
   * Check if conversation should end
   */
  checkShouldEnd(response: string, transcript: any[]): boolean {
    const endIndicators = [
      'goodbye',
      'thank you for your time',
      'have a great day',
      'not interested',
      'call back later',
      'end the call',
    ];

    const lowerResponse = response.toLowerCase();
    if (endIndicators.some(indicator => lowerResponse.includes(indicator))) {
      return true;
    }

    if (transcript.length >= 20) {
      return true;
    }

    return false;
  }

  /**
   * Check if call should be transferred to human agent
   */
  async checkShouldTransfer(
    userMessage: string,
    transcript: any[],
    agentId: string
  ): Promise<TransferCheckResult> {
    const lowerMessage = userMessage.toLowerCase();

    const transferConfig = await prisma.transferConfig.findFirst({
      where: {
        OR: [
          { agentId: agentId },
          { agentId: null },
        ],
        isActive: true,
      },
      orderBy: { agentId: 'desc' },
    });

    if (!transferConfig) {
      const hasTransferKeyword = DEFAULT_TRANSFER_KEYWORDS.some(keyword =>
        lowerMessage.includes(keyword.toLowerCase())
      );
      return { shouldTransfer: hasTransferKeyword };
    }

    const triggerKeywords = (transferConfig.triggerKeywords as string[]) || DEFAULT_TRANSFER_KEYWORDS;
    const hasTransferKeyword = triggerKeywords.some(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (hasTransferKeyword) {
      return { shouldTransfer: true, config: transferConfig };
    }

    if (transferConfig.maxAITurns) {
      const userTurns = transcript.filter(t => t.role === 'user').length;
      if (userTurns >= transferConfig.maxAITurns) {
        return { shouldTransfer: true, config: transferConfig };
      }
    }

    if (transferConfig.triggerSentiment === 'negative') {
      const sentiment = await this.analyzeSentiment(transcript);
      if (sentiment === 'negative') {
        return { shouldTransfer: true, config: transferConfig };
      }
    }

    return { shouldTransfer: false };
  }

  /**
   * Generate TwiML for transferring to human agent
   */
  async generateTransferTwiML(callId: string, transferConfig: any): Promise<string> {
    const transferMessage = transferConfig?.transferMessage ||
      "Please hold while I transfer you to a live agent.";
    const transferType = transferConfig?.transferType || 'PHONE';
    const transferTo = transferConfig?.transferTo;

    let exomlContent = `<Say voice="Polly.Joanna">${transferMessage}</Say>`;

    if (!transferTo) {
      if (transferConfig?.voicemailEnabled) {
        exomlContent += `
          <Say voice="Polly.Joanna">I'm sorry, no agents are currently available. Please leave a message after the beep.</Say>
          <Record maxLength="120" playBeep="true"/>
        `;
      } else {
        const fallbackMsg = transferConfig?.fallbackMessage ||
          "I'm sorry, no agents are currently available. We'll call you back soon.";
        exomlContent += `<Say voice="Polly.Joanna">${fallbackMsg}</Say>`;
      }
      exomlContent += '<Hangup/>';
    } else {
      switch (transferType) {
        case 'PHONE':
          exomlContent += `
            <Dial callerId="${config.exotel.callerId}" timeout="30" action="${config.baseUrl}/api/outbound-calls/webhook/transfer-status/${callId}">
              <Number>${transferTo}</Number>
            </Dial>
          `;
          break;

        case 'SIP':
          exomlContent += `
            <Dial timeout="30" action="${config.baseUrl}/api/outbound-calls/webhook/transfer-status/${callId}">
              <Sip>${transferTo}</Sip>
            </Dial>
          `;
          break;

        case 'QUEUE':
          exomlContent += `<Enqueue>${transferTo}</Enqueue>`;
          break;

        case 'VOICEMAIL':
          exomlContent += `
            <Say voice="Polly.Joanna">Please leave a message after the beep.</Say>
            <Record maxLength="120" playBeep="true"/>
            <Hangup/>
          `;
          break;
      }
    }

    // Update call status
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        outcome: 'CALLBACK_REQUESTED',
        outcomeNotes: `Transferred to human agent: ${transferTo || 'voicemail'}`,
      },
    });

    // Add to telecaller queue
    if (transferTo && transferType === 'PHONE') {
      const call = await prisma.outboundCall.findUnique({
        where: { id: callId },
        include: { agent: true },
      });

      if (call) {
        await prisma.telecallerQueue.create({
          data: {
            organizationId: call.agent?.organizationId || '',
            leadId: call.leadId,
            outboundCallId: call.id,
            phoneNumber: call.phoneNumber,
            contactName: undefined,
            aiCallSummary: call.summary,
            aiCallSentiment: call.sentiment,
            aiCallOutcome: call.outcome,
            aiCallDuration: call.duration,
            qualification: call.qualification || {},
            priority: 1,
            status: 'PENDING',
            reason: 'Customer requested human agent',
          },
        });
      }
    }

    return generateExoML(exomlContent);
  }

  /**
   * Analyze sentiment of transcript
   */
  async analyzeSentiment(transcript: any[]): Promise<string> {
    if (!openai) {
      return 'neutral';
    }

    try {
      const userMessages = transcript
        .filter((t: any) => t.role === 'user')
        .map((t: any) => t.content)
        .join(' ');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment. Reply with only: positive, neutral, or negative.',
          },
          {
            role: 'user',
            content: userMessages,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      return completion.choices[0]?.message?.content?.toLowerCase() || 'neutral';
    } catch (error) {
      return 'neutral';
    }
  }

  /**
   * Generate summary from transcript
   */
  async generateSummary(transcript: any[]): Promise<string> {
    if (!openai) {
      return '';
    }

    try {
      const text = transcript
        .map((t: any) => `${t.role}: ${t.content}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize this phone call in 2-3 sentences. Focus on key points and outcomes.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      return '';
    }
  }
}

export const callSpeechService = new CallSpeechService();
export default callSpeechService;
