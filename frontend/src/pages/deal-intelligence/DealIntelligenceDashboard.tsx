import { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Target,
  RefreshCw,
  CheckCircle,
  XCircle,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';
import {
  dealIntelligenceService,
  DealDashboard,
  DealIntelligence,
  DealRiskAlert,
  WIN_PROBABILITY_COLORS,
  HEALTH_SCORE_COLORS,
  COMMON_LOSS_REASONS
} from '../../services/deal-intelligence.service';

export default function DealIntelligenceDashboard() {
  const [dashboard, setDashboard] = useState<DealDashboard | null>(null);
  const [deals, setDeals] = useState<DealIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardData, dealsData] = await Promise.all([
        dealIntelligenceService.getDashboard(),
        dealIntelligenceService.getDeals({ limit: 20 }),
      ]);
      setDashboard(dashboardData);
      setDeals(dealsData.deals);
    } catch (error) {
      console.error('Failed to load deal intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCalculate = async () => {
    try {
      setCalculating(true);
      await dealIntelligenceService.batchCalculate(100);
      await loadData();
    } catch (error) {
      console.error('Failed to batch calculate:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await dealIntelligenceService.resolveAlert(alertId);
      await loadData();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getWinProbabilityColor = (probability: number): string => {
    if (probability >= 70) return 'bg-green-100 text-green-700';
    if (probability >= 40) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-700';
    if (score >= 60) return 'bg-green-100 text-green-700';
    if (score >= 40) return 'bg-amber-100 text-amber-700';
    if (score >= 20) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-700',
      MEDIUM: 'bg-amber-100 text-amber-700',
      HIGH: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return colors[severity] || colors.LOW;
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
            <Briefcase className="h-7 w-7 text-blue-600" />
            Deal Intelligence
          </h1>
          <p className="text-gray-500 mt-1">Win probability, deal health, and risk assessment</p>
        </div>
        <button
          onClick={handleBatchCalculate}
          disabled={calculating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? 'Calculating...' : 'Recalculate All'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Briefcase className="h-5 w-5" />}
          label="Total Deals"
          value={dashboard?.totalDeals || 0}
          color="blue"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Pipeline Value"
          value={`₹${((dashboard?.totalValue || 0) / 100000).toFixed(1)}L`}
          color="green"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Avg Win Probability"
          value={`${(dashboard?.avgWinProbability || 0).toFixed(0)}%`}
          color="purple"
        />
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="Avg Health Score"
          value={`${(dashboard?.avgHealthScore || 0).toFixed(0)}/100`}
          color="amber"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Win Rate"
          value={`${(dashboard?.winLossStats?.winRate || 0).toFixed(0)}%`}
          color="teal"
        />
      </div>

      {/* Pipeline by Stage & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Pipeline by Stage
          </h3>
          <div className="space-y-3">
            {Object.entries(dashboard?.pipelineByStage || {}).map(([stage, data]: [string, any]) => (
              <div key={stage} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{stage}</p>
                  <p className="text-sm text-gray-500">{data.count} deals</p>
                </div>
                <p className="text-lg font-bold text-gray-900">₹{(data.value / 1000).toFixed(0)}K</p>
              </div>
            ))}
            {Object.keys(dashboard?.pipelineByStage || {}).length === 0 && (
              <p className="text-center text-gray-500 py-4">No pipeline data</p>
            )}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { level: 'LOW', color: 'green', count: dashboard?.riskDistribution?.low || 0 },
              { level: 'MEDIUM', color: 'amber', count: dashboard?.riskDistribution?.medium || 0 },
              { level: 'HIGH', color: 'orange', count: dashboard?.riskDistribution?.high || 0 },
              { level: 'CRITICAL', color: 'red', count: dashboard?.riskDistribution?.critical || 0 },
            ].map((item) => (
              <div key={item.level} className={`p-4 rounded-lg border bg-${item.color}-50 border-${item.color}-200`}>
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-600">{item.level}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Deals & At-Risk Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Deals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Top Deals by Value
          </h3>
          <div className="space-y-3">
            {(dashboard?.topDeals || []).map((deal, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{deal.leadName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getWinProbabilityColor(deal.winProbability)}`}>
                      {deal.winProbability.toFixed(0)}% Win
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getHealthColor(deal.healthScore)}`}>
                      Health: {deal.healthScore.toFixed(0)}
                    </span>
                  </div>
                </div>
                <p className="text-lg font-bold text-green-600">₹{(deal.dealValue / 1000).toFixed(0)}K</p>
              </div>
            ))}
            {(!dashboard?.topDeals || dashboard.topDeals.length === 0) && (
              <p className="text-center text-gray-500 py-4">No deals available</p>
            )}
          </div>
        </div>

        {/* At-Risk Deals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            At-Risk Deals
          </h3>
          <div className="space-y-3">
            {(dashboard?.atRiskDeals || []).map((deal, idx) => (
              <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{deal.leadName}</p>
                  <p className="text-lg font-bold text-red-600">₹{(deal.dealValue / 1000).toFixed(0)}K</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(deal.alerts || []).slice(0, 2).map((alert, alertIdx) => (
                    <span key={alertIdx} className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(alert.severity)}`}>
                      {alert.message}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {(!dashboard?.atRiskDeals || dashboard.atRiskDeals.length === 0) && (
              <p className="text-center text-gray-500 py-4">No at-risk deals</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Active Risk Alerts
        </h3>
        {(dashboard?.activeAlerts || []).length > 0 ? (
          <div className="space-y-2">
            {dashboard?.activeAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{alert.alertType}</p>
                    <p className="text-sm text-gray-500">{alert.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-lg flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Resolve
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No active alerts</p>
        )}
      </div>

      {/* Win/Loss Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Win/Loss Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Win/Loss Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Won</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-green-600">{dashboard?.winLossStats?.totalWon || 0}</p>
                <p className="text-xs text-gray-500">Avg: ₹{((dashboard?.winLossStats?.avgWonValue || 0) / 1000).toFixed(0)}K</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-gray-900">Lost</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-red-600">{dashboard?.winLossStats?.totalLost || 0}</p>
                <p className="text-xs text-gray-500">Avg: ₹{((dashboard?.winLossStats?.avgLostValue || 0) / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </div>

          {/* Win Rate Gauge */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-gray-200"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-green-500"
                  strokeWidth="10"
                  strokeDasharray={`${(dashboard?.winLossStats?.winRate || 0) * 2.51} 251`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {(dashboard?.winLossStats?.winRate || 0).toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">Win Rate</p>
          </div>

          {/* Top Loss Reasons */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Top Loss Reasons</h4>
            <div className="space-y-2">
              {(dashboard?.winLossStats?.topLossReasons || []).slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.reason}</span>
                  <span className="font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
              {(!dashboard?.winLossStats?.topLossReasons || dashboard.winLossStats.topLossReasons.length === 0) && (
                <p className="text-sm text-gray-500">No loss data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Deals Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Deals</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">Lead</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Value</th>
                <th className="text-center py-3 text-sm font-medium text-gray-500">Win Prob</th>
                <th className="text-center py-3 text-sm font-medium text-gray-500">Health</th>
                <th className="text-center py-3 text-sm font-medium text-gray-500">Risk</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Next Steps</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 text-sm font-medium text-gray-900">
                    {deal.lead?.firstName} {deal.lead?.lastName}
                    {deal.lead?.company && <span className="text-gray-500 ml-1">({deal.lead.company})</span>}
                  </td>
                  <td className="py-3 text-right text-sm font-medium text-gray-900">
                    ₹{(deal.dealValue / 1000).toFixed(0)}K
                  </td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getWinProbabilityColor(deal.winProbability)}`}>
                      {deal.winProbability.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthColor(deal.healthScore)}`}>
                      {deal.healthScore.toFixed(0)}
                    </span>
                  </td>
                  <td className="py-3 text-center text-sm text-gray-600">
                    {deal.riskScore?.toFixed(0) || '-'}
                  </td>
                  <td className="py-3 text-sm text-gray-600 max-w-[200px] truncate">
                    {deal.nextSteps?.[0] || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
