/**
 * Lead Scoring Service - Single Responsibility Principle
 * Handles lead scoring, grading, prioritization, and rule-based scoring
 */

import { CallOutcome, LeadGrade, Lead, LeadScoringRule, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import OpenAI from 'openai';

// Rule condition interface for rule-based scoring
interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

interface ScoreBreakdown {
  demographic: number;
  behavioral: number;
  engagement: number;
  intent: number;
  total: number;
  rulesApplied: {
    ruleId: string;
    ruleName: string;
    scoreType: string;
    scoreChange: number;
  }[];
}

interface RuleBasedScoringResult {
  leadId: string;
  previousScore: number;
  newScore: number;
  breakdown: ScoreBreakdown;
}

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

// ==================== Rule-Based Scoring ====================

/**
 * Calculate lead score based on organization's scoring rules
 */
export async function calculateRuleBasedScore(
  leadId: string,
  organizationId: string
): Promise<RuleBasedScoringResult> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      assignments: true,
      followUps: true,
      leadActivities: true,
      leadNotes: true,
      telecallerCalls: true,
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const previousScore = lead.totalScore || 0;

  // Get all active scoring rules
  const rules = await prisma.leadScoringRule.findMany({
    where: {
      organizationId,
      isActive: true,
    },
  });

  const breakdown: ScoreBreakdown = {
    demographic: 0,
    behavioral: 0,
    engagement: 0,
    intent: 0,
    total: 0,
    rulesApplied: [],
  };

  // Evaluate each rule
  for (const rule of rules) {
    const matches = evaluateRuleConditions(lead, rule);

    if (matches) {
      const scoreChange = calculateRuleScoreChange(rule);

      // Apply decay if enabled
      const finalScore = rule.decayEnabled
        ? applyScoreDecayToValue(scoreChange, lead.updatedAt, rule.decayDays!, rule.decayPercent!)
        : scoreChange;

      // Categorize score
      switch (rule.scoreType) {
        case 'DEMOGRAPHIC':
          breakdown.demographic += finalScore;
          break;
        case 'BEHAVIORAL':
          breakdown.behavioral += finalScore;
          break;
        case 'ENGAGEMENT':
          breakdown.engagement += finalScore;
          break;
        case 'INTENT':
          breakdown.intent += finalScore;
          break;
      }

      breakdown.rulesApplied.push({
        ruleId: rule.id,
        ruleName: rule.name,
        scoreType: rule.scoreType,
        scoreChange: finalScore,
      });
    }
  }

  // Add engagement from activities
  breakdown.engagement += calculateActivityEngagement(lead);

  // Calculate total score (capped at 0-100)
  breakdown.total = Math.max(
    0,
    Math.min(100, breakdown.demographic + breakdown.behavioral + breakdown.engagement + breakdown.intent)
  );

  // Update lead with new scores
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      qualificationScore: Math.max(0, Math.min(100, breakdown.demographic)),
      engagementScore: Math.max(0, Math.min(100, breakdown.engagement)),
      intentScore: Math.max(0, Math.min(100, breakdown.intent)),
      totalScore: breakdown.total,
      lastScoredAt: new Date(),
    },
  });

  return {
    leadId,
    previousScore,
    newScore: breakdown.total,
    breakdown,
  };
}

function evaluateRuleConditions(lead: Lead, rule: LeadScoringRule): boolean {
  const conditions = rule.conditions as RuleCondition[];

  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => evaluateSingleCondition(lead, condition));
}

function evaluateSingleCondition(lead: Lead, condition: RuleCondition): boolean {
  const leadValue = getNestedFieldValue(lead, condition.field);
  const conditionValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(leadValue).toLowerCase() === String(conditionValue).toLowerCase();
    case 'not_equals':
      return String(leadValue).toLowerCase() !== String(conditionValue).toLowerCase();
    case 'contains':
      return String(leadValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case 'starts_with':
      return String(leadValue).toLowerCase().startsWith(String(conditionValue).toLowerCase());
    case 'ends_with':
      return String(leadValue).toLowerCase().endsWith(String(conditionValue).toLowerCase());
    case 'in':
      const inValues = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
      return inValues.some((v: any) => String(v).toLowerCase() === String(leadValue).toLowerCase());
    case 'not_in':
      const notInValues = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
      return !notInValues.some((v: any) => String(v).toLowerCase() === String(leadValue).toLowerCase());
    case 'greater_than':
      return Number(leadValue) > Number(conditionValue);
    case 'less_than':
      return Number(leadValue) < Number(conditionValue);
    case 'is_empty':
      return !leadValue || leadValue === '';
    case 'is_not_empty':
      return !!leadValue && leadValue !== '';
    default:
      return false;
  }
}

