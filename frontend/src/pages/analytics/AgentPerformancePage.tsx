/**
 * Agent Performance Page - Redesigned
 * Clean, modern analytics dashboard for voice agents
 */

import React from 'react';
import { useAgentPerformance } from './hooks';
import {
  AgentPerformanceLoadingSkeleton,
  AgentPerformanceHeader,
  StatsOverview,
  AgentGrid,
  AgentDetailModal,
} from './components';

const AgentPerformancePage: React.FC = () => {
  const {
    leaderboard,
    selectedAgent,
    agentPerformance,
    loading,
    radarData,
    metric,
    setMetric,
    dateRange,
    setDateRange,
    setSelectedAgent,
    fetchLeaderboard,
    getSelectedAgentEntry,
  } = useAgentPerformance();

  if (loading && leaderboard.length === 0) {
    return <AgentPerformanceLoadingSkeleton />;
  }

  // Calculate overview stats
  const totalCalls = leaderboard.reduce((sum, a) => sum + a.metrics.totalCalls, 0);
  const avgConversion = leaderboard.length > 0
    ? leaderboard.reduce((sum, a) => sum + a.metrics.avgConversionRate, 0) / leaderboard.length
    : 0;
  const avgAnswerRate = leaderboard.length > 0
    ? leaderboard.reduce((sum, a) => sum + a.metrics.avgAnswerRate, 0) / leaderboard.length
    : 0;
  const totalAgents = leaderboard.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AgentPerformanceHeader
          metric={metric}
          dateRange={dateRange}
          loading={loading}
          onMetricChange={setMetric}
          onDateRangeChange={setDateRange}
          onRefresh={fetchLeaderboard}
        />

        {/* Stats Overview */}
        <StatsOverview
          totalAgents={totalAgents}
          totalCalls={totalCalls}
          avgConversion={avgConversion}
          avgAnswerRate={avgAnswerRate}
        />

        {/* Agent Grid */}
        <AgentGrid
          leaderboard={leaderboard}
          selectedAgent={selectedAgent}
          metric={metric}
          onSelectAgent={setSelectedAgent}
        />

        {/* Agent Detail Modal */}
        {selectedAgent && (
          <AgentDetailModal
            agentPerformance={agentPerformance}
            selectedEntry={getSelectedAgentEntry()}
            radarData={radarData}
            onClose={() => setSelectedAgent(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AgentPerformancePage;
