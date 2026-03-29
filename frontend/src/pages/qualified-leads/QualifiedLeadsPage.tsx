import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PhoneIcon,
  ArrowPathIcon,
  ChartBarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

interface QualifiedLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: string;
  stage?: { name: string };
  isConverted: boolean;
  convertedAt?: string;
  createdAt: string;
  assignments?: Array<{
    assignedTo?: { firstName: string; lastName: string };
  }>;
}

interface Stats {
  total: number;
  converted: number;
  lost: number;
  pending: number;
  conversionRate: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  WON: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircleIcon },
  CONVERTED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircleIcon },
  LOST: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircleIcon },
  NEW: { bg: 'bg-blue-100', text: 'text-blue-700', icon: ClockIcon },
  CONTACTED: { bg: 'bg-amber-100', text: 'text-amber-700', icon: PhoneIcon },
  QUALIFIED: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: UserIcon },
  NEGOTIATION: { bg: 'bg-purple-100', text: 'text-purple-700', icon: ChartBarIcon },
};

export default function QualifiedLeadsPage() {
  const [leads, setLeads] = useState<QualifiedLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, statsRes] = await Promise.all([
        api.get('/telecaller/my-qualified-leads', {
          params: filter !== 'all' ? { status: filter } : {},
        }),
        api.get('/telecaller/my-qualified-leads/stats'),
      ]);

      setLeads(leadsRes.data?.data?.leads || []);
      setStats(statsRes.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch qualified leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (lead: QualifiedLead) => {
    const stageName = lead.stage?.name?.toUpperCase() || lead.status || 'NEW';
    return STATUS_COLORS[stageName] || STATUS_COLORS.NEW;
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen -m-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Qualified Leads</h1>
          <p className="text-sm text-slate-500">Track leads you converted from raw data</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-white rounded-lg border border-slate-200"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Qualified</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.converted}</p>
                <p className="text-xs text-slate-500">Won/Converted</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">{stats.conversionRate}%</p>
                <p className="text-xs text-slate-500">Conversion Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { id: 'all', label: 'All' },
          { id: 'WON', label: 'Won' },
          { id: 'LOST', label: 'Lost' },
          { id: 'NEW', label: 'New' },
          { id: 'CONTACTED', label: 'Contacted' },
          { id: 'QUALIFIED', label: 'Qualified' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center">
            <UserIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No qualified leads yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Leads you convert from raw data will appear here
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Qualified On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => {
                const statusStyle = getStatusStyle(lead);
                const StatusIcon = statusStyle.icon;
                const assignedTo = lead.assignments?.[0]?.assignedTo;
                const stageName = lead.stage?.name || lead.status || 'New';

                return (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/leads/${lead.id}`} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                          {lead.firstName?.[0]}{lead.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 flex items-center gap-1">
                            {lead.firstName} {lead.lastName}
                            {lead.isConverted && (
                              <CheckBadgeIcon className="w-4 h-4 text-emerald-500" />
                            )}
                          </p>
                          {lead.convertedAt && (
                            <p className="text-xs text-emerald-600">
                              Converted {new Date(lead.convertedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-800">{lead.phone}</p>
                      <p className="text-xs text-slate-400">{lead.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {stageName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {assignedTo ? (
                        <span className="text-sm text-slate-700">
                          {assignedTo.firstName} {assignedTo.lastName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600">
                        {new Date(lead.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
