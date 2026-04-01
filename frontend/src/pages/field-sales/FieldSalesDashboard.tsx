import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCollegeStats } from '../../store/slices/fieldSales/collegeSlice';
import { fetchOpenVisit, fetchTodaySchedule, fetchVisitStats } from '../../store/slices/fieldSales/visitSlice';
import { fetchDealStats, fetchRecentWins } from '../../store/slices/fieldSales/dealSlice';
import { fetchMySummary } from '../../store/slices/fieldSales/expenseSlice';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolidIcon } from '@heroicons/react/24/solid';

export default function FieldSalesDashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { stats: collegeStats } = useAppSelector((state) => state.fieldSalesColleges);
  const { openVisit, hasOpenVisit, todaySchedule, stats: visitStats } = useAppSelector(
    (state) => state.fieldSalesVisits
  );
  const { stats: dealStats, recentWins } = useAppSelector((state) => state.fieldSalesDeals);
  const { mySummary } = useAppSelector((state) => state.fieldSalesExpenses);

  useEffect(() => {
    dispatch(fetchCollegeStats(undefined));
    dispatch(fetchOpenVisit());
    dispatch(fetchTodaySchedule());
    dispatch(fetchVisitStats({}));
    dispatch(fetchDealStats({}));
    dispatch(fetchRecentWins(5));
    dispatch(fetchMySummary(undefined));
  }, [dispatch]);

  const formatValue = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-emerald-600 text-white sticky top-0 z-10">
        <div className="max-w-full mx-auto px-3 py-3 sm:py-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm sm:text-xs font-semibold">Field Sales</h1>
              <p className="text-emerald-200 text-xs sm:text-[10px]">Daily overview</p>
            </div>
            {hasOpenVisit && openVisit ? (
              <button
                onClick={() => navigate('/field-sales/visits/check-in')}
                className="flex items-center gap-2 px-4 py-2.5 sm:px-2.5 sm:py-1.5 bg-amber-500 hover:bg-amber-600 rounded-lg sm:rounded text-xs sm:text-[10px] font-medium transition-colors shadow-lg"
              >
                <ClockIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Complete Check-out</span>
                <span className="sm:hidden">Check-out</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/field-sales/visits/check-in')}
                className="flex items-center gap-2 px-4 py-2.5 sm:px-2.5 sm:py-1.5 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded text-xs sm:text-[10px] font-medium transition-colors"
              >
                <PlayIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                <span>Start Visit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-2 space-y-3 sm:space-y-2">
        {/* Open Visit Banner - Mobile Optimized */}
        {hasOpenVisit && openVisit && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-lg p-3 sm:p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-2">
                <div className="w-12 h-12 sm:w-8 sm:h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 sm:w-4 sm:h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-[10px] font-medium text-amber-800">Currently Checked In</p>
                  <p className="text-sm sm:text-[11px] font-semibold text-amber-900">{openVisit.college?.name}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/field-sales/visits/check-in')}
                className="px-4 py-2 sm:px-2 sm:py-1 bg-amber-500 text-white rounded-lg sm:rounded text-xs sm:text-[10px] font-medium hover:bg-amber-600 shadow-sm"
              >
                Check Out
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid - Mobile: 2x2, Desktop: 4 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
          <div className="bg-white rounded-xl sm:rounded-lg border border-slate-200 p-3 sm:p-2 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-2">
              <div className="w-12 h-12 sm:w-8 sm:h-8 bg-blue-50 rounded-xl sm:rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 sm:w-4 sm:h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-[9px] text-slate-500">Colleges</p>
                <p className="text-xl sm:text-sm font-bold text-slate-900">{collegeStats?.totalColleges || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-lg border border-slate-200 p-3 sm:p-2 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-2">
              <div className="w-12 h-12 sm:w-8 sm:h-8 bg-emerald-50 rounded-xl sm:rounded-lg flex items-center justify-center">
                <MapPinIcon className="w-6 h-6 sm:w-4 sm:h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs sm:text-[9px] text-slate-500">Visits</p>
                <p className="text-xl sm:text-sm font-bold text-slate-900">{visitStats?.totalVisits || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-lg border border-slate-200 p-3 sm:p-2 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-2">
              <div className="w-12 h-12 sm:w-8 sm:h-8 bg-violet-50 rounded-xl sm:rounded-lg flex items-center justify-center">
                <CurrencyRupeeIcon className="w-6 h-6 sm:w-4 sm:h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs sm:text-[9px] text-slate-500">Pipeline</p>
                <p className="text-xl sm:text-sm font-bold text-slate-900">{formatValue(dealStats?.totalPipelineValue || 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-lg border border-slate-200 p-3 sm:p-2 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-2">
              <div className="w-12 h-12 sm:w-8 sm:h-8 bg-amber-50 rounded-xl sm:rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-6 h-6 sm:w-4 sm:h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs sm:text-[9px] text-slate-500">Win Rate</p>
                <p className="text-xl sm:text-sm font-bold text-slate-900">{dealStats?.winRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Mobile First (Big Buttons) */}
        <div className="grid grid-cols-4 sm:hidden gap-2">
          <button
            onClick={() => navigate('/field-sales/colleges')}
            className="flex flex-col items-center justify-center p-4 bg-blue-500 text-white rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <BuildingOfficeIcon className="w-8 h-8 mb-1" />
            <span className="text-xs font-medium">Colleges</span>
          </button>
          <button
            onClick={() => navigate('/field-sales/visits')}
            className="flex flex-col items-center justify-center p-4 bg-emerald-500 text-white rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <MapPinIcon className="w-8 h-8 mb-1" />
            <span className="text-xs font-medium">Visits</span>
          </button>
          <button
            onClick={() => navigate('/field-sales/deals')}
            className="flex flex-col items-center justify-center p-4 bg-violet-500 text-white rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <CurrencyRupeeIcon className="w-8 h-8 mb-1" />
            <span className="text-xs font-medium">Deals</span>
          </button>
          <button
            onClick={() => navigate('/field-sales/expenses?action=new')}
            className="flex flex-col items-center justify-center p-4 bg-amber-500 text-white rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <DocumentTextIcon className="w-8 h-8 mb-1" />
            <span className="text-xs font-medium">Expense</span>
          </button>
        </div>

        {/* Main Content Grid - Mobile: Single column, Desktop: 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
          {/* Today's Schedule - Mobile Optimized */}
          <div className="bg-white rounded-xl sm:rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 sm:px-2.5 sm:py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-1.5">
                <CalendarIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-blue-600" />
                <h3 className="text-sm sm:text-[10px] font-semibold text-slate-900">Today's Schedule</h3>
              </div>
              <span className="text-xs sm:text-[9px] px-2 py-1 sm:px-1.5 sm:py-0.5 bg-blue-100 text-blue-700 rounded-full sm:rounded font-medium">
                {todaySchedule?.totalCompleted || 0}/{todaySchedule?.totalScheduled || 0}
              </span>
            </div>
            <div className="p-3 sm:p-2 max-h-[250px] sm:max-h-[180px] overflow-y-auto">
              {todaySchedule?.scheduledVisits && todaySchedule.scheduledVisits.length > 0 ? (
                <div className="space-y-2 sm:space-y-1.5">
                  {todaySchedule.scheduledVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between p-3 sm:p-1.5 border border-slate-100 rounded-xl sm:rounded hover:bg-slate-50 cursor-pointer active:bg-slate-100"
                      onClick={() => navigate(`/field-sales/colleges/${visit.id}`)}
                    >
                      <div className="flex items-center gap-3 sm:gap-1.5 min-w-0">
                        <div className="w-10 h-10 sm:w-auto sm:h-auto bg-blue-50 rounded-lg sm:rounded-none sm:bg-transparent flex items-center justify-center">
                          <BuildingOfficeIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-blue-600 sm:text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-[10px] font-medium text-slate-900 truncate">{visit.name}</p>
                          <p className="text-xs sm:text-[9px] text-slate-500">{visit.city}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/field-sales/visits/check-in?collegeId=${visit.id}`);
                        }}
                        className="px-4 py-2 sm:px-1.5 sm:py-0.5 bg-emerald-500 text-white rounded-lg sm:rounded text-xs sm:text-[9px] font-medium hover:bg-emerald-600 flex-shrink-0 shadow-sm"
                      >
                        Visit
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-6">
                  <CalendarIcon className="w-8 h-8 sm:w-5 sm:h-5 text-slate-300 mx-auto mb-2 sm:mb-1" />
                  <p className="text-xs sm:text-[9px] text-slate-400">No scheduled visits</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Wins - Mobile Optimized */}
          <div className="bg-white rounded-xl sm:rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 sm:px-2.5 sm:py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-1.5">
                <TrophySolidIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                <h3 className="text-sm sm:text-[10px] font-semibold text-slate-900">Recent Wins</h3>
              </div>
              <button
                onClick={() => navigate('/field-sales/deals')}
                className="text-xs sm:text-[9px] text-emerald-600 font-medium"
              >
                View All
              </button>
            </div>
            <div className="p-3 sm:p-2 max-h-[250px] sm:max-h-[180px] overflow-y-auto">
              {recentWins && recentWins.length > 0 ? (
                <div className="space-y-2 sm:space-y-1.5">
                  {recentWins.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 sm:p-1.5 border border-slate-100 rounded-xl sm:rounded"
                    >
                      <div className="flex items-center gap-3 sm:gap-1.5 min-w-0">
                        <div className="w-10 h-10 sm:w-6 sm:h-6 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <TrophyIcon className="w-5 h-5 sm:w-3 sm:h-3 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-[10px] font-medium text-slate-900 truncate">{deal.college?.name}</p>
                          <p className="text-xs sm:text-[9px] text-slate-500 truncate">{deal.dealName}</p>
                        </div>
                      </div>
                      {deal.dealValue && (
                        <p className="text-sm sm:text-[10px] font-bold text-emerald-600 flex-shrink-0">
                          {formatValue(deal.dealValue)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-6">
                  <TrophyIcon className="w-8 h-8 sm:w-5 sm:h-5 text-slate-300 mx-auto mb-2 sm:mb-1" />
                  <p className="text-xs sm:text-[9px] text-slate-400">No wins yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Expense Summary - Mobile Optimized */}
          <div className="bg-white rounded-xl sm:rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 sm:px-2.5 sm:py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-1.5">
                <DocumentTextIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-violet-600" />
                <h3 className="text-sm sm:text-[10px] font-semibold text-slate-900">This Month Expenses</h3>
              </div>
              <button
                onClick={() => navigate('/field-sales/expenses')}
                className="text-xs sm:text-[9px] text-violet-600 font-medium"
              >
                View All
              </button>
            </div>
            <div className="p-4 sm:p-2">
              {mySummary ? (
                <div className="space-y-3 sm:space-y-1.5">
                  <div className="flex justify-between items-center text-sm sm:text-[10px]">
                    <span className="text-slate-500">Draft</span>
                    <span className="text-slate-700 font-medium">{formatValue(mySummary.draft.amount)} ({mySummary.draft.count})</span>
                  </div>
                  <div className="flex justify-between items-center text-sm sm:text-[10px]">
                    <span className="text-slate-500">Submitted</span>
                    <span className="text-amber-600 font-medium">{formatValue(mySummary.submitted.amount)} ({mySummary.submitted.count})</span>
                  </div>
                  <div className="flex justify-between items-center text-sm sm:text-[10px]">
                    <span className="text-slate-500">Approved</span>
                    <span className="text-emerald-600 font-medium">{formatValue(mySummary.approved.amount)} ({mySummary.approved.count})</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 sm:pt-1.5 mt-3 sm:mt-1.5">
                    <div className="flex justify-between items-center text-sm sm:text-[10px] font-semibold">
                      <span className="text-slate-700">Total Reimbursable</span>
                      <span className="text-lg sm:text-sm text-violet-600">{formatValue(mySummary.totalReimbursable)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-6">
                  <CurrencyRupeeIcon className="w-8 h-8 sm:w-5 sm:h-5 text-slate-300 mx-auto mb-2 sm:mb-1" />
                  <p className="text-xs sm:text-[9px] text-slate-400">No expenses</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - Desktop Only (Mobile has big buttons at top) */}
          <div className="hidden sm:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <ChartBarIcon className="w-3.5 h-3.5 text-slate-600" />
                <h3 className="text-[10px] font-semibold text-slate-900">Quick Actions</h3>
              </div>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => navigate('/field-sales/colleges')}
                  className="flex flex-col items-center justify-center p-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 transition-colors"
                >
                  <BuildingOfficeIcon className="w-4 h-4 text-blue-600 mb-1" />
                  <span className="text-[9px] font-medium text-blue-700">Colleges</span>
                </button>
                <button
                  onClick={() => navigate('/field-sales/visits')}
                  className="flex flex-col items-center justify-center p-2 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-100 transition-colors"
                >
                  <MapPinIcon className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="text-[9px] font-medium text-emerald-700">Visits</span>
                </button>
                <button
                  onClick={() => navigate('/field-sales/deals')}
                  className="flex flex-col items-center justify-center p-2 bg-violet-50 hover:bg-violet-100 rounded border border-violet-100 transition-colors"
                >
                  <CurrencyRupeeIcon className="w-4 h-4 text-violet-600 mb-1" />
                  <span className="text-[9px] font-medium text-violet-700">Deals</span>
                </button>
                <button
                  onClick={() => navigate('/field-sales/expenses?action=new')}
                  className="flex flex-col items-center justify-center p-2 bg-amber-50 hover:bg-amber-100 rounded border border-amber-100 transition-colors"
                >
                  <DocumentTextIcon className="w-4 h-4 text-amber-600 mb-1" />
                  <span className="text-[9px] font-medium text-amber-700">Add Expense</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
