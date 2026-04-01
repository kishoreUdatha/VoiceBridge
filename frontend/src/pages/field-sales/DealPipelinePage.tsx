import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPipeline, fetchDealStats, updateStage } from '../../store/slices/fieldSales/dealSlice';
import {
  CurrencyRupeeIcon,
  TrophyIcon,
  XCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { DealStage, Deal } from '../../services/fieldSales/deal.service';

const stageConfig: { stage: DealStage; label: string; color: string; textColor: string; borderColor: string; isFinal?: boolean }[] = [
  { stage: 'PROSPECTING', label: 'Prospect', color: 'bg-slate-100', textColor: 'text-slate-700', borderColor: 'border-slate-300' },
  { stage: 'FIRST_MEETING', label: '1st Meet', color: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-300' },
  { stage: 'NEEDS_ANALYSIS', label: 'Analysis', color: 'bg-indigo-50', textColor: 'text-indigo-700', borderColor: 'border-indigo-300' },
  { stage: 'PROPOSAL_SENT', label: 'Proposal', color: 'bg-violet-50', textColor: 'text-violet-700', borderColor: 'border-violet-300' },
  { stage: 'NEGOTIATION', label: 'Negotiate', color: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-300' },
  { stage: 'DECISION_PENDING', label: 'Decision', color: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-300' },
  { stage: 'WON', label: 'Won', color: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-300', isFinal: true },
  { stage: 'LOST', label: 'Lost', color: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-300', isFinal: true },
];

export default function DealPipelinePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { pipeline, stats, isLoading } = useAppSelector((state) => state.fieldSalesDeals);
  const [draggingDeal, setDraggingDeal] = useState<Deal | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedStage, setSelectedStage] = useState<DealStage | 'ALL'>('ALL');

  useEffect(() => {
    dispatch(fetchPipeline(undefined));
    dispatch(fetchDealStats({}));
  }, [dispatch]);

  const handleDragStart = (deal: Deal) => {
    setDraggingDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStage: DealStage) => {
    if (!draggingDeal || draggingDeal.stage === newStage) {
      setDraggingDeal(null);
      return;
    }

    try {
      await dispatch(
        updateStage({
          id: draggingDeal.id,
          stage: newStage,
        })
      ).unwrap();
      toast.success(`Deal moved to ${newStage.replace('_', ' ')}`);
      dispatch(fetchPipeline(undefined));
    } catch (error: any) {
      toast.error(error || 'Failed to move deal');
    }
    setDraggingDeal(null);
  };

  const handleMarkWon = async (deal: Deal) => {
    const reason = window.prompt('Enter reason for winning this deal:');
    if (reason !== null) {
      try {
        await dispatch(updateStage({ id: deal.id, stage: 'WON', reason })).unwrap();
        toast.success('Deal marked as Won!');
        dispatch(fetchPipeline(undefined));
        dispatch(fetchDealStats({}));
      } catch (error: any) {
        toast.error(error || 'Failed to mark deal as won');
      }
    }
  };

  const handleMarkLost = async (deal: Deal) => {
    const reason = window.prompt('Enter reason for losing this deal:');
    if (reason !== null) {
      try {
        await dispatch(updateStage({ id: deal.id, stage: 'LOST', reason })).unwrap();
        toast.success('Deal marked as Lost');
        dispatch(fetchPipeline(undefined));
        dispatch(fetchDealStats({}));
      } catch (error: any) {
        toast.error(error || 'Failed to mark deal as lost');
      }
    }
  };

  const formatValue = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  // Get all deals for mobile view
  const allDeals = stageConfig.flatMap(({ stage }) => {
    const deals = pipeline?.pipeline[stage] || [];
    return deals.map(deal => ({ ...deal, stageConfig: stageConfig.find(s => s.stage === stage)! }));
  });

  const filteredDeals = selectedStage === 'ALL'
    ? allDeals
    : allDeals.filter(d => d.stage === selectedStage);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-emerald-600 text-white sticky top-0 z-10">
        <div className="max-w-full mx-auto px-3 py-3 sm:py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-sm sm:text-xs font-semibold">Deal Pipeline</h1>
                <p className="text-emerald-200 text-xs sm:text-[10px]">Track opportunities</p>
              </div>
              {/* View Toggle - Hidden on mobile */}
              <div className="hidden sm:flex bg-white/10 rounded p-0.5">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1 rounded ${viewMode === 'kanban' ? 'bg-white/20' : ''}`}
                  title="Kanban View"
                >
                  <Squares2X2Icon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${viewMode === 'list' ? 'bg-white/20' : ''}`}
                  title="List View"
                >
                  <ListBulletIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {stats && (
              <>
                {/* Desktop Stats */}
                <div className="hidden sm:flex items-center gap-2 text-[10px]">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded">
                    <ChartBarIcon className="w-3 h-3" />
                    <span>{stats.openDeals} Open</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded">
                    <CurrencyRupeeIcon className="w-3 h-3" />
                    <span>{formatValue(stats.totalPipelineValue || 0)} Pipeline</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 rounded">
                    <TrophySolidIcon className="w-3 h-3" />
                    <span>{stats.wonDeals} Won ({formatValue(stats.wonValue || 0)})</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded">
                    <ArrowTrendingUpIcon className="w-3 h-3" />
                    <span>{stats.winRate || 0}% Win</span>
                  </div>
                </div>
                {/* Mobile Stats */}
                <div className="flex sm:hidden items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500 rounded-lg">
                    <TrophySolidIcon className="w-4 h-4" />
                    <span>{stats.wonDeals}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatValue(stats.totalPipelineValue || 0)}</p>
                    <p className="text-emerald-200 text-[10px]">{stats.winRate}% win</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Stage Filter Pills */}
        <div className="sm:hidden px-3 pb-2 overflow-x-auto">
          <div className="flex gap-1.5">
            <button
              onClick={() => setSelectedStage('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                selectedStage === 'ALL' ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'
              }`}
            >
              All ({allDeals.length})
            </button>
            {stageConfig.map(({ stage, label }) => {
              const count = (pipeline?.pipeline[stage] || []).length;
              if (count === 0) return null;
              return (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    selectedStage === stage ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeals.length === 0 ? (
              <div className="text-center py-12">
                <CurrencyRupeeIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No deals found</p>
              </div>
            ) : (
              filteredDeals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => deal.college?.id && navigate(`/field-sales/colleges/${deal.college.id}`)}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${deal.stageConfig.color} rounded-xl flex items-center justify-center`}>
                        {deal.stage === 'WON' ? (
                          <TrophySolidIcon className="w-6 h-6 text-emerald-600" />
                        ) : deal.stage === 'LOST' ? (
                          <XCircleIcon className="w-6 h-6 text-red-500" />
                        ) : (
                          <BuildingOfficeIcon className={`w-6 h-6 ${deal.stageConfig.textColor}`} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{deal.college?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{deal.dealName}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${deal.stageConfig.color} ${deal.stageConfig.textColor}`}>
                      {deal.stageConfig.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      {deal.dealValue && (
                        <p className="text-xl font-bold text-emerald-600">{formatValue(deal.dealValue)}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {deal.owner ? `${deal.owner.firstName} ${deal.owner.lastName}` : ''}
                      </p>
                    </div>
                    {!deal.stageConfig.isFinal && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkWon(deal);
                          }}
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-xl active:bg-emerald-100"
                        >
                          <TrophyIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkLost(deal);
                          }}
                          className="p-3 bg-red-50 text-red-500 rounded-xl active:bg-red-100"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Desktop Pipeline Board */}
      <div className="hidden sm:block p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-1.5 text-slate-500">
              <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
              <span className="text-[10px]">Loading pipeline...</span>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-1" style={{ minWidth: stageConfig.length * 130 }}>
              {stageConfig.map(({ stage, label, color, textColor, borderColor, isFinal }) => {
                const deals = pipeline?.pipeline[stage] || [];
                const totals = pipeline?.totals[stage] || { count: 0, value: 0, weightedValue: 0 };

                return (
                  <div
                    key={stage}
                    className="w-32 flex-shrink-0"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(stage)}
                  >
                    {/* Stage Header */}
                    <div className={`rounded-t px-2 py-1.5 ${color} border-b ${borderColor}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          {stage === 'WON' && <TrophySolidIcon className="w-3 h-3 text-emerald-600" />}
                          {stage === 'LOST' && <XCircleIcon className="w-3 h-3 text-red-500" />}
                          <h3 className={`text-[10px] font-semibold ${textColor}`}>{label}</h3>
                        </div>
                        <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${textColor} bg-white/60`}>
                          {totals.count}
                        </span>
                      </div>
                      <p className={`text-[9px] ${textColor} opacity-80`}>
                        {formatValue(totals.value)}
                      </p>
                    </div>

                    {/* Deals List */}
                    <div className={`${color} rounded-b p-1 min-h-[280px] space-y-1`}>
                      {deals.map((deal) => (
                        <div
                          key={deal.id}
                          draggable={!isFinal}
                          onDragStart={!isFinal ? () => handleDragStart(deal) : undefined}
                          onClick={() => deal.college?.id && navigate(`/field-sales/colleges/${deal.college.id}`)}
                          className={`bg-white rounded p-1.5 border ${borderColor} cursor-pointer hover:shadow-sm transition-all ${
                            draggingDeal?.id === deal.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <div className={`w-5 h-5 ${color} rounded flex items-center justify-center flex-shrink-0`}>
                              {stage === 'WON' ? (
                                <TrophySolidIcon className="w-2.5 h-2.5 text-emerald-600" />
                              ) : stage === 'LOST' ? (
                                <XCircleIcon className="w-2.5 h-2.5 text-red-500" />
                              ) : (
                                <BuildingOfficeIcon className={`w-2.5 h-2.5 ${textColor}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-semibold text-slate-900 truncate">
                                {deal.college?.name || 'Unknown College'}
                              </p>
                              <p className="text-[8px] text-slate-500 truncate">{deal.dealName}</p>
                            </div>
                          </div>

                          {deal.dealValue && (
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                              <div className="flex items-center gap-0.5">
                                <CurrencyRupeeIcon className="h-2.5 w-2.5 text-emerald-600" />
                                <span className="text-[9px] font-semibold text-emerald-600">
                                  {formatValue(deal.dealValue)}
                                </span>
                              </div>
                              {!isFinal && (
                                <span className={`text-[8px] px-1 py-0.5 rounded-full ${
                                  deal.probability >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                  deal.probability >= 40 ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {deal.probability}%
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-1">
                            {deal.owner && (
                              <p className="text-[8px] text-slate-400 truncate flex-1">
                                {deal.owner.firstName} {deal.owner.lastName}
                              </p>
                            )}
                            {!isFinal && (
                              <div className="flex gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkWon(deal);
                                  }}
                                  className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Mark as Won"
                                >
                                  <TrophyIcon className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkLost(deal);
                                  }}
                                  className="p-0.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Mark as Lost"
                                >
                                  <XCircleIcon className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {deals.length === 0 && (
                        <div className="text-center py-6">
                          {stage === 'WON' ? (
                            <TrophyIcon className="w-5 h-5 text-emerald-300 mx-auto mb-1" />
                          ) : stage === 'LOST' ? (
                            <XCircleIcon className="w-5 h-5 text-red-300 mx-auto mb-1" />
                          ) : (
                            <ClockIcon className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                          )}
                          <p className="text-[9px] text-slate-400">No deals</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded border border-slate-200 overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-2 py-1.5 font-semibold text-slate-600">College</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-slate-600">Deal</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-slate-600">Stage</th>
                  <th className="text-right px-2 py-1.5 font-semibold text-slate-600">Value</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-slate-600">Prob</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-slate-600">Owner</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stageConfig.flatMap(({ stage, label, color, textColor, isFinal }) => {
                  const deals = pipeline?.pipeline[stage] || [];
                  return deals.map((deal) => (
                    <tr
                      key={deal.id}
                      onClick={() => deal.college?.id && navigate(`/field-sales/colleges/${deal.college.id}`)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <BuildingOfficeIcon className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-900 truncate max-w-[120px]">
                            {deal.college?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-slate-600 truncate max-w-[100px]">{deal.dealName}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${color} ${textColor} text-[9px] font-medium`}>
                          {stage === 'WON' && <TrophySolidIcon className="w-2.5 h-2.5" />}
                          {stage === 'LOST' && <XCircleIcon className="w-2.5 h-2.5" />}
                          {label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <span className="text-emerald-600 font-semibold">
                          {deal.dealValue ? formatValue(deal.dealValue) : '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                          deal.probability >= 70 ? 'bg-emerald-100 text-emerald-700' :
                          deal.probability >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {deal.probability}%
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-500 truncate max-w-[80px]">
                        {deal.owner ? `${deal.owner.firstName} ${deal.owner.lastName}` : '-'}
                      </td>
                      <td className="px-2 py-1.5">
                        {!isFinal && (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkWon(deal);
                              }}
                              className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Mark as Won"
                            >
                              <TrophyIcon className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkLost(deal);
                              }}
                              className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                              title="Mark as Lost"
                            >
                              <XCircleIcon className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
            {Object.values(pipeline?.pipeline || {}).flat().length === 0 && (
              <div className="text-center py-8">
                <ClockIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400">No deals found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
