/**
 * Field Permissions Service
 * API client for field-level access control
 */

import api from './api';

export interface EntityField {
  name: string;
  label: string;
  sensitive?: boolean;
}

export interface EntityDefinition {
  name: string;
  description: string;
  fields: EntityField[];
}

export interface FieldPermission {
  fieldName: string;
  label: string;
  sensitive: boolean;
  canView: boolean;
  canEdit: boolean;
}

export const fieldPermissionsService = {
  async getEntities(): Promise<Record<string, EntityDefinition>> {
    const response = await api.get('/field-permissions/entities');
    return response.data.data;
  },

  async getPermissionsForRole(roleId: string): Promise<Record<string, FieldPermission[]>> {
    const response = await api.get(`/field-permissions/roles/${roleId}`);
    return response.data.data;
  },

  async getPermissions(roleId: string, entity: string): Promise<FieldPermission[]> {
    const response = await api.get(`/field-permissions/roles/${roleId}/${entity}`);
    return response.data.data;
  },

  async setPermissions(roleId: string, entity: string, permissions: {
    fieldName: string;
    canView: boolean;
    canEdit: boolean;
  }[]): Promise<FieldPermission[]> {
    const response = await api.put(`/field-permissions/roles/${roleId}/${entity}`, { permissions });
    return response.data.data;
  },

  async copyPermissions(fromRoleId: string, toRoleId: string): Promise<{ copied: number }> {
    const response = await api.post('/field-permissions/copy', { fromRoleId, toRoleId });
    return response.data.data;
  },
};
