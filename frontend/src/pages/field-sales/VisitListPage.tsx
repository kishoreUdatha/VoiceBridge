import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  EyeIcon,
  XMarkIcon,
  DocumentTextIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { visitService, Visit, VisitFilter } from '../../services/fieldSales/visit.service';

const purposeConfig: Record<string, { bg: string; text: string }> = {
  FIRST_INTRODUCTION: { bg: 'bg-blue-100', text: 'text-blue-700' },
  PRODUCT_DEMO: { bg: 'bg-violet-100', text: 'text-violet-700' },
  PROPOSAL_PRESENTATION: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  NEGOTIATION: { bg: 'bg-amber-100', text: 'text-amber-700' },
  DOCUMENT_COLLECTION: { bg: 'bg-slate-100', text: 'text-slate-700' },
  AGREEMENT_SIGNING: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  RELATIONSHIP_BUILDING: { bg: 'bg-pink-100', text: 'text-pink-700' },
  ISSUE_RESOLUTION: { bg: 'bg-red-100', text: 'text-red-700' },
  PAYMENT_FOLLOWUP: { bg: 'bg-orange-100', text: 'text-orange-700' },
  OTHER: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

const outcomeConfig: Record<string, { bg: string; text: string; label: string }> = {
  POSITIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Positive' },
  NEUTRAL: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Neutral' },
  NEGATIVE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Negative' },
  DECISION_PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  REFERRED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Referred' },
  RESCHEDULED: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Rescheduled' },
  DEAL_WON: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Won' },
  DEAL_LOST: { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost' },
};

export default function VisitListPage() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [stats, setStats] = useState<any>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadVisits();
    loadStats();
  }, [filter]);

  const loadVisits = async () => {
    setIsLoading(true);
    try {
      const filterParams: VisitFilter = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (filter === 'today') {
        filterParams.startDate = today.toISOString();
        filterParams.endDate = tomorrow.toISOString();
      } else if (filter === 'upcoming') {
        filterParams.startDate = tomorrow.toISOString();
      } else if (filter === 'completed') {
        filterParams.endDate = today.toISOString();
      }

      const result = await visitService.getVisits(filterParams, 1, 50);
      setVisits(result.visits);
    } catch (error) {
      console.error('Failed to load visits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await visitService.getVisitStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getVisitStatus = (visit: Visit) => {
    const visitDate = new Date(visit.visitDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (visit.checkOutTime) {
      return { label: 'Completed', class: 'fs-status-completed' };
    }
    if (visit.checkInTime && !visit.checkOutTime) {
      return { label: 'In Progress', class: 'fs-status-in-progress' };
    }
    if (visitDate.toDateString() === today.toDateString()) {
      return { label: 'Today', class: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' };
    }
    if (visitDate > today) {
      return { label: 'Scheduled', class: 'fs-status-scheduled' };
    }
    if (!visit.checkInTime) {
      return { label: 'Missed', class: 'fs-status-missed' };
    }
    return { label: 'Unknown', class: 'fs-status-scheduled' };
  };

  const handleViewVisit = (visit: Visit, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVisit(visit);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen sm:min-h-0">
      {/* Mobile Header - Sticky */}
      <div className="sm:hidden bg-emerald-600 text-white sticky top-0 z-20 -mx-4 -mt-4 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Visits</h1>
            <p className="text-emerald-200 text-[10px]">{stats?.totalVisits || 0} total visits</p>
          </div>
          <button
            onClick={() => navigate('/field-sales/visits/check-in')}
            className="px-3 py-2 bg-white text-emerald-600 text-xs font-semibold rounded-lg active:scale-95 transition-transform"
          >
            Check In
          </button>
        </div>

        {/* Mobile Stats */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{stats?.totalVisits || 0}</p>
            <p className="text-[9px] text-emerald-200">Total</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{stats?.todayVisits || 0}</p>
            <p className="text-[9px] text-emerald-200">Today</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{stats?.completedThisWeek || 0}</p>
            <p className="text-[9px] text-emerald-200">Week</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold">{stats?.upcomingVisits || 0}</p>
            <p className="text-[9px] text-emerald-200">Upcoming</p>
          </div>
        </div>

        {/* Mobile Filter Pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'today', label: 'Today' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? 'bg-white text-emerald-600'
                  : 'bg-white/10 text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Visits</h1>
          <p className="text-xs text-slate-500">Track and manage college visits</p>
        </div>
        <button
          onClick={() => navigate('/field-sales/visits/check-in')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Check In
        </button>
      </div>

      {/* Stats Row */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Total:</span>
            <span className="text-sm font-semibold text-slate-900">{stats?.totalVisits || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Today:</span>
            <span className="text-sm font-semibold text-amber-600">{stats?.todayVisits || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">This Week:</span>
            <span className="text-sm font-semibold text-emerald-600">{stats?.completedThisWeek || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Upcoming:</span>
            <span className="text-sm font-semibold text-violet-600">{stats?.upcomingVisits || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs - Underline Style */}
      <div className="px-4 border-b border-slate-200">
        <div className="flex items-center gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'today', label: 'Today' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                filter === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Visits Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner spinner-sm"></div>
        </div>
      ) : visits.length === 0 ? (
        <div className="p-8 text-center">
          <MapPinIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">No visits found</p>
          <p className="text-xs text-slate-400 mb-4">
            {filter === 'today'
              ? "No visits scheduled for today"
              : filter === 'upcoming'
              ? 'No upcoming visits scheduled'
              : 'Start by checking in at a college'}
          </p>
          <button
            onClick={() => navigate('/field-sales/visits/check-in')}
            className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md"
          >
            Check In Now
          </button>
        </div>
      ) : (
        <div>
          {/* Table */}
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                <th className="text-left px-3 py-2.5" style={{ width: '9%' }}>Date</th>
                <th className="text-left px-3 py-2.5" style={{ width: '32%' }}>College</th>
                <th className="text-left px-3 py-2.5" style={{ width: '12%' }}>Purpose</th>
                <th className="text-left px-3 py-2.5" style={{ width: '10%' }}>Time</th>
                <th className="text-left px-3 py-2.5" style={{ width: '12%' }}>Status</th>
                <th className="text-left px-3 py-2.5" style={{ width: '10%' }}>Outcome</th>
                <th className="text-center px-3 py-2.5" style={{ width: '7%' }}>Action</th>
              </tr>
            </thead>
            <tbody>

              {visits.map((visit) => {
                const status = getVisitStatus(visit);
                const purposeCfg = purposeConfig[visit.purpose] || { bg: 'bg-slate-100', text: 'text-slate-700' };
                const outcomeCfg = visit.outcome ? (outcomeConfig[visit.outcome] || { bg: 'bg-slate-100', text: 'text-slate-700', label: visit.outcome }) : null;

                // Shortened purpose labels
                const purposeShort: Record<string, string> = {
                  FIRST_INTRODUCTION: 'Introduction',
                  PRODUCT_DEMO: 'Demo',
                  PROPOSAL_PRESENTATION: 'Proposal',
                  NEGOTIATION: 'Negotiation',
                  DOCUMENT_COLLECTION: 'Documents',
                  AGREEMENT_SIGNING: 'Agreement',
                  RELATIONSHIP_BUILDING: 'Relationship',
                  ISSUE_RESOLUTION: 'Issue',
                  PAYMENT_FOLLOWUP: 'Payment',
                  OTHER: 'Other',
                };

                // Get display time
                const displayTime = visit.checkInTime
                  ? formatTime(visit.checkInTime)
                  : formatTime(visit.visitDate);

                return (
                  <tr
                    key={visit.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                    onClick={() => navigate(`/field-sales/colleges/${visit.collegeId}`)}
                  >
                    {/* Date */}
                    <td className="px-3 py-3 text-xs text-slate-700 font-medium whitespace-nowrap">
                      {new Date(visit.visitDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    {/* College */}
                    <td className="px-3 py-3">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {visit.college?.name || 'Unknown College'}
                      </p>
                      {visit.college?.city && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPinIcon className="w-2.5 h-2.5 flex-shrink-0" />
                          <span>{visit.college.city}</span>
                        </p>
                      )}
                    </td>

                    {/* Purpose */}
                    <td className="px-3 py-3">
                      <span className={`inline-block text-[10px] px-2 py-1 rounded font-medium ${purposeCfg.bg} ${purposeCfg.text}`}>
                        {purposeShort[visit.purpose] || visit.purpose.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                      <span>{displayTime}</span>
                      {visit.duration && (
                        <p className="text-[10px] text-slate-400">{formatDuration(visit.duration)}</p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded font-medium whitespace-nowrap ${
                        status.label === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        status.label === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        status.label === 'Missed' ? 'bg-red-100 text-red-700' :
                        status.label === 'Today' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {status.label === 'Completed' && <CheckCircleSolidIcon className="w-3 h-3" />}
                        {status.label === 'In Progress' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />}
                        {status.label}
                      </span>
                    </td>

                    {/* Outcome */}
                    <td className="px-3 py-3">
                      {outcomeCfg ? (
                        <span className={`inline-block text-[10px] px-2 py-1 rounded font-medium ${outcomeCfg.bg} ${outcomeCfg.text}`}>
                          {outcomeCfg.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={(e) => handleViewVisit(visit, e)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Mobile Visit Cards */}
      <div className="sm:hidden space-y-3 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-12">
            <MapPinIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">No visits found</p>
            <button
              onClick={() => navigate('/field-sales/visits/check-in')}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg"
            >
              Check In Now
            </button>
          </div>
        ) : (
          visits.map((visit) => {
            const status = getVisitStatus(visit);
            const purposeCfg = purposeConfig[visit.purpose] || { bg: 'bg-slate-100', text: 'text-slate-700' };
            const outcomeCfg = visit.outcome ? (outcomeConfig[visit.outcome] || { bg: 'bg-slate-100', text: 'text-slate-700', label: visit.outcome }) : null;
            const purposeShort: Record<string, string> = {
              FIRST_INTRODUCTION: 'Intro',
              PRODUCT_DEMO: 'Demo',
              PROPOSAL_PRESENTATION: 'Proposal',
              NEGOTIATION: 'Negotiate',
              DOCUMENT_COLLECTION: 'Docs',
              AGREEMENT_SIGNING: 'Agreement',
              RELATIONSHIP_BUILDING: 'Relation',
              ISSUE_RESOLUTION: 'Issue',
              PAYMENT_FOLLOWUP: 'Payment',
              OTHER: 'Other',
            };

            return (
              <div
                key={visit.id}
                onClick={() => navigate(`/field-sales/colleges/${visit.collegeId}`)}
                className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {visit.college?.name || 'Unknown College'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3" />
                        {visit.college?.city || 'N/A'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{formatDate(visit.visitDate)}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                    status.label === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                    status.label === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    status.label === 'Missed' ? 'bg-red-100 text-red-700' :
                    status.label === 'Today' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${purposeCfg.bg} ${purposeCfg.text}`}>
                      {purposeShort[visit.purpose] || visit.purpose}
                    </span>
                    {outcomeCfg && (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${outcomeCfg.bg} ${outcomeCfg.text}`}>
                        {outcomeCfg.label}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleViewVisit(visit, e)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Visit Detail Modal */}
      {isDetailModalOpen && selectedVisit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsDetailModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Visit Details</h2>
                <p className="text-[10px] text-slate-500">{selectedVisit.college?.name || 'Unknown College'}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <XMarkIcon className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Status Banner */}
              {(() => {
                const outcomeCfg = selectedVisit.outcome ? outcomeConfig[selectedVisit.outcome] : null;
                return (
                  <div className={`p-3 rounded-lg ${
                    selectedVisit.outcome === 'POSITIVE' || selectedVisit.outcome === 'DEAL_WON' || selectedVisit.outcome === 'CLOSED_WON'
                      ? 'bg-emerald-50 border border-emerald-200'
                      : selectedVisit.outcome === 'NEGATIVE' || selectedVisit.outcome === 'DEAL_LOST' || selectedVisit.outcome === 'CLOSED_LOST'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {outcomeCfg && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${outcomeCfg.bg} ${outcomeCfg.text}`}>
                            {selectedVisit.outcome?.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                          {selectedVisit.purpose.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {selectedVisit.locationVerified && (
                        <span className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-medium">
                          <CheckCircleIcon className="h-3 w-3" />
                          GPS
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Time Grid */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Date', value: formatDate(selectedVisit.visitDate) },
                  { label: 'In', value: selectedVisit.checkInTime ? formatTime(selectedVisit.checkInTime) : '-' },
                  { label: 'Out', value: selectedVisit.checkOutTime ? formatTime(selectedVisit.checkOutTime) : '-' },
                  { label: 'Duration', value: selectedVisit.duration ? formatDuration(selectedVisit.duration) : '-' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[9px] text-slate-500 uppercase">{item.label}</p>
                    <p className="text-xs font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                  <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Summary</h4>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-700 whitespace-pre-line">{selectedVisit.summary || 'No summary provided'}</p>
                </div>
              </div>

              {/* Contacts Met */}
              {selectedVisit.contactsMet && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Contacts Met</h4>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    {(() => {
                      try {
                        const contacts = typeof selectedVisit.contactsMet === 'string'
                          ? JSON.parse(selectedVisit.contactsMet)
                          : selectedVisit.contactsMet;
                        if (Array.isArray(contacts) && contacts.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-1">
                              {contacts.map((contact: any, idx: number) => (
                                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                                  {typeof contact === 'string' ? contact : contact.name || contact}
                                </span>
                              ))}
                            </div>
                          );
                        }
                        return <p className="text-slate-500 text-xs">No contacts recorded</p>;
                      } catch {
                        return <p className="text-xs text-slate-700">{String(selectedVisit.contactsMet)}</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {selectedVisit.actionItems && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Action Items</h4>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                    <ul className="space-y-1">
                      {selectedVisit.actionItems.split('\n').filter(Boolean).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center text-[9px] font-semibold text-amber-800 flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] text-amber-900">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {(selectedVisit.nextVisitDate || selectedVisit.nextAction) && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Next Steps</h4>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1">
                    {selectedVisit.nextVisitDate && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-600">Next Visit:</span>
                        <span className="text-[10px] font-medium text-blue-700">
                          {new Date(selectedVisit.nextVisitDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {selectedVisit.nextAction && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] text-slate-600">Action:</span>
                        <span className="text-[10px] text-slate-900">{selectedVisit.nextAction}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {(selectedVisit.checkInLatitude && selectedVisit.checkInLongitude) && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-semibold text-slate-700 uppercase">Location</h4>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-600">
                        {selectedVisit.checkInLatitude.toFixed(6)}, {selectedVisit.checkInLongitude.toFixed(6)}
                      </p>
                      {selectedVisit.distanceFromCollege != null && (
                        <p className="text-[9px] text-slate-500">
                          {selectedVisit.distanceFromCollege.toFixed(0)}m from college
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedVisit.checkInLatitude},${selectedVisit.checkInLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 border border-slate-200 text-slate-600 text-[10px] font-medium rounded hover:bg-white"
                    >
                      Open Map
                    </a>
                  </div>
                </div>
              )}

              {/* College Link */}
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate(`/field-sales/colleges/${selectedVisit.collegeId}`);
                }}
                className="w-full px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg"
              >
                View College Details
              </button>

              {/* Meta */}
              <div className="border-t border-slate-100 pt-3 text-[9px] text-slate-400 space-y-0.5">
                <p>ID: {selectedVisit.id.substring(0, 8)}...</p>
                <p>Created: {formatDateTime(selectedVisit.createdAt)}</p>
                {selectedVisit.user && (
                  <p>By: {selectedVisit.user.firstName} {selectedVisit.user.lastName}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

