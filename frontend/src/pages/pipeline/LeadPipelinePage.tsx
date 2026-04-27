/**
 * Lead Pipeline Page - Dynamic Pipeline Dashboard
 * Displays funnel chart, leads by tags, and campaigns sidebar
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import api from '../../services/api';

// Types
interface StageData {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface TagData {
  id: string;
  name: string;
  count: number;
  color: string;
}

interface TagCategory {
  name: string;
  total: number;
  tags: TagData[];
}

interface LeadTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  isSystem: boolean;
  _count?: {
    leadAssignments: number;
  };
}

interface Campaign {
  id: string;
  name: string;
  date: string;
  isPaused: boolean;
}

// Diverse colors for funnel stages - each stage gets a distinct color
const FUNNEL_COLORS = [
  '#6366F1', // Indigo - New leads
  '#8B5CF6', // Purple - Early stage
  '#EC4899', // Pink
  '#F59E0B', // Amber - Mid stage
  '#10B981', // Emerald - Progressing
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#22C55E', // Green - Closing
  '#EF4444', // Red - Lost/Not Interested
];
const TAG_COLORS = ['#EF4444', '#22C55E', '#EAB308', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const LeadPipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hidePaused, setHidePaused] = useState(false);
  const [searchCampaign, setSearchCampaign] = useState('');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Data states
  const [pipelineName, setPipelineName] = useState('Sales Pipeline');
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalInProgress, setTotalInProgress] = useState(0);
  const [totalClosed, setTotalClosed] = useState(0);
  const [stageData, setStageData] = useState<StageData[]>([]);
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [hasRealTags, setHasRealTags] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      setLoading(true);

      // First fetch pipelines to get the default pipeline
      const [pipelineRes, campaignsRes, tagsRes] = await Promise.all([
        api.get('/pipelines?entityType=LEAD').catch(() => ({ data: { data: [] } })),
        api.get('/campaigns').catch(() => ({ data: { data: [] } })),
        api.get('/lead-tags?includeCount=true').catch(() => ({ data: { data: [] } })),
      ]);

      const pipelines = pipelineRes.data?.data || [];
      const campaignsData = campaignsRes.data?.data || [];
      // Tags API returns { tags: [...], total: N }
      const tagsResponse = tagsRes.data?.data || {};
      const tagsData: LeadTag[] = tagsResponse.tags || [];

      // Find default pipeline or use first LEAD pipeline
      const defaultPipeline = pipelines.find((p: any) => p.isDefault) || pipelines[0];

      // Debug logging
      console.log('Pipeline API Response:', {
        pipelines,
        defaultPipeline,
        tagsData,
      });

      // Set dynamic pipeline name
      if (defaultPipeline) {
        setPipelineName(defaultPipeline.name || 'Sales Pipeline');
      }

      // Build stage funnel data from pipeline stages
      const stageList: StageData[] = [];
      let total = 0;
      let analyticsSuccess = false;

      if (defaultPipeline && defaultPipeline.id) {
        // Fetch pipeline analytics for accurate stage counts
        try {
          const analyticsRes = await api.get(`/pipelines/${defaultPipeline.id}/analytics`);
          const analytics = analyticsRes.data?.data || {};

          console.log('Pipeline Analytics:', analytics);

          total = analytics.totalRecords || 0;
          setTotalLeads(total);

          // Use stages from analytics with their record counts
          if (analytics.stages && analytics.stages.length > 0) {
            analytics.stages.forEach((stage: any, idx: number) => {
              const count = stage.recordCount || 0;
              const percentage = total > 0 ? ((count / total) * 100).toFixed(2) : '0';
              stageList.push({
                id: stage.id,
                name: stage.name,
                count,
                percentage: parseFloat(percentage),
                color: stage.color || FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
              });
            });
          }

          // Set in-progress and closed from analytics
          setTotalInProgress(analytics.activeRecords || 0);
          setTotalClosed((analytics.wonRecords || 0) + (analytics.lostRecords || 0));
          analyticsSuccess = true;
        } catch (analyticsError) {
          console.warn('Pipeline analytics failed, falling back to pipeline stages:', analyticsError);

          // Fallback: use pipeline stages without counts
          if (defaultPipeline.stages && defaultPipeline.stages.length > 0) {
            defaultPipeline.stages.forEach((stage: any, idx: number) => {
              stageList.push({
                id: stage.id,
                name: stage.name,
                count: 0,
                percentage: 0,
                color: stage.color || FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
              });
            });
          }

          // Try to get total from leads/stats
          try {
            const statsRes = await api.get('/leads/stats');
            const stats = statsRes.data?.data || {};
            total = stats.total || 0;
            setTotalLeads(total);
          } catch {
            setTotalLeads(0);
          }
        }
      } else {
        // No pipeline found, try legacy lead-stages API
        try {
          const [statsRes, stagesRes] = await Promise.all([
            api.get('/leads/stats'),
            api.get('/lead-stages'),
          ]);

          const stats = statsRes.data?.data || {};
          const stages = stagesRes.data?.data || [];
          const byStatus = stats.byStatus || {};
          total = stats.total || 0;
          setTotalLeads(total);

          if (stages.length > 0) {
            stages.forEach((stage: any, idx: number) => {
              const count = byStatus[stage.name] || byStatus[stage.id] || 0;
              const percentage = total > 0 ? ((count / total) * 100).toFixed(2) : '0';
              stageList.push({
                id: stage.id,
                name: stage.name,
                count,
                percentage: parseFloat(percentage),
                color: stage.color || FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
              });
            });
          }
        } catch (legacyError) {
          console.warn('Legacy stages API failed:', legacyError);
        }
      }

      // Keep stages in pipeline order (don't sort by count)
      setStageData(stageList);

      // Calculate in-progress and closed from stage list if not set from analytics
      if (!analyticsSuccess && stageList.length > 0) {
        let inProgress = 0;
        let closed = 0;
        stageList.forEach((stage) => {
          const name = stage.name.toLowerCase();
          const stageType = (stage as any).stageType;
          // Check stageType if available, otherwise use name heuristics
          if (stageType === 'won' || stageType === 'lost' ||
              name.includes('won') || name.includes('lost') ||
              name.includes('closed') || name.includes('converted') ||
              name.includes('admitted') || name.includes('enrolled')) {
            closed += stage.count;
          } else if (!name.includes('new') && !name.includes('unassigned') && stageType !== 'entry') {
            inProgress += stage.count;
          }
        });
        setTotalInProgress(inProgress);
        setTotalClosed(closed);
      }

      // Build tag categories from real API data
      // Group tags into categories based on their type/usage
      const allTags: TagData[] = tagsData.map((tag: LeadTag) => ({
        id: tag.id,
        name: tag.name,
        count: tag._count?.leadAssignments || 0,
        color: tag.color || '#6B7280',
      }));

      // Calculate total leads with tags
      const totalTaggedLeads = allTags.reduce((sum, tag) => sum + tag.count, 0);

      // Create categories based on lead status with actual tag distribution
      // If we have tags, display them; otherwise show status-based breakdown
      const categories: TagCategory[] = [];

      if (allTags.length > 0) {
        // Group tags into logical categories (you can customize this logic)
        const hotTags = allTags.filter(t =>
          t.name.toLowerCase().includes('hot') ||
          t.name.toLowerCase().includes('vip') ||
          t.name.toLowerCase().includes('urgent')
        );
        const warmTags = allTags.filter(t =>
          t.name.toLowerCase().includes('warm') ||
          t.name.toLowerCase().includes('follow') ||
          t.name.toLowerCase().includes('callback')
        );
        const coldTags = allTags.filter(t =>
          t.name.toLowerCase().includes('cold') ||
          t.name.toLowerCase().includes('not interested') ||
          t.name.toLowerCase().includes('lost')
        );
        const otherTags = allTags.filter(t =>
          !hotTags.includes(t) && !warmTags.includes(t) && !coldTags.includes(t)
        );

        if (hotTags.length > 0) {
          categories.push({
            name: 'Hot Leads',
            total: hotTags.reduce((sum, t) => sum + t.count, 0),
            tags: hotTags,
          });
        }

        if (warmTags.length > 0) {
          categories.push({
            name: 'Warm Leads',
            total: warmTags.reduce((sum, t) => sum + t.count, 0),
            tags: warmTags,
          });
        }

        if (coldTags.length > 0) {
          categories.push({
            name: 'Cold/Lost',
            total: coldTags.reduce((sum, t) => sum + t.count, 0),
            tags: coldTags,
          });
        }

        if (otherTags.length > 0) {
          categories.push({
            name: 'Other Tags',
            total: otherTags.reduce((sum, t) => sum + t.count, 0),
            tags: otherTags,
          });
        }

        // If no grouping matched, just show all tags in one category
        if (categories.length === 0 && allTags.length > 0) {
          categories.push({
            name: 'All Tags',
            total: totalTaggedLeads,
            tags: allTags,
          });
        }
      }
      // Note: When no real tags exist, we don't show fallback data
      // The "Leads by Tags" section will be hidden entirely

      setTagCategories(categories);
      setHasRealTags(allTags.length > 0);

      // Set campaigns
      setCampaigns(
        campaignsData.map((c: any) => ({
          id: c.id,
          name: c.name,
          date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          isPaused: c.status === 'paused',
        }))
      );

    } catch (error) {
      console.error('Failed to fetch pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = (id: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowActionMenu(false);
    if (showActionMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActionMenu]);

  const filteredCampaigns = campaigns.filter(c => {
    if (hidePaused && c.isPaused) return false;
    if (searchCampaign && !c.name.toLowerCase().includes(searchCampaign.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => showActionMenu && setShowActionMenu(false)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-1 hover:bg-gray-100 rounded-lg">
              <ArrowLeftIcon className="w-4 h-4 text-gray-600" />
            </button>
            <h1 className="text-base font-semibold text-gray-800">{pipelineName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/leads"
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Lead Summary
            </Link>
            <Link
              to="/telecaller-call-history"
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Call Logs
            </Link>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Action
                <ChevronDownIcon className="w-3 h-3" />
              </button>
              {showActionMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <Link to="/leads/bulk-upload" className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-t-md">
                    Import Leads
                  </Link>
                  <Link to="/assignments" className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    Assign Leads
                  </Link>
                  <Link to="/reports" className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    Export Report
                  </Link>
                  <Link to="/settings/pipelines" className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-b-md">
                    Pipeline Settings
                  </Link>
                </div>
              )}
            </div>
            <Link
              to="/outbound-calls/campaigns/create"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <PlusIcon className="w-3 h-3" />
              Create Campaign
            </Link>
          </div>
        </div>
      </div>

      <div>
        {/* Main Content */}
        <div>
          {/* Lead Funnel by Stages */}
          <div className="bg-white border-b border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Lead Funnel by Stages
              </h2>
            </div>
            <div className="p-4">
            <div className="flex gap-6">
              {/* Stats Cards - Compact */}
              <div className="flex flex-col gap-2 w-28">
                <Link
                  to="/leads"
                  className="border border-gray-200 rounded-md p-2 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="text-lg font-bold text-gray-800">{totalLeads}</p>
                </Link>
                <Link
                  to="/leads?status=Contacted,Qualified,Negotiation,Proposal"
                  className="border border-gray-200 rounded-md p-2 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">In-Progress</p>
                  <p className="text-lg font-bold text-amber-600">{totalInProgress}</p>
                </Link>
                <Link
                  to="/leads?status=Won,Lost,Converted"
                  className="border border-gray-200 rounded-md p-2 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Closed</p>
                  <p className="text-lg font-bold text-emerald-600">{totalClosed}</p>
                </Link>
              </div>

              {/* Custom Funnel Chart */}
              <div className="flex-1 flex items-center justify-center">
                {stageData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4l7.5 16.5L12 17l1.5 3.5L21 4H3z" />
                    </svg>
                    <p className="text-sm">No stage data available</p>
                    <Link to="/settings/pipelines" className="text-xs text-indigo-600 mt-2">Configure pipeline stages</Link>
                  </div>
                ) : (
                <div className="flex items-start gap-3">
                  {/* SVG Funnel */}
                  <svg width="200" height={Math.max(180, stageData.length * 26)} viewBox={`0 0 200 ${Math.max(180, stageData.length * 26)}`}>
                    {(() => {
                      const maxWidth = 180;
                      const minWidth = 60;
                      const totalHeight = Math.max(160, stageData.length * 24);
                      let currentY = 6;

                      return stageData.map((stage, idx) => {
                        const segmentHeight = totalHeight / stageData.length;
                        const progress = idx / Math.max(stageData.length - 1, 1);
                        const topWidth = maxWidth - (progress * (maxWidth - minWidth));
                        const nextProgress = (idx + 1) / Math.max(stageData.length - 1, 1);
                        const bottomWidth = idx === stageData.length - 1
                          ? minWidth
                          : maxWidth - (nextProgress * (maxWidth - minWidth));
                        const centerX = 100;

                        const points = [
                          `${centerX - topWidth / 2},${currentY}`,
                          `${centerX + topWidth / 2},${currentY}`,
                          `${centerX + bottomWidth / 2},${currentY + segmentHeight - 1}`,
                          `${centerX - bottomWidth / 2},${currentY + segmentHeight - 1}`,
                        ].join(' ');

                        const yPos = currentY;
                        currentY += segmentHeight;

                        return (
                          <g
                            key={idx}
                            onClick={() => navigate(`/leads?pipelineStageId=${stage.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <polygon
                              points={points}
                              fill={stage.color}
                              stroke="white"
                              strokeWidth="1"
                              className="cursor-pointer hover:opacity-90 transition-opacity"
                            />
                            {/* Stage count in center of segment */}
                            <text
                              x={centerX}
                              y={yPos + segmentHeight / 2}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="10"
                              fontWeight="600"
                              className="pointer-events-none"
                            >
                              {stage.count}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>

                  {/* Labels on the right - Clickable */}
                  <div className="flex flex-col justify-around" style={{ height: `${Math.max(170, stageData.length * 24)}px`, paddingTop: '4px' }}>
                    {stageData.map((stage, idx) => (
                      <Link
                        key={idx}
                        to={`/leads?pipelineStageId=${stage.id}`}
                        className="flex items-center gap-1.5 text-xs hover:bg-indigo-50 rounded px-1.5 py-0.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-gray-600 hover:text-indigo-600 truncate max-w-[100px]">{stage.name}</span>
                        <span className="text-gray-400 flex-shrink-0 text-[11px]">({stage.count})</span>
                      </Link>
                    ))}
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
          </div>

          {/* Leads by Tags - Only shown when real tags exist */}
          {hasRealTags && (
          <div className="bg-white border-t border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Leads by Tags
              </h2>
              <Link to="/settings/tags" className="text-xs text-indigo-600 hover:text-indigo-700">
                Manage Tags
              </Link>
            </div>
            <div className="p-4">
            {tagCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-sm">No leads tagged yet</p>
                <p className="text-xs text-gray-400 mt-1">Assign tags to leads to see distribution here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {tagCategories.map((category) => (
                  <div key={category.name} className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                    {/* Top: Donut Chart */}
                    <div className="h-28 w-28" style={{ minWidth: 112, minHeight: 112 }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={80} minHeight={80}>
                        <PieChart>
                          <Pie
                            data={category.tags.filter(t => t.count > 0).length > 0
                              ? category.tags.filter(t => t.count > 0)
                              : [{ name: 'No Data', count: 1, color: '#E5E7EB' }]
                            }
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={48}
                            paddingAngle={2}
                            dataKey="count"
                            onClick={(data) => {
                              if (data && data.id && data.name !== 'No Data') {
                                navigate(`/leads?tag=${data.id}`);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {category.tags.filter(t => t.count > 0).length > 0
                              ? category.tags.filter(t => t.count > 0).map((tag) => (
                                  <Cell
                                    key={`cell-${tag.id}`}
                                    fill={tag.color}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                ))
                              : <Cell fill="#E5E7EB" />
                            }
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [`${value} leads`, name]}
                            contentStyle={{ fontSize: 11, borderRadius: 6 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Category Title */}
                    <p className="text-xs font-semibold text-gray-700 text-center mt-1 mb-2">{category.name} ({category.total})</p>

                    {/* Bottom: Legend with numbers - Clickable */}
                    <div className="w-full space-y-0.5">
                      {category.tags.slice(0, 4).map((tag) => (
                        <Link
                          key={tag.id}
                          to={`/leads?tag=${tag.id}`}
                          className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                        >
                          <span
                            className="w-2 h-2 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="truncate flex-1">{tag.name}</span>
                          <span className="text-gray-400">({tag.count})</span>
                        </Link>
                      ))}
                      {category.tags.length > 4 && (
                        <p className="text-[10px] text-gray-400 text-center pt-1">+{category.tags.length - 4} more</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadPipelinePage;
