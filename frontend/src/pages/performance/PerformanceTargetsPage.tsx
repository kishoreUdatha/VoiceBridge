import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  TrophyIcon,
  PhoneIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  BellAlertIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface TargetsData {
  targets: {
    callTarget: number;
    conversionTarget: number;
    talkTimeTarget: number;
  };
  performance: {
    callsCompleted: number;
    conversions: number;
    talkTimeMinutes: number;
  };
  progress: {
    calls: number;
    conversions: number;
    talkTime: number;
  };
}

interface TeamMember {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  targets: TargetsData['targets'];
  performance: TargetsData['performance'];
  progress: TargetsData['progress'];
}

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  calls: number;
  conversions: number;
  talkTimeMinutes: number;
  score: number;
}

export default function PerformanceTargetsPage() {
  const { t } = useTranslation();
  const [myTargets, setMyTargets] = useState<TargetsData | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTargets, setEditTargets] = useState({
    callTarget: 50,
    conversionTarget: 5,
    talkTimeTarget: 180,
  });

  useEffect(() => {
    fetchData();
  }, [leaderboardPeriod]);

  const fetchData = async () => {
    try {
      const [targetsRes, teamRes, leaderboardRes] = await Promise.all([
        api.get('/performance/my-targets'),
        api.get('/performance/team').catch(() => ({ data: { data: [] } })),
        api.get(`/performance/leaderboard?period=${leaderboardPeriod}`),
      ]);

      setMyTargets(targetsRes.data.data);
      setTeamPerformance(teamRes.data.data || []);
      setLeaderboard(leaderboardRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTargets = async () => {
    try {
      if (editingUserId) {
        await api.put(`/performance/users/${editingUserId}/targets`, editTargets);
      }
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to update targets:', error);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-100';
    if (progress >= 75) return 'bg-blue-100';
    if (progress >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance & Targets</h1>
          <p className="text-slate-500">Track progress towards daily goals</p>
        </div>
      </div>

      {/* My Targets */}
      {myTargets && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">My Daily Progress</h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Calls */}
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <PhoneIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-700">Calls</span>
                </div>
                <span className="text-sm text-slate-500">
                  {myTargets.performance.callsCompleted} / {myTargets.targets.callTarget}
                </span>
              </div>
              <div className="mt-3">
                <div className={`h-2 rounded-full ${getProgressBgColor(myTargets.progress.calls)}`}>
                  <div
                    className={`h-2 rounded-full ${getProgressColor(myTargets.progress.calls)} transition-all`}
                    style={{ width: `${Math.min(myTargets.progress.calls, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-sm font-medium text-slate-600">
                  {Math.round(myTargets.progress.calls)}%
                </p>
              </div>
            </div>

            {/* Conversions */}
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-green-100 p-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-medium text-slate-700">Conversions</span>
                </div>
                <span className="text-sm text-slate-500">
                  {myTargets.performance.conversions} / {myTargets.targets.conversionTarget}
                </span>
              </div>
              <div className="mt-3">
                <div className={`h-2 rounded-full ${getProgressBgColor(myTargets.progress.conversions)}`}>
                  <div
                    className={`h-2 rounded-full ${getProgressColor(myTargets.progress.conversions)} transition-all`}
                    style={{ width: `${Math.min(myTargets.progress.conversions, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-sm font-medium text-slate-600">
                  {Math.round(myTargets.progress.conversions)}%
                </p>
              </div>
            </div>

            {/* Talk Time */}
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <ClockIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-slate-700">Talk Time</span>
                </div>
                <span className="text-sm text-slate-500">
                  {myTargets.performance.talkTimeMinutes}m / {myTargets.targets.talkTimeTarget}m
                </span>
              </div>
              <div className="mt-3">
                <div className={`h-2 rounded-full ${getProgressBgColor(myTargets.progress.talkTime)}`}>
                  <div
                    className={`h-2 rounded-full ${getProgressColor(myTargets.progress.talkTime)} transition-all`}
                    style={{ width: `${Math.min(myTargets.progress.talkTime, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-sm font-medium text-slate-600">
                  {Math.round(myTargets.progress.talkTime)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Performance */}
        {teamPerformance.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-900">Team Performance</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {teamPerformance.map((member) => {
                const avgProgress = (member.progress.calls + member.progress.conversions + member.progress.talkTime) / 3;
                return (
                  <div key={member.user.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                        {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {member.performance.callsCompleted} calls, {member.performance.conversions} conversions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                        avgProgress >= 100 ? 'bg-green-100 text-green-700' :
                        avgProgress >= 75 ? 'bg-blue-100 text-blue-700' :
                        avgProgress >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {Math.round(avgProgress)}%
                      </div>
                      <button
                        onClick={() => {
                          setEditingUserId(member.user.id);
                          setEditTargets(member.targets);
                          setShowEditModal(true);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrophyIcon className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-900">Leaderboard</h2>
              </div>
              <select
                value={leaderboardPeriod}
                onChange={(e) => setLeaderboardPeriod(e.target.value as any)}
                className="rounded-lg border-slate-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {leaderboard.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No data available
              </div>
            ) : (
              leaderboard.slice(0, 10).map((entry) => (
                <div key={entry.user.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                      entry.rank === 2 ? 'bg-slate-200 text-slate-600' :
                      entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {entry.rank}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {entry.user.firstName} {entry.user.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.calls} calls | {entry.conversions} conversions | {entry.talkTimeMinutes}m talk
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{entry.score}</p>
                    <p className="text-xs text-slate-500">points</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Targets Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Set Daily Targets</h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Call Target</label>
                <input
                  type="number"
                  value={editTargets.callTarget}
                  onChange={(e) => setEditTargets(prev => ({ ...prev, callTarget: parseInt(e.target.value) || 0 }))}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Conversion Target</label>
                <input
                  type="number"
                  value={editTargets.conversionTarget}
                  onChange={(e) => setEditTargets(prev => ({ ...prev, conversionTarget: parseInt(e.target.value) || 0 }))}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Talk Time Target (minutes)</label>
                <input
                  type="number"
                  value={editTargets.talkTimeTarget}
                  onChange={(e) => setEditTargets(prev => ({ ...prev, talkTimeTarget: parseInt(e.target.value) || 0 }))}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={updateTargets}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Save Targets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
