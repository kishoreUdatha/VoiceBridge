/**
 * Conversion Funnel Page
 * Track lead progression through sales pipeline
 */

import React from 'react';
import { useConversionFunnel } from './hooks';
import {
  ConversionFunnelLoadingSkeleton,
  ConversionFunnelHeader,
  ConversionFunnelSummaryCards,
  ConversionFunnelInsights,
  FunnelVisual,
  FunnelTable,
  StageComparisonChart,
} from './components';

const ConversionFunnelPage: React.FC = () => {
  const {
    funnelData,
    loading,
    funnelName,
    dateRange,
    viewMode,
    insights,
    setFunnelName,
    setDateRange,
    setViewMode,
    fetchFunnelData,
  } = useConversionFunnel();

  // Show skeleton on initial load
  if (loading && !funnelData) {
    return <ConversionFunnelLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 py-3">
        <ConversionFunnelHeader
          funnelName={funnelName}
          dateRange={dateRange}
          viewMode={viewMode}
          loading={loading}
          onFunnelChange={setFunnelName}
          onDateRangeChange={setDateRange}
          onViewModeChange={setViewMode}
          onRefresh={fetchFunnelData}
        />

        <ConversionFunnelSummaryCards data={funnelData} />

        <ConversionFunnelInsights insights={insights} />

        {/* Main Content */}
        {viewMode === 'visual' ? (
          <div className="bg-white rounded-lg border border-gray-200 p-2 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-700">Funnel Visualization</span>
            </div>
            <FunnelVisual stages={funnelData?.stages || []} />
          </div>
        ) : (
          <FunnelTable stages={funnelData?.stages || []} />
        )}

        <StageComparisonChart stages={funnelData?.stages || []} />
      </div>
    </div>
  );
};

export default ConversionFunnelPage;
