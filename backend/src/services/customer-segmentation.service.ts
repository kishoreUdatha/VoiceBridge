/**
 * Customer Segmentation Service
 * Dynamic segments, RFM analysis, and behavioral cohorts
 */

import { PrismaClient, SegmentType } from '@prisma/client';

const prisma = new PrismaClient();

// RFM Segment Labels based on RFM scores
const RFM_SEGMENTS: Record<string, string> = {
  '555': 'Champions',
  '554': 'Champions',
  '545': 'Champions',
  '544': 'Loyal Customers',
  '535': 'Loyal Customers',
  '534': 'Loyal Customers',
  '445': 'Loyal Customers',
  '444': 'Loyal Customers',
  '455': 'Loyal Customers',
  '355': 'Potential Loyalist',
  '354': 'Potential Loyalist',
  '345': 'Potential Loyalist',
  '344': 'Potential Loyalist',
  '335': 'Potential Loyalist',
  '255': 'New Customers',
  '254': 'New Customers',
  '245': 'New Customers',
  '244': 'New Customers',
  '155': 'New Customers',
  '154': 'New Customers',
  '145': 'Promising',
  '144': 'Promising',
  '135': 'Promising',
  '134': 'Promising',
  '553': 'Need Attention',
  '552': 'Need Attention',
  '543': 'Need Attention',
  '542': 'Need Attention',
  '533': 'Need Attention',
  '532': 'Need Attention',
  '443': 'About To Sleep',
  '442': 'About To Sleep',
  '433': 'About To Sleep',
  '432': 'About To Sleep',
  '333': 'About To Sleep',
  '332': 'About To Sleep',
  '551': 'At Risk',
  '541': 'At Risk',
  '531': 'At Risk',
  '451': 'At Risk',
  '441': 'At Risk',
  '431': 'At Risk',
  '351': 'At Risk',
  '341': 'At Risk',
  '331': 'At Risk',
  '251': 'Hibernating',
  '241': 'Hibernating',
  '231': 'Hibernating',
  '151': 'Hibernating',
  '141': 'Hibernating',
  '131': 'Hibernating',
  '111': 'Lost',
  '112': 'Lost',
  '121': 'Lost',
  '122': 'Lost',
  '211': 'Lost',
  '212': 'Lost',
  '221': 'Lost',
  '222': 'Lost',
};

