/**
 * AI Lead Scoring 2.0 Service
 * ML-based lead scoring with predictions and recommendations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Feature weights for ML-like scoring (simplified model)
const FEATURE_WEIGHTS = {
  // Engagement signals
  emailOpened: 5,
  emailClicked: 10,
  websiteVisits: 3,
  pageViewsPerVisit: 2,
  formSubmissions: 15,
  chatInitiated: 8,

  // Response behavior
  respondedToCall: 20,
  respondedToEmail: 10,
  respondedToWhatsApp: 12,

  // Demographics
  companySize: {
    enterprise: 15,
    midMarket: 12,
    smallBusiness: 8,
    individual: 5,
  },

  // Source quality
  sourceQuality: {
    referral: 20,
    website: 15,
    indiamart: 12,
    justdial: 10,
    facebook: 8,
    cold: 3,
  },

  // Timing factors
  recentActivity: 10, // Activity in last 7 days
  responseSpeed: 8, // How fast they respond

  // Negative signals
  unsubscribed: -30,
  bounced: -20,
  markedSpam: -50,
  noResponse3Attempts: -15,
};

// Best time to call based on industry patterns
const INDUSTRY_CALL_TIMES = {
  education: { bestHours: [10, 11, 15, 16], bestDays: [1, 2, 3, 4] }, // Mon-Thu
  realEstate: { bestHours: [11, 12, 17, 18], bestDays: [0, 5, 6] }, // Fri-Sun
  healthcare: { bestHours: [9, 10, 14, 15], bestDays: [1, 2, 3] },
  finance: { bestHours: [10, 11, 14, 15], bestDays: [1, 2, 3, 4] },
  ecommerce: { bestHours: [12, 13, 19, 20], bestDays: [0, 5, 6] },
  default: { bestHours: [10, 11, 15, 16], bestDays: [1, 2, 3, 4, 5] },
};

// Next best actions based on lead state
const ACTION_RULES = {
  new: [
    { action: 'CALL', priority: 1, reason: 'First contact - establish relationship' },
    { action: 'EMAIL', priority: 2, reason: 'Send introduction email' },
    { action: 'WHATSAPP', priority: 3, reason: 'Quick WhatsApp message' },
  ],
  contacted: [
    { action: 'FOLLOW_UP_CALL', priority: 1, reason: 'Follow up on previous conversation' },
    { action: 'SEND_BROCHURE', priority: 2, reason: 'Share product information' },
    { action: 'SCHEDULE_DEMO', priority: 3, reason: 'Book a product demo' },
  ],
  qualified: [
    { action: 'SCHEDULE_DEMO', priority: 1, reason: 'Lead is ready for demo' },
    { action: 'SEND_PROPOSAL', priority: 2, reason: 'Create and send proposal' },
    { action: 'CONNECT_MANAGER', priority: 3, reason: 'Involve sales manager' },
  ],
  proposal: [
    { action: 'FOLLOW_UP_PROPOSAL', priority: 1, reason: 'Discuss proposal details' },
    { action: 'NEGOTIATE', priority: 2, reason: 'Address pricing concerns' },
    { action: 'OFFER_DISCOUNT', priority: 3, reason: 'Provide special offer' },
  ],
  negotiation: [
    { action: 'CLOSE_DEAL', priority: 1, reason: 'Push for final decision' },
    { action: 'SEND_CONTRACT', priority: 2, reason: 'Send agreement for signature' },
    { action: 'ESCALATE', priority: 3, reason: 'Involve senior management' },
  ],
};

export interface LeadScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  confidence: number;
  factors: ScoreFactor[];
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

export interface ScoreFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface BestTimeToCall {
  recommended: {
    day: string;
    hour: number;
    confidence: number;
  };
  alternatives: {
    day: string;
    hour: number;
    confidence: number;
  }[];
  reasoning: string;
  basedOn: string;
}

export interface NextBestAction {
  action: string;
  priority: number;
  reason: string;
  expectedOutcome: string;
  successProbability: number;
}

class AILeadScoringService {
  /**
   * Calculate ML-based lead score
   */
  async calculateScore(leadId: string): Promise<LeadScore> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        organization: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    let score = 50; // Base score
    const factors: ScoreFactor[] = [];

    // 1. Source quality scoring
    const sourceScore = this.getSourceScore(lead.source || 'unknown');
    score += sourceScore;
    factors.push({
      factor: 'Lead Source',
      impact: sourceScore,
      description: `Source: ${lead.source || 'Unknown'}`,
    });

    // 2. Engagement scoring
    const engagementScore = await this.calculateEngagementScore(lead);
    score += engagementScore.score;
    factors.push(...engagementScore.factors);

    // 3. Response behavior scoring
    const responseScore = this.calculateResponseScore(lead);
    score += responseScore.score;
    factors.push(...responseScore.factors);

    // 4. Recency scoring
    const recencyScore = this.calculateRecencyScore(lead);
    score += recencyScore.score;
    factors.push(...recencyScore.factors);

    // 5. Demographics scoring
    const demographicsScore = this.calculateDemographicsScore(lead);
    score += demographicsScore.score;
    factors.push(...demographicsScore.factors);

    // 6. Negative signals
    const negativeScore = await this.calculateNegativeSignals(lead);
    score += negativeScore.score;
    factors.push(...negativeScore.factors);

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Calculate grade
    const grade = this.getGrade(score);

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(lead);

    // Calculate trend
    const trend = await this.calculateTrend(leadId);

    // Save score to database
    await this.saveScore(leadId, score, grade, confidence, factors);

    return {
      score: Math.round(score),
      grade,
      confidence,
      factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
      trend,
      lastUpdated: new Date(),
    };
  }

  /**
   * Predict best time to call a lead
   */
  async predictBestTimeToCall(leadId: string): Promise<BestTimeToCall> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        callLogs: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        organization: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Analyze historical call patterns for this lead
    const successfulCalls = lead.callLogs.filter(
      (call: any) => call.outcome === 'INTERESTED' || call.outcome === 'CALLBACK_REQUESTED'
    );

    let bestTime: BestTimeToCall;

    if (successfulCalls.length >= 3) {
      // Use lead's actual response pattern
      bestTime = this.analyzeLeadCallPattern(successfulCalls);
    } else {
      // Use industry defaults
      const industry = (lead.organization as any)?.industry || 'default';
      bestTime = this.getIndustryBestTime(industry);
    }

    return bestTime;
  }

  /**
   * Recommend next best action for a lead
   */
  async recommendNextAction(leadId: string): Promise<NextBestAction[]> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const stage = (lead.stage || 'new').toLowerCase();
    const baseActions = ACTION_RULES[stage as keyof typeof ACTION_RULES] || ACTION_RULES.new;

    // Analyze recent activities to avoid repetition
    const recentActivities = lead.activities.slice(0, 5);
    const recentActions = recentActivities.map((a: any) => a.type);

    // Score and filter actions
    const recommendations: NextBestAction[] = baseActions.map((action) => {
      let successProbability = 0.7 - (action.priority - 1) * 0.15;

      // Boost probability if action hasn't been tried recently
      if (!recentActions.includes(action.action)) {
        successProbability += 0.1;
      }

      // Adjust based on lead score
      const leadScore = (lead as any).aiScore || 50;
      if (leadScore > 70) {
        successProbability += 0.1;
      } else if (leadScore < 30) {
        successProbability -= 0.1;
      }

      return {
        action: action.action,
        priority: action.priority,
        reason: action.reason,
        expectedOutcome: this.getExpectedOutcome(action.action, stage),
        successProbability: Math.min(0.95, Math.max(0.1, successProbability)),
      };
    });

    // Add contextual actions based on lead data
    const contextualActions = this.getContextualActions(lead, recentActivities);
    recommendations.push(...contextualActions);

    // Sort by success probability
    return recommendations.sort((a, b) => b.successProbability - a.successProbability).slice(0, 5);
  }

  /**
   * Batch score multiple leads
   */
  async batchScoreLeads(organizationId: string, limit = 100): Promise<{ processed: number; errors: number }> {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        OR: [
          { aiScoreUpdatedAt: null },
          { aiScoreUpdatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Older than 24 hours
        ],
      },
      take: limit,
      select: { id: true },
    });

    let processed = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        await this.calculateScore(lead.id);
        processed++;
      } catch (error) {
        errors++;
        console.error(`Failed to score lead ${lead.id}:`, error);
      }
    }

    return { processed, errors };
  }

  /**
   * Get scoring insights for organization
   */
  async getOrganizationInsights(organizationId: string) {
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      select: {
        id: true,
        aiScore: true,
        aiGrade: true,
        stage: true,
        source: true,
        createdAt: true,
      },
    });

    const totalLeads = leads.length;
    const scoredLeads = leads.filter((l) => l.aiScore !== null);

    // Score distribution
    const distribution = {
      A: scoredLeads.filter((l) => l.aiGrade === 'A').length,
      B: scoredLeads.filter((l) => l.aiGrade === 'B').length,
      C: scoredLeads.filter((l) => l.aiGrade === 'C').length,
      D: scoredLeads.filter((l) => l.aiGrade === 'D').length,
      F: scoredLeads.filter((l) => l.aiGrade === 'F').length,
    };

    // Average score by source
    const sourceScores: Record<string, { total: number; count: number }> = {};
    scoredLeads.forEach((lead) => {
      const source = lead.source || 'Unknown';
      if (!sourceScores[source]) {
        sourceScores[source] = { total: 0, count: 0 };
      }
      sourceScores[source].total += lead.aiScore || 0;
      sourceScores[source].count++;
    });

    const avgBySource = Object.entries(sourceScores).map(([source, data]) => ({
      source,
      avgScore: Math.round(data.total / data.count),
      count: data.count,
    })).sort((a, b) => b.avgScore - a.avgScore);

    // Top leads to prioritize
    const hotLeads = scoredLeads
      .filter((l) => (l.aiScore || 0) >= 70)
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
      .slice(0, 10);

    return {
      totalLeads,
      scoredLeads: scoredLeads.length,
      averageScore: scoredLeads.length > 0
        ? Math.round(scoredLeads.reduce((sum, l) => sum + (l.aiScore || 0), 0) / scoredLeads.length)
        : 0,
      distribution,
      avgBySource,
      hotLeadsCount: hotLeads.length,
      coldLeadsCount: scoredLeads.filter((l) => (l.aiScore || 0) < 30).length,
    };
  }

  // Private helper methods

  private getSourceScore(source: string): number {
    const sourceMap: Record<string, number> = {
      REFERRAL: 20,
      WEBSITE: 15,
      INDIAMART: 12,
      JUSTDIAL: 10,
      '99ACRES': 10,
      MAGICBRICKS: 10,
      HOUSING: 10,
      FACEBOOK: 8,
      INSTAGRAM: 8,
      LINKEDIN: 12,
      GOOGLE: 10,
      SULEKHA: 8,
      TAWKTO: 10,
      ZAPIER: 12,
      MANUAL: 5,
      COLD: 3,
    };
    return sourceMap[source.toUpperCase()] || 5;
  }

  private async calculateEngagementScore(lead: any): Promise<{ score: number; factors: ScoreFactor[] }> {
    let score = 0;
    const factors: ScoreFactor[] = [];

    const activities = lead.activities || [];

    // Email engagement
    const emailOpens = activities.filter((a: any) => a.type === 'EMAIL_OPENED').length;
    const emailClicks = activities.filter((a: any) => a.type === 'EMAIL_CLICKED').length;

    if (emailOpens > 0) {
      const impact = Math.min(emailOpens * 5, 15);
      score += impact;
      factors.push({
        factor: 'Email Engagement',
        impact,
        description: `Opened ${emailOpens} emails`,
      });
    }

    if (emailClicks > 0) {
      const impact = Math.min(emailClicks * 10, 20);
      score += impact;
      factors.push({
        factor: 'Email Clicks',
        impact,
        description: `Clicked ${emailClicks} email links`,
      });
    }

    // Website visits
    const websiteVisits = activities.filter((a: any) => a.type === 'WEBSITE_VISIT').length;
    if (websiteVisits > 0) {
      const impact = Math.min(websiteVisits * 3, 12);
      score += impact;
      factors.push({
        factor: 'Website Visits',
        impact,
        description: `${websiteVisits} website visits`,
      });
    }

    return { score, factors };
  }

  private calculateResponseScore(lead: any): { score: number; factors: ScoreFactor[] } {
    let score = 0;
    const factors: ScoreFactor[] = [];

    const callLogs = lead.callLogs || [];
    const answeredCalls = callLogs.filter((c: any) => c.status === 'COMPLETED').length;
    const totalCalls = callLogs.length;

    if (totalCalls > 0) {
      const answerRate = answeredCalls / totalCalls;
      if (answerRate >= 0.7) {
        score += 15;
        factors.push({
          factor: 'Call Response Rate',
          impact: 15,
          description: `High response rate (${Math.round(answerRate * 100)}%)`,
        });
      } else if (answerRate >= 0.4) {
        score += 8;
        factors.push({
          factor: 'Call Response Rate',
          impact: 8,
          description: `Moderate response rate (${Math.round(answerRate * 100)}%)`,
        });
      } else if (answerRate > 0) {
        score += 3;
        factors.push({
          factor: 'Call Response Rate',
          impact: 3,
          description: `Low response rate (${Math.round(answerRate * 100)}%)`,
        });
      }
    }

    return { score, factors };
  }

  private calculateRecencyScore(lead: any): { score: number; factors: ScoreFactor[] } {
    let score = 0;
    const factors: ScoreFactor[] = [];

    const activities = lead.activities || [];
    if (activities.length > 0) {
      const lastActivity = new Date(activities[0].createdAt);
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceActivity <= 1) {
        score += 15;
        factors.push({
          factor: 'Recent Activity',
          impact: 15,
          description: 'Active in last 24 hours',
        });
      } else if (daysSinceActivity <= 7) {
        score += 10;
        factors.push({
          factor: 'Recent Activity',
          impact: 10,
          description: 'Active in last week',
        });
      } else if (daysSinceActivity <= 30) {
        score += 5;
        factors.push({
          factor: 'Recent Activity',
          impact: 5,
          description: 'Active in last month',
        });
      } else {
        score -= 10;
        factors.push({
          factor: 'Inactive Lead',
          impact: -10,
          description: `No activity in ${Math.round(daysSinceActivity)} days`,
        });
      }
    }

    return { score, factors };
  }

  private calculateDemographicsScore(lead: any): { score: number; factors: ScoreFactor[] } {
    let score = 0;
    const factors: ScoreFactor[] = [];

    // Budget indicator
    const customFields = lead.customFields || {};
    if (customFields.budget) {
      const budget = parseInt(customFields.budget) || 0;
      if (budget >= 1000000) {
        score += 15;
        factors.push({ factor: 'High Budget', impact: 15, description: 'Budget over 10L' });
      } else if (budget >= 100000) {
        score += 10;
        factors.push({ factor: 'Medium Budget', impact: 10, description: 'Budget 1L-10L' });
      }
    }

    // Company size
    if (customFields.companySize) {
      const sizeScore = FEATURE_WEIGHTS.companySize[customFields.companySize as keyof typeof FEATURE_WEIGHTS.companySize] || 5;
      score += sizeScore;
      factors.push({
        factor: 'Company Size',
        impact: sizeScore,
        description: `${customFields.companySize} company`,
      });
    }

    // Decision maker
    if (customFields.isDecisionMaker === true || customFields.designation?.toLowerCase().includes('ceo') ||
        customFields.designation?.toLowerCase().includes('director') || customFields.designation?.toLowerCase().includes('owner')) {
      score += 10;
      factors.push({
        factor: 'Decision Maker',
        impact: 10,
        description: 'Lead is a decision maker',
      });
    }

    return { score, factors };
  }

  private async calculateNegativeSignals(lead: any): Promise<{ score: number; factors: ScoreFactor[] }> {
    let score = 0;
    const factors: ScoreFactor[] = [];

    // Check for DNC
    if (lead.isDoNotCall) {
      score -= 50;
      factors.push({
        factor: 'Do Not Call',
        impact: -50,
        description: 'Lead marked as Do Not Call',
      });
    }

    // Check for bounced emails
    const activities = lead.activities || [];
    const bounced = activities.filter((a: any) => a.type === 'EMAIL_BOUNCED').length;
    if (bounced > 0) {
      score -= 20;
      factors.push({
        factor: 'Bounced Email',
        impact: -20,
        description: 'Email address bounced',
      });
    }

    // Check for unsubscribed
    const unsubscribed = activities.filter((a: any) => a.type === 'UNSUBSCRIBED').length;
    if (unsubscribed > 0) {
      score -= 30;
      factors.push({
        factor: 'Unsubscribed',
        impact: -30,
        description: 'Lead unsubscribed from communications',
      });
    }

    // Multiple failed call attempts
    const callLogs = lead.callLogs || [];
    const failedCalls = callLogs.filter((c: any) => c.status === 'NO_ANSWER' || c.status === 'BUSY').length;
    if (failedCalls >= 3) {
      score -= 15;
      factors.push({
        factor: 'Unreachable',
        impact: -15,
        description: `${failedCalls} failed call attempts`,
      });
    }

    return { score, factors };
  }

  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  private calculateConfidence(lead: any): number {
    let dataPoints = 0;

    if (lead.email) dataPoints += 10;
    if (lead.phone) dataPoints += 10;
    if (lead.activities?.length > 0) dataPoints += 20;
    if (lead.activities?.length > 5) dataPoints += 10;
    if (lead.callLogs?.length > 0) dataPoints += 20;
    if (lead.callLogs?.length > 3) dataPoints += 10;
    if (lead.customFields && Object.keys(lead.customFields).length > 0) dataPoints += 10;
    if (lead.source) dataPoints += 10;

    return Math.min(100, dataPoints);
  }

  private async calculateTrend(leadId: string): Promise<'up' | 'down' | 'stable'> {
    // Get historical scores (simplified - in real implementation, store score history)
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { aiScore: true, aiScoreUpdatedAt: true },
    });

    // For now, return stable (would need score history table for real trend)
    return 'stable';
  }

  private async saveScore(
    leadId: string,
    score: number,
    grade: string,
    confidence: number,
    factors: ScoreFactor[]
  ): Promise<void> {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        aiScore: score,
        aiGrade: grade,
        aiConfidence: confidence,
        aiScoreFactors: factors as any,
        aiScoreUpdatedAt: new Date(),
      },
    });
  }

  private analyzeLeadCallPattern(calls: any[]): BestTimeToCall {
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};

    calls.forEach((call) => {
      const date = new Date(call.createdAt);
      const hour = date.getHours();
      const day = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      recommended: {
        day: dayNames[parseInt(bestDay[0])],
        hour: parseInt(bestHour[0]),
        confidence: 0.85,
      },
      alternatives: [
        {
          day: dayNames[(parseInt(bestDay[0]) + 1) % 7],
          hour: (parseInt(bestHour[0]) + 1) % 24,
          confidence: 0.65,
        },
      ],
      reasoning: 'Based on lead\'s historical response pattern',
      basedOn: `${calls.length} successful calls analyzed`,
    };
  }

  private getIndustryBestTime(industry: string): BestTimeToCall {
    const times = INDUSTRY_CALL_TIMES[industry as keyof typeof INDUSTRY_CALL_TIMES] || INDUSTRY_CALL_TIMES.default;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      recommended: {
        day: dayNames[times.bestDays[0]],
        hour: times.bestHours[0],
        confidence: 0.7,
      },
      alternatives: times.bestHours.slice(1).map((hour, i) => ({
        day: dayNames[times.bestDays[Math.min(i + 1, times.bestDays.length - 1)]],
        hour,
        confidence: 0.5 - i * 0.1,
      })),
      reasoning: `Industry best practice for ${industry}`,
      basedOn: 'Industry benchmark data',
    };
  }

  private getExpectedOutcome(action: string, stage: string): string {
    const outcomes: Record<string, string> = {
      CALL: 'Establish first contact and qualify interest',
      FOLLOW_UP_CALL: 'Move lead to next stage',
      EMAIL: 'Provide information and gauge interest',
      WHATSAPP: 'Quick engagement and response',
      SEND_BROCHURE: 'Educate lead about offerings',
      SCHEDULE_DEMO: 'Product demonstration scheduled',
      SEND_PROPOSAL: 'Formal proposal delivered',
      FOLLOW_UP_PROPOSAL: 'Address concerns and negotiate',
      NEGOTIATE: 'Reach agreement on terms',
      OFFER_DISCOUNT: 'Close with special pricing',
      CLOSE_DEAL: 'Convert to customer',
      SEND_CONTRACT: 'Formalize agreement',
      CONNECT_MANAGER: 'Senior involvement for complex deals',
      ESCALATE: 'Management attention for high-value leads',
    };
    return outcomes[action] || 'Move lead forward in pipeline';
  }

  private getContextualActions(lead: any, recentActivities: any[]): NextBestAction[] {
    const actions: NextBestAction[] = [];

    // If lead has email but no recent email sent
    if (lead.email && !recentActivities.some((a) => a.type === 'EMAIL_SENT')) {
      actions.push({
        action: 'SEND_PERSONALIZED_EMAIL',
        priority: 2,
        reason: 'Lead has email, no recent email communication',
        expectedOutcome: 'Re-engage lead via email',
        successProbability: 0.55,
      });
    }

    // If lead viewed pricing page
    if (recentActivities.some((a) => a.metadata?.page?.includes('pricing'))) {
      actions.push({
        action: 'DISCUSS_PRICING',
        priority: 1,
        reason: 'Lead showed interest in pricing',
        expectedOutcome: 'Address pricing questions and close',
        successProbability: 0.75,
      });
    }

    return actions;
  }
}

export const aiLeadScoringService = new AILeadScoringService();
