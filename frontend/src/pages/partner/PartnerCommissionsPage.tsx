import React, { useEffect, useState } from 'react';
import {
  CurrencyRupeeIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Commission {
  id: string;
  transactionType: string;
  description: string | null;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  transactionDate: string;
  paidAt: string | null;
}

interface CommissionStats {
  totalCommission: number;
  totalGross: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusConfig: Record<string, { color: string; icon: React.FC<any> }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  APPROVED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
  PROCESSING: { color: 'bg-purple-100 text-purple-800', icon: ClockIcon },
  PAID: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
  HELD: { color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
};

export const PartnerCommissionsPage: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  useEffect(() => {
    fetchCommissions();
  }, [statusFilter, dateRange]);

  const fetchCommissions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await api.get(`/partner/commissions?${params.toString()}`);
      setCommissions(response.data.data);
      setStats(response.data.stats);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SUBSCRIPTION: 'Subscription',
      ADDON: 'Add-on Purchase',
      AGENT_SALE: 'Agent Sale',
      REFERRAL: 'Referral Bonus',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
          <p className="text-gray-600">Track your earnings and commission history</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue Generated</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalGross)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CurrencyRupeeIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Commissions</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalCommission)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CurrencyRupeeIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{pagination?.total || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FunnelIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PROCESSING">Processing</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {(statusFilter || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setDateRange({ start: '', end: '' });
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-12">
            <CurrencyRupeeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No commissions yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Start adding customers to earn commissions
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Gross Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Commission
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissions.map((commission) => {
                const StatusIcon = statusConfig[commission.status]?.icon || ClockIcon;
                return (
                  <tr key={commission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(commission.transactionDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {getTransactionTypeLabel(commission.transactionType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {commission.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(commission.grossAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {commission.commissionRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                      {formatCurrency(commission.commissionAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          statusConfig[commission.status]?.color || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {commission.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} commissions
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCommissions(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchCommissions(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerCommissionsPage;
