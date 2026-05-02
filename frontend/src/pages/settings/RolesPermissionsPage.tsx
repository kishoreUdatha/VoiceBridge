/**
 * Roles & Permissions Page - Manage roles and permission matrix
 * Connected to real API for persistent storage
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { roleService, Role, PermissionCategory } from '../../services/role.service';

export default function RolesPermissionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionCategories, setPermissionCategories] = useState<PermissionCategory[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [cloneName, setCloneName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  // Load roles and permissions from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesData, permissionsData] = await Promise.all([
          roleService.getAll(),
          roleService.getPermissionCategories(),
        ]);
        setRoles(rolesData);
        setPermissionCategories(permissionsData);
        if (rolesData.length > 0) {
          setSelectedRole(rolesData[0]);
        }
      } catch (error) {
        console.error('Failed to load roles:', error);
        toast.error('Failed to load roles and permissions');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddRole = () => {
    setEditingRole(null);
    setFormData({ name: '', slug: '', description: '' });
    setShowModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      slug: role.slug,
      description: role.description || '',
    });
    setShowModal(true);
  };

  const handleSaveRole = async () => {
    if (!formData.name) {
      toast.error('Please enter a role name');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRole) {
        const updated = await roleService.update(editingRole.id, {
          name: formData.name,
          description: formData.description,
        });
        setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, ...updated } : r));
        if (selectedRole?.id === editingRole.id) {
          setSelectedRole({ ...selectedRole, ...updated });
        }
        toast.success('Role updated successfully');
      } else {
        const created = await roleService.create({
          name: formData.name,
          slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '_'),
          description: formData.description,
        });
        setRoles(prev => [...prev, created]);
        toast.success('Role created successfully');
      }
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save role');
      console.error('Failed to save role:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      await roleService.delete(role.id);
      setRoles(prev => prev.filter(r => r.id !== role.id));
      if (selectedRole?.id === role.id) {
        setSelectedRole(roles.find(r => r.id !== role.id) || null);
      }
      toast.success('Role deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
      console.error('Failed to delete role:', error);
    }
  };

  const handleCloneRole = async () => {
    if (!selectedRole || !cloneName) {
      toast.error('Please enter a name for the cloned role');
      return;
    }

    setIsSaving(true);
    try {
      const cloned = await roleService.clone(selectedRole.id, cloneName);
      setRoles(prev => [...prev, cloned]);
      setShowCloneModal(false);
      setCloneName('');
      toast.success('Role cloned successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to clone role');
      console.error('Failed to clone role:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionToggle = async (permissionKey: string) => {
    if (!selectedRole) return;

    if (selectedRole.isSystem) {
      toast.error('Cannot modify permissions of system roles');
      return;
    }

    const currentPermissions = selectedRole.permissions || [];
    let newPermissions: string[];

    if (currentPermissions.includes(permissionKey)) {
      newPermissions = currentPermissions.filter(p => p !== permissionKey);
    } else {
      newPermissions = [...currentPermissions, permissionKey];
    }

    try {
      const updated = await roleService.updatePermissions(selectedRole.id, newPermissions);
      setSelectedRole({ ...selectedRole, permissions: newPermissions });
      setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, permissions: newPermissions } : r));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
      console.error('Failed to update permissions:', error);
    }
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (!selectedRole) return false;
    const permissions = selectedRole.permissions || [];
    // Check for exact match or wildcard
    if (permissions.includes('*')) return true;
    if (permissions.includes(permissionKey)) return true;
    // Check for category wildcard (e.g., 'leads:*' covers 'leads:read')
    const category = permissionKey.split(':')[0];
    if (permissions.includes(`${category}:*`)) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
            <p className="text-sm text-slate-500">Manage user roles and their access permissions</p>
          </div>
        </div>
        <button
          onClick={handleAddRole}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900">Roles</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                    selectedRole?.id === role.id ? 'bg-primary-50 border-l-2 border-primary-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{role.name}</span>
                        {role.isSystem && (
                          <LockClosedIcon className="w-3 h-3 text-slate-400" title="System Role" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{role.userCount || 0} users</p>
                    </div>
                    {!role.isSystem && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRole(role);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {roles.length === 0 && (
                <div className="p-4 text-center text-slate-500">
                  No roles found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                      <ShieldCheckIcon className="w-5 h-5 text-primary-600" />
                      {selectedRole.name} Permissions
                      {selectedRole.isSystem && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded">
                          System Role
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedRole.description || 'Configure what this role can access'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCloneName(`${selectedRole.name} Copy`);
                      setShowCloneModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    Clone
                  </button>
                </div>
              </div>

              <div className="p-6">
                {selectedRole.isSystem && selectedRole.permissions?.includes('*') ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      This is a system role with full administrative access. Permissions cannot be modified.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {permissionCategories.map((category) => (
                      <div key={category.category} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <h3 className="font-medium text-slate-900">{category.category}</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {category.permissions.map((permission) => (
                            <div
                              key={permission.key}
                              className="px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                            >
                              <div>
                                <p className="font-medium text-slate-900">{permission.label}</p>
                                <p className="text-xs text-slate-500">{permission.description}</p>
                              </div>
                              <button
                                onClick={() => handlePermissionToggle(permission.key)}
                                disabled={selectedRole.isSystem}
                                className={`w-10 h-6 rounded-full transition-colors ${
                                  hasPermission(permission.key)
                                    ? 'bg-green-500'
                                    : 'bg-slate-300'
                                } ${selectedRole.isSystem ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div
                                  className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                    hasPermission(permission.key) ? 'translate-x-4' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <ShieldCheckIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Select a role to view and edit permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Sales Manager"
                />
              </div>

              {!editingRole && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                    placeholder="sales_manager"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Leave blank to auto-generate from name
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe this role's responsibilities..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Role Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Clone Role</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                Create a copy of "{selectedRole?.name}" with all its permissions.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter name for the new role"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCloneModal(false);
                  setCloneName('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneRole}
                disabled={isSaving || !cloneName}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Cloning...' : 'Clone Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
