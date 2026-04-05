/**
 * Analytics Dashboard Page
 * Real-time insights and performance metrics
 * Refactored to use extracted components and hooks (SOLID principles)
 */

import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartBarIcon,
  UserGroupIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  KeyIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  InboxIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// Local imports
import { ActiveTab } from './analytics-dashboard.types';
import { PIE_COLORS, formatNumber, DATE_RANGE_OPTIONS } from './analytics-dashboard.constants';
import { useAnalyticsDashboard } from './hooks';
import {
  KPICard,
  HealthScoreGauge,
  HealthStatCard,
  CustomTooltip,
  CustomPieTooltip,
  EmptyState,
  DashboardSkeleton,
} from './components';

const AnalyticsDashboardPage = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  const {
    loading,
    summary,
    usageTrend,
    dateRange,
    lastUpdated,
    refreshCountdown,
    setDateRange,
    fetchDashboardData,
    leadSourceData,
    messagingData,
    conversationChannelData,
    apiMethodData,
  } = useAnalyticsDashboard();

  // Show skeleton while loading
  if (loading && !summary) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-5">
        {/* Header Section */}
        <div className="mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-500 text-xs">Real-time insights and metrics</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Live indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-gray-500">{lastUpdated?.toLocaleTimeString()}</span>
                <span className="text-gray-400">({refreshCountdown}s)</span>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-transparent border-0 text-xs font-medium text-gray-700 focus:ring-0 cursor-pointer pr-6"
                >
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-all disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KPICard
            title="Total Leads"
            value={formatNumber(summary?.leads.totalLeads || 0)}
            subtitle={`+${summary?.leads.newLeads || 0} new`}
            icon={<UserGroupIcon className="w-5 h-5" />}
            trend={{ value: summary?.leads.newLeads || 0, isPositive: true }}
            gradient="from-blue-600 to-indigo-600"
            shadowColor="shadow-blue-500/20"
          />
          <KPICard
            title="API Requests"
            value={formatNumber(summary?.apiUsage.totalRequests || 0)}
            subtitle={`${summary?.apiUsage.successRate || 0}% success`}
            icon={<KeyIcon className="w-5 h-5" />}
            trend={{ value: Number(summary?.apiUsage.successRate) || 0, isPositive: Number(summary?.apiUsage.successRate || 0) >= 90 }}
            gradient="from-emerald-600 to-teal-600"
            shadowColor="shadow-emerald-500/20"
          />
          <KPICard
            title="Messages Sent"
            value={formatNumber(summary?.messaging.total.sent || 0)}
            subtitle={`${formatNumber(summary?.messaging.total.delivered || 0)} delivered`}
            icon={<EnvelopeIcon className="w-5 h-5" />}
            trend={{ value: summary?.messaging.total.sent ? Math.round((summary.messaging.total.delivered / summary.messaging.total.sent) * 100) : 0, isPositive: true }}
            gradient="from-violet-600 to-purple-600"
            shadowColor="shadow-violet-500/20"
          />
          <KPICard
            title="Conversations"
            value={formatNumber(summary?.conversations.totalConversations || 0)}
            subtitle={`${summary?.conversations.openConversations || 0} open`}
            icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />}
            trend={{ value: 0, isPositive: true }}
            gradient="from-amber-600 to-orange-600"
            shadowColor="shadow-amber-500/20"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-4 bg-white p-1 rounded-lg border border-gray-200 w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'messaging', label: 'Messaging', icon: EnvelopeIcon },
            { id: 'api', label: 'API', icon: KeyIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Usage Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Usage Trend</h2>
                  <p className="text-xs text-gray-500">Daily platform activity</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                    <span className="text-xs text-gray-600">Total</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-gray-600">API</span>
                  </div>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageTrend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} width={35} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total" />
                    <Area type="monotone" dataKey="api" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorApi)" name="API" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Lead Sources */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Lead Sources</h3>
                  <p className="text-xs text-gray-500">Distribution by channel</p>
                </div>
                <div className="h-44">
                  {leadSourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" stroke="#fff" strokeWidth={2}>
                          {leadSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No lead source data" />
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-3 border-t border-gray-100">
                  {leadSourceData.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-gray-600">{item.name}</span>
                      <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversations by Channel */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Channel Distribution</h3>
                  <p className="text-xs text-gray-500">Conversations by channel</p>
                </div>
                <div className="space-y-3">
                  {conversationChannelData.map((channel, index) => {
                    const total = conversationChannelData.reduce((sum, c) => sum + c.value, 0);
                    const percentage = total > 0 ? ((channel.value / total) * 100).toFixed(1) : 0;
                    const icons: Record<string, any> = { SMS: DevicePhoneMobileIcon, WhatsApp: ChatBubbleLeftRightIcon, Email: InboxIcon, Voice: PhoneIcon };
                    const Icon = icons[channel.name] || GlobeAltIcon;

                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${channel.color}15` }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: channel.color }} />
                            </div>
                            <span className="text-xs font-medium text-gray-900">{channel.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{channel.value.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${percentage}%`, backgroundColor: channel.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contact List Health */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Contact List Health</h3>
                  <p className="text-xs text-gray-500">List quality metrics</p>
                </div>
                <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                  (summary?.contactLists.healthScore || 0) >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  (summary?.contactLists.healthScore || 0) >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {(summary?.contactLists.healthScore || 0) >= 80 ? 'Excellent' : (summary?.contactLists.healthScore || 0) >= 60 ? 'Good' : 'Needs Attention'}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <div className="flex items-center justify-center">
                  <HealthScoreGauge score={summary?.contactLists.healthScore || 0} />
                </div>
                <HealthStatCard label="Total" value={summary?.contactLists.totalContacts || 0} icon={<UserGroupIcon className="w-4 h-4" />} color="slate" />
                <HealthStatCard label="Active" value={summary?.contactLists.activeContacts || 0} icon={<CheckCircleIcon className="w-4 h-4" />} color="emerald" percentage={summary?.contactLists.totalContacts ? Math.round((summary.contactLists.activeContacts / summary.contactLists.totalContacts) * 100) : 0} />
                <HealthStatCard label="Unsubscribed" value={summary?.contactLists.unsubscribed || 0} icon={<ExclamationCircleIcon className="w-4 h-4" />} color="amber" percentage={summary?.contactLists.totalContacts ? Math.round((summary.contactLists.unsubscribed / summary.contactLists.totalContacts) * 100) : 0} />
                <HealthStatCard label="Bounced" value={summary?.contactLists.bounced || 0} icon={<ExclamationCircleIcon className="w-4 h-4" />} color="red" percentage={summary?.contactLists.totalContacts ? Math.round((summary.contactLists.bounced / summary.contactLists.totalContacts) * 100) : 0} />
              </div>
            </div>
          </>
        )}

        {/* Messaging Tab */}
        {activeTab === 'messaging' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {messagingData.map((channel, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">{channel.name}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">{channel.rate}%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-600">Sent</span>
                      <span className="text-sm font-bold text-gray-900">{channel.sent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-lg">
                      <span className="text-xs text-emerald-700">Delivered</span>
                      <span className="text-sm font-bold text-emerald-700">{channel.delivered.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                      <span className="text-xs text-red-700">Failed</span>
                      <span className="text-sm font-bold text-red-700">{channel.failed.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Messaging Performance</h3>
                <p className="text-xs text-gray-500">Performance across channels</p>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={messagingData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} width={35} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sent" fill="#6366F1" radius={[4, 4, 0, 0]} name="Sent" />
                    <Bar dataKey="delivered" fill="#10B981" radius={[4, 4, 0, 0]} name="Delivered" />
                    <Bar dataKey="failed" fill="#EF4444" radius={[4, 4, 0, 0]} name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <KeyIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Requests</p>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(summary?.apiUsage.totalRequests || 0)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <CheckCircleSolid className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Successful</p>
                    <p className="text-lg font-bold text-emerald-600">{formatNumber(summary?.apiUsage.successfulRequests || 0)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                    <ExclamationCircleIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Failed</p>
                    <p className="text-lg font-bold text-red-600">{formatNumber(summary?.apiUsage.failedRequests || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900">API Usage by Method</h3>
                <p className="text-xs text-gray-500">Request distribution by HTTP method</p>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={apiMethodData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 11, fontWeight: 600 }} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="requests" radius={[0, 6, 6, 0]} barSize={24}>
                      {apiMethodData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