function getNestedFieldValue(obj: any, field: string): any {
  const parts = field.split('.');
  let value = obj;

  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return null;
    }
  }

  return value;
}

function calculateRuleScoreChange(rule: LeadScoringRule): number {
  switch (rule.scoreAction) {
    case 'ADD':
      return rule.scoreValue;
    case 'SUBTRACT':
      return -rule.scoreValue;
    case 'SET':
      return rule.scoreValue;
    default:
      return rule.scoreValue;
  }
}

function applyScoreDecayToValue(
  score: number,
  lastUpdated: Date,
  decayDays: number,
  decayPercent: number
): number {
  const daysSinceUpdate = Math.floor(
    (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpdate <= decayDays) {
    return score;
  }

  const decayPeriods = Math.floor((daysSinceUpdate - decayDays) / decayDays);
  const decayMultiplier = Math.pow(1 - decayPercent / 100, decayPeriods);

  return Math.round(score * decayMultiplier);
}

function calculateActivityEngagement(lead: any): number {
  let score = 0;

  score += (lead.emailOpens || 0) * 2;
  score += (lead.emailClicks || 0) * 5;
  score += Math.min(lead.totalPageViews || 0, 20) * 1;
  score += (lead.telecallerCalls?.length || 0) * 3;
  score += Math.min(lead.leadNotes?.length || 0, 10) * 1;
  score += Math.min(lead.leadActivities?.length || 0, 20) * 0.5;

  const completedFollowUps = lead.followUps?.filter((f: any) => f.isCompleted)?.length || 0;
  score += completedFollowUps * 2;

  return Math.min(score, 40);
}

/**
 * Batch calculate rule-based scores for all leads
 */
export async function batchCalculateRuleBasedScores(organizationId: string): Promise<{
  leadsProcessed: number;
  averageScore: number;
}> {
  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      isDuplicate: false,
      mergedIntoId: null,
    },
    select: { id: true },
  });

  let totalScore = 0;

  for (const lead of leads) {
    const result = await calculateRuleBasedScore(lead.id, organizationId);
    totalScore += result.newScore;
  }

  return {
    leadsProcessed: leads.length,
    averageScore: leads.length > 0 ? Math.round(totalScore / leads.length) : 0,
  };
}

/**
 * Get hot leads (high score, recent activity)
 */
