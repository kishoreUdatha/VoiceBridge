/**
 * Telecaller Performance Page
 * Analytics dashboard for human telecallers with warm color themes
 * Role-based access: Admin sees all, Manager sees branch, Team Lead sees assigned telecallers
 */

import React, { useState } from 'react';
import { useTelecallerPerformance } from './hooks/useTelecallerPerformance';
import {
  TelecallerLoadingSkeleton,
  TelecallerHeader,
  TelecallerStatsOverview,
  TelecallerGrid,
  TelecallerDetailModal,
} from './components/TelecallerPerformanceComponents';
import {
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

const TelecallerPerformancePage: React.FC = () => {
  const {
    leaderboard,
    dailyReport,
    selectedTelecaller,
    telecallerPerformance,
    loading,
    dailyLoading,
    metric,
    setMetric,
    dateRange,
    setDateRange,
    reportDate,
    setReportDate,
    setSelectedTelecaller,
    fetchLeaderboard,
    fetchDailyReport,
    getSelectedTelecallerEntry,
  } = useTelecallerPerformance();

  const [activeTab, setActiveTab] = useState<'daily' | 'leaderboard'>('daily');

  if (loading && leaderboard.length === 0) {
    return <TelecallerLoadingSkeleton />;
  }

  const totalCalls = leaderboard.reduce((sum, t) => sum + t.metrics.totalCalls, 0);
  const avgConversion = leaderboard.length > 0
    ? leaderboard.reduce((sum, t) => sum + t.metrics.avgConversionRate, 0) / leaderboard.length
    : 0;
  const avgAnswerRate = leaderboard.length > 0
    ? leaderboard.reduce((sum, t) => sum + t.metrics.avgAnswerRate, 0) / leaderboard.length
    : 0;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 py-3">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Telecaller Performance</h1>
            <p className="text-xs text-gray-500">Track daily calls, outcomes, and team performance</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'daily'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Daily Report
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'leaderboard'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Leaderboard
            </button>
          </div>
        </div>

        {/* Daily Report Tab */}
        {activeTab === 'daily' && (
          <div className="space-y-4">
            {/* Date Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Report Date:</span>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={fetchDailyReport}
                  disabled={dailyLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <ArrowPathIcon className={`w-3.5 h-3.5 ${dailyLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {dailyLoading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : dailyReport ? (
              <>
                {/* Daily Summary Cards - Row 1: Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <UserGroupIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Telecallers</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{dailyReport.totals.totalTelecallers}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-blue-200 p-3 bg-blue-50/50">
                    <div className="flex items-center gap-2 mb-1">
                      <PhoneIcon className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-blue-600">Total Calls</span>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{dailyReport.totals.totalCalls}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-green-200 p-3 bg-green-50/50">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600">Answered</span>
                    </div>
                    <p className="text-xl font-bold text-green-700">{dailyReport.totals.answered}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Talk Time</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatDuration(dailyReport.totals.totalDuration)}</p>
                  </div>
                </div>

                {/* Daily Summary Cards - Row 2: All Outcomes */}
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  <div className="bg-white rounded-xl border border-emerald-200 p-2.5 bg-emerald-50/50">
                    <span className="text-[10px] text-emerald-600 font-medium">Interested</span>
                    <p className="text-lg font-bold text-emerald-700">{dailyReport.totals.interested}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-orange-200 p-2.5 bg-orange-50/50">
                    <span className="text-[10px] text-orange-600 font-medium">Not Interested</span>
                    <p className="text-lg font-bold text-orange-700">{dailyReport.totals.notInterested}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-200 p-2.5 bg-amber-50/50">
                    <span className="text-[10px] text-amber-600 font-medium">Callback</span>
                    <p className="text-lg font-bold text-amber-700">{dailyReport.totals.callback}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-purple-200 p-2.5 bg-purple-50/50">
                    <span className="text-[10px] text-purple-600 font-medium">Converted</span>
                    <p className="text-lg font-bold text-purple-700">{dailyReport.totals.converted}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-red-200 p-2.5 bg-red-50/50">
                    <span className="text-[10px] text-red-600 font-medium">No Answer</span>
                    <p className="text-lg font-bold text-red-700">{dailyReport.totals.noAnswer}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-rose-200 p-2.5 bg-rose-50/50">
                    <span className="text-[10px] text-rose-600 font-medium">Busy</span>
                    <p className="text-lg font-bold text-rose-700">{dailyReport.totals.busy}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-[10px] text-slate-600 font-medium">Wrong No.</span>
                    <p className="text-lg font-bold text-slate-700">{dailyReport.totals.wrongNumber}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-indigo-200 p-2.5 bg-indigo-50/50">
                    <span className="text-[10px] text-indigo-600 font-medium">Voicemail</span>
                    <p className="text-lg font-bold text-indigo-700">{dailyReport.totals.voicemail}</p>
                  </div>
                </div>

                {/* Telecaller Details Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-900">Telecaller Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">Telecaller</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-blue-600 uppercase">Calls</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-green-600 uppercase">Ans.</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-emerald-600 uppercase">Int.</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-orange-600 uppercase">Not Int.</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-amber-600 uppercase">Callback</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-purple-600 uppercase">Conv.</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-red-600 uppercase">No Ans.</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-rose-600 uppercase">Busy</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-600 uppercase">Wrong</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-indigo-600 uppercase">VM</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ans %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {dailyReport.telecallers.length === 0 ? (
                          <tr>
                            <td colSpan={13} className="px-4 py-8 text-center text-gray-400">
                              No telecaller data for this date
                            </td>
                          </tr>
                        ) : (
                          dailyReport.telecallers.map((t) => (
                            <tr key={t.telecallerId} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 sticky left-0 bg-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-xs font-semibold">
                                    {t.telecallerName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                  </div>
                                  <span className="font-medium text-gray-900 text-xs">{t.telecallerName}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                {t.branch ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded">
                                    {t.branch.code}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center font-semibold text-blue-600">{t.stats.totalCalls}</td>
                              <td className="px-2 py-2 text-center text-green-600">{t.stats.answered}</td>
                              <td className="px-2 py-2 text-center text-emerald-600 font-medium">{t.stats.interested || '—'}</td>
                              <td className="px-2 py-2 text-center text-orange-600">{t.stats.notInterested || '—'}</td>
                              <td className="px-2 py-2 text-center text-amber-600">{t.stats.callback || '—'}</td>
                              <td className="px-2 py-2 text-center text-purple-600 font-semibold">{t.stats.converted || '—'}</td>
                              <td className="px-2 py-2 text-center text-red-600">{t.stats.noAnswer || '—'}</td>
                              <td className="px-2 py-2 text-center text-rose-600">{t.stats.busy || '—'}</td>
                              <td className="px-2 py-2 text-center text-slate-600">{t.stats.wrongNumber || '—'}</td>
                              <td className="px-2 py-2 text-center text-indigo-600">{t.stats.voicemail || '—'}</td>
                              <td className="px-2 py-2 text-center">
                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                  t.stats.answerRate >= 70 ? 'bg-green-100 text-green-700' :
                                  t.stats.answerRate >= 40 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {t.stats.answerRate}%
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <PhoneIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No daily report data available</p>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <>
            <TelecallerHeader
              metric={metric}
              dateRange={dateRange}
              loading={loading}
              onMetricChange={setMetric}
              onDateRangeChange={setDateRange}
              onRefresh={fetchLeaderboard}
            />
            <TelecallerStatsOverview
              totalTelecallers={leaderboard.length}
              totalCalls={totalCalls}
              avgConversion={avgConversion}
              avgAnswerRate={avgAnswerRate}
            />
            <TelecallerGrid
              leaderboard={leaderboard}
              selectedTelecaller={selectedTelecaller}
              metric={metric}
              onSelectTelecaller={setSelectedTelecaller}
            />
          </>
        )}

        {selectedTelecaller && (
          <TelecallerDetailModal
            telecallerPerformance={telecallerPerformance}
            selectedEntry={getSelectedTelecallerEntry()}
            onClose={() => setSelectedTelecaller(null)}
          />
        )}
      </div>
    </div>
  );
};

export default TelecallerPerformancePage;
