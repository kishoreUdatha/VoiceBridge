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
  Area,
  ComposedChart,
} from 'recharts';
import {
  UsersIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  PlusIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3B82F6',
  CONTACTED: '#F59E0B',
  QUALIFIED: '#10B981',
  NEGOTIATION: '#8B5CF6',
  WON: '#059669',
  LOST: '#EF4444',
  FOLLOW_UP: '#F97316',
};

const PIE_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#3B82F6'];
const SOURCE_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];

// Comprehensive Dashboard Stats
interface DashboardStats {
  today: {
    calls: number;
    followUpsCompleted: number;
    pendingFollowUps: number;
    target: { calls: number; followUps: number };
  };
  // Assigned data breakdown - targets come from here
  assignedData: {
    leads: number;
    rawRecords: number;        // Pending to call (ASSIGNED/PENDING status)
    totalRawRecords: number;   // Total assigned (all statuses)
    queueItems: number;
    total: number;             // Total pending to call
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

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { stats } = useSelector((state: RootState) => state.leads);
  const { stats: rawImportStats } = useSelector((state: RootState) => state.rawImports);
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Get user role
  const userRole = user?.role?.toLowerCase() || '';
  const isTelecallerOrCounselor = ['telecaller', 'counselor'].includes(userRole);

  useEffect(() => {
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    setLastRefresh(new Date());

    // Fetch subscription info
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

  const statusPieData = stats?.byStatus
    ? Object.entries(stats.byStatus).map(([status, count], index) => ({
        name: status.replace('_', ' '),
        value: count as number,
        color: STATUS_COLORS[status] || PIE_COLORS[index % PIE_COLORS.length],
      }))
    : [];

  const sourceBarData = stats?.bySource
    ? Object.entries(stats.bySource).map(([source, count], index) => ({
        name: source.replace(/_/g, ' '),
        leads: count as number,
        color: SOURCE_COLORS[index % SOURCE_COLORS.length],
      }))
    : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-xl">
          <p className="font-medium">{payload[0].name || payload[0].payload?.name}</p>
          <p className="text-gray-300">{payload[0].value} leads</p>
        </div>
      );
    }
    return null;
  };

  const handleRefresh = () => {
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    setLastRefresh(new Date());
  };

  // Check if user is on free plan or trial
  const isFreePlan = subscription?.planId === 'free' || !subscription?.planId;
  const isTrial = subscription?.status === 'TRIAL';
  const showUpgradeBanner = isFreePlan || isTrial;

