// Use the main api service for consistent cookie-based authentication
import api from './api';

export interface SuperAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  activePlanId?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
    leads: number;
  };
  subscriptions?: Array<{
    status: string;
  }>;
}

export interface PlatformStats {
  overview: {
    totalOrganizations: number;
    activeOrganizations: number;
    expiredOrganizations: number;
    trialOrganizations: number;
    newOrganizationsThisMonth: number;
    totalUsers: number;
    activeUsers: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    currency: string;
  };
  usage: {
    thisMonth: {
      leads: number;
      aiCalls: number;
      voiceMinutes: number;
      sms: number;
      whatsapp: number;
      emails: number;
      apiCalls: number;
      storageGB: number;
    };
  };
  planDistribution: Array<{
    plan: string;
    count: number;
    revenue: number;
  }>;
  subscriptionStatus: Array<{
    status: string;
    count: number;
  }>;
  topOrganizations: Array<{
    organizationId: string;
    aiCallsCount: number;
    voiceMinutes: number;
    leadsCount: number;
    smsCount: number;
    whatsappCount: number;
    emailCount: number;
    usersCount: number;
    revenue: number;
    lastActiveAt: string | null;
    organization?: {
      id: string;
      name: string;
      activePlanId: string;
      subscriptionStatus: string;
      industry: string;
    };
  }>;
}

export interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  industry: string;
  activePlanId: string;
  subscriptionStatus: string;
  isActive: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  trialEndsAt: string | null;
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalLeads: number;
    totalCalls: number;
    voiceMinutesUsed: number;
    voiceMinutesLimit: number;
    smsCount: number;
    whatsappCount: number;
    emailCount: number;
    storageUsedMB: number;
    apiCallsThisMonth: number;
    lastLoginAt: string | null;
  };
  billing: {
    totalPaid: number;
    lastPaymentAt: string | null;
    nextBillingAt: string | null;
    paymentStatus: string;
  };
}

export interface RevenueData {
  month: string;
  year: number;
  revenue: number;
  transactions: number;
}

