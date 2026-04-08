import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { roleService, Role, PermissionCategory } from '../../services/role.service';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; permissions: string[] }) => void;
  permissionCategories: PermissionCategory[];
  editingRole?: Role | null;
}

function CreateRoleModal({ isOpen, onClose, onSave, permissionCategories, editingRole }: CreateRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (editingRole) {
      setName(editingRole.name);
      setDescription(editingRole.description || '');
      setSelectedPermissions(editingRole.permissions || []);
      setExpandedCategories(permissionCategories.map(c => c.category));
    } else {
      setName('');
      setDescription('');
      setSelectedPermissions([]);
      setExpandedCategories([]);
    }
  }, [editingRole, permissionCategories]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const togglePermission = (permKey: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permKey)
        ? prev.filter(p => p !== permKey)
        : [...prev, permKey]
    );
  };

  const toggleAllInCategory = (category: PermissionCategory) => {
    const categoryPermKeys = category.permissions.map(p => p.key);
    const allSelected = categoryPermKeys.every(k => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !categoryPermKeys.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...categoryPermKeys])]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Role name is required');
      return;
    }
    onSave({ name: name.trim(), description: description.trim(), permissions: selectedPermissions });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingRole ? 'Edit Role' : 'Create New Role'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Senior Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional description of this role"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Permissions
              </label>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                {permissionCategories.map((category) => {
                  const categoryPermKeys = category.permissions.map(p => p.key);
                  const selectedCount = categoryPermKeys.filter(k => selectedPermissions.includes(k)).length;
                  const isExpanded = expandedCategories.includes(category.category);

                  return (
                    <div key={category.category}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.category)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRightIcon className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="font-medium text-slate-900">{category.category}</span>
                        </div>
                        <span className="text-sm text-slate-500">
                          {selectedCount} / {category.permissions.length} selected
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-slate-50">
                          <div className="mb-2">
                            <button
                              type="button"
                              onClick={() => toggleAllInCategory(category)}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              {selectedCount === category.permissions.length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {category.permissions.map((perm) => (
                              <label
                                key={perm.key}
                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-white cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(perm.key)}
                                  onChange={() => togglePermission(perm.key)}
                                  className="mt-0.5 w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                />
                                <div>
                                  <span className="text-sm font-medium text-slate-900">{perm.label}</span>
                                  <p className="text-xs text-slate-500">{perm.description}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {editingRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClone: (newName: string) => void;
  roleName: string;
}

function CloneModal({ isOpen, onClose, onClone, roleName }: CloneModalProps) {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(`${roleName} (Copy)`);
    }
  }, [isOpen, roleName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Role name is required');
      return;
    }
    onClone(newName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Clone Role</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Create a copy of <strong>{roleName}</strong> with the same permissions.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Role Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Clone Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RolesListPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionCategories, setPermissionCategories] = useState<PermissionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [cloneModalRole, setCloneModalRole] = useState<Role | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, categoriesData] = await Promise.all([
        roleService.getAll(),
        roleService.getPermissionCategories(),
      ]);
      setRoles(rolesData);
      setPermissionCategories(categoriesData);
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; description: string; permissions: string[] }) => {
    try {
      await roleService.create(data);
      toast.success('Role created successfully');
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create role');
    }
  };

  const handleUpdate = async (data: { name: string; description: string; permissions: string[] }) => {
    if (!editingRole) return;
    try {
      await roleService.update(editingRole.id, data);
      toast.success('Role updated successfully');
      setEditingRole(null);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }
    try {
      setDeletingId(role.id);
      await roleService.delete(role.id);
      toast.success('Role deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete role');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClone = async (newName: string) => {
    if (!cloneModalRole) return;
    try {
      await roleService.clone(cloneModalRole.id, newName);
      toast.success('Role cloned successfully');
      setCloneModalRole(null);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to clone role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage roles with custom permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-amber-100' : 'bg-primary-100'}`}>
                    <ShieldCheckIcon className={`w-5 h-5 ${role.isSystem ? 'text-amber-600' : 'text-primary-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{role.name}</h3>
                    <p className="text-xs text-slate-500">{role.slug}</p>
                  </div>
                </div>
                {role.isSystem && (
                  <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                    System
                  </span>
                )}
              </div>

              {role.description && (
                <p className="mt-3 text-sm text-slate-600 line-clamp-2">{role.description}</p>
              )}

              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <UserGroupIcon className="w-4 h-4" />
                  <span>{role.userCount || 0} users</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>{role.permissions?.length || 0} permissions</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setCloneModalRole(role)}
                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Clone Role"
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </button>
                {!role.isSystem && (
                  <>
                    <button
                      onClick={() => setEditingRole(role)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit Role"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      disabled={deletingId === role.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Role"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <ShieldCheckIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No roles found</h3>
          <p className="text-slate-500 mb-4">Create your first custom role to get started.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-5 h-5" />
            Create Role
          </button>
        </div>
      )}

      <CreateRoleModal
        isOpen={showCreateModal || !!editingRole}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRole(null);
        }}
        onSave={editingRole ? handleUpdate : handleCreate}
        permissionCategories={permissionCategories}
        editingRole={editingRole}
      />

      <CloneModal
        isOpen={!!cloneModalRole}
        onClose={() => setCloneModalRole(null)}
        onClone={handleClone}
        roleName={cloneModalRole?.name || ''}
      />
    </div>
  );
}
