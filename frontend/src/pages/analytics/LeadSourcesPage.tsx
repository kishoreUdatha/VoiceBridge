/**
 * Lead Sources Page
 * Compare Social Media vs AI Voice Agent lead generation analytics
 */

import { useLeadSources } from './hooks';
import {
  LeadSourcesLoadingSkeleton,
  LeadSourcesHeader,
  SocialMediaCard,
  AIVoiceCard,
  DistributionCard,
  TrendChart,
  ComparisonTable,
} from './components';

const LeadSourcesPage: React.FC = () => {
  const {
    data,
    loading,
    dateRange,
    selectedCategory,
    pieChartData,
    trendData,
    setDateRange,
    setSelectedCategory,
    fetchData,
  } = useLeadSources();

  // Skeleton loader
  if (loading && !data) {
    return <LeadSourcesLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
        <LeadSourcesHeader
          selectedCategory={selectedCategory}
          dateRange={dateRange}
          loading={loading}
          onCategoryChange={setSelectedCategory}
          onDateRangeChange={setDateRange}
          onRefresh={fetchData}
        />

        {/* Main Category Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {data?.socialMedia && (
            <SocialMediaCard
              data={data.socialMedia}
              isSelected={selectedCategory === 'socialMedia'}
              onClick={() => setSelectedCategory('socialMedia')}
            />
          )}

          {data?.aiVoiceAgent && (
            <AIVoiceCard
              data={data.aiVoiceAgent}
              isSelected={selectedCategory === 'aiVoice'}
              onClick={() => setSelectedCategory('aiVoice')}
            />
          )}

          <DistributionCard pieChartData={pieChartData} />
        </div>

        {/* Trend Chart */}
        <TrendChart data={trendData} />

        {/* Comparison Table */}
        {data?.comparison && <ComparisonTable comparison={data.comparison} />}
      </div>
    </div>
  );
};

export default LeadSourcesPage;
