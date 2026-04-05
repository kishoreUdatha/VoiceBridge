import api from './api';

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  status: 'success' | 'failed' | 'blocked';
  failReason: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  isActive: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
}

export interface UserAnalytics {
  userId: string;
  totalCalls: number;
  successfulCalls: number;
  averageCallDuration: number;
  leadsAssigned: number;
  leadsConverted: number;
  conversionRate: number;
  lastActiveAt: string | null;
  loginCount: number;
  activeSessions: number;
}

export interface ImportUserData {
  email: string;
  firstName: string;
  lastName: string;
  roleSlug: string;
  phone?: string;
  managerEmail?: string;
  password?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; email: string; error: string }[];
}

export interface BulkUpdateData {
  userIds: string[];
  roleId?: string;
  managerId?: string | null;
  isActive?: boolean;
}

class UserManagementService {
  // ================== LOGIN HISTORY ==================

  async getLoginHistory(params?: {
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ history: LoginHistoryEntry[]; total: number }> {
    const response = await api.get('/user-management/login-history', { params });
    return response.data.data;
  }

  async getUserLoginHistory(
    userId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ history: LoginHistoryEntry[]; total: number }> {
    const response = await api.get(`/user-management/users/${userId}/login-history`, { params });
    return response.data.data;
  }

  // ================== SESSION MANAGEMENT ==================

  async getAllActiveSessions(): Promise<UserSession[]> {
    const response = await api.get('/user-management/sessions');
    return response.data.data;
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    const response = await api.get(`/user-management/users/${userId}/sessions`);
    return response.data.data;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/user-management/sessions/${sessionId}`);
  }

  async revokeAllUserSessions(
    userId: string,
    exceptCurrentSession?: boolean,
    currentToken?: string
  ): Promise<void> {
    await api.post(`/user-management/users/${userId}/revoke-sessions`, {
      exceptCurrentSession,
      currentToken,
    });
  }

  // ================== BULK OPERATIONS ==================

  async bulkUpdateUsers(data: BulkUpdateData): Promise<{ updated: number }> {
    const response = await api.post('/user-management/bulk/update', data);
    return response.data.data;
  }

  async bulkDeleteUsers(userIds: string[]): Promise<{ deleted: number }> {
    const response = await api.post('/user-management/bulk/delete', { userIds });
    return response.data.data;
  }

  // ================== CSV IMPORT ==================

  async importUsers(users: ImportUserData[]): Promise<ImportResult> {
    const response = await api.post('/user-management/import', { users });
    return response.data.data;
  }

  parseCSV(csvContent: string): ImportUserData[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    const users: ImportUserData[] = [];

    // Map common header variations
    const headerMap: Record<string, string> = {
      email: 'email',
      'e-mail': 'email',
      'email address': 'email',
      firstname: 'firstName',
      'first name': 'firstName',
      'first_name': 'firstName',
      lastname: 'lastName',
      'last name': 'lastName',
      'last_name': 'lastName',
      phone: 'phone',
      'phone number': 'phone',
      mobile: 'phone',
      role: 'roleSlug',
      'role slug': 'roleSlug',
      roleslug: 'roleSlug',
      manager: 'managerEmail',
      'manager email': 'managerEmail',
      manageremail: 'managerEmail',
      password: 'password',
    };

    const normalizedHeaders = headers.map((h) => headerMap[h] || h);

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0 || values.every((v) => !v)) continue;

      const user: Record<string, string> = {};
      normalizedHeaders.forEach((header, index) => {
        if (values[index]) {
          user[header] = values[index].trim().replace(/^"|"$/g, '');
        }
      });

      if (user.email && user.firstName && user.lastName && user.roleSlug) {
        users.push({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleSlug: user.roleSlug,
          phone: user.phone,
          managerEmail: user.managerEmail,
          password: user.password,
        });
      }
    }

    return users;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  generateCSVTemplate(): string {
    const headers = ['email', 'firstName', 'lastName', 'phone', 'roleSlug', 'managerEmail', 'password'];
    const example = [
      'john@example.com',
      'John',
      'Doe',
      '+1234567890',
      'telecaller',
      'manager@example.com',
      'Password123!',
    ];
    return `${headers.join(',')}\n${example.join(',')}`;
  }

  // ================== USER ANALYTICS ==================

  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    const response = await api.get(`/user-management/users/${userId}/analytics`);
    return response.data.data;
  }

  async getBulkUserAnalytics(userIds: string[]): Promise<Record<string, UserAnalytics>> {
    const response = await api.get('/user-management/analytics/bulk', {
      params: { userIds: userIds.join(',') },
    });
    return response.data.data;
  }

  // ================== 2FA MANAGEMENT ==================

  async toggle2FA(userId: string, enabled: boolean): Promise<{ id: string; twoFactorEnabled: boolean }> {
    const response = await api.post(`/user-management/users/${userId}/2fa`, { enabled });
    return response.data.data;
  }
}

export const userManagementService = new UserManagementService();
