import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchLeadStats } from '../../store/slices/leadSlice';
import { fetchStats } from '../../store/slices/rawImportSlice';
import subscriptionService, { Subscription } from '../../services/subscription.service';
import api from '../../services/api';
import { teamMonitoringService, LiveTeamStatus } from '../../services/team-monitoring.service';
import pipelineSettingsService, { Pipeline, PipelineAnalytics } from '../../services/pipeline-settings.service';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import {
  UsersIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  BoltIcon,
  EyeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

const STAGE_COLORS: Record<string, string> = {
  // Common Pipeline Stages - Brighter colors
  'New': '#60A5FA',           // Bright Blue
  'NEW': '#60A5FA',
  'Contacted': '#A78BFA',     // Bright Purple
  'CONTACTED': '#A78BFA',
  'Qualified': '#FBBF24',     // Bright Amber
  'QUALIFIED': '#FBBF24',
  'Negotiation': '#F472B6',   // Bright Pink
  'NEGOTIATION': '#F472B6',
  'Proposal': '#818CF8',      // Bright Indigo
  'PROPOSAL': '#818CF8',
  'Won': '#4ADE80',           // Bright Green
  'WON': '#4ADE80',
  'Lost': '#FB7185',          // Bright Red
  'LOST': '#FB7185',
  'Follow Up': '#FB923C',     // Bright Orange
  'Follow-Up': '#FB923C',
  'FOLLOW_UP': '#FB923C',
  // Education Pipeline Stages - Brighter
  'Admitted': '#34D399',      // Bright Emerald
  'ADMITTED': '#34D399',
  'Enrolled': '#10B981',      // Emerald
  'ENROLLED': '#10B981',
  'Application': '#38BDF8',   // Bright Sky
  'APPLICATION': '#38BDF8',
  'Document Verification': '#2DD4BF', // Bright Teal
  'DOCUMENT_VERIFICATION': '#2DD4BF',
  'Counseling': '#C084FC',    // Bright Violet
  'COUNSELING': '#C084FC',
  'Fee Payment': '#F9A8D4',   // Bright Pink
  'FEE_PAYMENT': '#F9A8D4',
  // Other common stages - Brighter
  'Unassigned': '#9CA3AF',    // Brighter Gray
  'UNASSIGNED': '#9CA3AF',
  'Pending': '#FCD34D',       // Bright Yellow
  'PENDING': '#FCD34D',
  'In Progress': '#60A5FA',   // Bright Blue
  'IN_PROGRESS': '#60A5FA',
  'Closed': '#94A3B8',        // Brighter Slate
  'CLOSED': '#94A3B8',
  'Inquiry': '#F472B6',       // Bright Pink
  'INQUIRY': '#F472B6',
};

const PIE_COLORS = ['#818CF8', '#F472B6', '#2DD4BF', '#FBBF24', '#A78BFA', '#FB7185', '#34D399', '#60A5FA', '#FB923C', '#4ADE80'];
const SOURCE_COLORS: Record<string, string> = {
  'FACEBOOK': '#4F9DF7',
  'INSTAGRAM': '#F56C8D',
  'GOOGLE': '#5C9EF8',
  'WEBSITE': '#34D399',
  'REFERRAL': '#A78BFA',
  'WALK_IN': '#FBBF24',
  'PHONE': '#22D3EE',
  'EMAIL': '#FB7185',
  'LINKEDIN': '#3B99FC',
  'TWITTER': '#38BDF8',
  'OTHER': '#9CA3AF',
};

// Call History Item
interface CallHistoryItem {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  outcome?: string;
  duration?: number;
  sentiment?: string;
  summary?: string;
  createdAt: string;
  lead?: {
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
  };
}

// Telecaller Dashboard Stats
interface DashboardStats {
  today: {
    calls: number;
    followUpsCompleted: number;
    pendingFollowUps: number;
    target: { calls: number; followUps: number };
  };
  yesterday?: {
    calls: number;
    outcomes: Record<string, number>;
    interested: number;
    interestRate: number;
    avgDuration: number;
  };
  assignedData: {
    leads: number;
    rawRecords: number;
    totalRawRecords: number;
    queueItems: number;
    total: number;
  };
  weeklyActivity: Array<{ day: string; date: string; calls: number; target: number }>;
  thisWeek: { totalCalls: number; followUpsCompleted: number; target: number };
  leads: {
    total: number;
    byStage: Record<string, number>;
    converted: number;
    won: number;
    conversionRate: number;
    winRate: number;
  };
  outcomes: Record<string, number>;
  callTypes?: { OUTBOUND: number; INBOUND: number };
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    leadName: string | null;
    leadId: string | null;
    createdAt: string;
  }>;
  pendingFollowUpsList?: Array<{
    id: string;
    leadId: string;
    leadName: string;
    phone: string | null;
    scheduledAt: string | null;
    notes: string | null;
    type: 'scheduled' | 'needs_attention';
  }>;
}

// Team member stats for Team Lead
interface TeamMemberStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalAssigned: number;
  callsToday: number;
  pending: number;
  interested: number;
  converted: number;
  conversionRate: number;
}

// Team Lead Dashboard Stats
interface TeamLeadDashboardStats {
  teamSize: number;
  totalAssigned: number;
  totalPending: number;
  totalInterested: number;
  totalConverted: number;
  callsToday: number;
  avgConversionRate: number;
  teamMembers: TeamMemberStats[];
}

// Admin/Manager Dashboard Stats
interface OrgDashboardStats {
  totalUsers: number;
  totalTelecallers: number;
  totalTeamLeads: number;
  totalLeads: number;
  totalImports: number;
  pendingRecords: number;
  assignedRecords: number;
  interestedRecords: number;
  convertedRecords: number;
  callsToday: number;
  activeVoiceAgents: number;
  activeCampaigns: number;
}

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { stats } = useSelector((state: RootState) => state.leads);
  const { stats: rawImportStats } = useSelector((state: RootState) => state.rawImports);
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Get user role - Admin dashboard is the default fallback
  const userRole = (user?.role?.toLowerCase() || '').trim();
  const isManager = userRole === 'manager';
  const isTeamLead = userRole === 'team_lead' || userRole === 'teamlead';
  const isTelecaller = userRole === 'telecaller' || userRole === 'counselor';

  useEffect(() => {
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    setLastRefresh(new Date());

    subscriptionService.getCurrentSubscription()
      .then(setSubscription)
      .catch(console.error);

    const timeTimer = setInterval(() => setCurrentTime(new Date()), 60000);
    const dataTimer = setInterval(() => {
      dispatch(fetchLeadStats());
      dispatch(fetchStats());
      setLastRefresh(new Date());
    }, 30000);

    return () => {
      clearInterval(timeTimer);
      clearInterval(dataTimer);
    };
  }, [dispatch]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Render based on role
  if (isTelecaller) {
    return <TelecallerDashboard user={user} getGreeting={getGreeting} currentTime={currentTime} lastRefresh={lastRefresh} setLastRefresh={setLastRefresh} />;
  }

  if (isTeamLead) {
    return <TeamLeadDashboard user={user} getGreeting={getGreeting} lastRefresh={lastRefresh} setLastRefresh={setLastRefresh} />;
  }

  if (isManager) {
    return <ManagerDashboard user={user} getGreeting={getGreeting} lastRefresh={lastRefresh} setLastRefresh={setLastRefresh} stats={stats} rawImportStats={rawImportStats} />;
  }

  // Admin Dashboard (default)
  return <AdminDashboard user={user} getGreeting={getGreeting} lastRefresh={lastRefresh} setLastRefresh={setLastRefresh} stats={stats} rawImportStats={rawImportStats} subscription={subscription} />;
}

