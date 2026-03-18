import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  GlobeAltIcon,
  UserGroupIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ArrowPathIcon,
  LinkIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface AdCampaign {
  id: string;
  platform: string;
  externalId: string;
  name: string;
  status: string;
  budget?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  syncedAt: string;
  _count?: { adLeads: number };
}

interface AdLead {
  id: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  adCampaign: {
    name: string;
    platform: string;
  };
  syncedAt: string;
}

interface Analytics {
  totalCampaigns: number;
  totalLeads: number;
  byPlatform: {
    platform: string;
    _count: number;
    _sum: { impressions: number; clicks: number; conversions: number };
  }[];
  recentLeads: AdLead[];
}

const platformConfig: Record<string, { color: string; bgColor: string; icon: string }> = {
  FACEBOOK: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: 'fb' },
  INSTAGRAM: { color: 'text-pink-600', bgColor: 'bg-pink-100', icon: 'ig' },
  LINKEDIN: { color: 'text-sky-600', bgColor: 'bg-sky-100', icon: 'li' },
  GOOGLE: { color: 'text-red-600', bgColor: 'bg-red-100', icon: 'g' },
};

export default function SocialMediaAdsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncForm, setSyncForm] = useState({
    platform: 'FACEBOOK',
    adAccountId: '',
    accessToken: '',
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedPlatform]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [campaignsRes, analyticsRes] = await Promise.all([
        api.get('/ads/campaigns', { params: selectedPlatform ? { platform: selectedPlatform } : {} }),
        api.get('/ads/analytics'),
      ]);
      setCampaigns(campaignsRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
    } catch (error) {
      toast.error('Failed to load ad data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!syncForm.adAccountId || !syncForm.accessToken) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSyncing(true);
      const endpoint = `/ads/${syncForm.platform.toLowerCase()}/sync`;
      await api.post(endpoint, {
        adAccountId: syncForm.adAccountId,
        accessToken: syncForm.accessToken,
      });
      toast.success('Campaigns synced successfully');
      setShowSyncModal(false);
      loadData();
    } catch (error) {
      toast.error('Failed to sync campaigns');
    } finally {
      setIsSyncing(false);
    }
  };

  const getPlatformStyle = (platform: string) => {
    return platformConfig[platform] || { color: 'text-slate-600', bgColor: 'bg-slate-100', icon: '?' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="spinner spinner-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Social Media Ads</h1>
          <p className="text-slate-500 mt-1">
            Manage leads from Facebook, Instagram, LinkedIn & Google Ads
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="btn btn-secondary">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => navigate('/ad-integrations')}
            className="btn btn-primary"
          >
            <LinkIcon className="h-4 w-4" />
            Manage Integrations
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100">
                <GlobeAltIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{analytics.totalCampaigns}</p>
                <p className="text-xs text-slate-500">Active Campaigns</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-100">
                <UserGroupIcon className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{analytics.totalLeads}</p>
                <p className="text-xs text-slate-500">Total Ad Leads</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-100">
                <EyeIcon className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {analytics.byPlatform.reduce((sum, p) => sum + (p._sum?.impressions || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Impressions</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <CursorArrowRaysIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {analytics.byPlatform.reduce((sum, p) => sum + (p._sum?.clicks || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Clicks</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedPlatform('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedPlatform === ''
              ? 'bg-primary-100 text-primary-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Platforms
        </button>
        {['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'GOOGLE'].map((platform) => {
          const style = getPlatformStyle(platform);
          return (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPlatform === platform
                  ? `${style.bgColor} ${style.color}`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {platform}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Ad Campaigns</h3>
            </div>
            {campaigns.length === 0 ? (
              <div className="card-body text-center py-12">
                <GlobeAltIcon className="w-12 h-12 mx-auto text-slate-300" />
                <p className="mt-2 text-slate-600 font-medium">No campaigns found</p>
                <p className="text-sm text-slate-500">Sync your ad accounts to see campaigns</p>
                <button
                  onClick={() => setShowSyncModal(true)}
                  className="btn btn-primary mt-4"
                >
                  <LinkIcon className="h-4 w-4" />
                  Sync Campaigns
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {campaigns.map((campaign) => {
                  const style = getPlatformStyle(campaign.platform);
                  return (
                    <div key={campaign.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${style.bgColor}`}>
                            <span className={`text-sm font-bold ${style.color}`}>
                              {campaign.platform.substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{campaign.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                campaign.status === 'ACTIVE'
                                  ? 'bg-success-100 text-success-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {campaign.status}
                              </span>
                              <span className="text-xs text-slate-500">
                                ID: {campaign.externalId}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">
                            {campaign._count?.adLeads || 0}
                          </p>
                          <p className="text-xs text-slate-500">leads</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {(campaign.impressions || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">Impressions</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {(campaign.clicks || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">Clicks</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {campaign.conversions || 0}
                          </p>
                          <p className="text-xs text-slate-500">Conversions</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {campaign.spend ? `₹${campaign.spend.toLocaleString()}` : '-'}
                          </p>
                          <p className="text-xs text-slate-500">Spend</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Ad Leads</h3>
            </div>
            {analytics?.recentLeads && analytics.recentLeads.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {analytics.recentLeads.map((adLead) => {
                  const style = getPlatformStyle(adLead.adCampaign.platform);
                  return (
                    <div key={adLead.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${style.bgColor}`}>
                          <span className={`text-xs font-bold ${style.color}`}>
                            {adLead.adCampaign.platform.substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {adLead.lead.firstName} {adLead.lead.lastName}
                          </p>
                          <p className="text-sm text-slate-500 truncate">{adLead.lead.email}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {adLead.adCampaign.name}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(adLead.syncedAt).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card-body text-center py-8">
                <UserGroupIcon className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm text-slate-500 mt-2">No recent leads</p>
              </div>
            )}
          </div>

          {/* Platform Stats */}
          {analytics?.byPlatform && analytics.byPlatform.length > 0 && (
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="card-title">Platform Performance</h3>
              </div>
              <div className="card-body space-y-4">
                {analytics.byPlatform.map((platform) => {
                  const style = getPlatformStyle(platform.platform);
                  const ctr = platform._sum?.clicks && platform._sum?.impressions
                    ? ((platform._sum.clicks / platform._sum.impressions) * 100).toFixed(2)
                    : '0';
                  return (
                    <div key={platform.platform} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1 rounded ${style.bgColor}`}>
                          <span className={`text-xs font-bold ${style.color}`}>
                            {platform.platform.substring(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-slate-900">{platform.platform}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">Campaigns</p>
                          <p className="font-medium">{platform._count}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">CTR</p>
                          <p className="font-medium">{ctr}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowSyncModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Sync Ad Campaigns
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Platform
                </label>
                <select
                  value={syncForm.platform}
                  onChange={(e) => setSyncForm({ ...syncForm, platform: e.target.value })}
                  className="input w-full"
                >
                  <option value="FACEBOOK">Facebook</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="GOOGLE">Google Ads</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ad Account ID
                </label>
                <input
                  type="text"
                  value={syncForm.adAccountId}
                  onChange={(e) => setSyncForm({ ...syncForm, adAccountId: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., 123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  value={syncForm.accessToken}
                  onChange={(e) => setSyncForm({ ...syncForm, accessToken: e.target.value })}
                  className="input w-full"
                  placeholder="Your platform access token"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Get this from your ad platform's developer settings
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSyncModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="btn btn-primary flex-1"
              >
                {isSyncing ? <span className="spinner"></span> : <CheckBadgeIcon className="h-4 w-4" />}
                Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
