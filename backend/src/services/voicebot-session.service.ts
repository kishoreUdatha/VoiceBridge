/**
 * Voicebot Session Service - Single Responsibility Principle
 * Handles session lifecycle management for voice bot calls
 */

import * as WebSocket from 'ws';
import { PrismaClient, CallOutcome } from '@prisma/client';
import { voiceMinutesService } from './voice-minutes.service';
import { analyzeCall, extractQualificationData } from './voicebot-ai.service';
import { detectCallbackRequest, createScheduledCallback } from './voicebot-callback.service';
import { normalizeLanguageCode } from './voicebot-transcription.service';

// Map AI outcomes to valid CallOutcome enum values
const OUTCOME_MAP: Record<string, CallOutcome> = {
  'INTERESTED': 'INTERESTED',
  'NOT_INTERESTED': 'NOT_INTERESTED',
  'CALLBACK_REQUESTED': 'CALLBACK_REQUESTED',
  'CONVERTED': 'CONVERTED',
  'NEEDS_FOLLOWUP': 'CALLBACK_REQUESTED', // Map to closest match
  'NO_ANSWER': 'NO_ANSWER',
  'VOICEMAIL': 'VOICEMAIL',
};

const prisma = new PrismaClient();

/**
 * Voice Bot Session interface
 */
export interface VoiceBotSession {
  callId: string;
  agentId: string;
  ws: WebSocket.WebSocket;
  audioBuffer: Buffer;
  transcript: Array<{ role: string; content: string; timestamp: string }>;
  qualification: Record<string, any>;
  isProcessing: boolean;
  silenceTimeout: NodeJS.Timeout | null;
  maxWaitTimeout: NodeJS.Timeout | null;
  agent: any;
  streamSid: string | null;
  greetingSent: boolean;
  dbCallId: string | null;
  startedAt: Date;
  language: string;
  userMood: string;
  moodHistory: Array<{ mood: string; timestamp: string }>;
  lastSpeechTime: number;
  speechDetected: boolean;
  mediaLogged?: boolean;
  isSpeaking: boolean;
  interruptTTS: boolean;
  greetingGraceUntil: number;
}

// Active sessions store
const sessions = new Map<string, VoiceBotSession>();

// Session timing constants
export const SILENCE_THRESHOLD = 600; // 600ms of silence to trigger processing
export const MAX_AUDIO_WAIT = 2500; // 2.5 seconds max wait before processing
export const MAX_BUFFER_SIZE = 48000; // Max 3 seconds of audio before forced processing

/**
 * Create a new voice bot session
 */
export function createSession(
  callId: string,
  agentId: string,
  ws: WebSocket.WebSocket,
  agent: any
): VoiceBotSession {
  const session: VoiceBotSession = {
    callId,
    agentId: agent?.id || agentId || '',
    ws,
    audioBuffer: Buffer.alloc(0),
    transcript: [],
    qualification: {},
    isProcessing: false,
    silenceTimeout: null,
    maxWaitTimeout: null,
    agent,
    streamSid: null,
    greetingSent: false,
    dbCallId: null,
    startedAt: new Date(),
    language: normalizeLanguageCode(agent?.language) || 'en-IN',
    userMood: 'neutral',
    moodHistory: [],
    lastSpeechTime: 0,
    speechDetected: false,
    isSpeaking: false,
    interruptTTS: false,
    greetingGraceUntil: 0,
  };

  sessions.set(callId, session);
  console.log(`[SessionService] Created session for call: ${callId}`);
  return session;
}

/**
 * Get session by call ID
 */
export function getSession(callId: string): VoiceBotSession | undefined {
  return sessions.get(callId);
}

/**
 * Delete session
 */
export function deleteSession(callId: string): boolean {
  const deleted = sessions.delete(callId);
  if (deleted) {
    console.log(`[SessionService] Deleted session for call: ${callId}`);
  }
  return deleted;
}

/**
 * Get active sessions count
 */
export function getActiveSessionsCount(): number {
  return sessions.size;
}

/**
 * Get all active sessions
 */
export function getAllSessions(): Map<string, VoiceBotSession> {
  return sessions;
}