export const superAdminService = {
  // Auth - tokens are now in httpOnly cookies, only store non-sensitive admin info
  async login(email: string, password: string) {
    const response = await api.post('/super-admin/login', { email, password });
    const { admin } = response.data;

    // Only store non-sensitive admin info in sessionStorage (not tokens)
    sessionStorage.setItem('superAdmin', JSON.stringify(admin));
    // Clear any legacy localStorage items
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminRefreshToken');

    return response.data;
  },

  async logout() {
    try {
      await api.post('/super-admin/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    sessionStorage.removeItem('superAdmin');
    // Clear any legacy localStorage items
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminRefreshToken');
    localStorage.removeItem('superAdmin');
  },

  getCurrentAdmin(): SuperAdmin | null {
    const admin = sessionStorage.getItem('superAdmin');
    return admin ? JSON.parse(admin) : null;
  },

  async isAuthenticated(): Promise<boolean> {
    try {
      // Verify auth status with server
      await api.get('/super-admin/me');
      return true;
    } catch {
      return false;
    }
  },

  // Dashboard Stats
  async getStats(): Promise<PlatformStats> {
    const response = await api.get('/super-admin/stats');
    return response.data;
  },

  async getRevenueAnalytics(months: number = 12): Promise<RevenueData[]> {
    const response = await api.get('/super-admin/revenue', { params: { months } });
    return response.data.data;
  },

  // Organizations
  async getOrganizations(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    plan?: string;
  }) {
    const response = await api.get('/super-admin/organizations', { params });
    return response.data;
  },

  async getOrganizationDetails(orgId: string) {
    const response = await api.get(`/super-admin/organizations/${orgId}`);
    return response.data;
  },

  async updateOrganization(orgId: string, data: {
    isActive?: boolean;
    activePlanId?: string;
    subscriptionStatus?: string;
  }) {
    const response = await api.patch(`/super-admin/organizations/${orgId}`, data);
    return response.data;
  },

  async createOrganization(data: {
    organizationName: string;
    slug: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    planId?: string;
  }) {
    const response = await api.post('/super-admin/organizations', data);
    return response.data;
  },

  // Impersonation - tokens handled via httpOnly cookies
  async impersonateUser(userId: string) {
    const response = await api.post(`/super-admin/impersonate/${userId}`);

    // Store non-sensitive impersonation info in sessionStorage
    const { user } = response.data;
    sessionStorage.setItem('impersonatedUser', JSON.stringify(user));
    sessionStorage.setItem('isImpersonating', 'true');
    // Clear any legacy localStorage items
    localStorage.removeItem('impersonationToken');

    return response.data;
  },

  async exitImpersonation() {
    const response = await api.post('/super-admin/exit-impersonation');

    // Clear impersonation state
    sessionStorage.removeItem('impersonatedUser');
    sessionStorage.removeItem('isImpersonating');
    // Clear any legacy localStorage items
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('impersonatedUser');
    localStorage.removeItem('isImpersonating');

    return response.data;
  },

  isImpersonating(): boolean {
    return sessionStorage.getItem('isImpersonating') === 'true';
  },

  getImpersonatedUser() {
    const user = localStorage.getItem('impersonatedUser');
    return user ? JSON.parse(user) : null;
  },

  // Bulk Email
  async sendBulkEmail(data: {
    subject: string;
    body: string;
    html?: string;
    filter: {
      planId?: string;
      isActive?: boolean;
      orgIds?: string[];
    };
  }) {
    const response = await api.post('/super-admin/bulk-email', data);
    return response.data;
  },

  // Plans
  async getPlans() {
    const response = await api.get('/super-admin/plans');
    return response.data;
  },

  // Audit Logs
  async getAuditLogs(params: {
    organizationId?: string;
    actorId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/super-admin/audit-logs', { params });
    return response.data;
  },

  // Exports
  async exportOrganizations() {
    const response = await api.get('/super-admin/export/organizations', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportRevenue(months: number = 12) {
    const response = await api.get('/super-admin/export/revenue', {
      params: { months },
      responseType: 'blob',
    });
    return response.data;
  },

  async exportUsage() {
    const response = await api.get('/super-admin/export/usage', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportAuditLogs(params?: {
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }) {
    const response = await api.get('/super-admin/export/audit-logs', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Helper to download blob as file
  downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ==================== INDUSTRY MANAGEMENT ====================

  // Get all industries
  async getIndustries() {
    const response = await api.get('/admin/industries');
    return response.data;
  },

  // Get industry by slug
  async getIndustry(slug: string) {
    const response = await api.get(`/admin/industries/${slug}`);
    return response.data;
  },

  // Create new industry
  async createIndustry(data: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }) {
    const response = await api.post('/admin/industries', data);
    return response.data;
  },

  // Update industry
  async updateIndustry(slug: string, data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    isActive?: boolean;
  }) {
    const response = await api.put(`/admin/industries/${slug}`, data);
    return response.data;
  },

  // Delete industry (only non-system)
  async deleteIndustry(slug: string) {
    const response = await api.delete(`/admin/industries/${slug}`);
    return response.data;
  },

  // Get industry field templates
  async getIndustryFields(slug: string) {
    const response = await api.get(`/admin/industries/${slug}/fields`);
    return response.data;
  },

  // Add field template
  async addIndustryField(slug: string, data: {
    key: string;
    label: string;
    fieldType: string;
    isRequired?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: Array<{ value: string; label: string; color?: string }>;
    minValue?: number;
    maxValue?: number;
    unit?: string;
    groupName?: string;
    gridSpan?: number;
  }) {
    const response = await api.post(`/admin/industries/${slug}/fields`, data);
    return response.data;
  },

  // Update field template
  async updateIndustryField(slug: string, fieldKey: string, data: {
    label?: string;
    fieldType?: string;
    isRequired?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: Array<{ value: string; label: string; color?: string }>;
    minValue?: number;
    maxValue?: number;
    unit?: string;
    groupName?: string;
    gridSpan?: number;
  }) {
    const response = await api.put(`/admin/industries/${slug}/fields/${fieldKey}`, data);
    return response.data;
  },

  // Delete field template
  async deleteIndustryField(slug: string, fieldKey: string) {
    const response = await api.delete(`/admin/industries/${slug}/fields/${fieldKey}`);
    return response.data;
  },

  // Reorder fields
  async reorderIndustryFields(slug: string, fieldKeys: string[]) {
    const response = await api.post(`/admin/industries/${slug}/fields/reorder`, { fieldKeys });
    return response.data;
  },

  // Get industry stage templates
  async getIndustryStages(slug: string) {
    const response = await api.get(`/admin/industries/${slug}/stages`);
    return response.data;
  },

  // Add stage template
  async addIndustryStage(slug: string, data: {
    name: string;
    stageSlug: string;
    color?: string;
    icon?: string;
    journeyOrder: number;
    isDefault?: boolean;
    isLostStage?: boolean;
    autoSyncStatus?: string;
  }) {
    const response = await api.post(`/admin/industries/${slug}/stages`, data);
    return response.data;
  },

  // Update stage template
  async updateIndustryStage(slug: string, stageSlug: string, data: {
    name?: string;
    color?: string;
    icon?: string;
    journeyOrder?: number;
    isDefault?: boolean;
    autoSyncStatus?: string;
  }) {
    const response = await api.put(`/admin/industries/${slug}/stages/${stageSlug}`, data);
    return response.data;
  },

  // Delete stage template
  async deleteIndustryStage(slug: string, stageSlug: string) {
    const response = await api.delete(`/admin/industries/${slug}/stages/${stageSlug}`);
    return response.data;
  },

  // Export industry as JSON
  async exportIndustry(slug: string) {
    const response = await api.get(`/admin/industries/${slug}/export`);
    return response.data;
  },

  // Import industry from JSON
  async importIndustry(data: any) {
    const response = await api.post('/admin/industries/import', data);
    return response.data;
  },

  // Invalidate industry cache
  async invalidateIndustryCache(slug?: string) {
    const response = await api.post('/admin/industries/cache/invalidate', { slug });
    return response.data;
  },

  // Get industry stats (for dashboard)
  async getIndustryStats() {
    const response = await api.get('/super-admin/industries/stats');
    return response.data;
  },
};

export default superAdminService;
