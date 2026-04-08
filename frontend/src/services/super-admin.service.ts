import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create a separate axios instance for super admin with httpOnly cookie auth
const superAdminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies for authentication
});

// Response interceptor for error handling
superAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any legacy localStorage items
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdmin');
      window.location.href = '/super-admin/login';
    }
    return Promise.reject(error);
  }
);

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
    const response = await superAdminApi.post('/super-admin/login', { email, password });
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
      await superAdminApi.post('/super-admin/logout');
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
      await superAdminApi.get('/super-admin/me');
      return true;
    } catch {
      return false;
    }
  },

  // Dashboard Stats
  async getStats(): Promise<PlatformStats> {
    const response = await superAdminApi.get('/super-admin/stats');
    return response.data;
  },

  async getRevenueAnalytics(months: number = 12): Promise<RevenueData[]> {
    const response = await superAdminApi.get('/super-admin/revenue', { params: { months } });
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
    const response = await superAdminApi.get('/super-admin/organizations', { params });
    return response.data;
  },

  async getOrganizationDetails(orgId: string) {
    const response = await superAdminApi.get(`/super-admin/organizations/${orgId}`);
    return response.data;
  },

  async updateOrganization(orgId: string, data: {
    isActive?: boolean;
    activePlanId?: string;
    subscriptionStatus?: string;
  }) {
    const response = await superAdminApi.patch(`/super-admin/organizations/${orgId}`, data);
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
    const response = await superAdminApi.post('/super-admin/organizations', data);
    return response.data;
  },

  // Impersonation - tokens handled via httpOnly cookies
  async impersonateUser(userId: string) {
    const response = await superAdminApi.post(`/super-admin/impersonate/${userId}`);

    // Store non-sensitive impersonation info in sessionStorage
    const { user } = response.data;
    sessionStorage.setItem('impersonatedUser', JSON.stringify(user));
    sessionStorage.setItem('isImpersonating', 'true');
    // Clear any legacy localStorage items
    localStorage.removeItem('impersonationToken');

    return response.data;
  },

  async exitImpersonation() {
    const response = await superAdminApi.post('/super-admin/exit-impersonation');

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
    const response = await superAdminApi.post('/super-admin/bulk-email', data);
    return response.data;
  },

  // Plans
  async getPlans() {
    const response = await superAdminApi.get('/super-admin/plans');
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
    const response = await superAdminApi.get('/super-admin/audit-logs', { params });
    return response.data;
  },

  // Exports
  async exportOrganizations() {
    const response = await superAdminApi.get('/super-admin/export/organizations', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportRevenue(months: number = 12) {
    const response = await superAdminApi.get('/super-admin/export/revenue', {
      params: { months },
      responseType: 'blob',
    });
    return response.data;
  },

  async exportUsage() {
    const response = await superAdminApi.get('/super-admin/export/usage', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportAuditLogs(params?: {
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }) {
    const response = await superAdminApi.get('/super-admin/export/audit-logs', {
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
};

export default superAdminService;
