import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  ChartBarSquareIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  businessTrendsService,
  BusinessTrendsSummary,
  CallsVsConnectedData,
  CallDurationData,
  ConversionRatioData,
  LeadsAddedData,
  LeadSourceData,
  LostLeadsData,
} from '../../services/business-trends.service';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Date filter options for individual charts
const CHART_DATE_OPTIONS = [
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Custom Range', value: 'custom' },
];

function getDateRange(option: string): { startDate: string; endDate: string } {
  const end = new Date();
  let start = new Date();

  if (option === 'yesterday') {
    start.setDate(end.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (option === '7') {
    start.setDate(end.getDate() - 7);
  } else if (option === '30') {
    start.setDate(end.getDate() - 30);
  } else if (option === '90') {
    start.setDate(end.getDate() - 90);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// Date Filter Dropdown Component
interface DateFilterDropdownProps {
  selectedValue: string;
  onApply: (value: string) => void;
  id: string;
}

function DateFilterDropdown({ selectedValue, onApply, id }: DateFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(selectedValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = CHART_DATE_OPTIONS.find(o => o.value === selectedValue)?.label || 'Last 30 days';

  // Sync tempValue when selectedValue changes
  useEffect(() => {
    setTempValue(selectedValue);
  }, [selectedValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    console.log(`[${id}] Applying date filter:`, tempValue);
    onApply(tempValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border-2 border-purple-300 rounded-lg text-purple-600 text-sm font-medium hover:bg-purple-50"
      >
        {selectedLabel}
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4">
          <h4 className="text-gray-900 font-semibold mb-3">Choose Date</h4>
          <div className="space-y-2">
            {CHART_DATE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`dateOption-${id}`}
                  value={option.value}
                  checked={tempValue === option.value}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-gray-700 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
          <button
            onClick={handleApply}
            className="mt-4 w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// Chart Card Header Component
interface ChartCardHeaderProps {
  title: string;
  selectedDateRange: string;
  onDateChange: (value: string) => void;
  loading?: boolean;
  chartId: string;
  viewMode: 'chart' | 'table';
  onViewModeChange: (mode: 'chart' | 'table') => void;
  infoText?: string;
}

function ChartCardHeader({
  title,
  selectedDateRange,
  onDateChange,
  loading,
  chartId,
  viewMode,
  onViewModeChange,
  infoText = 'This chart shows data for the selected date range.'
}: ChartCardHeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {loading && <ArrowPathIcon className="h-4 w-4 animate-spin text-purple-600" />}
      </div>
      <div className="flex items-center gap-2">
        {/* Info Button */}
        <div className="relative" ref={infoRef}>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-full ${showInfo ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
          >
            <InformationCircleIcon className={`h-5 w-5 ${showInfo ? 'text-purple-600' : 'text-gray-400'}`} />
          </button>
          {showInfo && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 z-50 shadow-lg">
              {infoText}
            </div>
          )}
        </div>

        {/* Chart View Button */}
        <button
          onClick={() => onViewModeChange('chart')}
          className={`p-1.5 rounded-full ${viewMode === 'chart' ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
        >
          <ChartBarSquareIcon className={`h-5 w-5 ${viewMode === 'chart' ? 'text-purple-600' : 'text-gray-400'}`} />
        </button>

        {/* Table View Button */}
        <button
          onClick={() => onViewModeChange('table')}
          className={`p-1.5 rounded-full ${viewMode === 'table' ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
        >
          <TableCellsIcon className={`h-5 w-5 ${viewMode === 'table' ? 'text-purple-600' : 'text-gray-400'}`} />
        </button>

        <DateFilterDropdown
          selectedValue={selectedDateRange}
          onApply={onDateChange}
          id={chartId}
        />
      </div>
    </div>
  );
}

export default function BusinessTrendsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Summary data
  const [summary, setSummary] = useState<BusinessTrendsSummary | null>(null);

  // Individual chart data and loading states
  const [callsData, setCallsData] = useState<CallsVsConnectedData[]>([]);
  const [callsRange, setCallsRange] = useState('30');
  const [callsLoading, setCallsLoading] = useState(false);

  const [durationData, setDurationData] = useState<CallDurationData[]>([]);
  const [durationRange, setDurationRange] = useState('30');
  const [durationLoading, setDurationLoading] = useState(false);

  const [conversionData, setConversionData] = useState<ConversionRatioData[]>([]);
  const [conversionRange, setConversionRange] = useState('30');
  const [conversionLoading, setConversionLoading] = useState(false);

  const [leadsAddedData, setLeadsAddedData] = useState<LeadsAddedData[]>([]);
  const [leadsAddedRange, setLeadsAddedRange] = useState('30');
  const [leadsAddedLoading, setLeadsAddedLoading] = useState(false);

  const [leadSourcesData, setLeadSourcesData] = useState<LeadSourceData[]>([]);
  const [leadSourcesRange, setLeadSourcesRange] = useState('30');
  const [leadSourcesLoading, setLeadSourcesLoading] = useState(false);

  const [lostLeadsData, setLostLeadsData] = useState<LostLeadsData[]>([]);
  const [lostLeadsRange, setLostLeadsRange] = useState('30');
  const [lostLeadsLoading, setLostLeadsLoading] = useState(false);

  // View modes for each chart (chart or table)
  const [callsViewMode, setCallsViewMode] = useState<'chart' | 'table'>('chart');
  const [durationViewMode, setDurationViewMode] = useState<'chart' | 'table'>('chart');
  const [conversionViewMode, setConversionViewMode] = useState<'chart' | 'table'>('chart');
  const [leadsAddedViewMode, setLeadsAddedViewMode] = useState<'chart' | 'table'>('chart');
  const [leadSourcesViewMode, setLeadSourcesViewMode] = useState<'chart' | 'table'>('chart');
  const [lostLeadsViewMode, setLostLeadsViewMode] = useState<'chart' | 'table'>('chart');

  // Fetch all data initially
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange('30');
      const report = await businessTrendsService.getComprehensiveReport({ startDate, endDate });
      setSummary(report.summary);
      setCallsData(report.callsVsConnected);
      setDurationData(report.callDuration);
      setConversionData(report.conversionRatio);
      setLeadsAddedData(report.leadsAdded);
      setLeadSourcesData(report.leadSources);
      setLostLeadsData(report.lostLeads);
    } catch (error) {
      console.error('Error fetching business trends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Individual fetch functions for each chart
  const fetchCallsData = async (range: string) => {
    setCallsLoading(true);
    try {
      const { startDate, endDate } = getDateRange(range);
      const data = await businessTrendsService.getCallsVsConnected({ startDate, endDate });
      setCallsData(data);
    } catch (error) {
      console.error('Error fetching calls data:', error);
    } finally {
      setCallsLoading(false);
    }
  };

  const fetchDurationData = async (range: string) => {
    setDurationLoading(true);
    try {
      const { startDate, endDate } = getDateRange(range);
      const data = await businessTrendsService.getCallDuration({ startDate, endDate });
      setDurationData(data);
    } catch (error) {
      console.error('Error fetching duration data:', error);
    } finally {
      setDurationLoading(false);
    }
  };

  const fetchConversionData = async (range: string) => {
    setConversionLoading(true);
    try {
      const { startDate, endDate } = getDateRange(range);
      const data = await businessTrendsService.getConversionRatio({ startDate, endDate });
      setConversionData(data);
    } catch (error) {
      console.error('Error fetching conversion data:', error);
    } finally {
      setConversionLoading(false);
    }
  };

  const fetchLeadsAddedData = async (range: string) => {
    setLeadsAddedLoading(true);
    try {
      const { startDate, endDate } = getDateRange(range);
      const data = await businessTrendsService.getLeadsAdded({ startDate, endDate });
      setLeadsAddedData(data);
    } catch (error) {
      console.error('Error fetching leads added data:', error);
    } finally {
      setLeadsAddedLoading(false);
    }
  };

  const fetchLeadSourcesData = async (range: string) => {
    setLeadSourcesLoading(true);
    try {
      const { startDate, endDate } = getDateRange(range);
      const data = await businessTrendsService.getLeadSources({ startDate, endDate });
      setLeadSourcesData(data);
    } catch (error) {
      console.error('Error fetching lead sources data:', error);
    } finally {
      setLeadSourcesLoading(false);
    }
  };

  const fetchLostLeadsData = async (range: string) => {
    setLostLeadsLoading(true);
    try {
      const { startDate, endDate } = getDateRange(range);
      const data = await businessTrendsService.getLostLeads({ startDate, endDate });
      setLostLeadsData(data);
    } catch (error) {
      console.error('Error fetching lost leads data:', error);
    } finally {
      setLostLeadsLoading(false);
    }
  };

  // Handle date range changes for each chart
  const handleCallsRangeChange = (range: string) => {
    setCallsRange(range);
    fetchCallsData(range);
  };

  const handleDurationRangeChange = (range: string) => {
    setDurationRange(range);
    fetchDurationData(range);
  };

  const handleConversionRangeChange = (range: string) => {
    setConversionRange(range);
    fetchConversionData(range);
  };

  const handleLeadsAddedRangeChange = (range: string) => {
    setLeadsAddedRange(range);
    fetchLeadsAddedData(range);
  };

  const handleLeadSourcesRangeChange = (range: string) => {
    setLeadSourcesRange(range);
    fetchLeadSourcesData(range);
  };

  const handleLostLeadsRangeChange = (range: string) => {
    setLostLeadsRange(range);
    fetchLostLeadsData(range);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading business trends...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-gray-500">
        Failed to load business trends data.
      </div>
    );
  }

  // Summary cards data
  const summaryCards = [
    {
      title: 'Total SMS',
      value: summary.totalSms.toLocaleString(),
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
      link: '/sms-logs',
    },
    {
      title: 'Total Calls',
      value: summary.totalCalls.toLocaleString(),
      icon: PhoneIcon,
      color: 'bg-green-500',
      link: '/telecaller-calls',
    },
    {
      title: 'Converted Leads',
      value: summary.convertedLeads.toLocaleString(),
      icon: CheckCircleIcon,
      color: 'bg-emerald-500',
      link: '/leads?status=converted',
    },
    {
      title: 'Total Call Time',
      value: summary.totalCallTime,
      icon: ClockIcon,
      color: 'bg-purple-500',
      link: '/telecaller-calls',
    },
    {
      title: 'Calls Connected',
      value: summary.callsConnected.toLocaleString(),
      icon: PhoneIcon,
      color: 'bg-cyan-500',
      link: '/telecaller-calls?status=connected',
    },
    {
      title: 'Lost Leads',
      value: summary.lostLeads.toLocaleString(),
      icon: XCircleIcon,
      color: 'bg-red-500',
      link: '/leads?status=lost',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Business Trends</h1>
        </div>
        <button
          onClick={fetchAllData}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh All
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 cursor-pointer transition-all"
            onClick={() => navigate(card.link)}
          >
            <div className="flex items-center gap-3">
              <div className={`${card.color} rounded-lg p-2`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.title}</p>
                <p className="text-lg font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Calls vs Connected Calls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <ChartCardHeader
            title="Total Calls Vs Calls Connected"
            selectedDateRange={callsRange}
            onDateChange={handleCallsRangeChange}
            loading={callsLoading}
            chartId="calls"
            viewMode={callsViewMode}
            onViewModeChange={setCallsViewMode}
            infoText="Compare total calls made vs successfully connected calls over time."
          />
          {callsViewMode === 'chart' ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callsData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="weekRange"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border rounded shadow-lg">
                          <p className="text-sm text-gray-600">{data.weekRange}</p>
                          <p className="text-sm font-semibold text-indigo-600">{data.totalCalls} Total Calls</p>
                          <p className="text-sm font-semibold text-lime-600">{data.connectedCalls} Connected</p>
                          <p className="text-xs text-blue-600 mt-1">Click to view details</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend
                    wrapperStyle={{ paddingTop: 10 }}
                    formatter={(value) => (
                      <span className="text-sm text-gray-700">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="totalCalls"
                    name="Total Calls"
                    fill="#4338CA"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data && data.weekRange) {
                        navigate(`/telecaller-calls?week=${encodeURIComponent(data.weekRange)}`);
                      }
                    }}
                  />
                  <Bar
                    dataKey="connectedCalls"
                    name="Total Calls Connected"
                    fill="#84CC16"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data && data.weekRange) {
                        navigate(`/telecaller-calls?week=${encodeURIComponent(data.weekRange)}`);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">Week</th>
                    <th className="text-right p-2 font-medium text-gray-600">Total Calls</th>
                    <th className="text-right p-2 font-medium text-gray-600">Connected</th>
                    <th className="text-right p-2 font-medium text-gray-600">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {callsData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/telecaller-calls?week=${encodeURIComponent(row.weekRange)}`)}
                    >
                      <td className="p-2 text-gray-900">{row.weekRange}</td>
                      <td className="p-2 text-right text-gray-900">{row.totalCalls}</td>
                      <td className="p-2 text-right text-gray-900">{row.connectedCalls}</td>
                      <td className="p-2 text-right text-gray-900">
                        {row.totalCalls > 0 ? Math.round((row.connectedCalls / row.totalCalls) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total Call Duration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <ChartCardHeader
            title="Total Call Duration"
            selectedDateRange={durationRange}
            onDateChange={handleDurationRangeChange}
            loading={durationLoading}
            chartId="duration"
            viewMode={durationViewMode}
            onViewModeChange={setDurationViewMode}
            infoText="Total call duration in minutes per day."
          />
          {durationViewMode === 'chart' ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border rounded shadow-lg">
                          <p className="text-sm text-gray-600">{payload[0].payload.date}</p>
                          <p className="text-sm font-semibold text-indigo-600">{payload[0].value} minutes</p>
                          <p className="text-xs text-blue-600 mt-1">Click to view details</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar
                    dataKey="duration"
                    name="Duration (min)"
                    fill="#4338CA"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data && data.date) {
                        navigate(`/telecaller-calls?date=${data.date}`);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">Date</th>
                    <th className="text-right p-2 font-medium text-gray-600">Duration (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {durationData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/telecaller-calls?date=${row.date}`)}
                    >
                      <td className="p-2 text-gray-900">{row.date}</td>
                      <td className="p-2 text-right text-gray-900">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Ratio */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <ChartCardHeader
            title="Conversion Ratio"
            selectedDateRange={conversionRange}
            onDateChange={handleConversionRangeChange}
            loading={conversionLoading}
            chartId="conversion"
            viewMode={conversionViewMode}
            onViewModeChange={setConversionViewMode}
            infoText="Percentage of leads converted over time."
          />
          {conversionViewMode === 'chart' ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border rounded shadow-lg">
                          <p className="text-sm text-gray-600">{payload[0].payload.date}</p>
                          <p className="text-sm font-semibold text-emerald-600">{payload[0].value}% Conversion</p>
                          <p className="text-xs text-gray-500">{payload[0].payload.converted}/{payload[0].payload.total} leads</p>
                          <p className="text-xs text-blue-600 mt-1">Click to view details</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="ratio"
                    name="Conversion %"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 5, cursor: 'pointer' }}
                    activeDot={{
                      r: 8,
                      fill: '#059669',
                      cursor: 'pointer',
                      onClick: (e: any, payload: any) => {
                        if (payload && payload.payload) {
                          navigate(`/leads?status=converted&date=${payload.payload.date}`);
                        }
                      }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">Date</th>
                    <th className="text-right p-2 font-medium text-gray-600">Total</th>
                    <th className="text-right p-2 font-medium text-gray-600">Converted</th>
                    <th className="text-right p-2 font-medium text-gray-600">Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {conversionData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/leads?status=converted&date=${row.date}`)}
                    >
                      <td className="p-2 text-gray-900">{row.date}</td>
                      <td className="p-2 text-right text-gray-900">{row.total}</td>
                      <td className="p-2 text-right text-gray-900">{row.converted}</td>
                      <td className="p-2 text-right text-gray-900">{row.ratio}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leads Added */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <ChartCardHeader
            title="Leads Added"
            selectedDateRange={leadsAddedRange}
            onDateChange={handleLeadsAddedRangeChange}
            loading={leadsAddedLoading}
            chartId="leadsAdded"
            viewMode={leadsAddedViewMode}
            onViewModeChange={setLeadsAddedViewMode}
            infoText="Number of new leads added per day."
          />
          {leadsAddedViewMode === 'chart' ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsAddedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border rounded shadow-lg">
                          <p className="text-sm text-gray-600">{payload[0].payload.date}</p>
                          <p className="text-sm font-semibold text-indigo-600">{payload[0].value} Leads</p>
                          <p className="text-xs text-blue-600 mt-1">Click to view details</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar
                    dataKey="count"
                    name="Leads"
                    fill="#4338CA"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data && data.date) {
                        navigate(`/leads?createdDate=${data.date}`);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">Date</th>
                    <th className="text-right p-2 font-medium text-gray-600">Leads Added</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsAddedData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/leads?createdDate=${row.date}`)}
                    >
                      <td className="p-2 text-gray-900">{row.date}</td>
                      <td className="p-2 text-right text-gray-900">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <ChartCardHeader
            title="Lead Sources"
            selectedDateRange={leadSourcesRange}
            onDateChange={handleLeadSourcesRangeChange}
            loading={leadSourcesLoading}
            chartId="leadSources"
            viewMode={leadSourcesViewMode}
            onViewModeChange={setLeadSourcesViewMode}
            infoText="Distribution of leads by their source."
          />
          {leadSourcesViewMode === 'chart' ? (
            <div className="h-72 flex">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSourcesData}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      onClick={(data: any) => {
                        if (data && data.source) {
                          navigate(`/leads?source=${encodeURIComponent(data.source)}`);
                        }
                      }}
                      cursor="pointer"
                    >
                      {leadSourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border rounded shadow-lg">
                            <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
                            <p className="text-sm text-gray-600">{payload[0].value} leads</p>
                            <p className="text-xs text-blue-600 mt-1">Click to view details</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 flex flex-col justify-center space-y-2 pl-4">
                {leadSourcesData.slice(0, 6).map((source, index) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between text-sm hover:bg-gray-50 p-1 rounded cursor-pointer"
                    onClick={() => navigate(`/leads?source=${encodeURIComponent(source.source)}`)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-600 truncate max-w-[120px]">{source.source}</span>
                    </div>
                    <span className="font-medium text-gray-900">{source.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">Source</th>
                    <th className="text-right p-2 font-medium text-gray-600">Count</th>
                    <th className="text-right p-2 font-medium text-gray-600">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const total = leadSourcesData.reduce((sum, s) => sum + s.count, 0);
                    return leadSourcesData.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/leads?source=${encodeURIComponent(row.source)}`)}
                      >
                        <td className="p-2 text-gray-900">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            {row.source}
                          </div>
                        </td>
                        <td className="p-2 text-right text-gray-900">{row.count}</td>
                        <td className="p-2 text-right text-gray-900">
                          {total > 0 ? ((row.count / total) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lost Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <ChartCardHeader
            title="Lost Leads"
            selectedDateRange={lostLeadsRange}
            onDateChange={handleLostLeadsRangeChange}
            loading={lostLeadsLoading}
            chartId="lostLeads"
            viewMode={lostLeadsViewMode}
            onViewModeChange={setLostLeadsViewMode}
            infoText="Number of leads lost per day."
          />
          {lostLeadsViewMode === 'chart' ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lostLeadsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border rounded shadow-lg">
                          <p className="text-sm text-gray-600">{payload[0].payload.date}</p>
                          <p className="text-sm font-semibold text-red-600">{payload[0].value} Lost Leads</p>
                          <p className="text-xs text-blue-600 mt-1">Click to view details</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Lost Leads"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', r: 5, cursor: 'pointer' }}
                    activeDot={{
                      r: 8,
                      fill: '#DC2626',
                      cursor: 'pointer',
                      onClick: (e: any, payload: any) => {
                        if (payload && payload.payload) {
                          navigate(`/leads?status=lost&date=${payload.payload.date}`);
                        }
                      }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">Date</th>
                    <th className="text-right p-2 font-medium text-gray-600">Lost Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {lostLeadsData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/leads?status=lost&date=${row.date}`)}
                    >
                      <td className="p-2 text-gray-900">{row.date}</td>
                      <td className="p-2 text-right text-gray-900">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
