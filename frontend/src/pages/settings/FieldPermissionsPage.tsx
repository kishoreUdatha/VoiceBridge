/**
 * Field Permissions Page
 * Configure field-level access control per role
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  fieldPermissionsService,
  FieldPermission,
  EntityDefinition,
} from '../../services/field-permissions.service';
import { userService } from '../../services/user.service';

interface Role {
  id: string;
  name: string;
  slug: string;
}

export default function FieldPermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entities, setEntities] = useState<Record<string, EntityDefinition>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [permissions, setPermissions] = useState<FieldPermission[]>([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyToRoleId, setCopyToRoleId] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedRole && selectedEntity) {
      loadPermissions();
    }
  }, [selectedRole, selectedEntity]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [entitiesData, rolesData] = await Promise.all([
        fieldPermissionsService.getEntities(),
        userService.getRoles(),
      ]);

      setEntities(entitiesData);
      setRoles(rolesData);

      // Set defaults
      const entityKeys = Object.keys(entitiesData);
      if (entityKeys.length > 0) {
        setSelectedEntity(entityKeys[0]);
      }
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const perms = await fieldPermissionsService.getPermissions(selectedRole, selectedEntity);
      setPermissions(perms);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handlePermissionChange = (fieldName: string, type: 'canView' | 'canEdit', value: boolean) => {
    setPermissions(prev =>
      prev.map(p =>
        p.fieldName === fieldName
          ? {
              ...p,
              [type]: value,
              // If disabling view, also disable edit
              ...(type === 'canView' && !value ? { canEdit: false } : {}),
            }
          : p
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fieldPermissionsService.setPermissions(
        selectedRole,
        selectedEntity,
        permissions.map(p => ({
          fieldName: p.fieldName,
          canView: p.canView,
          canEdit: p.canEdit,
        }))
      );
      toast.success('Permissions saved successfully');
    } catch (error) {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPermissions = async () => {
    if (!copyToRoleId) return;

    try {
      const result = await fieldPermissionsService.copyPermissions(selectedRole, copyToRoleId);
      toast.success(`Copied ${result.copied} permissions`);
      setShowCopyModal(false);
      setCopyToRoleId('');
    } catch (error) {
      toast.error('Failed to copy permissions');
    }
  };

  const handleQuickAction = (action: 'viewAll' | 'editAll' | 'viewOnly' | 'restrictSensitive') => {
    setPermissions(prev =>
      prev.map(p => {
        switch (action) {
          case 'viewAll':
            return { ...p, canView: true, canEdit: true };
          case 'editAll':
            return { ...p, canEdit: true };
          case 'viewOnly':
            return { ...p, canView: true, canEdit: false };
          case 'restrictSensitive':
            return p.sensitive ? { ...p, canView: false, canEdit: false } : p;
          default:
            return p;
        }
      })
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <ArrowPathIcon className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Field Permissions</h1>
        </div>
        <p className="text-slate-500 mt-1 ml-12">Control which fields each role can view and edit</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Entity</label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {Object.entries(entities).map(([key, entity]) => (
                <option key={key} value={key}>{entity.name} - {entity.description}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowCopyModal(true)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
            Copy to Role
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-slate-500">Quick actions:</span>
        <button
          onClick={() => handleQuickAction('viewAll')}
          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
        >
          Allow All
        </button>
        <button
          onClick={() => handleQuickAction('viewOnly')}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
        >
          View Only
        </button>
        <button
          onClick={() => handleQuickAction('restrictSensitive')}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200"
        >
          Restrict Sensitive
        </button>
      </div>

      {/* Permissions Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Field</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-24">
                  <div className="flex items-center justify-center gap-1">
                    <EyeIcon className="w-4 h-4" />
                    View
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-24">
                  <div className="flex items-center justify-center gap-1">
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {permissions.map(permission => (
                <tr key={permission.fieldName} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{permission.label}</span>
                      {permission.sensitive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          Sensitive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{permission.fieldName}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={permission.canView}
                      onChange={(e) => handlePermissionChange(permission.fieldName, 'canView', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={permission.canEdit}
                      disabled={!permission.canView}
                      onChange={(e) => handlePermissionChange(permission.fieldName, 'canEdit', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Save Button */}
        <div className="border-t border-slate-200 px-4 py-3 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheckIcon className="w-4 h-4" />
            )}
            Save Permissions
          </button>
        </div>
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Copy Permissions</h2>
            <p className="text-sm text-slate-500 mb-4">
              Copy all permissions from <strong>{roles.find(r => r.id === selectedRole)?.name}</strong> to another role.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Copy to Role</label>
              <select
                value={copyToRoleId}
                onChange={(e) => setCopyToRoleId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Select a role...</option>
                {roles
                  .filter(r => r.id !== selectedRole)
                  .map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCopyPermissions}
                disabled={!copyToRoleId}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Copy Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
