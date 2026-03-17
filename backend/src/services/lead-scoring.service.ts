/**
 * Lead Scoring Service - Single Responsibility Principle
 * Handles lead scoring, grading, and prioritization
 */

import { PrismaClient, CallOutcome, LeadGrade } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface CallScoreData {
  transcript: any[];
  duration: number;
  sentiment: string;
  qualification: any;
  outcome: CallOutcome;
}

export interface LeadScoreResult {
  overallScore: number;
  grade: LeadGrade;
  buyingSignals: string[];
  objections: string[];
}

/**
 * Calculate lead score from call data
 */
export async function calculateScore(leadId: string, callData: CallScoreData): Promise<LeadScoreResult> {
  // Base scores
  let engagementScore = 0;
  let qualificationScore = 0;
  let sentimentScore = 50;
  let intentScore = 0;

  // Engagement: Based on call duration and responses
  if (callData.duration > 300) engagementScore = 100;
  else if (callData.duration > 180) engagementScore = 80;
  else if (callData.duration > 60) engagementScore = 60;
  else if (callData.duration > 30) engagementScore = 40;
  else engagementScore = 20;

  // Qualification: Based on data collected
  const qualFields = Object.keys(callData.qualification || {}).length;
  qualificationScore = Math.min(qualFields * 15, 100);

  // Sentiment
  if (callData.sentiment === 'positive') sentimentScore = 85;
  else if (callData.sentiment === 'negative') sentimentScore = 25;

  // Intent based on outcome
  const intentMap: Record<string, number> = {
    'CONVERTED': 100,
    'INTERESTED': 85,
    'CALLBACK_REQUESTED': 70,
    'NEEDS_FOLLOWUP': 55,
    'NOT_INTERESTED': 20,
    'DO_NOT_CALL': 0,
  };
  intentScore = intentMap[callData.outcome] || 40;

  // AI Analysis for buying signals and objections
  let buyingSignals: string[] = [];
  let objections: string[] = [];

  if (callData.transcript && callData.transcript.length > 0) {
    const analysis = await analyzeConversation(callData.transcript);
    buyingSignals = analysis.buyingSignals;
    objections = analysis.objections;

    // Boost scores based on buying signals
    intentScore = Math.min(intentScore + buyingSignals.length * 5, 100);
  }

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    engagementScore * 0.2 +
    qualificationScore * 0.25 +
    sentimentScore * 0.25 +
    intentScore * 0.3
  );

  // Determine grade
  let grade: LeadGrade;
  if (overallScore >= 90) grade = 'A_PLUS';
  else if (overallScore >= 75) grade = 'A';
  else if (overallScore >= 60) grade = 'B';
  else if (overallScore >= 40) grade = 'C';
  else if (overallScore >= 25) grade = 'D';
  else grade = 'F';

  // Save or update lead score
  await prisma.leadScore.upsert({
    where: { leadId },
    create: {
      leadId,
      overallScore,
      engagementScore,
      qualificationScore,
      sentimentScore,
      intentScore,
      buyingSignals,
      objections,
      grade,
      priority: calculatePriority(overallScore, callData.outcome),
      callCount: 1,
      avgCallDuration: callData.duration,
      lastInteraction: new Date(),
    },
    update: {
      overallScore,
      engagementScore,
      qualificationScore,
      sentimentScore,
      intentScore,
      buyingSignals,
      objections,
      grade,
      priority: calculatePriority(overallScore, callData.outcome),
      callCount: { increment: 1 },
      avgCallDuration: callData.duration,
      lastInteraction: new Date(),
    },
  });

  return { overallScore, grade, buyingSignals, objections };
}

/**
 * Analyze conversation for buying signals and objections
 */
async function analyzeConversation(transcript: any[]): Promise<{
  buyingSignals: string[];
  objections: string[];
}> {
  if (!openai) {
    return { buyingSignals: [], objections: [] };
  }

  try {
    const text = transcript.map(t => `${t.role}: ${t.content}`).join('\n');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this sales conversation and extract:
1. Buying signals - phrases indicating purchase intent
2. Objections - concerns or hesitations raised

Return JSON: {"buyingSignals": ["signal1"], "objections": ["objection1"]}`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{"buyingSignals":[],"objections":[]}');
  } catch (error) {
    return { buyingSignals: [], objections: [] };
  }
}

/**
 * Calculate priority based on score and outcome
 */
function calculatePriority(score: number, outcome: CallOutcome): number {
  if (outcome === 'CALLBACK_REQUESTED') return 1;
  if (score >= 80) return 2;
  if (score >= 60) return 3;
  if (score >= 40) return 5;
  return 7;
}

/**
 * Get lead score by ID
 */
export async function getLeadScore(leadId: string) {
  return prisma.leadScore.findUnique({ where: { leadId } });
}

/**
 * Get top leads by score and priority
 */
export async function getTopLeads(organizationId: string, limit: number = 20) {
  return prisma.leadScore.findMany({
    where: {
      lead: {
        organizationId,
      },
    },
    orderBy: [{ priority: 'asc' }, { overallScore: 'desc' }],
    take: limit,
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          source: true,
          priority: true,
          stage: { select: { id: true, name: true } },
          assignments: {
            select: {
              assignedTo: { select: { id: true, firstName: true, lastName: true } },
            },
            take: 1,
          },
        },
      },
    },
  });
}

export const leadScoringService = {
  calculateScore,
  getLeadScore,
  getTopLeads,
  analyzeConversation,
};

export default leadScoringService;
