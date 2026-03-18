import React, { useEffect, useState } from 'react';
import {
  UserPlusIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  status: string;
  planId: string | null;
  monthlyValue: number;
  onboardedAt: string;
  organization: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    activePlanId: string | null;
    subscriptionStatus: string | null;
    createdAt: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  CHURNED: 'bg-red-100 text-red-800',
};

export const PartnerCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/partner/customers?${params.toString()}`);
      setCustomers(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomerEmail) {
      toast.error('Please enter customer email');
      return;
    }

    try {
      setAdding(true);
      await api.post('/partner/customers', {
        customerOrgId: newCustomerEmail, // This would need org lookup
      });
      toast.success('Customer added successfully');
      setShowAddModal(false);
      setNewCustomerEmail('');
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add customer');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCustomer = async (orgId: string) => {
    if (!confirm('Are you sure you want to remove this customer?')) return;

    try {
      await api.delete(`/partner/customers/${orgId}`);
      toast.success('Customer removed');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to remove customer');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer organizations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <UserPlusIcon className="h-5 w-5" />
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CHURNED">Churned</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No customers yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Add your first customer
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Monthly Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Onboarded
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.organization.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <EnvelopeIcon className="h-4 w-4 mr-1" />
                        {customer.organization.email}
                      </div>
                      {customer.organization.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          {customer.organization.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {customer.organization.activePlanId || 'No Plan'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(customer.monthlyValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[customer.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(customer.onboardedAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {customer.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRemoveCustomer(customer.organization.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} customers
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCustomers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchCustomers(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Customer</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the organization ID or email to add as your customer.
            </p>
            <input
              type="text"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
              placeholder="Organization ID or Email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={adding}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerCustomersPage;
