/**
 * Agent Performance Page
 * Leaderboard and detailed analytics for voice agents
 */

import React from 'react';
import { useAgentPerformance } from './hooks';
import {
  AgentPerformanceLoadingSkeleton,
  AgentPerformanceHeader,
  Podium,
  LeaderboardList,
  AgentDetailsPanel,
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

  // Skeleton loader
  if (loading && leaderboard.length === 0) {
    return <AgentPerformanceLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <AgentPerformanceHeader
          metric={metric}
          dateRange={dateRange}
          loading={loading}
          onMetricChange={setMetric}
          onDateRangeChange={setDateRange}
          onRefresh={fetchLeaderboard}
        />

        {/* Top 3 Podium */}
        <Podium
          leaderboard={leaderboard}
          selectedAgent={selectedAgent}
          metric={metric}
          onSelectAgent={setSelectedAgent}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Leaderboard */}
          <div className="xl:col-span-1">
            <LeaderboardList
              leaderboard={leaderboard}
              selectedAgent={selectedAgent}
              metric={metric}
              onSelectAgent={setSelectedAgent}
            />
          </div>

          {/* Agent Details */}
          <div className="xl:col-span-2">
            <AgentDetailsPanel
              agentPerformance={agentPerformance}
              selectedEntry={getSelectedAgentEntry()}
              radarData={radarData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPerformancePage;
