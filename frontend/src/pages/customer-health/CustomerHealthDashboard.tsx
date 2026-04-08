import { useState, useEffect } from 'react';
import {
  Heart,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Users,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  customerHealthService,
  HealthDashboard,
  CustomerHealth,
  HealthRiskLevel,
  HealthTrend
} from '../../services/customer-health.service';

export default function CustomerHealthDashboard() {
  const [dashboard, setDashboard] = useState<HealthDashboard | null>(null);
  const [records, setRecords] = useState<CustomerHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [filter, setFilter] = useState<{ riskLevel?: HealthRiskLevel; trend?: HealthTrend }>({});

  useEffect(() => {
    loadDashboard();
    loadRecords();
  }, [filter]);

  const loadDashboard = async () => {
    try {
      const data = await customerHealthService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load health dashboard:', error);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await customerHealthService.getHealthRecords({ ...filter, limit: 20 });
      setRecords(data.records);
    } catch (error) {
      console.error('Failed to load health records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCalculate = async () => {
    try {
      setCalculating(true);
      await customerHealthService.batchCalculate(100);
      await loadDashboard();
      await loadRecords();
    } catch (error) {
      console.error('Failed to batch calculate:', error);
    } finally {
      setCalculating(false);
    }
  };

  const getRiskColor = (risk: HealthRiskLevel) => {
    const colors = {
      LOW: 'bg-green-100 text-green-700',
      MEDIUM: 'bg-amber-100 text-amber-700',
      HIGH: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return colors[risk] || colors.LOW;
  };

  const getTrendIcon = (trend: HealthTrend) => {
    switch (trend) {
      case 'IMPROVING':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'DECLINING':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-7 w-7 text-red-500" />
            Customer Health
          </h1>
          <p className="text-gray-500 mt-1">Monitor customer health scores, interventions, and satisfaction metrics</p>
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
          icon={<Users className="h-5 w-5" />}
          label="Total Records"
          value={dashboard?.totalRecords || 0}
          color="blue"
        />
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          label="Avg Health Score"
          value={`${(dashboard?.averageHealth || 0).toFixed(0)}/100`}
          color="green"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Critical Accounts"
          value={dashboard?.riskDistribution?.critical || 0}
          color="red"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="NPS Score"
          value={dashboard?.npsScore?.toFixed(0) || 'N/A'}
          color="purple"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="CSAT Score"
          value={dashboard?.csatScore ? `${dashboard.csatScore.toFixed(0)}%` : 'N/A'}
          color="amber"
        />
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            <RiskCard level="LOW" count={dashboard?.riskDistribution?.low || 0} color="green" />
            <RiskCard level="MEDIUM" count={dashboard?.riskDistribution?.medium || 0} color="amber" />
            <RiskCard level="HIGH" count={dashboard?.riskDistribution?.high || 0} color="orange" />
            <RiskCard level="CRITICAL" count={dashboard?.riskDistribution?.critical || 0} color="red" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Distribution</h3>
          <div className="space-y-4">
            <TrendBar
              label="Improving"
              value={dashboard?.trendDistribution?.improving || 0}
              total={dashboard?.totalRecords || 1}
              icon={<TrendingUp className="h-4 w-4 text-green-600" />}
              color="bg-green-500"
            />
            <TrendBar
              label="Stable"
              value={dashboard?.trendDistribution?.stable || 0}
              total={dashboard?.totalRecords || 1}
              icon={<Minus className="h-4 w-4 text-gray-500" />}
              color="bg-gray-400"
            />
            <TrendBar
              label="Declining"
              value={dashboard?.trendDistribution?.declining || 0}
              total={dashboard?.totalRecords || 1}
              icon={<TrendingDown className="h-4 w-4 text-red-600" />}
              color="bg-red-500"
            />
          </div>
        </div>
      </div>

      {/* Critical Accounts & Recent Interventions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Accounts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Critical Accounts
          </h3>
          <div className="space-y-3">
            {(dashboard?.criticalAccounts || []).map((account, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{account.leadName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(account.riskLevel)}`}>
                      {account.riskLevel}
                    </span>
                    {getTrendIcon(account.trend)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{account.overallScore.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Health Score</p>
                </div>
              </div>
            ))}
            {(!dashboard?.criticalAccounts || dashboard.criticalAccounts.length === 0) && (
              <p className="text-center text-gray-500 py-4">No critical accounts</p>
            )}
          </div>
        </div>

        {/* Recent Interventions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Recent Interventions
          </h3>
          <div className="space-y-3">
            {(dashboard?.recentInterventions || []).map((intervention, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {intervention.type === 'CALL' && <Phone className="h-4 w-4 text-blue-500" />}
                  {intervention.type === 'EMAIL' && <Mail className="h-4 w-4 text-green-500" />}
                  {intervention.type === 'MEETING' && <Calendar className="h-4 w-4 text-purple-500" />}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{intervention.reason}</p>
                    <p className="text-xs text-gray-500">{intervention.type}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  intervention.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  intervention.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                  intervention.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {intervention.status}
                </span>
              </div>
            ))}
            {(!dashboard?.recentInterventions || dashboard.recentInterventions.length === 0) && (
              <p className="text-center text-gray-500 py-4">No recent interventions</p>
            )}
          </div>
        </div>
      </div>

      {/* Health Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Health Records</h3>
          <div className="flex gap-2">
            <select
              value={filter.riskLevel || ''}
              onChange={(e) => setFilter({ ...filter, riskLevel: e.target.value as HealthRiskLevel || undefined })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Risk Levels</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <select
              value={filter.trend || ''}
              onChange={(e) => setFilter({ ...filter, trend: e.target.value as HealthTrend || undefined })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Trends</option>
              <option value="IMPROVING">Improving</option>
              <option value="STABLE">Stable</option>
              <option value="DECLINING">Declining</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-sm font-medium text-gray-500">Lead</th>
                  <th className="text-center py-3 text-sm font-medium text-gray-500">Overall</th>
                  <th className="text-center py-3 text-sm font-medium text-gray-500">Engagement</th>
                  <th className="text-center py-3 text-sm font-medium text-gray-500">Payment</th>
                  <th className="text-center py-3 text-sm font-medium text-gray-500">Risk</th>
                  <th className="text-center py-3 text-sm font-medium text-gray-500">Trend</th>
                  <th className="text-right py-3 text-sm font-medium text-gray-500">Last Contact</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-900">{record.leadId}</td>
                    <td className="py-3 text-center">
                      <ScoreBadge score={record.overallScore} />
                    </td>
                    <td className="py-3 text-center text-sm text-gray-600">
                      {record.engagementScore?.toFixed(0) || '-'}
                    </td>
                    <td className="py-3 text-center text-sm text-gray-600">
                      {record.paymentScore?.toFixed(0) || '-'}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(record.riskLevel)}`}>
                        {record.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 text-center">{getTrendIcon(record.trend)}</td>
                    <td className="py-3 text-right text-sm text-gray-500">
                      {record.lastContactAt ? new Date(record.lastContactAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    amber: 'bg-amber-50 text-amber-600',
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

function RiskCard({ level, count, color }: { level: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    orange: 'border-orange-200 bg-orange-50',
    red: 'border-red-200 bg-red-50',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <p className="text-2xl font-bold text-gray-900">{count}</p>
      <p className="text-sm text-gray-600">{level}</p>
    </div>
  );
}

function TrendBar({ label, value, total, icon, color }: { label: string; value: number; total: number; icon: React.ReactNode; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="flex items-center gap-2 text-gray-600">{icon} {label}</span>
        <span className="font-medium text-gray-900">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let color = 'bg-red-100 text-red-700';
  if (score >= 80) color = 'bg-green-100 text-green-700';
  else if (score >= 60) color = 'bg-blue-100 text-blue-700';
  else if (score >= 40) color = 'bg-amber-100 text-amber-700';
  else if (score >= 20) color = 'bg-orange-100 text-orange-700';

  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>
      {score.toFixed(0)}
    </span>
  );
}
