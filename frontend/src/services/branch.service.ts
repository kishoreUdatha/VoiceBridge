import api from './api';

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  isHeadquarters: boolean;
  isActive: boolean;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  branchManagerId?: string;
  createdAt: string;
  updatedAt: string;
  branchManager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: {
    users: number;
    leads: number;
    campaigns: number;
    colleges: number;
  };
}

export interface BranchStats {
  totalUsers: number;
  totalLeads: number;
  totalCampaigns: number;
  totalColleges: number;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  isHeadquarters?: boolean;
  address: string;
  city: string;
  state: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  branchManagerId?: string;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  isHeadquarters?: boolean;
  isActive?: boolean;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  branchManagerId?: string | null;
}

export interface BranchUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: {
    name: string;
    slug: string;
  };
  createdAt: string;
}

export const branchService = {
  /**
   * Get all branches
   */
  async getAll(isActive?: boolean): Promise<Branch[]> {
    const params = isActive !== undefined ? `?isActive=${isActive}` : '';
    const response = await api.get(`/branches${params}`);
    return response.data.data;
  },

  /**
   * Get a single branch by ID
   */
  async getById(id: string): Promise<Branch> {
    const response = await api.get(`/branches/${id}`);
    return response.data.data;
  },

  /**
   * Create a new branch
   */
  async create(data: CreateBranchInput): Promise<Branch> {
    const response = await api.post('/branches', data);
    return response.data.data;
  },

  /**
   * Update a branch
   */
  async update(id: string, data: UpdateBranchInput): Promise<Branch> {
    const response = await api.patch(`/branches/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a branch (soft delete)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/branches/${id}`);
  },

  /**
   * Assign a manager to a branch
   */
  async assignManager(branchId: string, userId: string): Promise<Branch> {
    const response = await api.post(`/branches/${branchId}/manager`, { userId });
    return response.data.data;
  },

  /**
   * Assign users to a branch
   */
  async assignUsers(branchId: string, userIds: string[]): Promise<{ assigned: number }> {
    const response = await api.post(`/branches/${branchId}/users`, { userIds });
    return response.data.data;
  },

  /**
   * Remove users from a branch
   */
  async removeUsers(branchId: string, userIds: string[]): Promise<{ removed: number }> {
    const response = await api.delete(`/branches/${branchId}/users`, {
      data: { userIds },
    });
    return response.data.data;
  },

  /**
   * Get users for a branch
   */
  async getBranchUsers(branchId: string): Promise<BranchUser[]> {
    const response = await api.get(`/branches/${branchId}/users`);
    return response.data.data;
  },

  /**
   * Get branch statistics
   */
  async getBranchStats(branchId: string): Promise<BranchStats> {
    const response = await api.get(`/branches/${branchId}/stats`);
    return response.data.data;
  },
};
