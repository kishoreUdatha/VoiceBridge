import api from '../api';

export type CollegeType = 'ENGINEERING' | 'MEDICAL' | 'ARTS' | 'COMMERCE' | 'SCIENCE' | 'POLYTECHNIC' | 'ITI' | 'OTHER';
export type InstitutionStatus = 'UNIVERSITY' | 'AUTONOMOUS' | 'AFFILIATED' | 'DEEMED' | 'STANDALONE';
export type CollegeCategory = 'HOT' | 'WARM' | 'COLD' | 'LOST';
export type CollegeStatus = 'ACTIVE' | 'INACTIVE';

export interface CollegeContact {
  id: string;
  collegeId: string;
  name: string;
  designation: string;
  department?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  whatsapp?: string;
  isPrimary: boolean;
  isDecisionMaker: boolean;
  notes?: string;
  createdAt: string;
}

export interface College {
  id: string;
  organizationId: string;
  name: string;
  shortName?: string;
  collegeType: CollegeType;
  institutionStatus: InstitutionStatus;
  category: CollegeCategory;
  status: CollegeStatus;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  studentStrength?: number;
  annualIntake?: number;
  coursesOffered?: string[];
  establishedYear?: number;
  phone?: string;
  email?: string;
  website?: string;
  assignedToId: string;
  secondaryAssigneeId?: string;
  leadSource?: string;
  notes?: string;
  lastVisitDate?: string;
  nextFollowUpDate?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  secondaryAssignee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  contacts?: CollegeContact[];
  deals?: {
    id: string;
    stage: string;
    dealValue?: number;
  }[];
  _count?: {
    contacts: number;
    visits: number;
    expenses?: number;
  };
}

export interface CollegeFilter {
  assignedToId?: string;
  city?: string;
  state?: string;
  collegeType?: CollegeType;
  institutionStatus?: InstitutionStatus;
  category?: CollegeCategory;
  status?: CollegeStatus;
  search?: string;
}

export interface CreateCollegeData {
  name: string;
  shortName?: string;
  collegeType: CollegeType;
  institutionStatus: InstitutionStatus;
  category?: CollegeCategory;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  studentStrength?: number;
  annualIntake?: number;
  coursesOffered?: string[];
  establishedYear?: number;
  phone?: string;
  email?: string;
  website?: string;
  assignedToId?: string;
  secondaryAssigneeId?: string;
  leadSource?: string;
  notes?: string;
}

export interface UpdateCollegeData extends Partial<CreateCollegeData> {
  status?: CollegeStatus;
  nextFollowUpDate?: string;
}

export interface CollegeStats {
  totalColleges: number;
  categoryBreakdown: Record<string, number>;
  cityBreakdown: Array<{ city: string; count: number }>;
  recentVisits: number;
  upcomingFollowUps: number;
}

export interface CreateContactData {
  name: string;
  designation: string;
  department?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  whatsapp?: string;
  isPrimary?: boolean;
  isDecisionMaker?: boolean;
  notes?: string;
}

export const collegeService = {
  async getColleges(
    filter: CollegeFilter = {},
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ colleges: College[]; total: number }> {
    const response = await api.get('/field-sales/colleges', {
      params: { ...filter, page, limit, sortBy, sortOrder },
    });
    return {
      colleges: response.data.data,
      total: response.data.pagination.total,
    };
  },

  async getCollegeById(id: string): Promise<College> {
    const response = await api.get(`/field-sales/colleges/${id}`);
    return response.data.data;
  },

  async createCollege(data: CreateCollegeData): Promise<College> {
    const response = await api.post('/field-sales/colleges', data);
    return response.data.data;
  },

  async updateCollege(id: string, data: UpdateCollegeData): Promise<College> {
    const response = await api.put(`/field-sales/colleges/${id}`, data);
    return response.data.data;
  },

  async deleteCollege(id: string): Promise<void> {
    await api.delete(`/field-sales/colleges/${id}`);
  },

  async reassignCollege(id: string, newAssigneeId: string): Promise<College> {
    const response = await api.post(`/field-sales/colleges/${id}/reassign`, { newAssigneeId });
    return response.data.data;
  },

  async getCollegeStats(userId?: string): Promise<CollegeStats> {
    const response = await api.get('/field-sales/colleges/stats', {
      params: userId ? { userId } : {},
    });
    return response.data.data;
  },

  async getCities(): Promise<Array<{ city: string; state: string; count: number }>> {
    const response = await api.get('/field-sales/colleges/cities');
    return response.data.data;
  },

  async getStates(): Promise<Array<{ state: string; count: number }>> {
    const response = await api.get('/field-sales/colleges/states');
    return response.data.data;
  },

  // Contact methods
  async addContact(collegeId: string, data: CreateContactData): Promise<CollegeContact> {
    const response = await api.post(`/field-sales/colleges/${collegeId}/contacts`, data);
    return response.data.data;
  },

  async getContacts(collegeId: string): Promise<CollegeContact[]> {
    const response = await api.get(`/field-sales/colleges/${collegeId}/contacts`);
    return response.data.data;
  },

  async updateContact(collegeId: string, contactId: string, data: Partial<CreateContactData>): Promise<CollegeContact> {
    const response = await api.put(`/field-sales/colleges/${collegeId}/contacts/${contactId}`, data);
    return response.data.data;
  },

  async deleteContact(collegeId: string, contactId: string): Promise<void> {
    await api.delete(`/field-sales/colleges/${collegeId}/contacts/${contactId}`);
  },
};
