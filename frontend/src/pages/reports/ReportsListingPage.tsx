/**
 * Reports Listing Page
 * Tab-based design for easy navigation
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon,
  PhoneIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  MegaphoneIcon,
  FunnelIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

type Category = 'all' | 'analytics' | 'pipeline' | 'user' | 'campaign';

interface ReportItem {
  id: string;
  name: string;
  description: string;
  category: Category;
  icon: React.ElementType;
  path: string;
  color: string;
  bgColor: string;
}

const reports: ReportItem[] = [
  // Business Analytics
  {
    id: 'business-trends',
    name: 'Business Trends',
    description: 'Comprehensive dashboard with calls, SMS, leads, and conversion metrics',
    category: 'analytics',
    icon: ChartBarIcon,
    path: '/reports/business-trends',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'user-trends',
    name: 'User Trends',
    description: 'User-based metrics with call time, breaks, and performance',
    category: 'analytics',
    icon: ArrowTrendingUpIcon,
    path: '/reports/user-trends',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  // Pipeline Reports
  {
    id: 'deal-velocity',
    name: 'Deal Velocity Report',
    description: 'Pipeline velocity, stage bottlenecks, and stalled deals',
    category: 'pipeline',
    icon: BoltIcon,
    path: '/reports/deal-velocity',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  // User Reports
  {
    id: 'user-report',
    name: 'User Report',
    description: 'All in one user report with comprehensive metrics',
    category: 'user',
    icon: UserGroupIcon,
    path: '/reports/user',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'user-performance',
    name: 'User Performance',
    description: 'Team performance with leads, calls, follow-ups & conversions',
    category: 'user',
    icon: ArrowTrendingUpIcon,
    path: '/reports/user-performance',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'user-activity',
    name: 'User Activity Report',
    description: 'Insights into breaks information and calling metrics',
    category: 'user',
    icon: ClockIcon,
    path: '/reports/user-activity',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  {
    id: 'lead-disposition',
    name: 'Lead Disposition Report',
    description: 'Analysis of calls connected and status wise count',
    category: 'user',
    icon: FunnelIcon,
    path: '/reports/lead-disposition',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  {
    id: 'user-stage',
    name: 'User Stage Report',
    description: 'Lead stage distribution by user across campaigns',
    category: 'user',
    icon: ChartBarIcon,
    path: '/reports/user-stage',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    id: 'user-call',
    name: 'User Call Report',
    description: 'Insights into call related activities of users',
    category: 'user',
    icon: PhoneIcon,
    path: '/reports/user-call',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'followup',
    name: 'Follow-Up Report',
    description: 'Missed and due follow ups by the user',
    category: 'user',
    icon: CalendarDaysIcon,
    path: '/reports/followup',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'login',
    name: 'Login Report',
    description: 'Hourly report and login activities of users',
    category: 'user',
    icon: ArrowPathIcon,
    path: '/reports/login',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    id: 'message-activity',
    name: 'Message Activity Report',
    description: 'Messaging activities across WhatsApp, SMS, email',
    category: 'user',
    icon: ChatBubbleLeftRightIcon,
    path: '/reports/message-activity',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'user-deal',
    name: 'User Deal Report',
    description: 'Track deals in-progress, won, and lost by user',
    category: 'user',
    icon: CurrencyDollarIcon,
    path: '/reports/user-deal',
    color: 'text-lime-600',
    bgColor: 'bg-lime-50',
  },
  {
    id: 'user-task',
    name: 'User Task Report',
    description: 'Task completion, pending, and overdue tasks',
    category: 'user',
    icon: ClipboardDocumentListIcon,
    path: '/reports/user-task',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
  },
  // Campaign Reports
  {
    id: 'campaign',
    name: 'Campaign Report',
    description: 'Calls data with lost and converted count of leads',
    category: 'campaign',
    icon: MegaphoneIcon,
    path: '/reports/campaign',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  {
    id: 'campaign-lead',
    name: 'Campaign Lead Report',
    description: 'Campaign lead progress through statuses',
    category: 'campaign',
    icon: DocumentTextIcon,
    path: '/reports/campaign-lead',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    id: 'campaign-stage',
    name: 'Campaign Stage Report',
    description: 'Campaign lead progress through stages',
    category: 'campaign',
    icon: ChartBarIcon,
    path: '/reports/campaign-stage',
    color: 'text-fuchsia-600',
    bgColor: 'bg-fuchsia-50',
  },
  {
    id: 'campaign-deal',
    name: 'Campaign Deal Report',
    description: 'Deals in-progress, won, and lost for campaigns',
    category: 'campaign',
    icon: CurrencyDollarIcon,
    path: '/reports/campaign-deal',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'campaign-source',
    name: 'Campaign Source Report',
    description: 'Lead count by campaign and sources',
    category: 'campaign',
    icon: FunnelIcon,
    path: '/reports/campaign-source',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
];

const tabs: { id: Category; label: string; icon: React.ElementType; count: number }[] = [
  { id: 'all', label: 'All Reports', icon: Squares2X2Icon, count: reports.length },
  { id: 'analytics', label: 'Analytics', icon: ChartBarIcon, count: reports.filter(r => r.category === 'analytics').length },
  { id: 'pipeline', label: 'Pipeline', icon: BoltIcon, count: reports.filter(r => r.category === 'pipeline').length },
  { id: 'user', label: 'User', icon: UserGroupIcon, count: reports.filter(r => r.category === 'user').length },
  { id: 'campaign', label: 'Campaign', icon: MegaphoneIcon, count: reports.filter(r => r.category === 'campaign').length },
];

export default function ReportsListingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter(report => {
    const matchesTab = activeTab === 'all' || report.category === activeTab;
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reports</h1>
              <p className="text-sm text-gray-500 mt-0.5">Browse and access all your reports</p>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm w-64 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-5 flex gap-1 overflow-x-auto pb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-purple-600 border-purple-600 bg-purple-50'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} onClick={() => navigate(report.path)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-700 mb-1">No reports found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Report Card Component
function ReportCard({ report, onClick }: { report: ReportItem; onClick: () => void }) {
  const Icon = report.icon;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-purple-200 cursor-pointer transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${report.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${report.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
            {report.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{report.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400 capitalize">{report.category === 'analytics' ? 'Analytics' : report.category}</span>
        <div className="flex items-center gap-1 text-xs text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
          View Report
          <ChevronRightIcon className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}
