import { useState, useEffect } from 'react';
import { superAdminService, RevenueData } from '../../services/super-admin.service';
import {
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

export default function RevenuePage() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchRevenueData();
  }, [months]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const data = await superAdminService.getRevenueAnalytics(months);
      setRevenueData(data);
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await superAdminService.exportRevenue(months);
      superAdminService.downloadBlob(blob, `revenue-report-${months}m.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum, r) => sum + r.revenue, 0);
  const totalTransactions = revenueData.reduce((sum, r) => sum + r.transactions, 0);
  const avgMonthlyRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;

  // Calculate growth
  const lastMonth = revenueData[revenueData.length - 1];
  const prevMonth = revenueData[revenueData.length - 2];
  const growth = prevMonth && prevMonth.revenue > 0
    ? ((lastMonth?.revenue || 0) - prevMonth.revenue) / prevMonth.revenue * 100
    : 0;

  const maxRevenue = Math.max(...revenueData.map(r => r.revenue), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Revenue Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Track platform revenue and financial metrics</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-800">INR {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg Monthly</p>
              <p className="text-2xl font-bold text-slate-800">INR {Math.round(avgMonthlyRevenue).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${growth >= 0 ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
              {growth >= 0 ? (
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-slate-500">Monthly Growth</p>
              <p className={`text-2xl font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Transactions</p>
              <p className="text-2xl font-bold text-slate-800">{totalTransactions.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Revenue Over Time</h2>
        <div className="space-y-4">
          {revenueData.map((item) => (
            <div key={`${item.month}-${item.year}`} className="group">
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-slate-500">
                  {item.month} {item.year}
                </div>
                <div className="flex-1 relative">
                  <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg transition-all duration-500 group-hover:from-purple-400 group-hover:to-purple-500"
                      style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-32 text-right">
                  <span className="text-sm font-semibold text-slate-800">
                    INR {item.revenue.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 block">
                    {item.transactions} txns
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Details Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Monthly Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Month</th>
                <th className="pb-3 text-right">Revenue</th>
                <th className="pb-3 text-right">Transactions</th>
                <th className="pb-3 text-right">Avg Transaction</th>
                <th className="pb-3 text-right">vs Previous</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {revenueData.map((item, index) => {
                const prevRevenue = revenueData[index - 1]?.revenue || 0;
                const change = prevRevenue > 0
                  ? ((item.revenue - prevRevenue) / prevRevenue) * 100
                  : 0;
                const avgTransaction = item.transactions > 0
                  ? item.revenue / item.transactions
                  : 0;

                return (
                  <tr key={`${item.month}-${item.year}`}>
                    <td className="py-3 font-medium text-slate-800">
                      {item.month} {item.year}
                    </td>
                    <td className="py-3 text-right text-slate-600">
                      INR {item.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-600">
                      {item.transactions}
                    </td>
                    <td className="py-3 text-right text-slate-600">
                      INR {Math.round(avgTransaction).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      {index > 0 && (
                        <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200">
              <tr className="font-semibold">
                <td className="py-3 text-slate-800">Total</td>
                <td className="py-3 text-right text-slate-800">
                  INR {totalRevenue.toLocaleString()}
                </td>
                <td className="py-3 text-right text-slate-800">
                  {totalTransactions}
                </td>
                <td className="py-3 text-right text-slate-800">
                  INR {Math.round(totalTransactions > 0 ? totalRevenue / totalTransactions : 0).toLocaleString()}
                </td>
                <td className="py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
