/**
 * Login Report - User login/logout tracking with filters
 */
import { useState, useEffect } from 'react';
import { ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, ClockIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface LoginRow {
  no: number;
  user: string;
  reportingManager: string;
  loginDate: string;
  loginTime: string;
  logoutTime: string;
  duration: string;
  ipAddress: string;
  device: string;
  browser: string;
  location: string;
  status: 'active' | 'completed' | 'timeout';
}

export default function LoginReportPage() {
  const [data, setData] = useState<{ logins: LoginRow[]; summary: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  });

  useEffect(() => { loadData(); }, [dateRange]);

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '-';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const formatTime = (date: Date | string | null): string => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const parseUserAgent = (ua: string): { device: string; browser: string } => {
    let device = 'Desktop';
    let browser = 'Unknown';

    if (ua) {
      if (ua.includes('Mobile')) device = 'Mobile';
      else if (ua.includes('Tablet')) device = 'Tablet';
      else if (ua.includes('Laptop')) device = 'Laptop';

      if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Safari')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';
    }
    return { device, browser };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/work-sessions/history', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      const sessions = response.data.data?.sessions || [];

      // Group sessions by user + date for consolidation
      const consolidatedMap = new Map<string, {
        user: string;
        reportingManager: string;
        loginDate: string;
        firstLoginTime: Date;
        lastLogoutTime: Date | null;
        totalDuration: number;
        ipAddress: string;
        device: string;
        browser: string;
        hasActive: boolean;
        hasTimeout: boolean;
        sessionCount: number;
      }>();

      for (const session of sessions) {
        const userName = session.user ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() : 'Unknown';
        const loginDate = formatDate(session.startedAt);
        const key = `${userName}|${loginDate}`;

        const { device, browser } = parseUserAgent(session.userAgent || '');
        const isActive = session.status === 'ACTIVE' || session.status === 'ON_BREAK';
        const isTimeout = session.status === 'EXPIRED';

        const existing = consolidatedMap.get(key);

        if (existing) {
          // Update existing consolidated record
          const sessionStart = new Date(session.startedAt);
          const sessionEnd = session.endedAt ? new Date(session.endedAt) : null;

          // Use earliest login time
          if (sessionStart < existing.firstLoginTime) {
            existing.firstLoginTime = sessionStart;
          }

          // Use latest logout time (only if session has ended)
          if (sessionEnd) {
            if (!existing.lastLogoutTime || sessionEnd > existing.lastLogoutTime) {
              existing.lastLogoutTime = sessionEnd;
            }
          }

          // Sum durations
          existing.totalDuration += session.duration || session.activeTime || 0;
          existing.hasActive = existing.hasActive || isActive;
          existing.hasTimeout = existing.hasTimeout || isTimeout;
          existing.sessionCount += 1;
        } else {
          // Create new consolidated record
          consolidatedMap.set(key, {
            user: userName,
            reportingManager: session.user?.manager ? `${session.user.manager.firstName || ''} ${session.user.manager.lastName || ''}`.trim() : '-',
            loginDate,
            firstLoginTime: new Date(session.startedAt),
            lastLogoutTime: session.endedAt ? new Date(session.endedAt) : null,
            totalDuration: session.duration || session.activeTime || 0,
            ipAddress: session.ipAddress || '-',
            device: session.device || device,
            browser,
            hasActive: isActive,
            hasTimeout: isTimeout,
            sessionCount: 1,
          });
        }
      }

      // Convert consolidated map to LoginRow array
      const logins: LoginRow[] = Array.from(consolidatedMap.values())
        .sort((a, b) => b.firstLoginTime.getTime() - a.firstLoginTime.getTime()) // Sort by most recent first
        .map((record, index) => {
          const status: 'active' | 'completed' | 'timeout' =
            record.hasActive ? 'active' :
            record.hasTimeout ? 'timeout' : 'completed';

          return {
            no: index + 1,
            user: record.user,
            reportingManager: record.reportingManager,
            loginDate: record.loginDate,
            loginTime: formatTime(record.firstLoginTime),
            logoutTime: record.hasActive ? '-' : (record.lastLogoutTime ? formatTime(record.lastLogoutTime) : '-'),
            duration: formatDuration(record.totalDuration),
            ipAddress: record.ipAddress,
            device: record.device,
            browser: record.browser,
            location: '-',
            status,
          };
        });

      const activeCount = logins.filter(l => l.status === 'active').length;
      const completedCount = logins.filter(l => l.status === 'completed').length;
      const uniqueUsers = [...new Set(logins.map(l => l.user))].length;
      const totalDuration = sessions.reduce((sum: number, s: any) => sum + (s.duration || s.activeTime || 0), 0);
      const avgDuration = logins.length > 0 ? Math.round(totalDuration / logins.length) : 0;

      setData({
        logins,
        summary: {
          totalLogins: sessions.length, // Total individual sessions
          uniqueUsers,
          avgSessionDuration: formatDuration(avgDuration),
          activeNow: activeCount,
          completedToday: completedCount,
          timeoutSessions: logins.filter(l => l.status === 'timeout').length,
        },
      });
    } catch (err: any) {
      console.error('Failed to load login data:', err);
      toast.error('Failed to load login report');
      setData({ logins: [], summary: { totalLogins: 0, uniqueUsers: 0, avgSessionDuration: '-', activeNow: 0 } });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'active': 'bg-green-100 text-green-700',
      'completed': 'bg-blue-100 text-blue-700',
      'timeout': 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      'active': 'Active',
      'completed': 'Completed',
      'timeout': 'Timeout',
    };
    return { style: styles[status] || 'bg-gray-100 text-gray-700', label: labels[status] || status };
  };

  // Get unique users for filter
  const uniqueUsers = [...new Set(data?.logins.map(l => l.user) || [])];

  const filters = [
    {
      name: 'User',
      value: selectedUser,
      options: [
        { value: 'all', label: 'All Users' },
        ...uniqueUsers.map(user => ({ value: user, label: user })),
      ],
      onChange: setSelectedUser,
    },
    {
      name: 'Status',
      value: selectedStatus,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'timeout', label: 'Timeout' },
      ],
      onChange: setSelectedStatus,
    },
  ];

  const filteredLogins = data?.logins.filter(l =>
    (selectedUser === 'all' || l.user === selectedUser) &&
    (selectedStatus === 'all' || l.status === selectedStatus)
  ) || [];

  return (
    <ReportTemplate
      title="Login Report"
      description="Track user login/logout activities and session details"
      icon={ArrowRightOnRectangleIcon}
      iconColor="bg-teal-500"
      isLoading={isLoading}
      filters={filters}
      onRefresh={loadData}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {data && (
        <div className="space-y-6">
          <ReportStatsGrid>
            <ReportStatCard label="Total Logins" value={data.summary.totalLogins} icon={ArrowRightOnRectangleIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Unique Users" value={data.summary.uniqueUsers} icon={ArrowLeftOnRectangleIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Avg Session Duration" value={data.summary.avgSessionDuration} icon={ClockIcon} iconColor="bg-orange-500" />
            <ReportStatCard label="Active Now" value={data.summary.activeNow} icon={ComputerDesktopIcon} iconColor="bg-purple-500" />
          </ReportStatsGrid>

          {/* Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-slate-50 z-10">No</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-10 bg-slate-50 z-10">User</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reporting Manager</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Login Date</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">Login Time</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-red-50">Logout Time</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-orange-50">Duration</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-purple-50">IP Address</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-cyan-50">Device</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-cyan-50">Browser</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-indigo-50">Location</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-yellow-50">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogins.map((row) => {
                    const statusBadge = getStatusBadge(row.status);
                    return (
                      <tr key={row.no} className={`hover:bg-slate-50 ${row.status === 'active' ? 'bg-green-50/30' : ''}`}>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white z-10">{row.no}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-10 bg-white z-10">{row.user}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600">{row.reportingManager}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-900 bg-blue-50/30">{row.loginDate}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-green-700 font-medium bg-green-50/30">{row.loginTime}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-red-50/30">
                          {row.logoutTime === '-' ? (
                            <span className="text-green-600 font-medium">Still Active</span>
                          ) : (
                            <span className="text-red-600">{row.logoutTime}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-semibold text-orange-700 bg-orange-50/30">{row.duration}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-mono text-xs text-slate-600 bg-purple-50/30">{row.ipAddress}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-600 bg-cyan-50/30">{row.device}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-600 bg-cyan-50/30">{row.browser}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-600 bg-indigo-50/30">{row.location}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-yellow-50/30">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.style}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Summary Row */}
                <tfoot>
                  <tr className="bg-slate-100 font-semibold">
                    <td className="px-3 py-3 text-sm sticky left-0 bg-slate-100 z-10"></td>
                    <td className="px-3 py-3 text-sm font-bold sticky left-10 bg-slate-100 z-10">TOTAL: {filteredLogins.length} user-days ({data.summary.totalLogins} sessions)</td>
                    <td className="px-3 py-3 text-sm" colSpan={10}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* User Summary Cards */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">User Login Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {uniqueUsers.map(user => {
                const userLogins = data.logins.filter(l => l.user === user);
                const activeCount = userLogins.filter(l => l.status === 'active').length;
                return (
                  <div key={user} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-sm font-medium text-slate-900">{user}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{userLogins.length} logins</span>
                      {activeCount > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ReportTemplate>
  );
}
