import { useState, useEffect } from 'react';
import {
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Smile,
  Frown,
  Meh,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Zap,
  Search
} from 'lucide-react';
import {
  sentimentAnalysisService,
  SentimentDashboard,
  SentimentScore,
  SENTIMENT_COLORS,
  EMOTION_ICONS
} from '../../services/sentiment-analysis.service';

export default function SentimentAnalysisDashboard() {
  const [dashboard, setDashboard] = useState<SentimentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await sentimentAnalysisService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load sentiment dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAnalyze = async () => {
    try {
      setCalculating(true);
      await sentimentAnalysisService.batchAnalyze(100);
      await loadDashboard();
    } catch (error) {
      console.error('Failed to batch analyze:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!analyzeText.trim()) return;
    try {
      setAnalyzing(true);
      const result = await sentimentAnalysisService.analyzeText(analyzeText);
      setAnalyzeResult(result);
    } catch (error) {
      console.error('Failed to analyze text:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentIcon = (sentiment: SentimentScore) => {
    switch (sentiment) {
      case 'VERY_POSITIVE':
      case 'POSITIVE':
        return <Smile className="h-5 w-5 text-green-500" />;
      case 'VERY_NEGATIVE':
      case 'NEGATIVE':
        return <Frown className="h-5 w-5 text-red-500" />;
      default:
        return <Meh className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: SentimentScore): string => {
    const colors: Record<SentimentScore, string> = {
      'VERY_POSITIVE': 'bg-emerald-100 text-emerald-700',
      'POSITIVE': 'bg-green-100 text-green-700',
      'NEUTRAL': 'bg-gray-100 text-gray-700',
      'NEGATIVE': 'bg-orange-100 text-orange-700',
      'VERY_NEGATIVE': 'bg-red-100 text-red-700',
    };
    return colors[sentiment] || colors.NEUTRAL;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-purple-600" />
            Sentiment Analysis
          </h1>
          <p className="text-gray-500 mt-1">Analyze customer sentiment from calls, messages, and conversations</p>
        </div>
        <button
          onClick={handleBatchAnalyze}
          disabled={calculating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? 'Analyzing...' : 'Analyze All Calls'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Total Analyses"
          value={dashboard?.totalAnalyses || 0}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Avg Sentiment"
          value={((dashboard?.avgSentiment || 0) * 100).toFixed(0) + '%'}
          color={dashboard?.avgSentiment && dashboard.avgSentiment > 0 ? 'green' : 'red'}
        />
        <StatCard
          icon={<Smile className="h-5 w-5" />}
          label="Positive"
          value={(dashboard?.sentimentDistribution?.positive || 0) + (dashboard?.sentimentDistribution?.veryPositive || 0)}
          color="green"
        />
        <StatCard
          icon={<Frown className="h-5 w-5" />}
          label="Negative"
          value={(dashboard?.sentimentDistribution?.negative || 0) + (dashboard?.sentimentDistribution?.veryNegative || 0)}
          color="red"
        />
      </div>

      {/* Quick Analyze */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-purple-600" />
          Quick Sentiment Analysis
        </h3>
        <div className="flex gap-4">
          <textarea
            value={analyzeText}
            onChange={(e) => setAnalyzeText(e.target.value)}
            placeholder="Enter text to analyze sentiment..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAnalyzeText}
              disabled={analyzing || !analyzeText.trim()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            {analyzeResult && (
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                {getSentimentIcon(analyzeResult.overallSentiment)}
                <p className={`text-sm font-medium mt-1 ${
                  analyzeResult.sentimentScore > 0 ? 'text-green-600' :
                  analyzeResult.sentimentScore < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {analyzeResult.overallSentiment.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-500">
                  Score: {(analyzeResult.sentimentScore * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </div>
        {analyzeResult?.emotions && Object.keys(analyzeResult.emotions).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(analyzeResult.emotions).map(([emotion, score]: [string, any]) => (
              <span key={emotion} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                {EMOTION_ICONS[emotion] || '🎭'} {emotion} ({(score * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Distribution & Emotions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
          <div className="space-y-3">
            {[
              { key: 'veryPositive', label: 'Very Positive', color: 'bg-emerald-500', icon: '😊' },
              { key: 'positive', label: 'Positive', color: 'bg-green-500', icon: '🙂' },
              { key: 'neutral', label: 'Neutral', color: 'bg-gray-400', icon: '😐' },
              { key: 'negative', label: 'Negative', color: 'bg-orange-500', icon: '😕' },
              { key: 'veryNegative', label: 'Very Negative', color: 'bg-red-500', icon: '😠' },
            ].map((item) => {
              const value = dashboard?.sentimentDistribution?.[item.key as keyof typeof dashboard.sentimentDistribution] || 0;
              const total = dashboard?.totalAnalyses || 1;
              const percentage = (value / total) * 100;

              return (
                <div key={item.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.icon} {item.label}</span>
                    <span className="font-medium text-gray-900">{value} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Emotions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Emotions Detected</h3>
          <div className="grid grid-cols-2 gap-3">
            {(dashboard?.topEmotions || []).map((emotion, idx) => (
              <div key={idx} className="p-3 bg-purple-50 rounded-lg flex items-center gap-3">
                <span className="text-2xl">{EMOTION_ICONS[emotion.emotion] || '🎭'}</span>
                <div>
                  <p className="font-medium text-gray-900 capitalize">{emotion.emotion}</p>
                  <p className="text-sm text-gray-500">{emotion.count} occurrences</p>
                </div>
              </div>
            ))}
            {(!dashboard?.topEmotions || dashboard.topEmotions.length === 0) && (
              <p className="col-span-2 text-center text-gray-500 py-4">No emotion data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Escalation Risk & Recent Analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Escalation Risk Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            High Escalation Risk
          </h3>
          <div className="space-y-3">
            {(dashboard?.escalationRiskLeads || []).map((lead, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{lead.leadName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getSentimentIcon(lead.lastSentiment)}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSentimentColor(lead.lastSentiment)}`}>
                      {lead.lastSentiment.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{(lead.escalationRisk * 100).toFixed(0)}%</p>
                  <p className="text-xs text-gray-500">Risk Score</p>
                </div>
              </div>
            ))}
            {(!dashboard?.escalationRiskLeads || dashboard.escalationRiskLeads.length === 0) && (
              <p className="text-center text-gray-500 py-4">No high-risk escalations</p>
            )}
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Recent Analyses
          </h3>
          <div className="space-y-3">
            {(dashboard?.recentAnalyses || []).slice(0, 5).map((analysis, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {getSentimentIcon(analysis.overallSentiment)}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{analysis.source}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(analysis.analyzedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(analysis.overallSentiment)}`}>
                  {(analysis.sentimentScore * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {(!dashboard?.recentAnalyses || dashboard.recentAnalyses.length === 0) && (
              <p className="text-center text-gray-500 py-4">No recent analyses</p>
            )}
          </div>
        </div>
      </div>

      {/* Trend Chart Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Sentiment Trends
        </h3>
        {(dashboard?.trendData || []).length > 0 ? (
          <div className="h-64 flex items-end gap-2">
            {dashboard?.trendData.map((trend, idx) => {
              const height = ((trend.avgSentiment + 1) / 2) * 100; // Convert -1 to 1 range to 0-100%
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">{(trend.avgSentiment * 100).toFixed(0)}%</span>
                    <div
                      className={`w-full rounded-t ${
                        trend.avgSentiment > 0.2 ? 'bg-green-500' :
                        trend.avgSentiment < -0.2 ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                      style={{ height: `${Math.max(height, 10)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                    {new Date(trend.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>No trend data available. Run batch analysis to generate trends.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
