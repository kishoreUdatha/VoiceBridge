/**
 * Payments Dashboard
 * View and manage payment links, subscriptions, and payment analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  TrendingUp,
  Users,
  Send,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  Download,
  Search,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface PaymentAnalytics {
  summary: {
    totalPayments: number;
    completedCount: number;
    completedAmount: number;
    pendingCount: number;
    pendingAmount: number;
    failedCount: number;
    conversionRate: number;
  };
  recentPayments: any[];
  dailyBreakdown: { date: string; count: number; total: number }[];
}

export const PaymentsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    amount: '',
    description: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notifyVia: [] as string[],
    expireDays: '7',
  });
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'subscriptions' | 'analytics'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, paymentsRes] = await Promise.all([
        api.get('/payments/analytics?days=30'),
        api.get('/payments?limit=50'),
      ]);

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
      if (paymentsRes.data.success) {
        setPayments(paymentsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const expireBy = new Date();
      expireBy.setDate(expireBy.getDate() + parseInt(createForm.expireDays));

      const response = await api.post('/payments/shareable-link', {
        amount: parseFloat(createForm.amount),
        description: createForm.description,
        customerName: createForm.customerName,
        customerPhone: createForm.customerPhone,
        customerEmail: createForm.customerEmail,
        notifyVia: createForm.notifyVia,
        expireBy: expireBy.toISOString(),
      });

      if (response.data.success) {
        toast.success('Payment link created!');
        setShowCreateModal(false);
        setCreateForm({
          amount: '',
          description: '',
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          notifyVia: [],
          expireDays: '7',
        });
        loadData();

        // Copy to clipboard
        navigator.clipboard.writeText(response.data.data.shortUrl);
        toast.success('Link copied to clipboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create payment link');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      COMPLETED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
      FAILED: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
      PROCESSING: { color: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  // Filter payments based on search and status
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchQuery === '' ||
      payment.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.studentProfile?.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.studentProfile?.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.studentProfile?.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export to Excel/CSV
  const handleExportToExcel = useCallback(() => {
    const headers = ['Order ID', 'Customer Name', 'Email', 'Amount', 'Status', 'Date'];
    const data = filteredPayments.map(p => [
      p.orderId || '',
      `${p.studentProfile?.user?.firstName || ''} ${p.studentProfile?.user?.lastName || ''}`,
      p.studentProfile?.user?.email || '',
      p.amount,
      p.status,
      new Date(p.createdAt).toLocaleDateString('en-IN'),
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payments exported to CSV');
  }, [filteredPayments]);

  // Prepare data for charts
  const statusData = analytics ? [
    { name: 'Completed', value: analytics.summary.completedCount, color: '#10B981' },
    { name: 'Pending', value: analytics.summary.pendingCount, color: '#F59E0B' },
    { name: 'Failed', value: analytics.summary.failedCount, color: '#EF4444' },
  ].filter(d => d.value > 0) : [];

  const dailyData = analytics?.dailyBreakdown?.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  })) || [];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 mt-1">Manage payment links, subscriptions, and view analytics</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Payment Link
        </button>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Collected (30 days)</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(analytics.summary.completedAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(analytics.summary.pendingAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Conversion Rate</p>
                <p className="text-xl font-bold text-slate-900">
                  {analytics.summary.conversionRate}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Payments</p>
                <p className="text-xl font-bold text-slate-900">
                  {analytics.summary.totalPayments}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {[
            { key: 'overview', label: 'Recent Payments', icon: CreditCard },
            { key: 'analytics', label: 'Analytics', icon: BarChart3 },
            { key: 'links', label: 'Payment Links', icon: ExternalLink },
            { key: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Daily Payments Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Trends (Last 30 Days)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748B" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748B" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Status Distribution */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Status Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {statusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-slate-600">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Volume Chart */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Payment Volume</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#64748B" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748B" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
                      formatter={(value: any) => [value, 'Payments']}
                    />
                    <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search - Only on overview tab */}
      {activeTab === 'overview' && (
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search payments..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            onClick={handleExportToExcel}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      )}

      {/* Payments Table - Only on overview tab */}
      {activeTab === 'overview' && (
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {searchQuery || statusFilter !== 'all' ? 'No matching payments found' : 'No payments found'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-slate-600">
                        {payment.orderId?.slice(0, 12)}...
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {payment.studentProfile?.user?.firstName || 'N/A'}{' '}
                          {payment.studentProfile?.user?.lastName || ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.studentProfile?.user?.email || ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {payment.metadata?.shortUrl && (
                          <button
                            onClick={() => copyToClipboard(payment.metadata.shortUrl)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Copy payment link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="View details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Links Tab Content */}
      {activeTab === 'links' && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <ExternalLink className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Payment Links</h3>
          <p className="text-sm text-slate-500 mb-4">
            View all your created payment links and their status
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create New Link
          </button>
        </div>
      )}

      {/* Subscriptions Tab Content */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Subscriptions</h3>
          <p className="text-sm text-slate-500 mb-4">
            Manage recurring payments and subscription plans
          </p>
          <p className="text-xs text-slate-400">Coming soon</p>
        </div>
      )}

      {/* Create Payment Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Create Payment Link
            </h2>

            <form onSubmit={handleCreatePaymentLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (INR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Payment for..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={createForm.customerPhone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="+91..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.customerEmail}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expires In
                </label>
                <select
                  value={createForm.expireDays}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, expireDays: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notify Via
                </label>
                <div className="flex gap-4">
                  {['sms', 'email', 'whatsapp'].map(method => (
                    <label key={method} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.notifyVia.includes(method)}
                        onChange={(e) => {
                          setCreateForm(prev => ({
                            ...prev,
                            notifyVia: e.target.checked
                              ? [...prev.notifyVia, method]
                              : prev.notifyVia.filter(m => m !== method),
                          }));
                        }}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700 capitalize">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createForm.amount}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Create Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsDashboard;
