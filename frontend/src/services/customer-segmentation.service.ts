/**
 * Customer Segmentation Service
 * API client for RFM analysis and dynamic customer segments
 */

import api from './api';

export type SegmentType = 'RFM' | 'BEHAVIORAL' | 'DEMOGRAPHIC' | 'CUSTOM';

export interface CustomerSegment {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: SegmentType;
  rules: Record<string, any>;
  rfmCriteria: Record<string, any> | null;
  memberCount: number;
  isDynamic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentMembership {
  id: string;
  segmentId: string;
  leadId: string;
  addedAt: string;
  removedAt: string | null;
  isActive: boolean;
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export interface RFMAnalysis {
  id: string;
  leadId: string;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: string;
  rfmSegment: string | null;
  lastPurchaseDate: string | null;
  totalTransactions: number;
  totalRevenue: number;
  calculatedAt: string;
}

export interface RFMDashboard {
  totalAnalyzed: number;
  segmentDistribution: Record<string, number>;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
  topSegments: Array<{
    segment: string;
    count: number;
    avgRevenue: number;
  }>;
  atRiskCustomers: Array<{
    leadId: string;
    leadName: string;
    rfmSegment: string;
    lastPurchaseDate: string;
  }>;
}

export const customerSegmentationService = {
  // RFM Dashboard
  async getRFMDashboard(): Promise<RFMDashboard> {
    const response = await api.get('/customer-segmentation/rfm/dashboard');
    return response.data.data;
  },

  // Get all segments
  async getSegments(): Promise<CustomerSegment[]> {
    const response = await api.get('/customer-segmentation/segments');
    return response.data.data;
  },

  // Create segment
  async createSegment(data: {
    name: string;
    description?: string;
    type: SegmentType;
    rules: Record<string, any>;
    rfmCriteria?: Record<string, any>;
    isDynamic?: boolean;
  }): Promise<CustomerSegment> {
    const response = await api.post('/customer-segmentation/segments', data);
    return response.data.data;
  },

  // Update segment
  async updateSegment(id: string, data: Partial<{
    name: string;
    description: string;
    rules: Record<string, any>;
    rfmCriteria: Record<string, any>;
    isDynamic: boolean;
    isActive: boolean;
  }>): Promise<CustomerSegment> {
    const response = await api.put(`/customer-segmentation/segments/${id}`, data);
    return response.data.data;
  },

  // Delete segment
  async deleteSegment(id: string): Promise<void> {
    await api.delete(`/customer-segmentation/segments/${id}`);
  },

  // Get segment members
  async getSegmentMembers(segmentId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ members: SegmentMembership[]; total: number }> {
    const response = await api.get(`/customer-segmentation/segments/${segmentId}/members`, { params });
    return { members: response.data.data, total: response.data.total };
  },

  // Refresh segment membership
  async refreshSegment(segmentId: string): Promise<{ added: number; removed: number }> {
    const response = await api.post(`/customer-segmentation/segments/${segmentId}/refresh`);
    return response.data.data;
  },

  // Calculate RFM for a lead
  async calculateRFM(leadId: string): Promise<RFMAnalysis> {
    const response = await api.post(`/customer-segmentation/rfm/lead/${leadId}`);
    return response.data.data;
  },

  // Batch calculate RFM
  async batchCalculateRFM(limit?: number): Promise<{ processed: number; errors: number }> {
    const response = await api.post('/customer-segmentation/rfm/batch-calculate', { limit });
    return response.data.data;
  },
};

// RFM Segment Descriptions
export const RFM_SEGMENT_DESCRIPTIONS: Record<string, string> = {
  'Champions': 'Best customers who bought recently, buy often and spend the most',
  'Loyal Customers': 'Customers who buy on a regular basis and are responsive to promotions',
  'Potential Loyalists': 'Recent customers with average frequency who could become loyal',
  'Recent Customers': 'Just made their first purchase or returned after a long time',
  'Promising': 'Recent shoppers with average monetary value',
  'Needs Attention': 'Above average recency, frequency, and monetary values, but may be slipping',
  'About to Sleep': 'Below average recency and frequency, need re-engagement',
  'At Risk': 'Spent big money but haven\'t purchased recently',
  'Can\'t Lose Them': 'Made biggest purchases but haven\'t returned for long',
  'Hibernating': 'Last purchase was long ago, low spenders',
  'Lost': 'Lowest recency, frequency, and monetary scores',
};
