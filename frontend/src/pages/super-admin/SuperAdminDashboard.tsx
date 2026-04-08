import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { superAdminService, PlatformStats, RevenueData } from '../../services/super-admin.service';
import {
  BuildingOffice2Icon,
  UsersIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  CloudIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingOrgs, setExportingOrgs] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, revenue] = await Promise.all([
        superAdminService.getStats(),
        superAdminService.getRevenueAnalytics(6),
      ]);
      setStats(statsData);
      setRevenueData(revenue);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportOrganizations = async () => {
    setExportingOrgs(true);
    try {
      const blob = await superAdminService.exportOrganizations();
      superAdminService.downloadBlob(blob, 'organizations.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingOrgs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Tenant Overview Cards
  const tenantCards = [
    {
      title: 'Total Tenants',
      value: stats?.overview.totalOrganizations || 0,
      icon: BuildingOffice2Icon,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
    {
      title: 'Active Tenants',
      value: stats?.overview.activeOrganizations || 0,
      icon: CheckCircleIcon,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      title: 'Trial Tenants',
      value: stats?.overview.trialOrganizations || 0,
      icon: ClockIcon,
      color: 'amber',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-600',
    },
    {
      title: 'Expired/Inactive',
      value: stats?.overview.expiredOrganizations || 0,
      icon: XCircleIcon,
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
    },
  ];

  // User & Revenue Cards
  const userRevenueCards = [
    {
      title: 'Total Users',
      value: stats?.overview.totalUsers || 0,
      subValue: `${stats?.overview.activeUsers || 0} active`,
      icon: UsersIcon,
      color: 'blue',
    },
    {
      title: 'Monthly Revenue',
      value: `₹${(stats?.revenue.thisMonth || 0).toLocaleString()}`,
      subValue: stats?.revenue.lastMonth
        ? `${stats.revenue.thisMonth > stats.revenue.lastMonth ? '+' : ''}${Math.round(((stats.revenue.thisMonth - stats.revenue.lastMonth) / (stats.revenue.lastMonth || 1)) * 100)}% vs last month`
        : 'No comparison',
      icon: CurrencyDollarIcon,
      color: 'green',
      trend: stats?.revenue.thisMonth && stats?.revenue.lastMonth
        ? stats.revenue.thisMonth >= stats.revenue.lastMonth ? 'up' : 'down'
        : null,
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats?.revenue.total || 0).toLocaleString()}`,
      subValue: 'All time',
      icon: ArrowTrendingUpIcon,
      color: 'indigo',
    },
    {
      title: 'New This Month',
      value: stats?.overview.newOrganizationsThisMonth || 0,
      subValue: 'organizations',
      icon: PlusIcon,
      color: 'cyan',
    },
  ];

  // Usage Cards
  const usageCards = [
    {
      title: 'AI Voice Calls',
      value: stats?.usage.thisMonth.aiCalls || 0,
      icon: PhoneIcon,
      color: 'violet',
    },
    {
      title: 'Voice Minutes',
      value: stats?.usage.thisMonth.voiceMinutes || 0,
      icon: CpuChipIcon,
      color: 'purple',
    },
    {
      title: 'Leads Created',
      value: stats?.usage.thisMonth.leads || 0,
      icon: UsersIcon,
      color: 'blue',
    },
    {
      title: 'SMS Sent',
      value: stats?.usage.thisMonth.sms || 0,
      icon: ChatBubbleLeftIcon,
      color: 'green',
    },
    {
      title: 'WhatsApp Messages',
      value: stats?.usage.thisMonth.whatsapp || 0,
      icon: ChatBubbleLeftIcon,
      color: 'emerald',
    },
    {
      title: 'Emails Sent',
      value: stats?.usage.thisMonth.emails || 0,
      icon: EnvelopeIcon,
      color: 'amber',
    },
    {
      title: 'API Calls',
      value: stats?.usage.thisMonth.apiCalls || 0,
      icon: ServerIcon,
      color: 'slate',
    },
    {
      title: 'Storage Used',
      value: `${(stats?.usage.thisMonth.storageGB || 0).toFixed(1)} GB`,
      icon: CloudIcon,
      color: 'sky',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Platform Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor all tenants and platform metrics</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/super-admin/organizations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add Tenant
          </Link>
          <button
            onClick={handleExportOrganizations}
            disabled={exportingOrgs}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {exportingOrgs ? 'Exporting...' : 'Export All'}
          </button>
        </div>
      </div>

      {/* Tenant Overview */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Tenant Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tenantCards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                  <p className="text-xs text-slate-500">{card.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users & Revenue */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Users & Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userRevenueCards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {card.trend === 'up' && <ArrowTrendingUpIcon className="w-3 h-3 text-green-500" />}
                    {card.trend === 'down' && <ArrowTrendingDownIcon className="w-3 h-3 text-red-500" />}
                    <p className={`text-xs ${card.trend === 'up' ? 'text-green-600' : card.trend === 'down' ? 'text-red-600' : 'text-slate-400'}`}>
                      {card.subValue}
                    </p>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-${card.color}-100 flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 text-${card.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Usage This Month */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Platform Usage This Month</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {usageCards.map((card) => (
            <div key={card.title} className="text-center p-3 bg-slate-50 rounded-lg">
              <card.icon className={`w-6 h-6 mx-auto text-${card.color}-500 mb-2`} />
              <p className="text-lg font-bold text-slate-800">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
              <p className="text-xs text-slate-500">{card.title}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Status Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Subscription Status</h2>
          <div className="space-y-3">
            {(stats?.subscriptionStatus || [
              { status: 'ACTIVE', count: stats?.overview.activeOrganizations || 0 },
              { status: 'TRIAL', count: stats?.overview.trialOrganizations || 0 },
              { status: 'EXPIRED', count: stats?.overview.expiredOrganizations || 0 },
            ]).map((item) => {
              const total = stats?.overview.totalOrganizations || 1;
              const percentage = Math.round((item.count / total) * 100);
              const colors: Record<string, string> = {
                ACTIVE: 'from-green-400 to-green-600',
                TRIAL: 'from-amber-400 to-amber-600',
                EXPIRED: 'from-red-400 to-red-600',
                CANCELLED: 'from-slate-400 to-slate-600',
              };
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 capitalize">{item.status.toLowerCase()}</span>
                    <span className="text-slate-500">{item.count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors[item.status] || 'from-purple-400 to-purple-600'} rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Plan Distribution</h2>
          <div className="space-y-3">
            {(stats?.planDistribution || []).map((plan) => {
              const percentage = Math.round((plan.count / (stats?.overview.totalOrganizations || 1)) * 100);
              return (
                <div key={plan.plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 capitalize">{plan.plan}</span>
                    <div className="text-right">
                      <span className="text-slate-500">{plan.count} orgs</span>
                      {plan.revenue > 0 && (
                        <span className="text-green-600 ml-2">₹{plan.revenue.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Revenue Trend (Last 6 Months)</h2>
        </div>
        <div className="space-y-3">
          {revenueData.map((item) => (
            <div key={`${item.month}-${item.year}`} className="flex items-center gap-4">
              <span className="text-sm text-slate-500 w-20">{item.month} {item.year}</span>
              <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                  style={{
                    width: `${Math.min(100, (item.revenue / Math.max(...revenueData.map(r => r.revenue || 1))) * 100)}%`,
                  }}
                ></div>
              </div>
              <span className="text-sm font-medium text-slate-700 w-28 text-right">
                ₹{item.revenue.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Tenants Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Top Tenants by Activity</h2>
          <Link to="/super-admin/organizations" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View All Tenants →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="pb-3 pr-4">Organization</th>
                <th className="pb-3 pr-4">Plan</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4 text-right">Users</th>
                <th className="pb-3 pr-4 text-right">Leads</th>
                <th className="pb-3 pr-4 text-right">AI Calls</th>
                <th className="pb-3 pr-4 text-right">Voice Min</th>
                <th className="pb-3 pr-4 text-right">Revenue</th>
                <th className="pb-3 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stats?.topOrganizations || []).slice(0, 10).map((org) => (
                <tr key={org.organizationId} className="text-sm hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <Link
                      to={`/super-admin/organizations/${org.organizationId}`}
                      className="font-medium text-slate-800 hover:text-purple-600"
                    >
                      {org.organization?.name || 'Unknown'}
                    </Link>
                    <p className="text-xs text-slate-400">{org.organization?.industry || 'General'}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded capitalize">
                      {org.organization?.activePlanId || 'starter'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      org.organization?.subscriptionStatus === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : org.organization?.subscriptionStatus === 'TRIAL'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {org.organization?.subscriptionStatus || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-600">{(org.usersCount || 0).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-right text-slate-600">{org.leadsCount.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-right text-slate-600">{org.aiCallsCount.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-right text-slate-600">{(org.voiceMinutes || 0).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-right text-green-600 font-medium">₹{(org.revenue || 0).toLocaleString()}</td>
                  <td className="py-3 text-right text-slate-500 text-xs">
                    {org.lastActiveAt
                      ? new Date(org.lastActiveAt).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/super-admin/organizations"
            className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <BuildingOffice2Icon className="w-5 h-5" />
            <span className="text-sm font-medium">Manage Tenants</span>
          </Link>
          <Link
            to="/super-admin/revenue"
            className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <CurrencyDollarIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Revenue Reports</span>
          </Link>
          <Link
            to="/super-admin/bulk-email"
            className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <EnvelopeIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Send Announcement</span>
          </Link>
          <button
            onClick={handleExportOrganizations}
            className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Export Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