class CustomerSegmentationService {
  /**
   * Calculate RFM scores for a lead
   */
  async calculateRFMScore(leadId: string, organizationId: string): Promise<{
    recencyScore: number;
    frequencyScore: number;
    monetaryScore: number;
    rfmScore: string;
    rfmSegment: string;
  }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) throw new Error('Lead not found');

    // Get all payments for this lead
    const payments = await prisma.payment.findMany({
      where: { leadId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate Recency (days since last purchase)
    const lastPurchaseDate = payments[0]?.createdAt;
    const daysSinceLastPurchase = lastPurchaseDate
      ? Math.floor((Date.now() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Recency Score (1-5)
    let recencyScore = 1;
    if (daysSinceLastPurchase <= 30) recencyScore = 5;
    else if (daysSinceLastPurchase <= 60) recencyScore = 4;
    else if (daysSinceLastPurchase <= 90) recencyScore = 3;
    else if (daysSinceLastPurchase <= 180) recencyScore = 2;

    // Calculate Frequency (number of purchases)
    const totalPurchases = payments.length;

    // Frequency Score (1-5)
    let frequencyScore = 1;
    if (totalPurchases >= 10) frequencyScore = 5;
    else if (totalPurchases >= 5) frequencyScore = 4;
    else if (totalPurchases >= 3) frequencyScore = 3;
    else if (totalPurchases >= 2) frequencyScore = 2;

    // Calculate Monetary (total spent)
    const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Monetary Score (1-5)
    let monetaryScore = 1;
    if (totalSpent >= 100000) monetaryScore = 5;
    else if (totalSpent >= 50000) monetaryScore = 4;
    else if (totalSpent >= 20000) monetaryScore = 3;
    else if (totalSpent >= 5000) monetaryScore = 2;

    const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;
    const rfmSegment = RFM_SEGMENTS[rfmScore] || 'Other';

    // Store RFM analysis
    await prisma.rFMAnalysis.upsert({
      where: { leadId },
      update: {
        recencyScore,
        frequencyScore,
        monetaryScore,
        rfmScore,
        rfmSegment,
        lastPurchaseDate,
        totalPurchases,
        totalSpent,
        avgOrderValue: totalPurchases > 0 ? totalSpent / totalPurchases : 0,
        calculatedAt: new Date(),
      },
      create: {
        organizationId,
        leadId,
        recencyScore,
        frequencyScore,
        monetaryScore,
        rfmScore,
        rfmSegment,
        lastPurchaseDate,
        totalPurchases,
        totalSpent,
        avgOrderValue: totalPurchases > 0 ? totalSpent / totalPurchases : 0,
      },
    });

    return { recencyScore, frequencyScore, monetaryScore, rfmScore, rfmSegment };
  }

  /**
   * Create a customer segment
   */
  async createSegment(data: {
    organizationId: string;
    name: string;
    description?: string;
    type: SegmentType;
    rules: any[];
    rfmCriteria?: any;
    isDynamic?: boolean;
    color?: string;
  }) {
    return prisma.customerSegment.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        type: data.type,
        rules: data.rules,
        rfmCriteria: data.rfmCriteria,
        isDynamic: data.isDynamic ?? true,
        color: data.color,
      },
    });
  }

  /**
   * Get all segments
   */
  async getSegments(organizationId: string) {
    return prisma.customerSegment.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update segment membership based on rules
   */
  async refreshSegmentMembership(segmentId: string, organizationId: string) {
    const segment = await prisma.customerSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) throw new Error('Segment not found');

    // Get all leads
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      include: { rfmAnalysis: true },
    });

    let addedCount = 0;
    let removedCount = 0;

    for (const lead of leads) {
      const matches = this.evaluateSegmentRules(lead, segment.rules as any[], segment.type, segment.rfmCriteria as any);

      const existingMembership = await prisma.segmentMembership.findUnique({
        where: { segmentId_leadId: { segmentId, leadId: lead.id } },
      });

      if (matches && !existingMembership) {
        // Add to segment
        await prisma.segmentMembership.create({
          data: {
            segmentId,
            leadId: lead.id,
            rfmScore: lead.rfmAnalysis?.rfmScore,
          },
        });
        addedCount++;
      } else if (!matches && existingMembership?.isActive) {
        // Remove from segment
        await prisma.segmentMembership.update({
          where: { id: existingMembership.id },
          data: { isActive: false, removedAt: new Date() },
        });
        removedCount++;
      }
    }

    // Update member count
    const memberCount = await prisma.segmentMembership.count({
      where: { segmentId, isActive: true },
    });

    await prisma.customerSegment.update({
      where: { id: segmentId },
      data: { memberCount, lastCalculatedAt: new Date() },
    });

    return { addedCount, removedCount, totalMembers: memberCount };
  }

  /**
   * Evaluate if a lead matches segment rules
   */
  private evaluateSegmentRules(lead: any, rules: any[], type: SegmentType, rfmCriteria?: any): boolean {
    if (type === 'RFM' && rfmCriteria && lead.rfmAnalysis) {
      // RFM-based segment
      const rfm = lead.rfmAnalysis;
      if (rfmCriteria.segments && rfmCriteria.segments.length > 0) {
        return rfmCriteria.segments.includes(rfm.rfmSegment);
      }
      if (rfmCriteria.minRecency && rfm.recencyScore < rfmCriteria.minRecency) return false;
      if (rfmCriteria.minFrequency && rfm.frequencyScore < rfmCriteria.minFrequency) return false;
      if (rfmCriteria.minMonetary && rfm.monetaryScore < rfmCriteria.minMonetary) return false;
      return true;
    }

    // Rule-based segment
    for (const rule of rules) {
      const value = lead[rule.field];

      switch (rule.operator) {
        case 'equals':
          if (value !== rule.value) return false;
          break;
        case 'not_equals':
          if (value === rule.value) return false;
          break;
        case 'contains':
          if (!String(value).toLowerCase().includes(String(rule.value).toLowerCase())) return false;
          break;
        case 'greater_than':
          if (Number(value) <= Number(rule.value)) return false;
          break;
        case 'less_than':
          if (Number(value) >= Number(rule.value)) return false;
          break;
        case 'in':
          if (!rule.value.includes(value)) return false;
          break;
        case 'is_empty':
          if (value !== null && value !== undefined && value !== '') return false;
          break;
        case 'is_not_empty':
          if (value === null || value === undefined || value === '') return false;
          break;
      }
    }

    return true;
  }

  /**
   * Get segment members
   */
  async getSegmentMembers(segmentId: string, options: {
    limit?: number;
    offset?: number;
  } = {}) {
    const { limit = 50, offset = 0 } = options;

    const [members, total] = await Promise.all([
      prisma.segmentMembership.findMany({
        where: { segmentId, isActive: true },
        take: limit,
        skip: offset,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              source: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.segmentMembership.count({ where: { segmentId, isActive: true } }),
    ]);

    return { members, total };
  }

  /**
   * Get RFM dashboard data
   */
  async getRFMDashboard(organizationId: string) {
    const [
      segmentDistribution,
      rfmStats,
      topChampions,
      atRiskCustomers,
    ] = await Promise.all([
      // RFM segment distribution
      prisma.rFMAnalysis.groupBy({
        by: ['rfmSegment'],
        where: { organizationId },
        _count: true,
        _sum: { totalSpent: true },
      }),
      // Overall RFM stats
      prisma.rFMAnalysis.aggregate({
        where: { organizationId },
        _avg: { recencyScore: true, frequencyScore: true, monetaryScore: true, totalSpent: true },
        _sum: { totalSpent: true },
        _count: true,
      }),
      // Top champions
      prisma.rFMAnalysis.findMany({
        where: { organizationId, rfmSegment: 'Champions' },
        orderBy: { totalSpent: 'desc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
      }),
      // At risk customers
      prisma.rFMAnalysis.findMany({
        where: { organizationId, rfmSegment: 'At Risk' },
        orderBy: { totalSpent: 'desc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
      }),
    ]);

    return {
      segmentDistribution,
      rfmStats,
      topChampions,
      atRiskCustomers,
    };
  }

  /**
   * Batch calculate RFM for organization
   */
  async batchCalculateRFM(organizationId: string, limit: number = 100) {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        OR: [
          { rfmAnalysis: null },
          { rfmAnalysis: { calculatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        ],
      },
      take: limit,
    });

    const results = [];
    for (const lead of leads) {
      try {
        const rfm = await this.calculateRFMScore(lead.id, organizationId);
        results.push({ leadId: lead.id, success: true, ...rfm });
      } catch (error) {
        results.push({ leadId: lead.id, success: false, error: (error as Error).message });
      }
    }

    return { processed: results.length, results };
  }

  /**
   * Delete segment
   */
  async deleteSegment(segmentId: string, organizationId: string) {
    // First remove all memberships
    await prisma.segmentMembership.deleteMany({
      where: { segmentId },
    });

    // Then delete segment
    await prisma.customerSegment.delete({
      where: { id: segmentId },
    });

    return { success: true };
  }

  /**
   * Update segment
   */
  async updateSegment(segmentId: string, data: {
    name?: string;
    description?: string;
    rules?: any[];
    rfmCriteria?: any;
    isActive?: boolean;
    color?: string;
  }) {
    return prisma.customerSegment.update({
      where: { id: segmentId },
      data,
    });
  }
}

export const customerSegmentationService = new CustomerSegmentationService();
