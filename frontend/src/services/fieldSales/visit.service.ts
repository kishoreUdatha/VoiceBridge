import api from '../api';

export type VisitPurpose =
  | 'FIRST_INTRODUCTION'
  | 'FIRST_VISIT'
  | 'FOLLOW_UP'
  | 'PRODUCT_DEMO'
  | 'DEMO'
  | 'PROPOSAL_PRESENTATION'
  | 'NEGOTIATION'
  | 'DOCUMENT_COLLECTION'
  | 'AGREEMENT_SIGNING'
  | 'RELATIONSHIP_BUILDING'
  | 'ISSUE_RESOLUTION'
  | 'PAYMENT_FOLLOWUP'
  | 'CLOSURE'
  | 'SUPPORT'
  | 'RELATIONSHIP'
  | 'OTHER';

export type VisitOutcome =
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'NEGATIVE'
  | 'NEED_FOLLOW_UP'
  | 'DECISION_PENDING'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export interface Visit {
  id: string;
  collegeId?: string; // Optional for ad-hoc visits
  organizationId: string;
  userId: string;
  visitDate: string;
  purpose: VisitPurpose;
  outcome?: VisitOutcome;
  summary: string;
  contactsMet?: string | string[];
  contactDetails?: string; // JSON string of ContactPerson[]
  actionItems?: string;
  nextVisitDate?: string;
  nextAction?: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInAddress?: string;
  locationVerified: boolean;
  distanceFromCollege?: number;
  duration?: number;
  photos?: string[];
  documents?: Array<{ name: string; url: string }>;
  createdAt: string;
  // Ad-hoc visit details
  visitCollegeName?: string;
  visitState?: string;
  visitDistrict?: string;
  visitCity?: string;
  college?: {
    id: string;
    name: string;
    shortName?: string;
    city: string;
    state?: string;
    district?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface VisitFilter {
  userId?: string;
  collegeId?: string;
  purpose?: VisitPurpose;
  outcome?: VisitOutcome;
  startDate?: string;
  endDate?: string;
}

export interface CheckInData {
  collegeId?: string; // For existing colleges
  collegeName?: string; // For ad-hoc visits
  state?: string;
  district?: string;
  city?: string;
  purpose: VisitPurpose;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface ContactPerson {
  id?: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
}

export interface CheckOutData {
  outcome: VisitOutcome;
  summary: string;
  contactsMet?: string | string[];
  actionItems?: string;
  nextVisitDate?: string;
  nextAction?: string;
  photos?: string[];
  documents?: Array<{ name: string; url: string }>;
  contactDetails?: string; // JSON string of ContactPerson[]
}

export interface CreateVisitData {
  collegeId: string;
  visitDate: string;
  purpose: VisitPurpose;
  summary: string;
  contactsMet?: string[];
  actionItems?: string;
  nextVisitDate?: string;
  nextAction?: string;
}

export interface VisitStats {
  totalVisits: number;
  outcomeBreakdown: Record<string, number>;
  purposeBreakdown: Record<string, number>;
  visitsByDay: Array<{ date: string; count: number }>;
}

export interface TodaySchedule {
  scheduledVisits: Array<{
    id: string;
    name: string;
    city: string;
    state?: string;
    district?: string;
    address: string;
    nextFollowUpDate: string;
    contacts?: Array<{
      name: string;
      phone: string;
    }>;
  }>;
  completedVisits: Visit[];
  completedCount?: number;
  openVisit: Visit | null;
  totalScheduled: number;
  totalCompleted: number;
}

export const visitService = {
  async checkIn(data: CheckInData): Promise<Visit> {
    const response = await api.post('/field-sales/visits/check-in', data);
    return response.data.data;
  },

  async checkOut(visitId: string, data: CheckOutData): Promise<Visit> {
    const response = await api.post(`/field-sales/visits/${visitId}/check-out`, data);
    return response.data.data;
  },

  async getVisits(
    filter: VisitFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ visits: Visit[]; total: number }> {
    const response = await api.get('/field-sales/visits', {
      params: { ...filter, page, limit },
    });
    return {
      visits: response.data.data,
      total: response.data.pagination.total,
    };
  },

  async getVisitById(id: string): Promise<Visit> {
    const response = await api.get(`/field-sales/visits/${id}`);
    return response.data.data;
  },

  async createVisit(data: CreateVisitData): Promise<Visit> {
    const response = await api.post('/field-sales/visits', data);
    return response.data.data;
  },

  async updateVisit(id: string, data: Partial<CheckOutData>): Promise<Visit> {
    const response = await api.put(`/field-sales/visits/${id}`, data);
    return response.data.data;
  },

  async deleteVisit(id: string): Promise<void> {
    await api.delete(`/field-sales/visits/${id}`);
  },

  async getOpenVisit(): Promise<{ visit: Visit | null; hasOpenVisit: boolean }> {
    const response = await api.get('/field-sales/visits/open');
    return {
      visit: response.data.data,
      hasOpenVisit: response.data.hasOpenVisit,
    };
  },

  async getVisitStats(userId?: string, startDate?: string, endDate?: string): Promise<VisitStats> {
    const response = await api.get('/field-sales/visits/stats', {
      params: { userId, startDate, endDate },
    });
    return response.data.data;
  },

  async getTodaySchedule(): Promise<TodaySchedule> {
    const response = await api.get('/field-sales/visits/today');
    return response.data.data;
  },
};