export async function getHotLeads(organizationId: string, limit = 20): Promise<Lead[]> {
  return prisma.lead.findMany({
    where: {
      organizationId,
      totalScore: { gte: 70 },
      isDuplicate: false,
      status: { notIn: ['WON', 'LOST'] },
    },
    orderBy: [{ totalScore: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  });
}

/**
 * Get score distribution for analytics
 */
export async function getScoreDistribution(organizationId: string): Promise<{
  excellent: number;
  good: number;
  average: number;
  poor: number;
  cold: number;
}> {
  const [excellent, good, average, poor, cold] = await Promise.all([
    prisma.lead.count({ where: { organizationId, totalScore: { gte: 80 }, isDuplicate: false } }),
    prisma.lead.count({ where: { organizationId, totalScore: { gte: 60, lt: 80 }, isDuplicate: false } }),
    prisma.lead.count({ where: { organizationId, totalScore: { gte: 40, lt: 60 }, isDuplicate: false } }),
    prisma.lead.count({ where: { organizationId, totalScore: { gte: 20, lt: 40 }, isDuplicate: false } }),
    prisma.lead.count({ where: { organizationId, totalScore: { lt: 20 }, isDuplicate: false } }),
  ]);

  return { excellent, good, average, poor, cold };
}

// ==================== Scoring Rules CRUD ====================

export async function createScoringRule(
  organizationId: string,
  data: {
    name: string;
    description?: string;
    scoreType: string;
    conditions: RuleCondition[];
    scoreValue: number;
    scoreAction?: string;
    decayEnabled?: boolean;
    decayDays?: number;
    decayPercent?: number;
  }
): Promise<LeadScoringRule> {
  return prisma.leadScoringRule.create({
    data: {
      organizationId,
      name: data.name,
      description: data.description,
      scoreType: data.scoreType,
      conditions: data.conditions as any,
      scoreValue: data.scoreValue,
      scoreAction: data.scoreAction || 'ADD',
      decayEnabled: data.decayEnabled || false,
      decayDays: data.decayDays,
      decayPercent: data.decayPercent,
    },
  });
}

export async function updateScoringRule(
  ruleId: string,
  organizationId: string,
  data: Partial<{
    name: string;
    description: string;
    scoreType: string;
    conditions: RuleCondition[];
    scoreValue: number;
    scoreAction: string;
    decayEnabled: boolean;
    decayDays: number;
    decayPercent: number;
    isActive: boolean;
  }>
): Promise<LeadScoringRule> {
  return prisma.leadScoringRule.update({
    where: { id: ruleId, organizationId },
    data: {
      ...data,
      conditions: data.conditions as any,
    },
  });
}

export async function deleteScoringRule(ruleId: string, organizationId: string): Promise<void> {
  await prisma.leadScoringRule.delete({
    where: { id: ruleId, organizationId },
  });
}

export async function getScoringRules(organizationId: string): Promise<LeadScoringRule[]> {
  return prisma.leadScoringRule.findMany({
    where: { organizationId },
    orderBy: { scoreType: 'asc' },
  });
}

export async function getScoringRule(ruleId: string, organizationId: string): Promise<LeadScoringRule | null> {
  return prisma.leadScoringRule.findFirst({
    where: { id: ruleId, organizationId },
  });
}

export async function createDefaultScoringRules(organizationId: string): Promise<LeadScoringRule[]> {
  const defaultRules = [
    {
      name: 'Has Email',
      description: 'Lead has provided email address',
      scoreType: 'DEMOGRAPHIC',
      conditions: [{ field: 'email', operator: 'is_not_empty', value: null }],
      scoreValue: 10,
      scoreAction: 'ADD',
    },
    {
      name: 'Has Phone',
      description: 'Lead has provided phone number',
      scoreType: 'DEMOGRAPHIC',
      conditions: [{ field: 'phone', operator: 'is_not_empty', value: null }],
      scoreValue: 15,
      scoreAction: 'ADD',
    },
    {
      name: 'High Value Lead',
      description: 'Lead marked as high priority',
      scoreType: 'INTENT',
      conditions: [{ field: 'priority', operator: 'equals', value: 'HIGH' }],
      scoreValue: 25,
      scoreAction: 'ADD',
    },
    {
      name: 'Multiple Page Views',
      description: 'Lead has viewed multiple pages',
      scoreType: 'BEHAVIORAL',
      conditions: [{ field: 'totalPageViews', operator: 'greater_than', value: 3 }],
      scoreValue: 15,
      scoreAction: 'ADD',
      decayEnabled: true,
      decayDays: 14,
      decayPercent: 15,
    },
  ];

  const createdRules: LeadScoringRule[] = [];

  for (const rule of defaultRules) {
    const created = await prisma.leadScoringRule.create({
      data: {
        organizationId,
        ...rule,
        conditions: rule.conditions as any,
      },
    });
    createdRules.push(created);
  }

  return createdRules;
}

export const leadScoringService = {
  calculateScore,
  getLeadScore,
  getTopLeads,
  analyzeConversation,
  // Rule-based scoring
  calculateRuleBasedScore,
  batchCalculateRuleBasedScores,
  getHotLeads,
  getScoreDistribution,
  // Scoring rules CRUD
  createScoringRule,
  updateScoringRule,
  deleteScoringRule,
  getScoringRules,
  getScoringRule,
  createDefaultScoringRules,
};

export default leadScoringService;
