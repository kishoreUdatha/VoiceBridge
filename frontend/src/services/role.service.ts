import api from './api';

export interface Permission {
  key: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  category: string;
  permissions: Permission[];
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  branch?: {
    id: string;
    name: string;
  } | null;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface CreateRoleInput {
  name: string;
  slug?: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export const roleService = {
  async getAll(): Promise<Role[]> {
    const response = await api.get('/roles');
    return response.data.data;
  },

  async getById(id: string): Promise<Role> {
    const response = await api.get(`/roles/${id}`);
    return response.data.data;
  },

  async create(data: CreateRoleInput): Promise<Role> {
    const response = await api.post('/roles', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateRoleInput): Promise<Role> {
    const response = await api.put(`/roles/${id}`, data);
    return response.data.data;
  },

  async updatePermissions(id: string, permissions: string[]): Promise<Role> {
    const response = await api.put(`/roles/${id}/permissions`, { permissions });
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/roles/${id}`);
  },

  async clone(id: string, newName: string): Promise<Role> {
    const response = await api.post(`/roles/${id}/clone`, { name: newName });
    return response.data.data;
  },

  async getRoleUsers(id: string, page = 1, limit = 20): Promise<{
    users: RoleUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await api.get(`/roles/${id}/users`, {
      params: { page, limit },
    });
    return response.data.data;
  },

  async getPermissionCategories(): Promise<PermissionCategory[]> {
    const response = await api.get('/roles/permissions');
    return response.data.data;
  },
};
