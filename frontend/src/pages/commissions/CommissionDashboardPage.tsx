/**
 * Commission Dashboard Page
 * Commission tracking, rules management, and payout processing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CurrencyRupeeIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  commissionService,
  Commission,
  CommissionRule,
  CommissionStats,
  CommissionStatus,
  CommissionType,
} from '../../services/commission.service';

const STATUS_COLORS: Record<CommissionStatus, { bg: string; text: string; icon: React.ElementType }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
  APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
  PAID: { bg: 'bg-green-100', text: 'text-green-800', icon: BanknotesIcon },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CommissionDashboardPage() {
  const [activeTab, setActiveTab] = useState<'commissions' | 'rules'>('commissions');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | ''>('');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New rule form
  const [newRule, setNewRule] = useState<{
    name: string;
    description: string;
    type: CommissionType;
    rate: number;
    minValue: number;
    maxValue: number;
  }>({
    name: '',
    description: '',
    type: 'PERCENTAGE',
    rate: 10,
    minValue: 0,
    maxValue: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [commissionsData, rulesData, statsData] = await Promise.all([
        commissionService.getAllCommissions({
          status: statusFilter || undefined,
          limit: 50,
        }),
        commissionService.getRules(),
        commissionService.getStats(),
      ]);
      setCommissions(commissionsData.commissions);
      setRules(rulesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch commission data:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (commission: Commission) => {
    try {
      setActionLoading(commission.id);
      await commissionService.approve(commission.id);
      await fetchData();
    } catch (error) {
      console.error('Failed to approve commission:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (commission: Commission, notes: string) => {
    try {
      setActionLoading(commission.id);
      await commissionService.reject(commission.id, notes);
      await fetchData();
      setSelectedCommission(null);
    } catch (error) {
      console.error('Failed to reject commission:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async (commission: Commission) => {
    try {
      setActionLoading(commission.id);
      await commissionService.markAsPaid(commission.id);
      await fetchData();
    } catch (error) {
      console.error('Failed to mark commission as paid:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || newRule.rate <= 0) return;

    try {
      await commissionService.createRule({
        name: newRule.name,
        description: newRule.description || undefined,
        type: newRule.type,
        rate: newRule.rate,
        minValue: newRule.minValue || undefined,
        maxValue: newRule.maxValue || undefined,
      });
      setShowRuleModal(false);
      setNewRule({
        name: '',
        description: '',
        type: 'PERCENTAGE',
        rate: 10,
        minValue: 0,
        maxValue: 0,
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const toggleRuleStatus = async (rule: CommissionRule) => {
    try {
      await commissionService.updateRule(rule.id, { isActive: !rule.isActive });
      await fetchData();
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CurrencyRupeeIcon className="h-7 w-7 text-green-600" />
            Commission Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage commissions, rules, and payouts</p>
        </div>
        <button
          onClick={() => fetchData()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Earned</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalEarned)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending ({stats.pending.count})</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.pending.amount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Approved ({stats.approved.count})</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.approved.amount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BanknotesIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid ({stats.paid.count})</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.paid.amount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CurrencyRupeeIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">This Month ({stats.thisMonth.count})</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.thisMonth.amount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('commissions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'commissions'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CurrencyRupeeIcon className="h-5 w-5" />
            Commissions
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Cog6ToothIcon className="h-5 w-5" />
            Commission Rules
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      ) : activeTab === 'commissions' ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as CommissionStatus | '')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>

          {/* Commissions Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No commissions found
                    </td>
                  </tr>
                ) : (
                  commissions.map(commission => {
                    const statusConfig = STATUS_COLORS[commission.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={commission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              {commission.user ? (
                                <p className="text-sm font-medium text-gray-900">
                                  {commission.user.firstName} {commission.user.lastName}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-500">Unknown User</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(commission.baseValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {commission.rate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(commission.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {commission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {commission.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(commission)}
                                disabled={actionLoading === commission.id}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setSelectedCommission(commission)}
                                disabled={actionLoading === commission.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {commission.status === 'APPROVED' && (
                            <button
                              onClick={() => handleMarkAsPaid(commission)}
                              disabled={actionLoading === commission.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Rules Header */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowRuleModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <PlusIcon className="h-5 w-5" />
              Add Rule
            </button>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                <Cog6ToothIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No commission rules configured</p>
              </div>
            ) : (
              rules.map(rule => (
                <div
                  key={rule.id}
                  className={`bg-white border rounded-xl p-5 ${
                    rule.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      {rule.description && (
                        <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleRuleStatus(rule)}
                      className="relative"
                    >
                      <div
                        className={`w-11 h-6 rounded-full transition-colors ${
                          rule.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            rule.isActive ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium text-gray-900">{rule.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Rate</span>
                      <span className="font-medium text-green-600">
                        {rule.type === 'PERCENTAGE' ? `${rule.rate}%` : formatCurrency(rule.rate)}
                      </span>
                    </div>
                    {(rule.minValue || rule.maxValue) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Value Range</span>
                        <span className="font-medium text-gray-900">
                          {rule.minValue ? formatCurrency(rule.minValue) : '0'} -{' '}
                          {rule.maxValue ? formatCurrency(rule.maxValue) : 'No limit'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Create Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Commission Rule</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Sales Commission"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newRule.description}
                  onChange={e => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newRule.type}
                    onChange={e => setNewRule(prev => ({ ...prev, type: e.target.value as CommissionType }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate {newRule.type === 'PERCENTAGE' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    value={newRule.rate}
                    onChange={e => setNewRule(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Value (₹)</label>
                  <input
                    type="number"
                    value={newRule.minValue}
                    onChange={e => setNewRule(prev => ({ ...prev, minValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    min={0}
                    placeholder="0 = No minimum"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Value (₹)</label>
                  <input
                    type="number"
                    value={newRule.maxValue}
                    onChange={e => setNewRule(prev => ({ ...prev, maxValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    min={0}
                    placeholder="0 = No maximum"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRule}
                disabled={!newRule.name || newRule.rate <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Reject Commission</h2>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for rejecting this commission of{' '}
              <span className="font-semibold">{formatCurrency(selectedCommission.amount)}</span>
            </p>

            <textarea
              id="reject-notes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
              placeholder="Reason for rejection..."
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSelectedCommission(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const notes = (document.getElementById('reject-notes') as HTMLTextAreaElement).value;
                  handleReject(selectedCommission, notes);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
