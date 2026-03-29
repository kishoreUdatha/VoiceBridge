import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { superAdminService } from '../../services/super-admin.service';
import {
  ArrowLeftIcon,
  UserIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CreditCardIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  activePlanId?: string;
  isActive: boolean;
  createdAt: string;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLoginAt?: string;
  }>;
  subscriptions: Array<{
    id: string;
    planId: string;
    status: string;
    startDate: string;
    endDate: string;
    amount: number;
  }>;
  _count: {
    leads: number;
    campaigns: number;
    voiceAgents: number;
  };
  usage?: {
    leadsCount: number;
    aiCallsCount: number;
    smsCount: number;
    emailsCount: number;
  };
  invoices: Array<{
    id: string;
    totalAmount: number;
    currency: string;
    status: string;
    paidAt?: string;
  }>;
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrganization();
    }
  }, [id]);

  const fetchOrganization = async () => {
    try {
      const result = await superAdminService.getOrganizationDetails(id!);
      setOrganization(result.organization);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!organization) return;

    setUpdating(true);
    try {
      await superAdminService.updateOrganization(organization.id, {
        isActive: !organization.isActive,
      });
      setOrganization({ ...organization, isActive: !organization.isActive });
    } catch (error) {
      console.error('Failed to update organization:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePlan = async (planId: string) => {
    if (!organization) return;

    setUpdating(true);
    try {
      await superAdminService.updateOrganization(organization.id, {
        activePlanId: planId,
      });
      setOrganization({ ...organization, activePlanId: planId });
    } catch (error) {
      console.error('Failed to update plan:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId);
    try {
      await superAdminService.impersonateUser(userId);
      // Redirect to tenant dashboard - cookies are set by the backend
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Failed to impersonate:', error);
      alert('Failed to impersonate user');
    } finally {
      setImpersonating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Organization not found</p>
        <Link to="/super-admin/organizations" className="text-purple-600 hover:text-purple-700 mt-2 inline-block">
          Back to Organizations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/super-admin/organizations')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{organization.name}</h1>
          <p className="text-sm text-slate-500">{organization.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {organization.isActive ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-lg">
              <CheckCircleIcon className="w-4 h-4" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-lg">
              <XCircleIcon className="w-4 h-4" />
              Inactive
            </span>
          )}
          <button
            onClick={handleToggleStatus}
            disabled={updating}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              organization.isActive
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            {organization.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <UserGroupIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{organization.users.length}</p>
              <p className="text-xs text-slate-500">Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{organization._count.leads}</p>
              <p className="text-xs text-slate-500">Leads</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <PhoneIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{organization.usage?.aiCallsCount || 0}</p>
              <p className="text-xs text-slate-500">AI Calls (This Month)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <CreditCardIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 capitalize">{organization.activePlanId || 'starter'}</p>
              <p className="text-xs text-slate-500">Current Plan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Organization Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Slug</span>
              <span className="text-slate-800 font-medium">{organization.slug}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-800">{organization.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Phone</span>
              <span className="text-slate-800">{organization.phone || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Created</span>
              <span className="text-slate-800">{new Date(organization.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-2 items-center">
              <span className="text-slate-500">Plan</span>
              <select
                value={organization.activePlanId || 'starter'}
                onChange={(e) => handleChangePlan(e.target.value)}
                disabled={updating}
                className="px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Usage This Month */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Usage This Month</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Leads</span>
                <span className="font-medium">{organization.usage?.leadsCount || 0}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${Math.min(100, ((organization.usage?.leadsCount || 0) / 1000) * 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">AI Calls</span>
                <span className="font-medium">{organization.usage?.aiCallsCount || 0}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, ((organization.usage?.aiCallsCount || 0) / 500) * 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">SMS</span>
                <span className="font-medium">{organization.usage?.smsCount || 0}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: `${Math.min(100, ((organization.usage?.smsCount || 0) / 1000) * 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Emails</span>
                <span className="font-medium">{organization.usage?.emailsCount || 0}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <div className="h-2 bg-amber-500 rounded-full" style={{ width: `${Math.min(100, ((organization.usage?.emailsCount || 0) / 5000) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="pb-3">User</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Last Login</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organization.users.map((user) => (
                <tr key={user.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    {user.isActive ? (
                      <span className="text-xs font-medium text-green-600">Active</span>
                    ) : (
                      <span className="text-xs font-medium text-red-600">Inactive</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-slate-500">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleImpersonate(user.id)}
                      disabled={impersonating === user.id || !user.isActive}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlayIcon className="w-4 h-4" />
                      {impersonating === user.id ? 'Starting...' : 'Impersonate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Invoices</h2>
        {organization.invoices.length === 0 ? (
          <p className="text-slate-500 text-sm">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-3">Invoice ID</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organization.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-3 text-sm font-medium text-slate-800">
                      {invoice.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 text-sm text-slate-600">
                      {invoice.currency} {invoice.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        invoice.status === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : invoice.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-slate-500">
                      {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
