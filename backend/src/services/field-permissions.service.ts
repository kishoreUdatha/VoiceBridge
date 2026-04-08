/**
 * Field-Level Permissions Service
 * Manages granular field access control per role
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define available entities and their fields
export const ENTITY_FIELDS: Record<string, { name: string; description: string; fields: { name: string; label: string; sensitive?: boolean }[] }> = {
  Lead: {
    name: 'Lead',
    description: 'Lead/Contact information',
    fields: [
      { name: 'firstName', label: 'First Name' },
      { name: 'lastName', label: 'Last Name' },
      { name: 'email', label: 'Email', sensitive: true },
      { name: 'phone', label: 'Phone', sensitive: true },
      { name: 'alternatePhone', label: 'Alternate Phone', sensitive: true },
      { name: 'address', label: 'Address', sensitive: true },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'country', label: 'Country' },
      { name: 'source', label: 'Source' },
      { name: 'status', label: 'Status' },
      { name: 'score', label: 'Lead Score' },
      { name: 'assignedTo', label: 'Assigned To' },
      { name: 'notes', label: 'Notes' },
      { name: 'customFields', label: 'Custom Fields' },
      { name: 'budget', label: 'Budget', sensitive: true },
      { name: 'income', label: 'Income', sensitive: true },
    ],
  },
  User: {
    name: 'User',
    description: 'User/Employee information',
    fields: [
      { name: 'firstName', label: 'First Name' },
      { name: 'lastName', label: 'Last Name' },
      { name: 'email', label: 'Email' },
      { name: 'phone', label: 'Phone', sensitive: true },
      { name: 'role', label: 'Role' },
      { name: 'manager', label: 'Manager' },
      { name: 'branch', label: 'Branch' },
      { name: 'salary', label: 'Salary', sensitive: true },
      { name: 'commission', label: 'Commission', sensitive: true },
      { name: 'targets', label: 'Targets' },
      { name: 'lastLoginAt', label: 'Last Login' },
    ],
  },
  Payment: {
    name: 'Payment',
    description: 'Payment/Transaction information',
    fields: [
      { name: 'amount', label: 'Amount' },
      { name: 'status', label: 'Status' },
      { name: 'method', label: 'Payment Method' },
      { name: 'transactionId', label: 'Transaction ID' },
      { name: 'bankAccount', label: 'Bank Account', sensitive: true },
      { name: 'cardDetails', label: 'Card Details', sensitive: true },
      { name: 'invoiceUrl', label: 'Invoice URL' },
    ],
  },
  CallLog: {
    name: 'CallLog',
    description: 'Call records and recordings',
    fields: [
      { name: 'duration', label: 'Duration' },
      { name: 'status', label: 'Status' },
      { name: 'recordingUrl', label: 'Recording', sensitive: true },
      { name: 'transcript', label: 'Transcript' },
      { name: 'notes', label: 'Call Notes' },
      { name: 'sentiment', label: 'Sentiment' },
    ],
  },
};

export interface FieldPermissionData {
  fieldName: string;
  canView: boolean;
  canEdit: boolean;
}

class FieldPermissionsService {
  /**
   * Get field permissions for a role and entity
   */
  async getPermissions(organizationId: string, roleId: string, entity: string) {
    const permissions = await prisma.fieldPermission.findMany({
      where: { organizationId, roleId, entity },
    });

    // Map to field name for easy lookup
    const permissionMap = new Map<string, { canView: boolean; canEdit: boolean }>();
    permissions.forEach(p => {
      permissionMap.set(p.fieldName, { canView: p.canView, canEdit: p.canEdit });
    });

    // Get entity field definitions
    const entityDef = ENTITY_FIELDS[entity];
    if (!entityDef) return [];

    // Return all fields with their permissions (default to true if not set)
    return entityDef.fields.map(field => ({
      fieldName: field.name,
      label: field.label,
      sensitive: field.sensitive || false,
      canView: permissionMap.get(field.name)?.canView ?? true,
      canEdit: permissionMap.get(field.name)?.canEdit ?? true,
    }));
  }

  /**
   * Set field permissions for a role and entity
   */
  async setPermissions(
    organizationId: string,
    roleId: string,
    entity: string,
    permissions: FieldPermissionData[]
  ) {
    // Use transaction to update all permissions
    const operations = permissions.map(perm =>
      prisma.fieldPermission.upsert({
        where: {
          organizationId_roleId_entity_fieldName: {
            organizationId,
            roleId,
            entity,
            fieldName: perm.fieldName,
          },
        },
        create: {
          organizationId,
          roleId,
          entity,
          fieldName: perm.fieldName,
          canView: perm.canView,
          canEdit: perm.canEdit,
        },
        update: {
          canView: perm.canView,
          canEdit: perm.canEdit,
        },
      })
    );

    await prisma.$transaction(operations);

    return this.getPermissions(organizationId, roleId, entity);
  }

  /**
   * Get all permissions for a role across all entities
   */
  async getAllPermissionsForRole(organizationId: string, roleId: string) {
    const result: Record<string, any[]> = {};

    for (const entity of Object.keys(ENTITY_FIELDS)) {
      result[entity] = await this.getPermissions(organizationId, roleId, entity);
    }

    return result;
  }

  /**
   * Copy permissions from one role to another
   */
  async copyPermissions(
    organizationId: string,
    fromRoleId: string,
    toRoleId: string
  ) {
    const sourcePermissions = await prisma.fieldPermission.findMany({
      where: { organizationId, roleId: fromRoleId },
    });

    const operations = sourcePermissions.map(perm =>
      prisma.fieldPermission.upsert({
        where: {
          organizationId_roleId_entity_fieldName: {
            organizationId,
            roleId: toRoleId,
            entity: perm.entity,
            fieldName: perm.fieldName,
          },
        },
        create: {
          organizationId,
          roleId: toRoleId,
          entity: perm.entity,
          fieldName: perm.fieldName,
          canView: perm.canView,
          canEdit: perm.canEdit,
        },
        update: {
          canView: perm.canView,
          canEdit: perm.canEdit,
        },
      })
    );

    await prisma.$transaction(operations);

    return { copied: sourcePermissions.length };
  }

  /**
   * Apply a permission template
   */
  async applyTemplate(
    organizationId: string,
    roleId: string,
    templateId: string
  ) {
    const template = await prisma.fieldPermissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const permissions = template.permissions as FieldPermissionData[];

    return this.setPermissions(organizationId, roleId, template.entity, permissions);
  }

  /**
   * Get available entities and their fields
   */
  getEntityDefinitions() {
    return ENTITY_FIELDS;
  }

  /**
   * Check if a user can view a specific field
   */
  async canViewField(
    organizationId: string,
    roleId: string,
    entity: string,
    fieldName: string
  ): Promise<boolean> {
    const permission = await prisma.fieldPermission.findUnique({
      where: {
        organizationId_roleId_entity_fieldName: {
          organizationId,
          roleId,
          entity,
          fieldName,
        },
      },
    });

    // Default to true if no permission is set
    return permission?.canView ?? true;
  }

  /**
   * Check if a user can edit a specific field
   */
  async canEditField(
    organizationId: string,
    roleId: string,
    entity: string,
    fieldName: string
  ): Promise<boolean> {
    const permission = await prisma.fieldPermission.findUnique({
      where: {
        organizationId_roleId_entity_fieldName: {
          organizationId,
          roleId,
          entity,
          fieldName,
        },
      },
    });

    // Default to true if no permission is set
    return permission?.canEdit ?? true;
  }

  /**
   * Filter object fields based on permissions
   */
  async filterFields<T extends object>(
    obj: T,
    organizationId: string,
    roleId: string,
    entity: string,
    mode: 'view' | 'edit' = 'view'
  ): Promise<Partial<T>> {
    const permissions = await this.getPermissions(organizationId, roleId, entity);

    const result: Partial<T> = {};

    for (const [key, value] of Object.entries(obj)) {
      const perm = permissions.find(p => p.fieldName === key);

      if (!perm) {
        // Field not in permission list, include it
        (result as any)[key] = value;
      } else if (mode === 'view' && perm.canView) {
        (result as any)[key] = value;
      } else if (mode === 'edit' && perm.canEdit) {
        (result as any)[key] = value;
      }
    }

    return result;
  }
}

export const fieldPermissionsService = new FieldPermissionsService();
