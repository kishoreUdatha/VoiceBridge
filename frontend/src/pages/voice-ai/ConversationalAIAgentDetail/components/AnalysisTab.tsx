/**
 * Analysis Tab - Advanced Analytics Dashboard
 */

import { useState } from 'react';
import {
  Loader2, Search, Phone, PhoneIncoming, Download, X,
  RefreshCw, ChevronLeft, ChevronRight, Clock, BarChart3,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { AgentAnalytics, ConversationRecord, AnalyticsFilters } from '../../../../services/agent-analytics.service';

interface AnalysisTabProps {
  analytics: AgentAnalytics | null;
  analyticsLoading: boolean;
  conversations: ConversationRecord[];
  conversationsLoading: boolean;
  totalConversations: number;
  currentPage: number;
  totalPages: number;
  selectedConversation: ConversationRecord | null;
  exportLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  fetchConversations: (page?: number, filters?: AnalyticsFilters) => Promise<void>;
  selectConversation: (conversation: ConversationRecord | null) => void;
  exportToCSV: () => void;
  refreshAnalytics: () => void;
}

export function AnalysisTab({
  analytics, analyticsLoading, conversations, conversationsLoading,
  totalConversations, currentPage, totalPages, selectedConversation,
  exportLoading, searchQuery, setSearchQuery, fetchConversations,
  selectConversation, exportToCSV, refreshAnalytics,
}: AnalysisTabProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [showAnalytics, setShowAnalytics] = useState(true);

  const getCount = () => {
    if (!analytics) return 0;
    if (period === 'today') return analytics.conversationsToday;
    if (period === 'week') return analytics.conversationsThisWeek;
    return analytics.conversationsThisMonth;
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const sentiment = analytics?.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0 };
  const outcomes = analytics?.outcomeBreakdown || {};
  const peakHours = analytics?.peakHours || [];

  // Chart colors
  const OUTCOME_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Prepare chart data
  const outcomeData = Object.entries(outcomes).map(([key, value]) => ({
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
  }));

  const peakHoursData = peakHours.map(h => ({
    hour: `${h.hour % 12 || 12}${h.hour < 12 ? 'am' : 'pm'}`,
    calls: h.count,
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Analytics & Call History</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="text-sm text-gray-600 bg-gray-100 border-0 rounded-lg px-3 py-1 cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <BarChart3 className="w-4 h-4" />
            {showAnalytics ? 'Hide' : 'Show'} Analytics
            {showAnalytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={refreshAnalytics}
            disabled={analyticsLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Analytics - Inline Charts */}
      {showAnalytics && (
        <div className="mb-6 pb-4 border-b border-gray-200">
          {/* Inline Stats with Search and Export */}
          <div className="flex items-center gap-6 mb-4 text-sm">
            <div>
              <span className="text-gray-500">Calls:</span>
              <span className="ml-1 font-semibold text-gray-900">{getCount()}</span>
            </div>
            <div>
              <span className="text-gray-500">Success:</span>
              <span className="ml-1 font-semibold text-green-600">{analytics?.successRate || 0}%</span>
            </div>
            <div>
              <span className="text-gray-500">Avg Duration:</span>
              <span className="ml-1 font-semibold text-gray-900">
                {analytics?.avgDuration ? formatDuration(analytics.avgDuration) : '0:00'}
              </span>
            </div>
            {(outcomes['APPOINTMENT_BOOKED'] || 0) > 0 && (
              <div>
                <span className="text-gray-500">Appointments:</span>
                <span className="ml-1 font-semibold text-blue-600">{outcomes['APPOINTMENT_BOOKED']}</span>
              </div>
            )}
            <div>
              <span className="text-green-600">{sentiment.positive} positive</span>
              <span className="mx-1 text-gray-300">·</span>
              <span className="text-gray-500">{sentiment.neutral} neutral</span>
              <span className="mx-1 text-gray-300">·</span>
              <span className="text-red-600">{sentiment.negative} negative</span>
            </div>

            {/* Search and Export inline */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchConversations(1, { search: searchQuery })}
                  placeholder="Search..."
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={exportToCSV}
                disabled={exportLoading || !totalConversations}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Charts Row - No boxes */}
          <div className="flex gap-8">
            {/* Peak Hours Chart */}
            {peakHoursData.length > 0 && (
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2">Peak Hours</p>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={peakHoursData}>
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 6, padding: '4px 8px' }}
                      formatter={(value) => [`${value} calls`]}
                    />
                    <Bar dataKey="calls" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Outcome Breakdown */}
            {outcomeData.length > 0 && (
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2">Outcomes</p>
                <div className="flex items-center gap-4 flex-wrap">
                  {outcomeData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-sm">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: OUTCOME_COLORS[index % OUTCOME_COLORS.length] }}
                      />
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Export when analytics hidden */}
      {!showAnalytics && (
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchConversations(1, { search: searchQuery })}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={exportToCSV}
            disabled={exportLoading || !totalConversations}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <span className="ml-auto text-sm text-gray-500">{totalConversations} calls</span>
        </div>
      )}

      {/* Conversation List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* List Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">Contact</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-2">Sentiment</div>
          <div className="col-span-2 text-right">Time</div>
        </div>

        {/* List Body */}
        <div className="divide-y divide-gray-100">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Phone className="w-12 h-12 mb-3 stroke-1" />
              <p className="font-medium text-gray-600">No calls yet</p>
              <p className="text-sm">Call history will appear here</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-blue-50 cursor-pointer transition-colors"
              >
                {/* Contact */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {(conv.contactName || 'A')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {conv.contactName || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.contactPhone || 'No phone'}
                    </p>
                  </div>
                </div>

                {/* Type */}
                <div className="col-span-2">
                  {conv.type === 'voice_session' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <PhoneIncoming className="w-3 h-3" />
                      Inbound
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      <Phone className="w-3 h-3" />
                      Outbound
                    </span>
                  )}
                </div>

                {/* Duration */}
                <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {conv.duration ? formatDuration(conv.duration) : '0:00'}
                </div>

                {/* Sentiment */}
                <div className="col-span-2">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    conv.sentiment === 'positive' ? 'bg-green-500' :
                    conv.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <span className={`text-sm capitalize ${
                    conv.sentiment === 'positive' ? 'text-green-600' :
                    conv.sentiment === 'negative' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {conv.sentiment || 'Neutral'}
                  </span>
                </div>

                {/* Time */}
                <div className="col-span-2 text-right text-sm text-gray-500">
                  {formatTime(conv.startedAt)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <strong>{conversations.length}</strong> of <strong>{totalConversations}</strong> calls
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchConversations(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => fetchConversations(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conversation Detail Slide-over */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => selectConversation(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {(selectedConversation.contactName || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConversation.contactName || 'Unknown'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.contactPhone || 'No phone'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => selectConversation(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Call Info */}
            <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-gray-50 border-b">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Duration</p>
                <p className="font-semibold">
                  {selectedConversation.duration ? formatDuration(selectedConversation.duration) : '--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sentiment</p>
                <p className={`font-semibold capitalize ${
                  selectedConversation.sentiment === 'positive' ? 'text-green-600' :
                  selectedConversation.sentiment === 'negative' ? 'text-red-600' : ''
                }`}>
                  {selectedConversation.sentiment || 'Neutral'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Outcome</p>
                <p className="font-semibold capitalize">
                  {selectedConversation.outcome?.replace(/_/g, ' ') || '--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date</p>
                <p className="font-semibold">
                  {new Date(selectedConversation.startedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Transcript
              </h4>
              {selectedConversation.transcript?.length ? (
                <div className="space-y-4">
                  {selectedConversation.transcript.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Phone className="w-10 h-10 mb-2 stroke-1" />
                  <p>No transcript available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
