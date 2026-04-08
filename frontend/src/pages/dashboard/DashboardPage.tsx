import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchLeadStats } from '../../store/slices/leadSlice';
import { fetchStats } from '../../store/slices/rawImportSlice';
import subscriptionService, { Subscription } from '../../services/subscription.service';
import api from '../../services/api';
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
} from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  // Uppercase versions
  NEW: '#3B82F6',        // Blue
  CONTACTED: '#A855F7',  // Violet
  QUALIFIED: '#F59E0B',  // Orange/Yellow
  NEGOTIATION: '#EC4899', // Pink
  PROPOSAL: '#6366F1',   // Indigo
  WON: '#22C55E',        // Green
  LOST: '#14B8A6',       // Teal
  FOLLOW_UP: '#F97316',  // Orange-red
  // Title case versions (from lead stages) - distinct colors
  'New': '#3B82F6',       // Blue
  'Contacted': '#A855F7', // Violet (distinct from Proposal)
  'Qualified': '#F59E0B', // Orange/Yellow
  'Negotiation': '#EC4899', // Pink
  'Proposal': '#6366F1',  // Indigo
  'Won': '#22C55E',       // Green
  'Lost': '#14B8A6',      // Teal
  'Follow Up': '#F97316',
  'Follow-Up': '#F97316',
};

const PIE_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#3B82F6'];
const SOURCE_COLORS: Record<string, string> = {
  'FACEBOOK': '#1877F2',
  'INSTAGRAM': '#E4405F',
  'GOOGLE': '#4285F4',
  'WEBSITE': '#10B981',
  'REFERRAL': '#8B5CF6',
  'WALK_IN': '#F59E0B',
  'PHONE': '#06B6D4',
  'EMAIL': '#EF4444',
  'LINKEDIN': '#0A66C2',
  'TWITTER': '#1DA1F2',
  'OTHER': '#6B7280',
};

