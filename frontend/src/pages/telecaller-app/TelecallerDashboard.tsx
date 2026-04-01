import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface TelecallerStats {
  totalLeads: number;
  todayCalls: number;
  totalCalls: number;
  conversionRate: number;
  outcomes: Record<string, number>;
}

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  status?: string;
  createdAt: string;
  _count: {
    activities: number;
    notes: number;
  };
}

const TelecallerDashboard: React.FC = () => {
  const [stats, setStats] = useState<TelecallerStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, leadsRes] = await Promise.all([
        api.get('/telecaller/stats'),
        api.get('/telecaller/leads?limit=20'),
      ]);
      setStats(statsRes.data.data);
      setLeads(leadsRes.data.data.leads || []);
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    return (
      lead.firstName.toLowerCase().includes(query) ||
      (lead.lastName && lead.lastName.toLowerCase().includes(query)) ||
      lead.phone.includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Telecaller App</h1>
            <p className="text-blue-100 mt-1">Make calls and record conversations</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="text-3xl font-bold text-blue-600">{stats?.todayCalls || 0}</div>
            <div className="text-gray-500 text-sm">Today's Calls</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="text-3xl font-bold text-green-600">{stats?.conversionRate || 0}%</div>
            <div className="text-gray-500 text-sm">Conversion Rate</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="text-3xl font-bold text-purple-600">{stats?.totalLeads || 0}</div>
            <div className="text-gray-500 text-sm">Assigned Leads</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="text-3xl font-bold text-orange-600">{stats?.totalCalls || 0}</div>
            <div className="text-gray-500 text-sm">Total Calls</div>
          </div>
        </div>
      </div>

      {/* Outcome Stats */}
      {stats?.outcomes && Object.keys(stats.outcomes).length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Call Outcomes</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.outcomes).map(([outcome, count]) => (
                <span
                  key={outcome}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    outcome === 'INTERESTED' || outcome === 'CONVERTED'
                      ? 'bg-green-100 text-green-700'
                      : outcome === 'NOT_INTERESTED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {outcome.replace('_', ' ')}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 mt-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search leads by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl shadow-sm border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Leads List */}
      <div className="px-4 mt-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Assigned Leads</h2>
        <div className="space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 font-medium">
                {searchQuery ? 'No leads match your search' : 'No leads assigned yet'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? 'Try a different search term' : 'Contact your admin to get leads assigned'}
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">
                      {lead.firstName} {lead.lastName || ''}
                    </h3>
                    <p className="text-gray-500 text-sm">{lead.phone}</p>
                    {lead.status && (
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          lead.status === 'NEW'
                            ? 'bg-blue-100 text-blue-700'
                            : lead.status === 'QUALIFIED'
                            ? 'bg-green-100 text-green-700'
                            : lead.status === 'LOST'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {lead.status}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/telecaller-app/call/${lead.id}`}
                    className="ml-4 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-around">
          <Link to="/telecaller-app" className="flex flex-col items-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/telecaller-app/calls" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs mt-1">History</span>
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="text-xs mt-1">Exit</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TelecallerDashboard;
