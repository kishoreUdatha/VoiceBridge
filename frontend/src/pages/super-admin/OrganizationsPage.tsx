import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { superAdminService, Organization } from '../../services/super-admin.service';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [formData, setFormData] = useState({
    organizationName: '',
    slug: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    planId: 'starter',
  });

  useEffect(() => {
    fetchOrganizations();
  }, [page, search, statusFilter, planFilter]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const result = await superAdminService.getOrganizations({
        page,
        limit: 20,
        search,
        status: statusFilter,
        plan: planFilter,
      });
      setOrganizations(result.organizations);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const result = await superAdminService.createOrganization(formData);
      setCreateSuccess(`Organization created! Temporary password: ${result.tempPassword}`);
      setFormData({
        organizationName: '',
        slug: '',
        adminEmail: '',
        adminFirstName: '',
        adminLastName: '',
        planId: 'starter',
      });
      fetchOrganizations();
    } catch (error: any) {
      setCreateError(error.response?.data?.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleExport = async () => {
    try {
      const blob = await superAdminService.exportOrganizations();
      superAdminService.downloadBlob(blob, 'organizations.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Organizations</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all organizations on the platform</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Create Organization
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Organization</th>
                    <th className="px-6 py-3">Plan</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Users</th>
                    <th className="px-6 py-3 text-right">Leads</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{org.name}</p>
                          <p className="text-sm text-slate-500">{org.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded capitalize">
                          {org.activePlanId || 'starter'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {org.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                            <XCircleIcon className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {org._count?.users || 0}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {org._count?.leads || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/super-admin/organizations/${org.id}`}
                          className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          <EyeIcon className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Create Organization</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError('');
                  setCreateSuccess('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateOrganization} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {createError}
                </div>
              )}

              {createSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                  {createSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      organizationName: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Acme Corporation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="acme-corporation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Admin First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.adminFirstName}
                    onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Admin Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.adminLastName}
                    onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="john@acme.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Plan
                </label>
                <select
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError('');
                    setCreateSuccess('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
