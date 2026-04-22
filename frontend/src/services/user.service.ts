import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  roleId: string;
  managerId?: string | null;
  branchId?: string | null;
  isActive: boolean;
  createdAt: string;
  role?: Role;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  activeLeadCount?: number;
}

export interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  branchId: string | null;
  branchName: string | null;
  roleSlug: string | null;
  roleName: string | null;
  teamMemberCount: number;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
}

export const userService = {
  async getAll(params: { page?: number; limit?: number; role?: string; search?: string } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get(`/users?${queryParams.toString()}`);
    return {
      users: response.data.data,
      total: response.data.meta?.total || 0,
    };
  },

  async getById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data.data;
  },

  async create(data: Partial<User> & { password?: string }): Promise<User> {
    const response = await api.post('/users', data);
    return response.data.data;
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    const response = await api.put(`/users/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async getCounselors(): Promise<User[]> {
    const response = await api.get('/users/counselors');
    return response.data.data;
  },

  async getTelecallers(): Promise<User[]> {
    const response = await api.get('/users/telecallers');
    return response.data.data;
  },

  async getRoles(): Promise<Role[]> {
    const response = await api.get('/users/roles');
    return response.data.data;
  },

  async getManagers(): Promise<Manager[]> {
    const response = await api.get('/users/managers');
    return response.data.data;
  },

  // Get users that the current user can assign leads to based on hierarchy
  async getAssignableUsers(): Promise<User[]> {
    const response = await api.get('/users/assignable');
    return response.data.data;
  },
};
