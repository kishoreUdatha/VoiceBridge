import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CpuChipIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface License {
  id: string;
  licenseKey: string;
  licenseType: string;
  priceType: string;
  pricePaid: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  maxInstances: number;
  currentInstances: number;
  status: string;
  purchasedAt: string;
  expiresAt: string | null;
  template: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    industry: string;
    iconUrl: string | null;
    priceType: string;
  };
}

const statusConfig: Record<string, { color: string; icon: React.FC<any> }> = {
  ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  EXPIRED: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
  CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: XCircleIcon },
  SUSPENDED: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
};

export const MyAgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [installingId, setInstallingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLicenses();
  }, [statusFilter]);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/marketplace/licenses?${params.toString()}`);
      setLicenses(response.data.data);
    } catch (error) {
      toast.error('Failed to load your agents');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (licenseId: string) => {
    try {
      setInstallingId(licenseId);
      await api.post(`/marketplace/licenses/${licenseId}/install`);
      toast.success('Agent installed successfully!');
      navigate('/voice-ai');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to install agent');
    } finally {
      setInstallingId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Agents</h1>
          <p className="text-gray-600">Manage your licensed AI agents</p>
        </div>
        <button
          onClick={() => navigate('/marketplace')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Browse Marketplace
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Licenses Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : licenses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl">
          <CpuChipIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No agents yet</h2>
          <p className="text-gray-500 mb-6">
            Browse the marketplace to find AI agents for your business
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            Explore Marketplace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {licenses.map((license) => {
            const StatusIcon = statusConfig[license.status]?.icon || ClockIcon;
            return (
              <div
                key={license.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  {/* Agent Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {license.template.iconUrl ? (
                        <img
                          src={license.template.iconUrl}
                          alt=""
                          className="w-10 h-10 rounded"
                        />
                      ) : (
                        <CpuChipIcon className="h-8 w-8 text-primary-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {license.template.name}
                      </h3>
                      <p className="text-sm text-gray-500">{license.template.industry}</p>
                      <span
                        className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                          statusConfig[license.status]?.color || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {license.status}
                      </span>
                    </div>
                  </div>

                  {/* License Details */}
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">License Type</span>
                      <span className="font-medium">{license.licenseType}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Instances</span>
                      <span className="font-medium">
                        {license.currentInstances} / {license.maxInstances}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Purchased</span>
                      <span className="font-medium">{formatDate(license.purchasedAt)}</span>
                    </div>
                    {license.expiresAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Expires</span>
                        <span className="font-medium">{formatDate(license.expiresAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                    {license.status === 'ACTIVE' &&
                      license.currentInstances < license.maxInstances && (
                        <button
                          onClick={() => handleInstall(license.id)}
                          disabled={installingId === license.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                          {installingId === license.id ? (
                            'Installing...'
                          ) : (
                            <>
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              Install
                            </>
                          )}
                        </button>
                      )}
                    <button
                      onClick={() => navigate(`/marketplace/${license.template.slug}`)}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <PlayIcon className="h-4 w-4" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAgentsPage;