// Telecaller Dashboard Stats
interface DashboardStats {
  today: {
    calls: number;
    followUpsCompleted: number;
    pendingFollowUps: number;
    target: { calls: number; followUps: number };
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
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    leadName: string | null;
    leadId: string | null;
    createdAt: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/telecaller/dashboard-stats');
      setDashboardStats(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const weeklyActivity = dashboardStats?.weeklyActivity || [];
  const dailyCallTarget = dashboardStats?.today?.target?.calls || dashboardStats?.assignedData?.total || 0;
  const callsProgress = dailyCallTarget > 0 ? Math.min(((dashboardStats?.today?.calls || 0) / dailyCallTarget) * 100, 100) : 0;

  const waterfallData = [
    { name: 'New', value: dashboardStats?.leads?.byStage?.['New'] || dashboardStats?.leads?.byStage?.['NEW'] || 0, fill: '#3B82F6' },
    { name: 'Contacted', value: dashboardStats?.leads?.byStage?.['Contacted'] || dashboardStats?.leads?.byStage?.['CONTACTED'] || 0, fill: '#8B5CF6' },
    { name: 'Qualified', value: dashboardStats?.leads?.byStage?.['Qualified'] || dashboardStats?.leads?.byStage?.['QUALIFIED'] || 0, fill: '#10B981' },
    { name: 'Negotiation', value: dashboardStats?.leads?.byStage?.['Negotiation'] || dashboardStats?.leads?.byStage?.['NEGOTIATION'] || 0, fill: '#F59E0B' },
    { name: 'Won', value: dashboardStats?.leads?.won || 0, fill: '#059669' },
  ];

  return (
    <div className="p-3 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">{getGreeting()}, {user?.firstName}</h1>
          <span className="text-slate-400 text-xs hidden sm:inline">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 text-[10px] font-medium">Live</span>
          </div>
        </div>
        <button onClick={() => { fetchData(); setLastRefresh(new Date()); }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-all">
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
        <Link to="/leads?assignedToMe=true" className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-blue-500/50 transition-all">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Leads</p>
          <p className="text-xl font-bold text-white">{dashboardStats?.leads?.total || 0}</p>
        </Link>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Calls Today</p>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold text-white">{dashboardStats?.today?.calls || 0}<span className="text-slate-500 text-sm font-normal">/{dailyCallTarget}</span></p>
            <span className={`text-[10px] font-medium ${callsProgress >= 100 ? 'text-emerald-400' : 'text-violet-400'}`}>{Math.round(callsProgress)}%</span>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Follow-ups</p>
          <p className="text-xl font-bold text-white">{dashboardStats?.today?.followUpsCompleted || 0}<span className="text-amber-400 text-sm ml-1">+{dashboardStats?.today?.pendingFollowUps || 0}</span></p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Conversion</p>
          <p className="text-xl font-bold text-emerald-400">{dashboardStats?.leads?.conversionRate || 0}%</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Win Rate</p>
          <p className="text-xl font-bold text-cyan-400">{dashboardStats?.leads?.winRate || 0}%</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Won</p>
          <p className="text-xl font-bold text-green-400">{dashboardStats?.leads?.won || 0}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {/* Weekly Performance */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Weekly Performance</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyActivity.length > 0 ? weeklyActivity : [
                  { day: 'Mon', date: '', calls: 0, target: 15 }, { day: 'Tue', date: '', calls: 0, target: 15 },
                  { day: 'Wed', date: '', calls: 0, target: 15 }, { day: 'Thu', date: '', calls: 0, target: 15 },
                  { day: 'Fri', date: '', calls: 0, target: 15 }, { day: 'Sat', date: '', calls: 0, target: 10 }, { day: 'Sun', date: '', calls: 0, target: 10 }
                ]} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} width={30} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assigned Data & Pipeline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Assigned Data</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">Total Assigned</span>
                  <span className="text-white font-bold">{dashboardStats?.assignedData?.totalRawRecords || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">Pending Calls</span>
                  <span className="text-amber-400 font-bold">{dashboardStats?.assignedData?.rawRecords || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">In Queue</span>
                  <span className="text-blue-400 font-bold">{dashboardStats?.assignedData?.queueItems || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Lead Pipeline</h3>
              <div className="space-y-1">
                {waterfallData.map((stage, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: stage.fill }}>{stage.name}</span>
                    <span className="text-white text-xs font-bold">{stage.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Call Outcomes */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Call Outcomes</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Connected', value: dashboardStats?.outcomes?.CONNECTED || 0, color: 'text-emerald-400' },
                { label: 'No Answer', value: dashboardStats?.outcomes?.NO_ANSWER || 0, color: 'text-amber-400' },
                { label: 'Busy', value: dashboardStats?.outcomes?.BUSY || 0, color: 'text-orange-400' },
                { label: 'Failed', value: dashboardStats?.outcomes?.FAILED || 0, color: 'text-red-400' },
              ].map((item, idx) => (
                <div key={idx} className="text-center p-2 bg-slate-700/30 rounded">
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/assigned-data" className="flex items-center gap-2 p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded text-blue-400 text-xs">
                <PhoneIcon className="w-4 h-4" /> Start Calling
              </Link>
              <Link to="/leads?followUpToday=true" className="flex items-center gap-2 p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded text-amber-400 text-xs">
                <ArrowPathIcon className="w-4 h-4" /> Pending Follow-ups
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-3">
        <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Real-time</span>
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
            <h1 className="text-lg font-semibold">{getGreeting()}, {user?.firstName}</h1>
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

  useEffect(() => {
    fetchManagerData();
  }, []);

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
    setLastRefresh(new Date());
    setTimeout(() => setLoading(false), 500);
  };

  const statusPieData = stats?.byStatus
    ? Object.entries(stats.byStatus).map(([status, count], index) => ({
        name: status.replace('_', ' '),
        value: count as number,
        color: STATUS_COLORS[status] || PIE_COLORS[index % PIE_COLORS.length],
      }))
    : [];

  // Calculate conversion rate
  const totalRecords = rawImportStats?.totalRecords || 0;
  const convertedRecords = rawImportStats?.convertedRecords || 0;
  const overallConversionRate = totalRecords > 0 ? Math.round((convertedRecords / totalRecords) * 100 * 10) / 10 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{getGreeting()}, {user?.firstName}</h1>
            <p className="text-blue-200 text-sm">Manager Dashboard - Organization Overview</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center px-3 py-1 bg-white/10 rounded-lg">
                <p className="text-lg font-bold">{teamOverview.length}</p>
                <p className="text-[10px] text-blue-200">Teams</p>
              </div>
              <div className="text-center px-3 py-1 bg-white/10 rounded-lg">
                <p className="text-lg font-bold">{overallConversionRate}%</p>
                <p className="text-[10px] text-blue-200">Conversion</p>
              </div>
            </div>
            <button onClick={handleRefresh} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Link to="/leads" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
        </Link>
        <Link to="/leads?status=NEW" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs uppercase tracking-wide">New Today</p>
          <p className="text-2xl font-bold text-green-600">{stats?.todayCount || 0}</p>
        </Link>
        <Link to="/raw-imports" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{rawImportStats?.pendingRecords || 0}</p>
        </Link>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Assigned</p>
          <p className="text-2xl font-bold text-blue-600">{rawImportStats?.assignedRecords || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Interested</p>
          <p className="text-2xl font-bold text-emerald-600">{rawImportStats?.interestedRecords || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Converted</p>
          <p className="text-2xl font-bold text-indigo-600">{rawImportStats?.convertedRecords || 0}</p>
        </div>
      </div>

      {/* Teams Overview + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Teams Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Teams Overview</h2>
            <Link to="/users" className="text-xs text-indigo-600">Manage →</Link>
          </div>
          {teamOverview.length > 0 ? (
            <div className="space-y-2">
              {teamOverview.map((team, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <UserGroupIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{team.name}</p>
                        <p className="text-xs text-gray-500">{team.memberCount} members</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-indigo-600">{team.memberCount}</span>
                  </div>
                </div>
              ))}
              {teamOverview.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">No teams configured</div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <UserGroupIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No teams created yet</p>
              <Link to="/users" className="text-xs text-indigo-600 mt-1 inline-block">Add Team Leads →</Link>
            </div>
          )}
        </div>

        {/* Lead Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Lead Status</h2>
            <Link to="/leads" className="text-xs text-indigo-600">View All →</Link>
          </div>
          {statusPieData.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-400">No data</div>
          )}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {statusPieData.slice(0, 4).map((entry, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Telecaller Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Top Telecallers Today</h2>
            <Link to="/analytics/telecaller-performance" className="text-xs text-indigo-600">View All →</Link>
          </div>
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, idx) => (
                <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-200 text-gray-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[100px]">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-center">
                      <p className="font-bold text-blue-600">{entry.calls}</p>
                      <p className="text-gray-400">calls</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-emerald-600">{entry.conversions}</p>
                      <p className="text-gray-400">conv</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-gray-400">
              <PhoneIcon className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm">No call data today</p>
              <p className="text-xs">Leaderboard updates as calls are made</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Import Pipeline Overview</h2>
          <Link to="/raw-imports" className="text-xs text-indigo-600">Manage →</Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xl font-bold text-gray-900">{rawImportStats?.totalRecords || 0}</p>
            <p className="text-xs text-gray-500">Total Records</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-100">
            <p className="text-xl font-bold text-yellow-600">{rawImportStats?.pendingRecords || 0}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xl font-bold text-blue-600">{rawImportStats?.assignedRecords || 0}</p>
            <p className="text-xs text-gray-500">Assigned</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50 border border-green-100">
            <p className="text-xl font-bold text-green-600">{rawImportStats?.interestedRecords || 0}</p>
            <p className="text-xs text-gray-500">Interested</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-100">
            <p className="text-xl font-bold text-purple-600">{rawImportStats?.convertedRecords || 0}</p>
            <p className="text-xs text-gray-500">Converted</p>
          </div>
        </div>
        {(rawImportStats?.totalRecords || 0) > 0 && (
          <div className="mt-3">
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
              <div className="bg-yellow-400 transition-all" style={{ width: `${((rawImportStats?.pendingRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-blue-500 transition-all" style={{ width: `${((rawImportStats?.assignedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-green-500 transition-all" style={{ width: `${((rawImportStats?.interestedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-purple-500 transition-all" style={{ width: `${((rawImportStats?.convertedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link to="/leads/bulk-upload" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <DocumentArrowUpIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Import Data</p>
            <p className="text-xs text-gray-500">CSV/Excel</p>
          </div>
        </Link>
        <Link to="/assignments" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Assignments</p>
            <p className="text-xs text-gray-500">Distribute</p>
          </div>
        </Link>
        <Link to="/campaigns" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <RocketLaunchIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Campaigns</p>
            <p className="text-xs text-gray-500">Manage</p>
          </div>
        </Link>
        <Link to="/call-monitoring" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
            <EyeIcon className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Monitoring</p>
            <p className="text-xs text-gray-500">Live calls</p>
          </div>
        </Link>
        <Link to="/analytics" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Analytics</p>
            <p className="text-xs text-gray-500">Reports</p>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {lastRefresh.toLocaleTimeString()} | Organization-wide view
      </div>
    </div>
  );
}

// ============================================
// ADMIN DASHBOARD
// ============================================
function AdminDashboard({ user, getGreeting, lastRefresh, setLastRefresh, stats, rawImportStats, subscription }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [orgStats, setOrgStats] = useState<OrgDashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState({ api: 'healthy', db: 'healthy', services: 'healthy' });
  const [usersByRole, setUsersByRole] = useState<Record<string, number>>({});
  const [stageData, setStageData] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    fetchOrgStats();
    checkSystemHealth();
  }, []);

  const fetchOrgStats = async () => {
    try {
      const [usersRes, stagesRes] = await Promise.all([
        api.get('/users?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/lead-stages').catch(() => ({ data: { data: [] } })),
      ]);
      const users = usersRes.data?.data || [];
      const stages = stagesRes.data?.data || [];

      // Count users by role
      const roleCounts: Record<string, number> = {};
      users.forEach((u: any) => {
        const role = u.role?.slug?.toLowerCase() || 'unknown';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
      setUsersByRole(roleCounts);

      // Map stage data with counts from stats
      if (stages.length > 0 && stats?.byStage) {
        const stageChartData = stages.map((s: any) => ({
          name: s.name?.length > 10 ? s.name.substring(0, 10) + '...' : s.name,
          count: stats.byStage[s.id] || 0,
        })).filter((s: any) => s.count > 0);
        setStageData(stageChartData);
      }

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

  const checkSystemHealth = async () => {
    try {
      await api.get('/users?limit=1');
      setSystemHealth({ api: 'healthy', db: 'healthy', services: 'healthy' });
    } catch {
      setSystemHealth({ api: 'degraded', db: 'unknown', services: 'unknown' });
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    fetchOrgStats();
    checkSystemHealth();
    setLastRefresh(new Date());
    setTimeout(() => setLoading(false), 500);
  };

  const statusPieData = stats?.byStatus
    ? Object.entries(stats.byStatus).map(([status, count], index) => ({
        name: status.replace('_', ' '),
        value: count as number,
        color: STATUS_COLORS[status] || PIE_COLORS[index % PIE_COLORS.length],
      }))
    : [];

  const sourceBarData = stats?.bySource
    ? Object.entries(stats.bySource).map(([source, count], index) => ({
        name: source.replace(/_/g, ' ').substring(0, 8),
        fullName: source,
        leads: count as number,
        color: SOURCE_COLORS[source] || PIE_COLORS[index % PIE_COLORS.length],
      })).sort((a, b) => b.leads - a.leads).slice(0, 8)
    : [];

  // Pipeline funnel data
  const pipelineData = [
    { name: 'Total', value: rawImportStats?.totalRecords || 0, fill: '#6366F1' },
    { name: 'Assigned', value: rawImportStats?.assignedRecords || 0, fill: '#3B82F6' },
    { name: 'Interested', value: rawImportStats?.interestedRecords || 0, fill: '#10B981' },
    { name: 'Converted', value: rawImportStats?.convertedRecords || 0, fill: '#8B5CF6' },
  ];

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
      case 'degraded': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
    }
  };

  const allHealthy = systemHealth.api === 'healthy' && systemHealth.db === 'healthy' && systemHealth.services === 'healthy';
  const conversionRate = (rawImportStats?.totalRecords || 0) > 0
    ? ((rawImportStats?.convertedRecords || 0) / (rawImportStats?.totalRecords || 1) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">{getGreeting()}, {user?.firstName}</h1>
          <p className="text-xs text-gray-500">Organization overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${allHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${allHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {allHealthy ? 'Operational' : 'Issues'}
          </div>
          <button onClick={handleRefresh} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
            <ArrowPathIcon className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Compact KPI Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <Link to="/users" className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-all">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Users</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{orgStats?.totalUsers || 0}</p>
        </Link>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Telecallers</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{orgStats?.totalTelecallers || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Team Leads</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{orgStats?.totalTeamLeads || 0}</p>
        </div>
        <Link to="/leads" className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-all">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Leads</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats?.total || 0}</p>
        </Link>
        <Link to="/raw-imports" className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-all">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{rawImportStats?.pendingRecords || 0}</p>
        </Link>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Converted</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{rawImportStats?.convertedRecords || 0}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Lead Sources Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-900">Lead Sources Distribution</h2>
            <Link to="/leads/bulk-upload" className="text-[10px] text-indigo-600">Import →</Link>
          </div>
          {sourceBarData.length > 0 ? (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} width={25} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(value: any) => [value, 'Leads']} />
                  <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
                    {sourceBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-gray-400">
              <DocumentArrowUpIcon className="w-8 h-8 text-gray-200 mb-1" />
              <p className="text-xs">No lead source data</p>
            </div>
          )}
        </div>

        {/* Lead Status Donut */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-900">Lead Status</h2>
            <Link to="/leads" className="text-[10px] text-indigo-600">View →</Link>
          </div>
          <div className="flex items-center gap-3">
            {statusPieData.length > 0 ? (
              <>
                <div className="h-28 w-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={2} dataKey="value">
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-0.5">
                  {statusPieData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-600">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-28 w-full flex items-center justify-center text-gray-400 text-xs">No leads</div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-900">Pipeline Funnel</h2>
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">{conversionRate}% conversion</span>
          </div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6B7280' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6B7280' }} width={50} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(rawImportStats?.totalRecords || 0) > 0 && (
            <div className="mt-2 flex h-1.5 rounded-full overflow-hidden bg-gray-100">
              <div className="bg-yellow-400" style={{ width: `${((rawImportStats?.pendingRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-blue-500" style={{ width: `${((rawImportStats?.assignedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-green-500" style={{ width: `${((rawImportStats?.interestedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-purple-500" style={{ width: `${((rawImportStats?.convertedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheckIcon className="w-4 h-4 text-gray-500" />
            <h2 className="text-xs font-semibold text-gray-900">System Health</h2>
          </div>
          <div className="space-y-1.5">
            {[
              { name: 'API Server', status: systemHealth.api },
              { name: 'Database', status: systemHealth.db },
              { name: 'Services', status: systemHealth.services },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                <span className="text-[10px] text-gray-600">{item.name}</span>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${getHealthColor(item.status).bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getHealthColor(item.status).dot}`}></span>
                  <span className={`text-[10px] font-medium ${getHealthColor(item.status).text} capitalize`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
            Last checked: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-900">Users by Role</h2>
            <Link to="/users" className="text-[10px] text-indigo-600">Manage →</Link>
          </div>
          {Object.entries(usersByRole).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(usersByRole).slice(0, 4).map(([role, count], idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                  <span className="text-[10px] text-gray-600 capitalize">{role.replace('_', ' ')}</span>
                  <span className="text-xs font-bold text-indigo-600">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-gray-400 text-center py-2">No users yet</p>
          )}
          <Link to="/users" className="mt-2 block text-center text-[10px] text-indigo-600 py-1.5 bg-indigo-50 rounded hover:bg-indigo-100">
            + Add New User
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <h2 className="text-xs font-semibold text-gray-900 mb-2">Quick Actions</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { to: '/users', icon: UsersIcon, label: 'Users', color: 'bg-blue-100 text-blue-600' },
            { to: '/settings/institution', icon: BuildingOfficeIcon, label: 'Org', color: 'bg-slate-100 text-slate-600' },
            { to: '/settings/auto-assign', icon: BoltIcon, label: 'Auto-Assign', color: 'bg-amber-100 text-amber-600' },
            { to: '/leads/bulk-upload', icon: DocumentArrowUpIcon, label: 'Import', color: 'bg-cyan-100 text-cyan-600' },
            { to: '/voice-ai', icon: SparklesIcon, label: 'Voice AI', color: 'bg-purple-100 text-purple-600' },
            { to: '/campaigns', icon: RocketLaunchIcon, label: 'Campaigns', color: 'bg-pink-100 text-pink-600' },
            { to: '/analytics', icon: ChartBarIcon, label: 'Analytics', color: 'bg-green-100 text-green-600' },
            { to: '/settings/integrations', icon: Cog6ToothIcon, label: 'Settings', color: 'bg-indigo-100 text-indigo-600' },
          ].map((item, idx) => (
            <Link key={idx} to={item.to} className="flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-50 transition-colors">
              <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                <item.icon className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-gray-600">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { to: '/call-monitoring', icon: EyeIcon, label: 'Call Monitoring', desc: 'Live supervision', color: 'bg-cyan-100 text-cyan-600' },
          { to: '/assignments', icon: UserGroupIcon, label: 'Assignments', desc: 'Distribute leads', color: 'bg-purple-100 text-purple-600' },
          { to: '/reports', icon: ChartBarIcon, label: 'Reports', desc: 'Export data', color: 'bg-emerald-100 text-emerald-600' },
          { to: '/compliance', icon: ShieldCheckIcon, label: 'Compliance', desc: 'DNC & regulations', color: 'bg-red-100 text-red-600' },
        ].map((item, idx) => (
          <Link key={idx} to={item.to} className="bg-white rounded-lg p-2.5 border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900">{item.label}</p>
              <p className="text-[10px] text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