  // Telecaller/Counselor Dashboard View
  if (isTelecallerOrCounselor) {
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [loadingLeads, setLoadingLeads] = useState(true);

    useEffect(() => {
      const fetchWorkQueue = async () => {
        try {
          setLoadingLeads(true);
          // Fetch comprehensive dashboard stats
          const dashboardRes = await api.get('/telecaller/dashboard-stats');
          setDashboardStats(dashboardRes.data?.data || null);
        } catch (error) {
          console.error('Failed to fetch work queue:', error);
        } finally {
          setLoadingLeads(false);
        }
      };
      fetchWorkQueue();
    }, []);

    // Weekly activity from real data
    const weeklyActivity = dashboardStats?.weeklyActivity || [];

    // KPI calculations - targets now come from assigned data
    const dailyCallTarget = dashboardStats?.today?.target?.calls || dashboardStats?.assignedData?.total || 0;
    const dailyFollowUpTarget = dashboardStats?.today?.target?.followUps || 0;
    const callsProgress = dailyCallTarget > 0
      ? Math.min(((dashboardStats?.today?.calls || 0) / dailyCallTarget) * 100, 100)
      : 0;
    const totalFollowUps = (dashboardStats?.today?.pendingFollowUps || 0) + (dashboardStats?.today?.followUpsCompleted || 0);

    // Lead pipeline data
    const waterfallData = [
      { name: 'New', value: dashboardStats?.leads?.byStage?.['New'] || dashboardStats?.leads?.byStage?.['NEW'] || 0, fill: '#3B82F6' },
      { name: 'Contacted', value: dashboardStats?.leads?.byStage?.['Contacted'] || dashboardStats?.leads?.byStage?.['CONTACTED'] || 0, fill: '#8B5CF6' },
      { name: 'Qualified', value: dashboardStats?.leads?.byStage?.['Qualified'] || dashboardStats?.leads?.byStage?.['QUALIFIED'] || 0, fill: '#10B981' },
      { name: 'Negotiation', value: dashboardStats?.leads?.byStage?.['Negotiation'] || dashboardStats?.leads?.byStage?.['NEGOTIATION'] || 0, fill: '#F59E0B' },
      { name: 'Won', value: dashboardStats?.leads?.won || 0, fill: '#059669' },
    ];

    return (
      <div className="p-3 min-h-screen">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white">{getGreeting()}, {user?.firstName}</h1>
            <span className="text-slate-600 text-xs hidden sm:inline">|</span>
            <span className="text-slate-400 text-xs hidden sm:inline">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            {/* Live Indicator */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-full">
              <span className="relative flex h-1 w-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 text-[9px] font-medium">Live</span>
            </div>
          </div>
          <button
            onClick={async () => {
              setLoadingLeads(true);
              try {
                const res = await api.get('/telecaller/dashboard-stats');
                setDashboardStats(res.data?.data || null);
              } catch (e) {
                console.error(e);
              }
              setLoadingLeads(false);
              setLastRefresh(new Date());
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-all"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Compact KPI Cards Row */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 mb-2">
          {/* Total Leads */}
          <Link to="/leads?assignedToMe=true" className="bg-slate-800/50 rounded p-2 border border-slate-700/50 hover:border-blue-500/50 transition-all">
            <p className="text-slate-400 text-[9px] uppercase tracking-wide">Leads</p>
            <p className="text-lg font-bold text-white">{dashboardStats?.leads?.total || 0}</p>
          </Link>

          {/* Calls Today */}
          <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
            <p className="text-slate-400 text-[9px] uppercase tracking-wide">Calls</p>
            <div className="flex items-end justify-between">
              <p className="text-lg font-bold text-white">{dashboardStats?.today?.calls || 0}<span className="text-slate-500 text-xs font-normal">/{dailyCallTarget}</span></p>
              <span className={`text-[9px] font-medium ${callsProgress >= 100 ? 'text-emerald-400' : 'text-violet-400'}`}>{Math.round(callsProgress)}%</span>
            </div>
          </div>

          {/* Follow-ups */}
          <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
            <p className="text-slate-400 text-[9px] uppercase tracking-wide">Follow-ups</p>
            <div className="flex items-end justify-between">
              <p className="text-lg font-bold text-white">{dashboardStats?.today?.followUpsCompleted || 0}<span className="text-slate-500 text-xs font-normal">/{dailyFollowUpTarget}</span></p>
              <span className="text-amber-400 text-[9px]">{dashboardStats?.today?.pendingFollowUps || 0} left</span>
            </div>
          </div>

          {/* Conversion */}
          <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
            <p className="text-slate-400 text-[9px] uppercase tracking-wide">Conversion</p>
            <p className="text-lg font-bold text-emerald-400">{dashboardStats?.leads?.conversionRate || 0}%</p>
          </div>

          {/* Win Rate */}
          <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
            <p className="text-slate-400 text-[9px] uppercase tracking-wide">Win Rate</p>
            <p className="text-lg font-bold text-cyan-400">{dashboardStats?.leads?.winRate || 0}%</p>
          </div>

          {/* Won */}
          <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
            <p className="text-slate-400 text-[9px] uppercase tracking-wide">Won</p>
            <p className="text-lg font-bold text-green-400">{dashboardStats?.leads?.won || 0}</p>
          </div>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-3">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-2">
            {/* Weekly Performance Chart */}
            <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[10px] font-semibold text-white uppercase tracking-wide">Weekly Performance</h3>
                <div className="flex items-center gap-2 text-[9px]">
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-sm bg-violet-500"></span>Calls</span>
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-0.5 bg-amber-400"></span>Target</span>
                </div>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyActivity.length > 0 ? weeklyActivity : [
                    { day: 'Mon', date: '', calls: 0, target: 15 }, { day: 'Tue', date: '', calls: 0, target: 15 },
                    { day: 'Wed', date: '', calls: 0, target: 15 }, { day: 'Thu', date: '', calls: 0, target: 15 },
                    { day: 'Fri', date: '', calls: 0, target: 15 }, { day: 'Sat', date: '', calls: 0, target: 10 }, { day: 'Sun', date: '', calls: 0, target: 10 }
                  ]} barSize={32}>
                    <defs>
                      <linearGradient id="barGradientEnterprise" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A78BFA" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#6D28D9" />
                      </linearGradient>
                      <linearGradient id="areaGradientEnterprise" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} width={35} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="bg-slate-900/95 backdrop-blur-xl text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700">
                        <p className="font-bold text-sm mb-2">{label}</p>
                        <div className="space-y-1">
                          <p className="text-violet-300 text-xs flex justify-between gap-4"><span>Calls:</span> <span className="font-bold">{payload[0]?.value}</span></p>
                          <p className="text-amber-300 text-xs flex justify-between gap-4"><span>Target:</span> <span className="font-bold">{payload[1]?.value}</span></p>
                          <p className={`text-xs flex justify-between gap-4 ${(payload[0]?.value as number) >= (payload[1]?.value as number) ? 'text-emerald-400' : 'text-red-400'}`}>
                            <span>Status:</span> <span className="font-bold">{(payload[0]?.value as number) >= (payload[1]?.value as number) ? '✓ Achieved' : '○ Pending'}</span>
                          </p>
                        </div>
                      </div>
                    ) : null} />
                    <Bar dataKey="calls" fill="url(#barGradientEnterprise)" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 4" dot={{ fill: '#F59E0B', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#FCD34D' }} />
                    <Area type="monotone" dataKey="calls" stroke="none" fill="url(#areaGradientEnterprise)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Assigned Data Breakdown - Shows where targets come from */}
            <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[10px] font-semibold text-white uppercase tracking-wide">Assigned to Call</h3>
                <span className="text-[9px] text-slate-500">Your Targets</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 rounded-lg bg-blue-500/10">
                  <p className="text-white font-bold text-lg">{dashboardStats?.assignedData?.leads || 0}</p>
                  <p className="text-[9px] text-blue-400">Leads</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <p className="text-cyan-400 font-bold text-lg">{dashboardStats?.assignedData?.totalRawRecords || 0}</p>
                  <p className="text-[9px] text-cyan-400">Total Assigned</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-purple-500/10">
                  <p className="text-white font-bold text-lg">{dashboardStats?.assignedData?.rawRecords || 0}</p>
                  <p className="text-[9px] text-purple-400">Pending</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-500/10">
                  <p className="text-white font-bold text-lg">{dashboardStats?.assignedData?.queueItems || 0}</p>
                  <p className="text-[9px] text-amber-400">Queue</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-emerald-400 font-bold text-lg">{dashboardStats?.assignedData?.total || 0}</p>
                  <p className="text-[9px] text-emerald-400">Total Target</p>
                </div>
              </div>
            </div>

            {/* Lead Pipeline */}
            <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[10px] font-semibold text-white uppercase tracking-wide">Lead Pipeline</h3>
                <Link to="/leads?assignedToMe=true" className="text-[9px] text-blue-400">View All →</Link>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {waterfallData.map((stage, idx) => (
                  <div key={idx} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${stage.fill}20` }}>
                    <p className="text-white font-bold text-lg">{stage.value}</p>
                    <p className="text-[9px]" style={{ color: stage.fill }}>{stage.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Call Outcomes */}
            <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-semibold text-white uppercase tracking-wide">Call Outcomes</h3>
                <span className="text-[9px] text-slate-500">Today</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Connected', value: dashboardStats?.outcomes?.CONNECTED || dashboardStats?.outcomes?.connected || 0, color: 'bg-emerald-500', icon: '✓' },
                  { label: 'No Answer', value: dashboardStats?.outcomes?.NO_ANSWER || dashboardStats?.outcomes?.noAnswer || 0, color: 'bg-amber-500', icon: '✗' },
                  { label: 'Busy', value: dashboardStats?.outcomes?.BUSY || dashboardStats?.outcomes?.busy || 0, color: 'bg-orange-500', icon: '⏸' },
                  { label: 'Failed', value: dashboardStats?.outcomes?.FAILED || dashboardStats?.outcomes?.failed || 0, color: 'bg-red-500', icon: '!' },
                ].map((outcome, idx) => (
                  <div key={idx} className="text-center p-2 bg-slate-700/30 rounded-lg">
                    <div className={`w-6 h-6 mx-auto mb-1 rounded-full ${outcome.color}/20 flex items-center justify-center`}>
                      <span className={`text-[10px] ${outcome.color.replace('bg-', 'text-')}`}>{outcome.icon}</span>
                    </div>
                    <p className="text-white font-bold text-sm">{outcome.value}</p>
                    <p className="text-slate-400 text-[8px]">{outcome.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-2">
            {/* Follow-up Funnel */}
            <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[10px] font-semibold text-white uppercase tracking-wide">Follow-ups</h3>
                <Link to="/leads?followUpToday=true" className="text-[9px] text-amber-400">View →</Link>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Total', value: totalFollowUps, color: 'bg-amber-500', width: '100%' },
                  { label: 'Pending', value: dashboardStats?.today?.pendingFollowUps || 0, color: 'bg-orange-500', width: '70%' },
                  { label: 'Done', value: dashboardStats?.today?.followUpsCompleted || 0, color: 'bg-emerald-500', width: '40%' },
                ].map((stage, idx) => (
                  <div key={idx} className={`h-5 rounded ${stage.color} flex items-center justify-between px-2`} style={{ width: stage.width }}>
                    <span className="text-white text-[9px]">{stage.label}</span>
                    <span className="text-white text-[10px] font-bold">{stage.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center mt-1.5 pt-1.5 border-t border-slate-700/50">
                <span className="text-emerald-400 text-xs font-bold">{totalFollowUps > 0 ? Math.round(((dashboardStats?.today?.followUpsCompleted || 0) / totalFollowUps) * 100) : 0}%</span>
                <span className="text-slate-500 text-[9px] ml-1">complete</span>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
              <h3 className="text-[10px] font-semibold text-white uppercase tracking-wide mb-1.5">Recent Activity</h3>
              <div className="space-y-1.5">
                {(dashboardStats?.recentActivities || []).slice(0, 4).length > 0 ? (
                  dashboardStats?.recentActivities?.slice(0, 4).map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 bg-slate-700/30 rounded-lg">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        activity.type === 'CALL' ? 'bg-blue-500/20' :
                        activity.type === 'NOTE_ADDED' ? 'bg-amber-500/20' :
                        activity.type === 'STATUS_CHANGED' ? 'bg-emerald-500/20' : 'bg-slate-500/20'
                      }`}>
                        <span className="text-[8px]">
                          {activity.type === 'CALL' ? '📞' :
                           activity.type === 'NOTE_ADDED' ? '📝' :
                           activity.type === 'STATUS_CHANGED' ? '✓' : '•'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-white truncate">{activity.title}</p>
                        <p className="text-[8px] text-slate-500">{activity.leadName || 'Unknown'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-slate-500 text-[10px]">No recent activity</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
          <span>Synced: {lastRefresh.toLocaleTimeString()}</span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
            Live
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upgrade Banner for Free/Trial Users */}
      {showUpgradeBanner && subscription && (
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-4 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white/20 rounded-xl">
                {isFreePlan ? (
                  <SparklesIcon className="w-6 h-6" />
                ) : (
                  <RocketLaunchIcon className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isFreePlan ? "You're on the Free Plan" : `${subscription.plan?.name || 'Trial'} - Trial Period`}
                </h3>
                <p className="text-white/80 text-sm mt-0.5">
                  {isFreePlan
                    ? `Upgrade to unlock AI calling, WhatsApp campaigns, and more features.`
                    : `Your trial ends on ${new Date(subscription.currentPeriodEnd || '').toLocaleDateString()}. Subscribe to continue.`
                  }
                </p>

                {/* Usage Summary */}
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/60">Leads:</span>
                    <span className="font-medium">
                      {subscription.usage?.leadsCount || 0} / {subscription.plan?.features?.maxLeads === -1 ? '∞' : (subscription.plan?.features?.maxLeads || 100)}
                    </span>
                  </div>
                  {subscription.plan?.features?.aiCallsPerMonth > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/60">AI Calls:</span>
                      <span className="font-medium">
                        {subscription.usage?.aiCallsCount || 0} / {subscription.plan?.features?.aiCallsPerMonth || 0}
                      </span>
                    </div>
                  )}
                  {subscription.plan?.features?.emailsPerMonth > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/60">Emails:</span>
                      <span className="font-medium">
                        {subscription.usage?.emailsCount || 0} / {subscription.plan?.features?.emailsPerMonth || 100}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Link
                to="/subscription"
                className="flex-1 sm:flex-none px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm text-center transition-colors"
              >
                View Plan
              </Link>
              <Link
                to="/pricing"
                className="flex-1 sm:flex-none px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold text-sm text-center transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header with Inline Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Greeting */}
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {getGreeting()}, {user?.firstName}
              </h1>
              <p className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>

            {/* Inline Stats */}
            <div className="hidden md:flex items-center gap-6 pl-6 border-l border-gray-200">
              <Link to="/leads" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded">
                <span className="text-2xl font-bold text-gray-900">{stats?.total || 0}</span>
                <span className="text-xs text-gray-500">Total<br/>Leads</span>
              </Link>
              <Link to="/leads?status=NEW" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded">
                <span className="text-2xl font-bold text-green-600">{stats?.todayCount || 0}</span>
                <span className="text-xs text-gray-500">New<br/>Today</span>
              </Link>
              <Link to="/raw-imports" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded">
                <span className="text-2xl font-bold text-purple-600">{rawImportStats?.pendingRecords || 0}</span>
                <span className="text-xs text-gray-500">Pending<br/>Review</span>
              </Link>
              <Link to="/raw-imports" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded">
                <span className="text-2xl font-bold text-amber-600">{rawImportStats?.interestedRecords || 0}</span>
                <span className="text-xs text-gray-500">Ready to<br/>Convert</span>
              </Link>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            <Link
              to="/leads/bulk-upload"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              Upload
            </Link>
            <Link
              to="/leads/new"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Lead
            </Link>
          </div>
        </div>

        {/* Mobile Stats Row */}
        <div className="flex md:hidden items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <Link to="/leads" className="text-center">
            <p className="text-xl font-bold text-gray-900">{stats?.total || 0}</p>
            <p className="text-xs text-gray-500">Leads</p>
          </Link>
          <Link to="/leads?status=NEW" className="text-center">
            <p className="text-xl font-bold text-green-600">{stats?.todayCount || 0}</p>
            <p className="text-xs text-gray-500">Today</p>
          </Link>
          <Link to="/raw-imports" className="text-center">
            <p className="text-xl font-bold text-purple-600">{rawImportStats?.pendingRecords || 0}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </Link>
          <Link to="/raw-imports" className="text-center">
            <p className="text-xl font-bold text-amber-600">{rawImportStats?.interestedRecords || 0}</p>
            <p className="text-xs text-gray-500">Convert</p>
          </Link>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Status Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Lead Status</h2>
            <Link to="/leads" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {statusPieData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <div className="text-center">
                <UsersIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No leads yet</p>
              </div>
            </div>
          )}

          {/* Legend */}
          {statusPieData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {statusPieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600">{entry.name}</span>
                  <span className="font-medium text-gray-900">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Sources Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Lead Sources</h2>
            <Link to="/leads/bulk-upload" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Import <ArrowUpRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {sourceBarData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#374151' }}
                    tickFormatter={(v) => (v.length > 10 ? v.substring(0, 10) + '..' : v)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="leads" radius={[0, 4, 4, 0]} barSize={20}>
                    {sourceBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <div className="text-center">
                <DocumentArrowUpIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No source data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Pipeline & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Import Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Import Pipeline</h2>
            <Link to="/raw-imports" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Manage <ArrowUpRightIcon className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xl font-bold text-gray-900">{rawImportStats?.totalRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-100">
              <p className="text-xl font-bold text-yellow-600">{rawImportStats?.pendingRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pending</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xl font-bold text-blue-600">{rawImportStats?.assignedRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Assigned</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xl font-bold text-green-600">{rawImportStats?.interestedRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Interested</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-xl font-bold text-purple-600">{rawImportStats?.convertedRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Converted</p>
            </div>
          </div>

          {/* Progress Bar */}
          {(rawImportStats?.totalRecords || 0) > 0 && (
            <div className="mt-4">
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-yellow-400"
                  style={{ width: `${((rawImportStats?.pendingRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }}
                />
                <div
                  className="bg-blue-500"
                  style={{ width: `${((rawImportStats?.assignedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }}
                />
                <div
                  className="bg-green-500"
                  style={{ width: `${((rawImportStats?.interestedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }}
                />
                <div
                  className="bg-purple-500"
                  style={{ width: `${((rawImportStats?.convertedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/leads/bulk-upload"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <DocumentArrowUpIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Bulk Upload</p>
                <p className="text-xs text-gray-500">Import CSV/Excel</p>
              </div>
            </Link>
            <Link
              to="/raw-imports"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <UsersIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Review Imports</p>
                <p className="text-xs text-gray-500">Assign & convert</p>
              </div>
            </Link>
            <Link
              to="/voice-ai"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">AI Voice Agents</p>
                <p className="text-xs text-gray-500">Manage agents</p>
              </div>
            </Link>
            <Link
              to="/outbound-calls"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Call Campaigns</p>
                <p className="text-xs text-gray-500">Outbound calls</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