// ============================================
// TELECALLER DASHBOARD
// ============================================
function TelecallerDashboard({ user, getGreeting, currentTime, lastRefresh, setLastRefresh }: any) {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallHistoryItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, callsRes] = await Promise.all([
        api.get('/telecaller/dashboard-stats'),
        api.get('/telecaller/calls?limit=20')
      ]);
      setDashboardStats(statsRes.data?.data || null);
      setCallHistory(callsRes.data?.data?.calls || []);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCallDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'INTERESTED':
      case 'CONVERTED':
        return 'bg-gradient-to-r from-emerald-400 to-green-500 text-white';
      case 'NOT_INTERESTED':
        return 'bg-gradient-to-r from-red-400 to-rose-500 text-white';
      case 'CALLBACK':
        return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white';
      case 'NO_ANSWER':
        return 'bg-gradient-to-r from-gray-400 to-slate-500 text-white';
      default:
        return 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white';
    }
  };

  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return { emoji: '😊', color: 'text-green-600' };
      case 'negative':
        return { emoji: '😞', color: 'text-red-600' };
      default:
        return { emoji: '😐', color: 'text-gray-500' };
    }
  };

  const weeklyActivity = dashboardStats?.weeklyActivity || [];
  const dailyCallTarget = dashboardStats?.today?.target?.calls || dashboardStats?.assignedData?.total || 0;
  const callsProgress = dailyCallTarget > 0 ? Math.min(((dashboardStats?.today?.calls || 0) / dailyCallTarget) * 100, 100) : 0;

  // Dynamically generate pipeline data from all stages returned by API
  const waterfallData = dashboardStats?.leads?.byStage
    ? Object.entries(dashboardStats.leads.byStage)
        .map(([stageName, count], index) => ({
          name: stageName,
          value: count as number,
          fill: STAGE_COLORS[stageName] || STAGE_COLORS[stageName.toUpperCase()] || PIE_COLORS[index % PIE_COLORS.length],
        }))
        .filter(stage => stage.value > 0) // Only show stages with leads
        .sort((a, b) => b.value - a.value) // Sort by count descending
    : [];

  return (
    <div className="p-4 min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-gray-900">{getGreeting()}, {user?.firstName ? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase() : ''}</h1>
          <span className="text-gray-500 text-xs hidden sm:inline">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-600 text-[10px] font-medium">Live</span>
          </div>
        </div>
        <button onClick={() => { fetchData(); setLastRefresh(new Date()); }} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all">
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards - Bright & Vibrant */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <Link to="/leads?assignedToMe=true" className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] transition-all cursor-pointer group">
          <p className="text-blue-100 text-[10px] uppercase tracking-wide font-medium">Leads</p>
          <p className="text-2xl font-bold text-white">{dashboardStats?.leads?.total || 0}</p>
        </Link>
        <Link to="/telecaller-call-history" className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-3 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02] transition-all cursor-pointer group">
          <p className="text-violet-100 text-[10px] uppercase tracking-wide font-medium">Calls Today</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-white">{dashboardStats?.today?.calls || 0}<span className="text-violet-200 text-sm font-normal">/{dailyCallTarget}</span></p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${callsProgress >= 100 ? 'bg-emerald-400 text-emerald-900' : 'bg-white/20 text-white'}`}>{Math.round(callsProgress)}%</span>
          </div>
        </Link>
        <Link to="/leads?pendingFollowUp=true" className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-3 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] transition-all cursor-pointer group">
          <p className="text-amber-100 text-[10px] uppercase tracking-wide font-medium">Follow-ups</p>
          <p className="text-2xl font-bold text-white">{dashboardStats?.today?.followUpsCompleted || 0}<span className="text-white text-sm font-semibold ml-1 bg-white/20 px-1.5 py-0.5 rounded">+{dashboardStats?.today?.pendingFollowUps || 0}</span></p>
        </Link>
        <Link to="/leads?converted=true" className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-3 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all cursor-pointer group">
          <p className="text-emerald-100 text-[10px] uppercase tracking-wide font-medium">Conversion</p>
          <p className="text-2xl font-bold text-white">{dashboardStats?.leads?.conversionRate || 0}%</p>
        </Link>
        <Link to="/leads?stage=Admitted" className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-3 shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.02] transition-all cursor-pointer group">
          <p className="text-cyan-100 text-[10px] uppercase tracking-wide font-medium">Win Rate</p>
          <p className="text-2xl font-bold text-white">{dashboardStats?.leads?.winRate || 0}%</p>
        </Link>
        <Link to="/leads?stage=Admitted" className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02] transition-all cursor-pointer group">
          <p className="text-green-100 text-[10px] uppercase tracking-wide font-medium">Won</p>
          <p className="text-2xl font-bold text-white">{dashboardStats?.leads?.won || 0}</p>
        </Link>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Call Outcomes - From Raw List + Leads */}
          <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-xl p-4 border border-violet-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full"></div>
                <h3 className="text-sm font-bold text-violet-800 uppercase tracking-wide">Today's Calls</h3>
              </div>
              <span className="text-[10px] text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full font-medium">Raw List + Leads</span>
            </div>
            <div className="flex items-center gap-6">
              {/* Donut Chart - Only call outcomes */}
              <div className="relative w-36 h-36 flex-shrink-0">
                {(() => {
                  const chartData = [
                    { name: 'Interested', value: dashboardStats?.outcomes?.INTERESTED || 0, fill: '#34D399' },
                    { name: 'Not Interested', value: dashboardStats?.outcomes?.NOT_INTERESTED || 0, fill: '#FB7185' },
                    { name: 'No Answer', value: dashboardStats?.outcomes?.NO_ANSWER || 0, fill: '#FBBF24' },
                    { name: 'Callbacks', value: dashboardStats?.outcomes?.CALLBACK || dashboardStats?.outcomes?.CALLBACK_REQUESTED || 0, fill: '#60A5FA' },
                    { name: 'Other', value: Math.max(0, (dashboardStats?.today?.calls || 0) -
                      ((dashboardStats?.outcomes?.INTERESTED || 0) +
                       (dashboardStats?.outcomes?.NOT_INTERESTED || 0) +
                       (dashboardStats?.outcomes?.NO_ANSWER || 0) +
                       (dashboardStats?.outcomes?.CALLBACK || dashboardStats?.outcomes?.CALLBACK_REQUESTED || 0))), fill: '#C4B5FD' },
                  ].filter(item => item.value > 0);

                  const displayData = chartData.length > 0 ? chartData : [{ name: 'No Calls', value: 1, fill: '#E5E7EB' }];

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={58}
                          paddingAngle={chartData.length > 0 ? 3 : 0}
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {displayData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        {chartData.length > 0 && (
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '12px' }} />
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-violet-700">{
                    dashboardStats?.today?.calls ||
                    ((dashboardStats?.outcomes?.INTERESTED || 0) +
                     (dashboardStats?.outcomes?.NOT_INTERESTED || 0) +
                     (dashboardStats?.outcomes?.NO_ANSWER || 0) +
                     (dashboardStats?.outcomes?.CALLBACK || dashboardStats?.outcomes?.CALLBACK_REQUESTED || 0))
                  }</span>
                  <span className="text-[9px] text-violet-500 uppercase font-medium">Total Calls</span>
                </div>
              </div>

              {/* Call Outcome Stats - 2x2 Grid */}
              <div className="flex-1 grid grid-cols-2 gap-1.5">
                <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg p-2 shadow-md shadow-emerald-200">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                    <span className="text-[9px] text-emerald-100 uppercase font-semibold">Interested</span>
                  </div>
                  <span className="text-lg font-bold text-white">{dashboardStats?.outcomes?.INTERESTED || 0}</span>
                </div>
                <div className="bg-gradient-to-br from-rose-400 to-red-500 rounded-lg p-2 shadow-md shadow-rose-200">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                    <span className="text-[9px] text-rose-100 uppercase font-semibold">Not Int.</span>
                  </div>
                  <span className="text-lg font-bold text-white">{dashboardStats?.outcomes?.NOT_INTERESTED || 0}</span>
                </div>
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg p-2 shadow-md shadow-amber-200">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                    <span className="text-[9px] text-amber-100 uppercase font-semibold">No Answer</span>
                  </div>
                  <span className="text-lg font-bold text-white">{dashboardStats?.outcomes?.NO_ANSWER || 0}</span>
                </div>
                <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg p-2 shadow-md shadow-blue-200">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                    <span className="text-[9px] text-blue-100 uppercase font-semibold">Callbacks</span>
                  </div>
                  <span className="text-lg font-bold text-white">{dashboardStats?.outcomes?.CALLBACK || dashboardStats?.outcomes?.CALLBACK_REQUESTED || 0}</span>
                </div>
              </div>
            </div>

            {/* Call Type Breakdown */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <PhoneIcon className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 uppercase">Call Types</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-gradient-to-r from-sky-100 to-blue-100 rounded-lg p-2 border border-sky-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      <span className="text-xs font-medium text-sky-700">Outbound</span>
                    </div>
                    <span className="text-lg font-bold text-sky-600">{dashboardStats?.callTypes?.OUTBOUND || 0}</span>
                  </div>
                </div>
                <div className="flex-1 bg-gradient-to-r from-teal-100 to-emerald-100 rounded-lg p-2 border border-teal-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      <span className="text-xs font-medium text-teal-700">Inbound</span>
                    </div>
                    <span className="text-lg font-bold text-teal-600">{dashboardStats?.callTypes?.INBOUND || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Performance - Separate section for lead-based metrics */}
          <div className="bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50 rounded-xl p-4 border border-pink-200 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-gradient-to-b from-pink-500 to-fuchsia-500 rounded-full"></div>
                <h3 className="text-sm font-bold text-pink-800 uppercase tracking-wide">Lead Performance</h3>
              </div>
              <span className="text-[10px] text-pink-500 bg-pink-100 px-2 py-0.5 rounded-full font-medium">From Leads Only</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-cyan-400 to-teal-500 rounded-xl p-3 shadow-lg shadow-cyan-200 text-center">
                <span className="text-[10px] text-cyan-100 uppercase font-semibold block mb-1">Follow-ups Done</span>
                <span className="text-2xl font-bold text-white">{dashboardStats?.today?.followUpsCompleted || 0}</span>
              </div>
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-3 shadow-lg shadow-violet-200 text-center">
                <span className="text-[10px] text-violet-100 uppercase font-semibold block mb-1">Pending F/U</span>
                <span className="text-2xl font-bold text-white">{dashboardStats?.today?.pendingFollowUps || 0}</span>
              </div>
              <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl p-3 shadow-lg shadow-fuchsia-200 text-center">
                <span className="text-[10px] text-fuchsia-100 uppercase font-semibold block mb-1">Converted</span>
                <span className="text-2xl font-bold text-white">{dashboardStats?.leads?.converted || 0}</span>
              </div>
            </div>
          </div>

          {/* Assigned Data & Pipeline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-50 rounded-xl p-4 border border-blue-200 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Assigned Data</h3>
              </div>
              <div className="space-y-2">
                <Link to="/assigned-data" className="flex justify-between items-center hover:bg-white/60 p-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                  <span className="text-blue-700 text-sm">Total Assigned</span>
                  <span className="text-blue-900 font-bold text-lg">{dashboardStats?.assignedData?.totalRawRecords || 0}</span>
                </Link>
                <Link to="/assigned-data?status=pending" className="flex justify-between items-center hover:bg-white/60 p-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                  <span className="text-blue-700 text-sm">Pending Calls</span>
                  <span className="text-amber-600 font-bold text-lg">{dashboardStats?.assignedData?.rawRecords || 0}</span>
                </Link>
                <Link to="/calling-queue" className="flex justify-between items-center hover:bg-white/60 p-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                  <span className="text-blue-700 text-sm">In Queue</span>
                  <span className="text-indigo-600 font-bold text-lg">{dashboardStats?.assignedData?.queueItems || 0}</span>
                </Link>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 via-fuchsia-100 to-pink-100 rounded-xl p-4 border border-purple-200 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-fuchsia-500 rounded-full shadow-sm shadow-purple-500/50"></div>
                <h3 className="text-xs font-bold text-purple-800 uppercase tracking-wide">Lead Pipeline</h3>
              </div>
              <div className="space-y-1">
                {waterfallData.length > 0 ? (
                  waterfallData.map((stage, idx) => (
                    <Link
                      key={idx}
                      to={`/leads?stage=${encodeURIComponent(stage.name)}`}
                      className="flex justify-between items-center hover:bg-white/70 p-2.5 -mx-2 rounded-lg transition-all hover:shadow-sm cursor-pointer"
                    >
                      <span className="text-sm font-semibold" style={{ color: stage.fill }}>{stage.name}</span>
                      <span className="text-purple-900 text-sm font-bold">{stage.value}</span>
                    </Link>
                  ))
                ) : (
                  <p className="text-purple-400 text-sm text-center py-3 font-medium">No leads assigned yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Pending Follow-ups List */}
          <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 rounded-xl p-4 border border-amber-200 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full shadow-sm shadow-amber-500/50"></div>
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Pending Follow-ups</h3>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {dashboardStats?.pendingFollowUpsList && dashboardStats.pendingFollowUpsList.length > 0 ? (
                dashboardStats.pendingFollowUpsList.map((followUp) => (
                  <Link
                    key={followUp.id}
                    to={`/leads/${followUp.leadId}`}
                    className="block p-3 bg-white/80 hover:bg-white rounded-lg transition-all hover:shadow-md border border-amber-200 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-amber-900 text-sm font-semibold">{followUp.leadName}</p>
                        {followUp.phone && (
                          <p className="text-amber-600 text-xs font-medium">{followUp.phone}</p>
                        )}
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm ${
                        followUp.type === 'scheduled' ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white' : 'bg-gradient-to-r from-red-400 to-rose-500 text-white'
                      }`}>
                        {followUp.type === 'scheduled' ? 'Scheduled' : 'Overdue'}
                      </span>
                    </div>
                    {followUp.scheduledAt && (
                      <p className="text-orange-600 text-xs mt-1.5 font-bold">
                        {new Date(followUp.scheduledAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    )}
                    {followUp.notes && (
                      <p className="text-amber-500 text-xs mt-1 truncate font-medium">{followUp.notes}</p>
                    )}
                  </Link>
                ))
              ) : (
                <p className="text-amber-500 text-sm text-center py-4 font-medium">No pending follow-ups</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-indigo-100 via-violet-100 to-purple-100 rounded-xl p-4 border border-indigo-200 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full shadow-sm shadow-indigo-500/50"></div>
              <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              <Link to="/assigned-data" className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg text-white text-sm font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] transition-all">
                <PhoneIcon className="w-5 h-5" /> Start Calling
              </Link>
              <Link to="/leads?pendingFollowUp=true" className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] transition-all">
                <ArrowPathIcon className="w-5 h-5" /> View All Follow-ups
              </Link>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-4 border border-emerald-200 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full shadow-sm shadow-emerald-500/50"></div>
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Performance Insights</h3>
            </div>
            <div className="space-y-2">
              {(() => {
                const insights = [];
                const todayCalls = dashboardStats?.today?.calls || 0;
                const target = dashboardStats?.today?.target?.calls || 1;
                const targetPercent = Math.round((todayCalls / target) * 100);
                const interested = dashboardStats?.outcomes?.INTERESTED || 0;
                const notInterested = dashboardStats?.outcomes?.NOT_INTERESTED || 0;
                const noAnswer = dashboardStats?.outcomes?.NO_ANSWER || 0;
                const callbacks = dashboardStats?.outcomes?.CALLBACK || dashboardStats?.outcomes?.CALLBACK_REQUESTED || 0;
                const totalOutcomes = interested + notInterested + noAnswer + callbacks;
                const interestRate = totalOutcomes > 0 ? Math.round((interested / totalOutcomes) * 100) : 0;
                const conversionRate = dashboardStats?.leads?.conversionRate || 0;
                const pendingFollowUps = dashboardStats?.today?.pendingFollowUps || 0;

                // Target completion insight
                if (targetPercent < 50) {
                  insights.push({ type: 'warning', iconType: 'phone', text: `Call volume low (${targetPercent}% of target). Make more calls to increase leads.` });
                } else if (targetPercent >= 100) {
                  insights.push({ type: 'success', iconType: 'check', text: `Target achieved (${targetPercent}%). Keep up the momentum!` });
                } else {
                  insights.push({ type: 'info', iconType: 'bolt', text: `${100 - targetPercent}% more calls needed to hit today's target.` });
                }

                // Interest rate insight
                if (totalOutcomes > 0) {
                  if (interestRate < 20) {
                    insights.push({ type: 'warning', iconType: 'warn', text: `Interest rate is ${interestRate}%. Try improving your pitch opening.` });
                  } else if (interestRate >= 40) {
                    insights.push({ type: 'success', iconType: 'sparkle', text: `Excellent interest rate (${interestRate}%)! Your pitch is working well.` });
                  }
                }

                // No answer insight
                if (noAnswer > 3 && totalOutcomes > 0) {
                  const noAnswerRate = Math.round((noAnswer / totalOutcomes) * 100);
                  if (noAnswerRate > 40) {
                    insights.push({ type: 'tip', iconType: 'clock', text: `High no-answer rate (${noAnswerRate}%). Try calling between 10AM-12PM or 4PM-6PM.` });
                  }
                }

                // Follow-up insight
                if (pendingFollowUps > 5) {
                  insights.push({ type: 'warning', iconType: 'warn', text: `${pendingFollowUps} pending follow-ups. Clear these for better conversion.` });
                } else if (pendingFollowUps === 0 && todayCalls > 0) {
                  insights.push({ type: 'success', iconType: 'check', text: 'All follow-ups done! Focus on new leads now.' });
                }

                // Callback insight
                if (callbacks > 0 && callbacks > interested) {
                  insights.push({ type: 'tip', iconType: 'refresh', text: `${callbacks} callbacks pending. Follow up within 24hrs for best results.` });
                }

                // Default insight if none
                if (insights.length === 0) {
                  insights.push({ type: 'info', iconType: 'chart', text: 'Start making calls to see personalized insights.' });
                }

                const getIcon = (iconType: string) => {
                  const iconClass = "w-4 h-4 flex-shrink-0";
                  switch (iconType) {
                    case 'up': return <ArrowTrendingUpIcon className={iconClass} />;
                    case 'down': return <ArrowTrendingDownIcon className={iconClass} />;
                    case 'fire': return <FireIcon className={iconClass} />;
                    case 'bulb': return <LightBulbIcon className={iconClass} />;
                    case 'phone': return <PhoneIcon className={iconClass} />;
                    case 'check': return <CheckCircleIcon className={iconClass} />;
                    case 'bolt': return <BoltIcon className={iconClass} />;
                    case 'warn': return <ExclamationTriangleIcon className={iconClass} />;
                    case 'sparkle': return <SparklesIcon className={iconClass} />;
                    case 'clock': return <ClockIcon className={iconClass} />;
                    case 'refresh': return <ArrowPathIcon className={iconClass} />;
                    case 'chart': return <ChartBarIcon className={iconClass} />;
                    default: return <BoltIcon className={iconClass} />;
                  }
                };

                return insights.slice(0, 4).map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      insight.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                      insight.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      insight.type === 'tip' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {getIcon(insight.iconType)}
                    <span>{insight.text}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Call History Section */}
      <div className="mt-4 bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 rounded-xl p-4 border border-slate-200 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-gradient-to-b from-slate-500 to-gray-600 rounded-full shadow-sm shadow-slate-500/50"></div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Recent Call History</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">{callHistory.length} calls</span>
        </div>

        {callHistory.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {callHistory.map((call) => (
              <div
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className="bg-white/80 hover:bg-white rounded-lg p-3 border border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(call.contactName || call.lead?.firstName || call.phoneNumber).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {call.contactName || (call.lead ? `${call.lead.firstName} ${call.lead.lastName || ''}`.trim() : call.phoneNumber)}
                        </p>
                        <p className="text-xs text-slate-500">{call.phoneNumber}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-slate-700">{formatDuration(call.duration)}</p>
                      <p className="text-[10px] text-slate-400">{formatCallDate(call.createdAt)}</p>
                    </div>
                    {call.outcome && (
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold shadow-sm ${getOutcomeColor(call.outcome)}`}>
                        {call.outcome.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto flex items-center justify-center mb-3">
              <PhoneIcon className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No calls recorded yet</p>
            <p className="text-slate-400 text-xs mt-1">Start making calls to see your history here</p>
          </div>
        )}
      </div>

      {/* Call Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCall(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Call Details</h2>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Contact Info */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 text-center border border-slate-200">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
                  <span className="text-2xl font-bold text-white">
                    {(selectedCall.contactName || selectedCall.phoneNumber).charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {selectedCall.contactName || (selectedCall.lead ? `${selectedCall.lead.firstName} ${selectedCall.lead.lastName || ''}`.trim() : 'Unknown')}
                </h3>
                <p className="text-slate-500">{selectedCall.phoneNumber}</p>
              </div>

              {/* Call Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl p-3 text-center border border-violet-200">
                  <div className="text-lg font-bold text-violet-700">{formatDuration(selectedCall.duration)}</div>
                  <div className="text-[10px] text-violet-500 font-medium uppercase">Duration</div>
                </div>
                <div className={`rounded-xl p-3 text-center border ${
                  selectedCall.outcome === 'INTERESTED' || selectedCall.outcome === 'CONVERTED'
                    ? 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-200'
                    : selectedCall.outcome === 'NOT_INTERESTED'
                    ? 'bg-gradient-to-br from-red-100 to-rose-100 border-red-200'
                    : 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-200'
                }`}>
                  <div className={`text-lg font-bold ${
                    selectedCall.outcome === 'INTERESTED' || selectedCall.outcome === 'CONVERTED'
                      ? 'text-emerald-700'
                      : selectedCall.outcome === 'NOT_INTERESTED'
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}>
                    {selectedCall.outcome?.replace('_', ' ') || '-'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase">Outcome</div>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl p-3 text-center border border-blue-200">
                  <div className={`text-lg font-bold ${getSentimentEmoji(selectedCall.sentiment).color}`}>
                    {selectedCall.sentiment || '-'}
                  </div>
                  <div className="text-[10px] text-blue-500 font-medium uppercase">Sentiment</div>
                </div>
              </div>

              {/* Summary */}
              {selectedCall.summary && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2 text-sm">Call Summary</h4>
                  <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 text-slate-600 text-sm border border-slate-200">
                    {selectedCall.summary}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-center text-slate-400 text-sm">
                {new Date(selectedCall.createdAt).toLocaleString()}
              </div>

              {/* Call Again Button */}
              {selectedCall.lead && (
                <Link
                  to={`/leads/${selectedCall.lead.id}`}
                  onClick={() => setSelectedCall(null)}
                  className="block w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-center rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all hover:shadow-xl hover:shadow-green-500/40"
                >
                  View Lead Details
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs mt-4 pt-3 border-t border-gray-200">
        <span className="text-gray-500 font-medium">Last updated: {lastRefresh.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-100 to-green-100 px-3 py-1 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 animate-pulse shadow-sm shadow-emerald-500/50"></span>
          <span className="text-emerald-700 font-bold">Real-time</span>
        </span>
      </div>
    </div>
  );
}

// ============================================
// TEAM LEAD DASHBOARD
// ============================================
function TeamLeadDashboard({ user, getGreeting, lastRefresh, setLastRefresh }: any) {
  const [teamStats, setTeamStats] = useState<TeamLeadDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/telecaller/team-dashboard-stats');
      setTeamStats(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch team stats:', error);
      setTeamStats({
        teamSize: 0,
        totalAssigned: 0,
        totalPending: 0,
        totalInterested: 0,
        totalConverted: 0,
        callsToday: 0,
        avgConversionRate: 0,
        teamMembers: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Sort team members by performance
  const sortedByConversion = [...(teamStats?.teamMembers || [])].sort((a, b) => b.conversionRate - a.conversionRate);
  const topPerformers = sortedByConversion.slice(0, 3);
  const needsAttention = sortedByConversion.filter(m => m.conversionRate < 10 || m.callsToday === 0);

  // Team health indicator
  const teamHealth = teamStats?.avgConversionRate !== undefined
    ? teamStats.avgConversionRate >= 15 ? 'excellent' : teamStats.avgConversionRate >= 10 ? 'good' : teamStats.avgConversionRate >= 5 ? 'fair' : 'needs-improvement'
    : 'no-data';

  const healthColors = {
    'excellent': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'good': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    'fair': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    'needs-improvement': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    'no-data': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
  };

  // Chart data for team member comparison
  const teamChartData = (teamStats?.teamMembers || []).map(m => ({
    name: `${m.firstName} ${m.lastName?.charAt(0) || ''}`.trim(),
    calls: m.callsToday,
    converted: m.converted,
    conversion: m.conversionRate,
  }));

  return (
    <div className="space-y-4">
      {/* Header with Team Health */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{getGreeting()}, {user?.firstName ? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase() : ''}</h1>
            <p className="text-indigo-200 text-sm">Team Lead Dashboard - Your Team's Performance</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold">{teamStats?.teamSize || 0}</p>
              <p className="text-indigo-200 text-xs">Team Members</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full ${healthColors[teamHealth].bg} flex items-center gap-2`}>
              <span className={`w-2 h-2 rounded-full ${healthColors[teamHealth].dot} animate-pulse`}></span>
              <span className={`text-xs font-medium ${healthColors[teamHealth].text} capitalize`}>
                {teamHealth === 'needs-improvement' ? 'Needs Attention' : teamHealth === 'no-data' ? 'No Data' : teamHealth}
              </span>
            </div>
            <button onClick={() => { fetchData(); setLastRefresh(new Date()); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Total Assigned</p>
          <p className="text-2xl font-bold text-gray-900">{teamStats?.totalAssigned || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Across all members</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{teamStats?.totalPending || 0}</p>
          <p className="text-xs text-gray-400 mt-1">To be contacted</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Interested</p>
          <p className="text-2xl font-bold text-green-600">{teamStats?.totalInterested || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Warm leads</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Converted</p>
          <p className="text-2xl font-bold text-indigo-600">{teamStats?.totalConverted || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Success!</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Calls Today</p>
          <p className="text-2xl font-bold text-blue-600">{teamStats?.callsToday || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Team total</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Avg Conversion</p>
          <p className={`text-2xl font-bold ${teamStats?.avgConversionRate && teamStats.avgConversionRate >= 15 ? 'text-emerald-600' : teamStats?.avgConversionRate && teamStats.avgConversionRate >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
            {teamStats?.avgConversionRate || 0}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Team average</p>
        </div>
      </div>

      {/* Team Performance Chart + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Team Comparison Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Team Member Comparison</h2>
          {teamChartData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamChartData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} width={30} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#6366F1" name="Calls Today" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" fill="#10B981" name="Converted" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No team data available</div>
          )}
        </div>

        {/* Top Performers & Needs Attention */}
        <div className="space-y-4">
          {/* Top Performers */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <ArrowUpRightIcon className="w-3 h-3 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Top Performers</h3>
            </div>
            {topPerformers.length > 0 ? (
              <div className="space-y-2">
                {topPerformers.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-gray-900">{member.firstName} {member.lastName?.charAt(0)}.</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{member.conversionRate}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">No data yet</p>
            )}
          </div>

          {/* Needs Attention */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <EyeIcon className="w-3 h-3 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Needs Attention</h3>
            </div>
            {needsAttention.length > 0 ? (
              <div className="space-y-2">
                {needsAttention.slice(0, 3).map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                    <span className="text-sm text-gray-900">{member.firstName} {member.lastName?.charAt(0)}.</span>
                    <div className="flex items-center gap-2">
                      {member.callsToday === 0 && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">No calls</span>}
                      <span className="text-sm font-semibold text-amber-600">{member.conversionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600 text-center py-2">All team members performing well!</p>
            )}
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Team Members Detail</h2>
          <Link to="/leads" className="text-xs text-indigo-600 hover:text-indigo-700">View All Leads →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Telecaller</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Assigned</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Calls Today</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Pending</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Interested</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Converted</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Conversion %</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(teamStats?.teamMembers || []).length > 0 ? (
                teamStats?.teamMembers.map((member, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          member.conversionRate >= 15 ? 'bg-emerald-500' : member.conversionRate >= 10 ? 'bg-amber-500' : 'bg-gray-400'
                        }`}>
                          {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 text-sm text-gray-900">{member.totalAssigned}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-sm font-medium ${member.callsToday > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {member.callsToday}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3 text-sm text-amber-600">{member.pending}</td>
                    <td className="text-center px-4 py-3 text-sm text-green-600">{member.interested}</td>
                    <td className="text-center px-4 py-3 text-sm text-indigo-600 font-medium">{member.converted}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-sm font-medium ${member.conversionRate >= 15 ? 'text-emerald-600' : member.conversionRate >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                        {member.conversionRate}%
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      {member.callsToday === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Idle</span>
                      ) : member.conversionRate >= 15 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Excellent</span>
                      ) : member.conversionRate >= 10 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Monitor</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <UserGroupIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm">No team members assigned yet</p>
                    <p className="text-xs text-gray-400">Contact admin to assign telecallers to your team</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Link to="/assignments" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Assignments</p>
            <p className="text-xs text-gray-500">Manage team data</p>
          </div>
        </Link>
        <Link to="/call-monitoring" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <EyeIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Call Monitoring</p>
            <p className="text-xs text-gray-500">Monitor live calls</p>
          </div>
        </Link>
        <Link to="/analytics/telecaller-performance" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Performance</p>
            <p className="text-xs text-gray-500">Detailed analytics</p>
          </div>
        </Link>
        <Link to="/leads" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <DocumentArrowUpIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Team Leads</p>
            <p className="text-xs text-gray-500">View all team leads</p>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {lastRefresh.toLocaleTimeString()} | Showing data for your team only
      </div>
    </div>
  );
}

// Leaderboard entry type
interface LeaderboardEntry {
  id: string;
  name: string;
  calls: number;
  connected: number;
  conversions: number;
  conversionRate: number;
}

// ============================================
// MANAGER DASHBOARD
// ============================================
function ManagerDashboard({ user, getGreeting, lastRefresh, setLastRefresh, stats, rawImportStats }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [teamOverview, setTeamOverview] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [liveStatus, setLiveStatus] = useState<LiveTeamStatus | null>(null);

  useEffect(() => {
    fetchManagerData();
    fetchLiveStatus();

    const liveStatusInterval = setInterval(fetchLiveStatus, 30000);
    return () => clearInterval(liveStatusInterval);
  }, []);

  const fetchLiveStatus = async () => {
    try {
      const status = await teamMonitoringService.getLiveStatus();
      setLiveStatus(status);
    } catch (error) {
      console.error('Failed to fetch live status:', error);
    }
  };

  const fetchManagerData = async () => {
    try {
      // Fetch team overview and leaderboard in parallel
      const [usersRes, leaderboardRes] = await Promise.all([
        api.get('/users?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/telecaller-analytics/leaderboard?metric=calls&limit=10').catch(() => ({ data: { data: [] } })),
      ]);
      const users = usersRes.data?.data || [];

      // Build team overview
      const teamLeads = users.filter((u: any) => u.role?.slug?.toLowerCase() === 'team_lead');
      const telecallers = users.filter((u: any) => ['telecaller', 'counselor', 'sales'].includes(u.role?.slug?.toLowerCase()));

      // Group telecallers by manager
      const teamData = teamLeads.map((tl: any) => {
        const members = telecallers.filter((t: any) => t.managerId === tl.id);
        return {
          id: tl.id,
          name: `${tl.firstName} ${tl.lastName || ''}`.trim(),
          memberCount: members.length,
          members: members.map((m: any) => ({ id: m.id, name: `${m.firstName} ${m.lastName || ''}`.trim() })),
        };
      });
      setTeamOverview(teamData);

      // Set leaderboard data
      const leaderboardData = (leaderboardRes.data?.data || []).map((entry: any) => ({
        id: entry.telecallerId || entry.id,
        name: entry.telecallerName || entry.name || 'Unknown',
        calls: entry.totalCalls || entry.calls || 0,
        connected: entry.connectedCalls || entry.connected || 0,
        conversions: entry.conversions || 0,
        conversionRate: entry.conversionRate || 0,
      }));
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Failed to fetch manager data:', error);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    fetchManagerData();
    fetchLiveStatus();
    setLastRefresh(new Date());
    setTimeout(() => setLoading(false), 500);
  };

  const statusPieData = stats?.byStatus
    ? Object.entries(stats.byStatus).map(([status, count], index) => ({
        name: status.replace('_', ' '),
        value: count as number,
        color: STAGE_COLORS[status] || PIE_COLORS[index % PIE_COLORS.length],
      }))
    : [];

  // Calculate conversion rate
  const totalRecords = rawImportStats?.totalRecords || 0;
  const convertedRecords = rawImportStats?.convertedRecords || 0;
  const overallConversionRate = totalRecords > 0 ? Math.round((convertedRecords / totalRecords) * 100 * 10) / 10 : 0;

  return (
    <div className="space-y-4">
      {/* Header - Vibrant gradient */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-xl p-4 text-white shadow-lg shadow-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{getGreeting()}, {user?.firstName ? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase() : ''}</h1>
            <p className="text-purple-200 text-sm">Manager Dashboard - Organization Overview</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <p className="text-2xl font-bold">{teamOverview.length}</p>
                <p className="text-[10px] text-purple-100 font-medium">Teams</p>
              </div>
              <div className="text-center px-4 py-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-lg">
                <p className="text-2xl font-bold">{overallConversionRate}%</p>
                <p className="text-[10px] text-emerald-100 font-medium">Conversion</p>
              </div>
            </div>
            <button onClick={handleRefresh} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all backdrop-blur-sm border border-white/20">
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Team Status - Enhanced colors */}
      {liveStatus && (
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-gray-200 p-4 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-base font-bold text-gray-900">Live Team Status</h2>
            </div>
            <Link to="/team-monitoring" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View Details →</Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl shadow-sm">
              <p className="text-3xl font-bold text-slate-700">{liveStatus.summary.total}</p>
              <p className="text-xs text-slate-600 font-medium mt-1">Total Team</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-lg shadow-emerald-200">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                <p className="text-3xl font-bold text-white">{liveStatus.summary.active}</p>
              </div>
              <p className="text-xs text-emerald-100 font-medium mt-1">Active Now</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-200">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                <p className="text-3xl font-bold text-white">{liveStatus.summary.onBreak}</p>
              </div>
              <p className="text-xs text-amber-100 font-medium mt-1">On Break</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-300 to-slate-400 rounded-xl shadow-sm">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/70"></span>
                <p className="text-3xl font-bold text-white">{liveStatus.summary.offline}</p>
              </div>
              <p className="text-xs text-gray-100 font-medium mt-1">Offline</p>
            </div>
          </div>
          {liveStatus.members.filter(m => m.status === 'active').length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-3 font-medium">Currently Active:</p>
              <div className="flex flex-wrap gap-2">
                {liveStatus.members.filter(m => m.status === 'active').slice(0, 10).map((member) => (
                  <div key={member.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full border border-emerald-200 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-emerald-700 font-semibold">{member.name.split(' ')[0]}</span>
                  </div>
                ))}
                {liveStatus.members.filter(m => m.status === 'active').length > 10 && (
                  <span className="text-xs text-gray-500 px-3 py-1.5 bg-gray-100 rounded-full">+{liveStatus.members.filter(m => m.status === 'active').length - 10} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs - Colorful gradient cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Link to="/leads" className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] transition-all">
          <p className="text-indigo-100 text-xs uppercase tracking-wide font-medium">Total Leads</p>
          <p className="text-3xl font-bold text-white mt-1">{stats?.total || 0}</p>
        </Link>
        <Link to="/leads?status=NEW" className="bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl p-4 shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] transition-all">
          <p className="text-emerald-100 text-xs uppercase tracking-wide font-medium">New Today</p>
          <p className="text-3xl font-bold text-white mt-1">{stats?.todayCount || 0}</p>
        </Link>
        <Link to="/raw-imports" className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-4 shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-[1.02] transition-all">
          <p className="text-amber-100 text-xs uppercase tracking-wide font-medium">Pending Review</p>
          <p className="text-3xl font-bold text-white mt-1">{rawImportStats?.pendingRecords || 0}</p>
        </Link>
        <div className="bg-gradient-to-br from-blue-400 to-cyan-600 rounded-xl p-4 shadow-lg shadow-blue-200">
          <p className="text-blue-100 text-xs uppercase tracking-wide font-medium">Assigned</p>
          <p className="text-3xl font-bold text-white mt-1">{rawImportStats?.assignedRecords || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-teal-400 to-emerald-600 rounded-xl p-4 shadow-lg shadow-teal-200">
          <p className="text-teal-100 text-xs uppercase tracking-wide font-medium">Interested</p>
          <p className="text-3xl font-bold text-white mt-1">{rawImportStats?.interestedRecords || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-4 shadow-lg shadow-violet-200">
          <p className="text-violet-100 text-xs uppercase tracking-wide font-medium">Converted</p>
          <p className="text-3xl font-bold text-white mt-1">{rawImportStats?.convertedRecords || 0}</p>
        </div>
      </div>

      {/* Teams Overview + Charts - Enhanced colors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Teams Overview */}
        <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl border border-indigo-100 p-4 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Teams Overview</h2>
            <Link to="/users" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Manage →</Link>
          </div>
          {teamOverview.length > 0 ? (
            <div className="space-y-2">
              {teamOverview.map((team, idx) => (
                <div key={idx} className="p-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                        <UserGroupIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                        <p className="text-xs text-indigo-600">{team.memberCount} members</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-indigo-600 bg-white px-3 py-1 rounded-lg shadow-sm">{team.memberCount}</span>
                  </div>
                </div>
              ))}
              {teamOverview.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">No teams configured</div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-3">
                <UserGroupIcon className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-sm text-gray-500">No teams created yet</p>
              <Link to="/users" className="text-xs text-indigo-600 mt-1 inline-block font-medium">Add Team Leads →</Link>
            </div>
          )}
        </div>

        {/* Lead Status */}
        <div className="bg-gradient-to-br from-white to-pink-50 rounded-xl border border-pink-100 p-4 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Lead Status</h2>
            <Link to="/leads" className="text-xs text-pink-600 hover:text-pink-800 font-medium">View All →</Link>
          </div>
          {statusPieData.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-400">No data</div>
          )}
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {statusPieData.slice(0, 4).map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs bg-white px-2 py-1 rounded-full shadow-sm border border-gray-100">
                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-700 font-medium">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Telecaller Leaderboard */}
        <div className="bg-gradient-to-br from-white to-amber-50 rounded-xl border border-amber-100 p-4 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Top Telecallers Today</h2>
            <Link to="/analytics/telecaller-performance" className="text-xs text-amber-600 hover:text-amber-800 font-medium">View All →</Link>
          </div>
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, idx) => (
                <div key={entry.id} className={`flex items-center justify-between p-3 rounded-xl ${
                  idx === 0 ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200' :
                  idx === 1 ? 'bg-gradient-to-r from-gray-100 to-slate-100 border border-gray-200' :
                  idx === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200' :
                  'bg-white border border-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                      idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-400 to-slate-500 text-white' :
                      idx === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 truncate max-w-[100px]">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-center bg-blue-50 px-2 py-1 rounded-lg">
                      <p className="font-bold text-blue-600">{entry.calls}</p>
                      <p className="text-blue-400 text-[10px]">calls</p>
                    </div>
                    <div className="text-center bg-emerald-50 px-2 py-1 rounded-lg">
                      <p className="font-bold text-emerald-600">{entry.conversions}</p>
                      <p className="text-emerald-400 text-[10px]">conv</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-gray-400">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mb-3">
                <PhoneIcon className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-sm text-gray-500">No call data today</p>
              <p className="text-xs text-gray-400">Leaderboard updates as calls are made</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Pipeline - Colorful gradient */}
      <div className="bg-gradient-to-br from-white via-cyan-50 to-teal-50 rounded-xl border border-cyan-100 p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Import Pipeline Overview</h2>
          <Link to="/raw-imports" className="text-xs text-cyan-600 hover:text-cyan-800 font-medium">Manage →</Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 shadow-lg shadow-gray-200">
            <p className="text-2xl font-bold text-white">{rawImportStats?.totalRecords || 0}</p>
            <p className="text-xs text-gray-200 font-medium mt-1">Total Records</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-200">
            <p className="text-2xl font-bold text-white">{rawImportStats?.pendingRecords || 0}</p>
            <p className="text-xs text-amber-100 font-medium mt-1">Pending</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg shadow-blue-200">
            <p className="text-2xl font-bold text-white">{rawImportStats?.assignedRecords || 0}</p>
            <p className="text-xs text-blue-100 font-medium mt-1">Assigned</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200">
            <p className="text-2xl font-bold text-white">{rawImportStats?.interestedRecords || 0}</p>
            <p className="text-xs text-emerald-100 font-medium mt-1">Interested</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-200">
            <p className="text-2xl font-bold text-white">{rawImportStats?.convertedRecords || 0}</p>
            <p className="text-xs text-purple-100 font-medium mt-1">Converted</p>
          </div>
        </div>
        {(rawImportStats?.totalRecords || 0) > 0 && (
          <div className="mt-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-200 shadow-inner">
              <div className="bg-gradient-to-r from-amber-400 to-yellow-500 transition-all" style={{ width: `${((rawImportStats?.pendingRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-gradient-to-r from-blue-400 to-indigo-500 transition-all" style={{ width: `${((rawImportStats?.assignedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-gradient-to-r from-emerald-400 to-teal-500 transition-all" style={{ width: `${((rawImportStats?.interestedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 transition-all" style={{ width: `${((rawImportStats?.convertedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions - Colorful gradient cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link to="/leads/bulk-upload" className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <DocumentArrowUpIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Import Data</p>
            <p className="text-xs text-indigo-200">CSV/Excel</p>
          </div>
        </Link>
        <Link to="/assignments" className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl p-4 shadow-lg shadow-fuchsia-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <UserGroupIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Assignments</p>
            <p className="text-xs text-fuchsia-200">Distribute</p>
          </div>
        </Link>
        <Link to="/campaigns" className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <RocketLaunchIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Campaigns</p>
            <p className="text-xs text-emerald-200">Manage</p>
          </div>
        </Link>
        <Link to="/call-monitoring" className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-4 shadow-lg shadow-cyan-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <EyeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Monitoring</p>
            <p className="text-xs text-cyan-200">Live calls</p>
          </div>
        </Link>
        <Link to="/analytics" className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Analytics</p>
            <p className="text-xs text-amber-200">Reports</p>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-400 text-center py-2">
        Last updated: {lastRefresh.toLocaleTimeString()} | Organization-wide view
      </div>
    </div>
  );
}

// ============================================
// ADMIN DASHBOARD
// ============================================
interface FollowUpStats {
  total: number;
  overdue: number;
  today: number;
  upcoming: number;
  completed: number;
}

function AdminDashboard({ user, getGreeting, lastRefresh, setLastRefresh, stats, rawImportStats, subscription }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [orgStats, setOrgStats] = useState<OrgDashboardStats | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveTeamStatus | null>(null);
  const [followUpStats, setFollowUpStats] = useState<FollowUpStats>({ total: 0, overdue: 0, today: 0, upcoming: 0, completed: 0 });
  const [convertedCount, setConvertedCount] = useState(0);
  const [pipelineAnalytics, setPipelineAnalytics] = useState<PipelineAnalytics | null>(null);
  const [defaultPipeline, setDefaultPipeline] = useState<Pipeline | null>(null);

  useEffect(() => {
    fetchOrgStats();
    fetchLiveStatus();
    fetchFollowUpStats();
    fetchConvertedCount();
    fetchPipelineData();
    const liveStatusInterval = setInterval(fetchLiveStatus, 30000);
    return () => clearInterval(liveStatusInterval);
  }, []);

  const fetchConvertedCount = async () => {
    try {
      // Fetch count of leads with isConverted=true
      const response = await api.get('/leads?isConverted=true&limit=1');
      setConvertedCount(response.data?.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch converted count:', error);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const status = await teamMonitoringService.getLiveStatus();
      setLiveStatus(status);
    } catch (error) {
      console.error('Failed to fetch live status:', error);
    }
  };

  const fetchFollowUpStats = async () => {
    try {
      // Use the followup-reports/summary endpoint for accurate stats
      const summaryRes = await api.get('/followup-reports/summary').catch(() => ({ data: { data: { summary: null } } }));
      const summary = summaryRes.data?.data?.summary;

      if (summary) {
        setFollowUpStats({
          total: (summary.pending || 0) + (summary.overdue || 0),
          overdue: summary.overdue || 0,
          today: summary.pending || 0,
          upcoming: 0,
          completed: summary.completed || 0,
        });
      }

      // Also get the schedule for more detailed breakdown
      const scheduleRes = await api.get('/followup-reports/schedule').catch(() => ({ data: { data: { schedule: null } } }));
      const schedule = scheduleRes.data?.data?.schedule;

      if (schedule) {
        setFollowUpStats(prev => ({
          ...prev,
          today: schedule.today?.length || 0,
          upcoming: (schedule.tomorrow?.length || 0) + (schedule.thisWeek?.length || 0),
          overdue: schedule.overdueCount || prev.overdue,
          total: (schedule.today?.length || 0) + (schedule.tomorrow?.length || 0) + (schedule.thisWeek?.length || 0) + (schedule.overdueCount || 0),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch follow-up stats:', error);
    }
  };

  const fetchOrgStats = async () => {
    try {
      const usersRes = await api.get('/users?limit=1000').catch(() => ({ data: { data: [] } }));
      const users = usersRes.data?.data || [];
      setOrgStats({
        totalUsers: users.length,
        totalTelecallers: users.filter((u: any) => ['telecaller', 'counselor', 'sales'].includes(u.role?.slug?.toLowerCase())).length,
        totalTeamLeads: users.filter((u: any) => u.role?.slug?.toLowerCase() === 'team_lead').length,
        totalLeads: stats?.total || 0,
        totalImports: rawImportStats?.totalImports || 0,
        pendingRecords: rawImportStats?.pendingRecords || 0,
        assignedRecords: rawImportStats?.assignedRecords || 0,
        interestedRecords: rawImportStats?.interestedRecords || 0,
        convertedRecords: rawImportStats?.convertedRecords || 0,
        callsToday: 0,
        activeVoiceAgents: 0,
        activeCampaigns: 0,
      });
    } catch (error) {
      console.error('Failed to fetch org stats:', error);
    }
  };

  const fetchPipelineData = async () => {
    try {
      // Fetch pipelines for LEAD entity type
      const pipelines = await pipelineSettingsService.getPipelines('LEAD');

      // Find default pipeline or use first one
      const defaultPipe = pipelines.find(p => p.isDefault) || pipelines[0];

      if (defaultPipe) {
        setDefaultPipeline(defaultPipe);

        // Fetch analytics for the default pipeline
        const analytics = await pipelineSettingsService.getPipelineAnalytics(defaultPipe.id);
        setPipelineAnalytics(analytics);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline data:', error);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    fetchOrgStats();
    fetchLiveStatus();
    fetchFollowUpStats();
    fetchConvertedCount();
    fetchPipelineData();
    setLastRefresh(new Date());
    setTimeout(() => setLoading(false), 500);
  };

  // Pipeline stages data for chart - prioritize Pipeline Stages from Settings
  const pipelineStages = pipelineAnalytics?.stageStats && pipelineAnalytics.stageStats.length > 0
    ? pipelineAnalytics.stageStats.map((stage, index) => {
        // Find the stage in default pipeline to get color
        const pipelineStage = defaultPipeline?.stages?.find(s => s.id === stage.stageId);
        return {
          name: stage.stageName,
          value: stage.count,
          color: pipelineStage?.color || STAGE_COLORS[stage.stageName.toUpperCase().replace(/\s+/g, '_')] || PIE_COLORS[index % PIE_COLORS.length],
        };
      }).sort((a, b) => b.value - a.value)
    : stats?.byStatus && Object.keys(stats.byStatus).length > 0
    ? Object.entries(stats.byStatus)
        .map(([stage, count], index) => ({
          name: stage.replace(/_/g, ' '),
          value: count as number,
          color: STAGE_COLORS[stage] || PIE_COLORS[index % PIE_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value)
    : rawImportStats?.byStatus && Object.keys(rawImportStats.byStatus).length > 0
    ? Object.entries(rawImportStats.byStatus)
        .map(([stage, count], index) => ({
          name: stage.replace(/_/g, ' '),
          value: count as number,
          color: STAGE_COLORS[stage] || PIE_COLORS[index % PIE_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  // Source data for bar chart - capitalize properly
  // Source data for bar chart - use lead sources or fallback to "Bulk Upload" for raw imports
  const sourceBarData = stats?.bySource && Object.keys(stats.bySource).length > 0
    ? Object.entries(stats.bySource).map(([source, count], index) => ({
        name: source.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        value: count as number,
        fill: SOURCE_COLORS[source] || PIE_COLORS[index % PIE_COLORS.length],
      })).sort((a, b) => b.value - a.value).slice(0, 6)
    : rawImportStats?.totalRecords && rawImportStats.totalRecords > 0
    ? [{ name: 'Bulk Upload', value: rawImportStats.totalRecords, fill: '#6366F1' }]
    : [];

  // Pipeline funnel data - use actual lead counts
  const totalLeads = stats?.total || 0;
  const assignedLeads = rawImportStats?.assignedRecords || 0;
  const interestedLeads = rawImportStats?.interestedRecords || 0;

  const funnelData = [
    { name: 'Total', value: totalLeads, fill: '#6366F1', percent: 100 },
    { name: 'Assigned', value: assignedLeads, fill: '#3B82F6', percent: totalLeads ? Math.round((assignedLeads / totalLeads) * 100) : 0 },
    { name: 'Interested', value: interestedLeads, fill: '#10B981', percent: totalLeads ? Math.round((interestedLeads / totalLeads) * 100) : 0 },
    { name: 'Converted', value: convertedCount, fill: '#8B5CF6', percent: totalLeads ? Math.round((convertedCount / totalLeads) * 100) : 0 },
  ];

  const conversionRate = totalLeads > 0
    ? ((convertedCount / totalLeads) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-5 bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{getGreeting()}, {user?.firstName ? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase() : ''}</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all">
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Row 1: Compact Key Metrics */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <Link to="/leads" className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stats?.total || 0}</p>
              <p className="text-[10px] text-indigo-100">Leads</p>
            </div>
          </div>
        </Link>
        <Link to="/users" className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{orgStats?.totalUsers || 0}</p>
              <p className="text-[10px] text-blue-100">Team</p>
            </div>
          </div>
        </Link>
        <Link to="/raw-imports" className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <DocumentArrowUpIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{rawImportStats?.pendingRecords || 0}</p>
              <p className="text-[10px] text-amber-100">Pending</p>
            </div>
          </div>
        </Link>
        <Link to="/leads?converted=true" className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{convertedCount}</p>
              <p className="text-[10px] text-emerald-100">Converted</p>
            </div>
          </div>
        </Link>
        <Link to="/reports/business-trends" className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <ArrowUpRightIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{conversionRate}%</p>
              <p className="text-[10px] text-violet-100">Conv. Rate</p>
            </div>
          </div>
        </Link>
        <Link to="/assignments" className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{rawImportStats?.assignedRecords || 0}</p>
              <p className="text-[10px] text-cyan-100">Assigned</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Row 2: Lead Status (left) + Team & Today's Highlights (right) */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Pipeline Stages - Donut Chart */}
        <div className="col-span-5 bg-white rounded-xl p-4 shadow-lg border border-indigo-100/50 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Pipeline Stages</h3>
            <Link to="/leads" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View All →</Link>
          </div>
          {pipelineStages.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-36 h-36 flex-shrink-0 relative">
                {pipelineStages.reduce((sum, stage) => sum + stage.value, 0) === 0 ? (
                  // Show placeholder circle when all values are 0
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-[120px] h-[120px] rounded-full border-[20px] border-gray-200"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pipelineStages.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pipelineStages.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                        formatter={(value: number, name: string) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Total number in center of donut */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center bg-white rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xl font-bold text-gray-800 leading-none">
                      {pipelineStages.reduce((sum, stage) => sum + stage.value, 0)}
                    </span>
                    <p className="text-[9px] text-gray-500 font-medium mt-0.5">Total</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {pipelineStages.slice(0, 6).map((stage, index) => (
                  <Link
                    key={index}
                    to={`/leads?stage=${encodeURIComponent(stage.name)}`}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: stage.color }}></span>
                      <span className="text-xs font-medium text-gray-700">{stage.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800">{stage.value}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>

        {/* Team Status */}
        <div className="col-span-3 bg-white rounded-xl p-4 shadow-lg border border-emerald-100/50 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Team Status</h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-300"></span>
                <span className="text-xs font-medium text-gray-700">Active</span>
              </div>
              <span className="text-xl font-bold text-emerald-600">{liveStatus?.summary.active || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-500 rounded-full shadow-sm shadow-amber-300"></span>
                <span className="text-xs font-medium text-gray-700">On Break</span>
              </div>
              <span className="text-xl font-bold text-amber-600">{liveStatus?.summary.onBreak || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-slate-100 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                <span className="text-xs font-medium text-gray-700">Offline</span>
              </div>
              <span className="text-xl font-bold text-gray-500">{liveStatus?.summary.offline || 0}</span>
            </div>
          </div>
          <Link to="/team-monitoring" className="block text-center text-xs text-indigo-600 mt-3 hover:text-indigo-700 font-medium">
            View Details →
          </Link>
        </div>

        {/* Today's Highlights */}
        <div className="col-span-4 bg-white rounded-xl p-4 shadow-lg border border-purple-100/50 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Today's Highlights</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/leads?status=NEW" className="p-3 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl hover:from-blue-100 hover:to-indigo-150 transition-all border border-blue-200/50 hover:shadow-md">
              <p className="text-2xl font-bold text-blue-600">{stats?.todayCount || 0}</p>
              <p className="text-xs text-blue-700 font-medium">New Leads</p>
            </Link>
            <Link to="/leads?pendingFollowUp=true" className="p-3 bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl hover:from-amber-100 hover:to-orange-150 transition-all border border-amber-200/50 hover:shadow-md">
              <p className="text-2xl font-bold text-amber-600">{stats?.followUpsDue || 0}</p>
              <p className="text-xs text-amber-700 font-medium">Follow-ups Due</p>
            </Link>
            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl border border-emerald-200/50">
              <p className="text-2xl font-bold text-emerald-600">{conversionRate}%</p>
              <p className="text-xs text-emerald-700 font-medium">Conversion Rate</p>
            </div>
            <Link to="/assignments?date=today" className="p-3 bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl hover:from-violet-100 hover:to-purple-150 transition-all border border-violet-200/50 hover:shadow-md cursor-pointer">
              <p className="text-2xl font-bold text-violet-600">{rawImportStats?.todayAssigned ?? rawImportStats?.assignedRecords ?? 0}</p>
              <p className="text-xs text-violet-700 font-medium">Assigned Today</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Lead Sources Chart - Horizontal Bar Chart */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Lead Sources</h3>
            <Link to="/leads/bulk-upload" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">+ Import</Link>
          </div>
          {sourceBarData.length > 0 ? (
            <div className="space-y-3">
              {sourceBarData.map((source, index) => {
                const maxValue = Math.max(...sourceBarData.map(s => s.value));
                const percentage = maxValue > 0 ? (source.value / maxValue) * 100 : 0;
                const colors = [
                  { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50' },
                  { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-50' },
                  { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50' },
                  { bg: 'from-pink-500 to-pink-600', light: 'bg-pink-50' },
                  { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50' },
                  { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50' },
                ];
                const color = colors[index % colors.length];
                // Convert display name back to source value for filter
                const sourceValue = source.name.toUpperCase().replace(/\s+/g, '_');
                return (
                  <Link
                    key={index}
                    to={`/leads?source=${encodeURIComponent(sourceValue)}`}
                    className="block hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{source.name}</span>
                      <span className="text-sm font-bold text-gray-800">{source.value}</span>
                    </div>
                    <div className={`h-8 ${color.light} rounded-lg overflow-hidden`}>
                      <div
                        className={`h-full bg-gradient-to-r ${color.bg} rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2`}
                        style={{ width: `${Math.max(percentage, 8)}%` }}
                      >
                        <span className="text-xs font-semibold text-white">{Math.round(percentage)}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
              <DocumentArrowUpIcon className="w-12 h-12 mb-2 text-gray-300" />
              <p className="text-sm font-medium">No lead sources yet</p>
              <Link to="/leads/bulk-upload" className="text-xs text-indigo-600 mt-2 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">Import leads</Link>
            </div>
          )}
        </div>

        {/* Conversion Funnel - Vertical Bar Chart */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Conversion Funnel</h3>
            <span className="text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 rounded-full shadow-sm">{conversionRate}%</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} barSize={45}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: 'white' }}
                  formatter={(value: number, name: string) => [value, 'Count']}
                  labelStyle={{ fontWeight: 600, color: '#374151' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {funnelData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }}></span>
                <span className="text-[10px] text-gray-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Follow-ups Overview */}
      <div className="bg-white rounded-xl p-4 shadow-lg border border-orange-100 mb-5 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Follow-ups Overview</h3>
          </div>
          <Link to="/leads?pendingFollowUp=true" className="text-xs text-orange-600 hover:text-orange-700 font-medium bg-orange-50 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors">View All →</Link>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-red-700">Overdue</span>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </div>
            <p className="text-3xl font-bold text-red-600">{followUpStats.overdue}</p>
            <p className="text-[10px] text-red-500 mt-1">Need immediate attention</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-orange-700">Today</span>
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{followUpStats.today}</p>
            <p className="text-[10px] text-orange-500 mt-1">Scheduled for today</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-700">Upcoming</span>
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{followUpStats.upcoming}</p>
            <p className="text-[10px] text-blue-500 mt-1">Next 7 days</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-emerald-700">Total Pending</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{followUpStats.total}</p>
            <p className="text-[10px] text-emerald-500 mt-1">All pending follow-ups</p>
          </div>
        </div>
      </div>

      {/* Row 5: Quick Actions */}
      <div className="bg-gradient-to-r from-white to-indigo-50/30 rounded-xl p-4 shadow-lg border border-indigo-100/50">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-6 gap-3">
          {[
            { to: '/leads/bulk-upload', icon: DocumentArrowUpIcon, label: 'Import', color: 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700' },
            { to: '/assignments', icon: UserGroupIcon, label: 'Assign', color: 'bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700' },
            { to: '/reports', icon: ChartBarIcon, label: 'Reports', color: 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' },
            { to: '/users', icon: UsersIcon, label: 'Team', color: 'bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700' },
            { to: '/campaigns', icon: RocketLaunchIcon, label: 'Campaigns', color: 'bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700' },
            { to: '/settings', icon: Cog6ToothIcon, label: 'Settings', color: 'bg-gradient-to-br from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700' },
          ].map((item, idx) => (
            <Link
              key={idx}
              to={item.to}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl text-white ${item.color} shadow-lg hover:shadow-xl transition-all hover:-translate-y-1`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-2">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>
    </div>
  );
}
