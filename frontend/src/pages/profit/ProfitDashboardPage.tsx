import { useEffect, useState } from 'react';
import {
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { profitService, ProfitDashboard, ProfitByUniversity, MonthlyProfitTrend, ProfitByUser } from '../../services/profit.service';

export default function ProfitDashboardPage() {
  const [dashboard, setDashboard] = useState<ProfitDashboard | null>(null);
  const [topUniversities, setTopUniversities] = useState<ProfitByUniversity[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyProfitTrend[]>([]);
  const [topUsers, setTopUsers] = useState<ProfitByUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const getDateRange = () => {
    const now = new Date();
    const to = now.toISOString();
    let from: string;

    switch (dateRange) {
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        break;
      case 'quarter':
        from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
        break;
      case 'year':
        from = new Date(now.getFullYear(), 0, 1).toISOString();
        break;
      default:
        return undefined;
    }

    return { from, to };
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const range = getDateRange();

      const [dashboardData, universities, trend, users] = await Promise.all([
        profitService.getDashboard(range),
        profitService.getTopUniversities(5, range),
        profitService.getMonthlyTrend(12),
        profitService.getByUser(range),
      ]);

      setDashboard(dashboardData);
      setTopUniversities(universities);
      setMonthlyTrend(trend);
      setTopUsers(users.slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-96">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Profit Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Financial overview and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {(['month', 'quarter', 'year', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                dateRange === range
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CurrencyRupeeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(dashboard.revenue.totalFees)}</p>
          <p className="text-sm text-slate-500 mt-1">Total Fee Collection</p>
        </div>

        {/* Total Commission */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <ReceiptPercentIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Commission</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(dashboard.revenue.totalCommission)}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-green-600">₹{formatCurrency(dashboard.revenue.receivedCommission)} received</span>
            <span className="text-xs text-yellow-600">₹{formatCurrency(dashboard.revenue.pendingCommission)} pending</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">Expenses</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(dashboard.expenses.total)}</p>
          <p className="text-sm text-slate-500 mt-1">Total Business Expenses</p>
        </div>

        {/* Net Profit */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">Net Profit</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(dashboard.profit.net)}</p>
          <p className="text-sm text-white/80 mt-1">Margin: {dashboard.profit.margin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Admissions Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AcademicCapIcon className="w-5 h-5 text-slate-500" />
          Admissions Overview
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-3xl font-bold text-slate-900">{dashboard.admissions.total}</p>
            <p className="text-sm text-slate-500 mt-1">Total Admissions</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-700">{dashboard.admissions.donation}</p>
            <p className="text-sm text-purple-600 mt-1">Donation</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-700">{dashboard.admissions.nonDonation}</p>
            <p className="text-sm text-blue-600 mt-1">Non-Donation</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Universities */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BuildingLibraryIcon className="w-5 h-5 text-slate-500" />
            Top Performing Universities
          </h2>
          {topUniversities.length > 0 ? (
            <div className="space-y-3">
              {topUniversities.map((u, index) => (
                <div key={u.university.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{u.university.shortName || u.university.name}</p>
                    <p className="text-xs text-slate-500">{u.admissions} admissions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">{formatCurrency(u.commission)}</p>
                    <p className="text-xs text-slate-500">profit: {formatCurrency(u.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-slate-500" />
            Top Performers
          </h2>
          {topUsers.length > 0 ? (
            <div className="space-y-3">
              {topUsers.map((u, index) => (
                <div key={u.user.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{u.user.firstName} {u.user.lastName}</p>
                    <p className="text-xs text-slate-500">{u.user.role?.name || 'Staff'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{u.admissions} admissions</p>
                    <p className="text-xs text-emerald-600">{formatCurrency(u.commission)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-slate-500" />
          Expense Breakdown
        </h2>
        {dashboard.expenses.byCategory.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dashboard.expenses.byCategory.map((cat) => (
              <div key={cat.category} className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 capitalize">{cat.category.toLowerCase().replace('_', ' ')}</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">{formatCurrency(cat.amount)}</p>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-red-500 rounded-full h-1.5"
                    style={{ width: `${Math.min((cat.amount / dashboard.expenses.total) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">No expense data available</p>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5 text-slate-500" />
          Monthly Trend
        </h2>
        {monthlyTrend.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium text-slate-600">Month</th>
                  <th className="px-3 py-2 font-medium text-slate-600 text-right">Admissions</th>
                  <th className="px-3 py-2 font-medium text-slate-600 text-right">Revenue</th>
                  <th className="px-3 py-2 font-medium text-slate-600 text-right">Commission</th>
                  <th className="px-3 py-2 font-medium text-slate-600 text-right">Expenses</th>
                  <th className="px-3 py-2 font-medium text-slate-600 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyTrend.slice(-6).map((month) => (
                  <tr key={month.month} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-900">{month.month}</td>
                    <td className="px-3 py-2 text-right">{month.admissions}</td>
                    <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(month.revenue)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(month.commission)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatCurrency(month.expenses)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(month.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">No trend data available</p>
        )}
      </div>
    </div>
  );
}