/**
 * Clear session timeouts
 */
export function clearSessionTimeouts(session: VoiceBotSession): void {
  if (session.silenceTimeout) {
    clearTimeout(session.silenceTimeout);
    session.silenceTimeout = null;
  }
  if (session.maxWaitTimeout) {
    clearTimeout(session.maxWaitTimeout);
    session.maxWaitTimeout = null;
  }
}

/**
 * Update session mood
 */
export function updateSessionMood(session: VoiceBotSession, newMood: string): void {
  if (newMood !== session.userMood) {
    console.log(`[SessionService] Mood changed: ${session.userMood} → ${newMood}`);
    session.userMood = newMood;
    session.moodHistory.push({
      mood: newMood,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Add to session transcript
 */
export function addToTranscript(
  session: VoiceBotSession,
  role: 'user' | 'assistant',
  content: string
): void {
  session.transcript.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Update session qualification data
 */
export function updateQualification(
  session: VoiceBotSession,
  newData: Record<string, any>
): void {
  session.qualification = { ...session.qualification, ...newData };
}

/**
 * Finalize session - save transcript, create/update lead, record minutes
 */
export async function finalizeSession(session: VoiceBotSession): Promise<void> {
  try {
    const callId = session.dbCallId || session.callId;
    console.log(`[SessionService] Finalizing session for call: ${callId}`);
    console.log(`[SessionService] Transcript turns: ${session.transcript.length}`);
    console.log(`[SessionService] Qualification data:`, session.qualification);

    // Calculate duration
    const duration = Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000);
    console.log(`[SessionService] Call duration: ${duration} seconds`);

    // Find the call record
    let call = null;
    if (session.dbCallId) {
      call = await prisma.outboundCall.findUnique({
        where: { id: session.dbCallId },
        include: { agent: true },
      });
    }

    if (!call) {
      console.log('[SessionService] No call record found, skipping finalization');
      return;
    }

    // Analyze the call
    const analysis = await analyzeCall(session.transcript, session.moodHistory, session.userMood);
    console.log(`[SessionService] Call outcome: ${analysis.outcome}, Lead score: ${analysis.leadScore}`);

    // Detect callback request
    const callbackInfo = await detectCallbackRequest(session.transcript);
    if (callbackInfo.isCallbackRequested && callbackInfo.scheduledAt) {
      console.log(`[SessionService] Callback requested for: ${callbackInfo.scheduledTimeDescription}`);
      await createScheduledCallback(
        call.agent?.organizationId || '',
        session.agentId,
        call.phoneNumber,
        session.qualification.name || session.qualification.firstName || 'Unknown',
        callbackInfo.scheduledAt,
        callbackInfo.scheduledTimeDescription,
        session.transcript.slice(-3).map(t => `${t.role}: ${t.content}`).join(' | ')
      );
      analysis.outcome = 'CALLBACK_REQUESTED';
      analysis.nextAction = `Scheduled callback: ${callbackInfo.scheduledTimeDescription}`;
    }

    // Update call record
    await prisma.outboundCall.update({
      where: { id: session.dbCallId! },
      data: {
        transcript: JSON.stringify(session.transcript),
        qualification: JSON.stringify({
          ...session.qualification,
          keyPoints: analysis.keyPoints,
          leadScore: analysis.leadScore,
          nextAction: analysis.nextAction,
          moodAnalysis: {
            finalMood: session.userMood,
            moodJourney: analysis.moodJourney,
            dominantMood: analysis.dominantMood,
            moodHistory: session.moodHistory,
          },
        }),
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        outcome: OUTCOME_MAP[analysis.outcome] || 'CALLBACK_REQUESTED',
        status: 'COMPLETED',
        endedAt: new Date(),
        duration,
      },
    });
    console.log(`[SessionService] Updated call record - Duration: ${duration}s, Outcome: ${analysis.outcome}`);

    // Record voice minutes usage
    if (duration > 0 && call.agent?.organizationId) {
      const durationMinutes = duration / 60;
      try {
        await voiceMinutesService.recordUsage(
          call.agent.organizationId,
          null,
          durationMinutes
        );
        console.log(`[VoiceMinutes] Recorded ${durationMinutes.toFixed(2)} minutes`);
      } catch (error) {
        console.error('[VoiceMinutes] Failed to record usage:', error);
      }
    }

    // Create or update lead
    await handleLeadCreation(session, call, analysis, duration);

    console.log(`[SessionService] Session finalized successfully`);
  } catch (error) {
    console.error('[SessionService] Error finalizing session:', error);
  }
}

/**
 * Handle lead creation/update based on call analysis
 */
async function handleLeadCreation(
  session: VoiceBotSession,
  call: any,
  analysis: any,
  duration: number
): Promise<void> {
  if (!call.agent) return;

  const shouldCreateLead = Object.keys(session.qualification).length > 0 ||
    analysis.outcome === 'INTERESTED' ||
    analysis.leadScore >= 30;

  if (!shouldCreateLead) return;

  const existingLead = await prisma.lead.findFirst({
    where: {
      phone: call.phoneNumber,
      organizationId: call.agent.organizationId,
    },
  });

  // Determine lead priority based on outcome
  let leadPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
  if (analysis.outcome === 'INTERESTED' || analysis.outcome === 'CONVERTED') leadPriority = 'HIGH';
  else if (analysis.outcome === 'CALLBACK_REQUESTED') leadPriority = 'HIGH';
  else if (analysis.outcome === 'NOT_INTERESTED') leadPriority = 'LOW';

  const leadData = {
    firstName: session.qualification.name?.split(' ')[0] || session.qualification.firstName || 'Prospect',
    lastName: session.qualification.name?.split(' ').slice(1).join(' ') || session.qualification.lastName || '',
    email: session.qualification.email || null,
    customFields: {
      ...session.qualification,
      company: session.qualification.company || null,
      callAnalysis: {
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        outcome: analysis.outcome,
        leadScore: analysis.leadScore,
        keyPoints: analysis.keyPoints,
        nextAction: analysis.nextAction,
        callDuration: duration,
        callDate: new Date().toISOString(),
      },
    },
  };

  if (existingLead) {
    // Update existing lead
    const existingFields = (existingLead.customFields as Record<string, any>) || {};
    const callHistory = existingFields.callHistory || [];
    callHistory.push({
      callId: session.dbCallId,
      date: new Date().toISOString(),
      duration,
      outcome: analysis.outcome,
      summary: analysis.summary,
    });

    await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        ...leadData,
        priority: leadPriority,
        customFields: {
          ...existingFields,
          ...leadData.customFields,
          callHistory,
          totalCalls: callHistory.length,
          lastCallDate: new Date().toISOString(),
        },
      },
    });
    console.log(`[SessionService] Updated lead: ${existingLead.id} (priority: ${leadPriority})`);
  } else {
    // Create new lead
    const newLead = await prisma.lead.create({
      data: {
        organizationId: call.agent.organizationId,
        ...leadData,
        phone: call.phoneNumber,
        source: 'API',
        sourceDetails: `Voice Bot - ${call.agent.name}`,
        priority: leadPriority,
        customFields: {
          ...leadData.customFields,
          callHistory: [{
            callId: session.dbCallId,
            date: new Date().toISOString(),
            duration,
            outcome: analysis.outcome,
            summary: analysis.summary,
          }],
          totalCalls: 1,
          lastCallDate: new Date().toISOString(),
        },
      },
    });

    // Link to call
    await prisma.outboundCall.update({
      where: { id: session.dbCallId! },
      data: { leadId: newLead.id },
    });

    console.log(`[SessionService] Created lead: ${newLead.id} (Score: ${analysis.leadScore}, Priority: ${leadPriority})`);
  }
}

export const voicebotSessionService = {
  createSession,
  getSession,
  deleteSession,
  getActiveSessionsCount,
  getAllSessions,
  clearSessionTimeouts,
  updateSessionMood,
  addToTranscript,
  updateQualification,
  finalizeSession,
  SILENCE_THRESHOLD,
  MAX_AUDIO_WAIT,
  MAX_BUFFER_SIZE,
};

export default voicebotSessionService;
