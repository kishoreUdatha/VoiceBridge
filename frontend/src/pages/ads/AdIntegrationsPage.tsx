import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  TrashIcon,
  PlusIcon,
  SignalIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface Integration {
  id: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  pageId?: string;
  pageName?: string;
  instagramUsername?: string;
  adAccountId?: string;
  adAccountName?: string;
  customerId?: string;
  customerName?: string;
}

interface PlatformConfig {
  key: string;
  name: string;
  description: string;
  gradient: string;
  iconBg: string;
  icon: React.ReactNode;
  setupPath: string;
  apiEndpoint: string;
  category: 'social' | 'search' | 'video' | 'b2b' | 'scraping';
}

// Platform SVG Icons
const FacebookIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const ApifyIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const platforms: PlatformConfig[] = [
  {
    key: 'facebook',
    name: 'Facebook Ads',
    description: 'Capture leads from Facebook Lead Ads campaigns',
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-500',
    icon: <FacebookIcon />,
    setupPath: '/facebook-setup',
    apiEndpoint: '/facebook/integrations',
    category: 'social',
  },
  {
    key: 'instagram',
    name: 'Instagram Ads',
    description: 'Capture leads from Instagram Lead Ads',
    gradient: 'from-pink-500 via-purple-500 to-orange-400',
    iconBg: 'bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400',
    icon: <InstagramIcon />,
    setupPath: '/instagram-setup',
    apiEndpoint: '/instagram/integrations',
    category: 'social',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn Ads',
    description: 'Capture B2B leads from Lead Gen Forms',
    gradient: 'from-blue-700 to-blue-800',
    iconBg: 'bg-blue-700',
    icon: <LinkedInIcon />,
    setupPath: '/linkedin-setup',
    apiEndpoint: '/linkedin/integrations',
    category: 'b2b',
  },
  {
    key: 'google',
    name: 'Google Ads',
    description: 'Capture leads from Lead Form Extensions',
    gradient: 'from-blue-500 via-green-500 to-yellow-500',
    iconBg: 'bg-white',
    icon: <GoogleIcon />,
    setupPath: '/google-ads-setup',
    apiEndpoint: '/google-ads/integrations',
    category: 'search',
  },
  {
    key: 'youtube',
    name: 'YouTube Ads',
    description: 'Capture leads from TrueView video campaigns',
    gradient: 'from-red-500 to-red-600',
    iconBg: 'bg-red-500',
    icon: <YouTubeIcon />,
    setupPath: '/youtube-setup',
    apiEndpoint: '/youtube/integrations',
    category: 'video',
  },
  {
    key: 'twitter',
    name: 'Twitter / X Ads',
    description: 'Capture leads from Lead Gen Cards',
    gradient: 'from-slate-800 to-slate-900',
    iconBg: 'bg-black',
    icon: <TwitterIcon />,
    setupPath: '/twitter-setup',
    apiEndpoint: '/twitter/integrations',
    category: 'social',
  },
  {
    key: 'tiktok',
    name: 'TikTok Ads',
    description: 'Capture leads from Instant Forms',
    gradient: 'from-pink-500 via-red-500 to-cyan-400',
    iconBg: 'bg-black',
    icon: <TikTokIcon />,
    setupPath: '/tiktok-setup',
    apiEndpoint: '/tiktok/integrations',
    category: 'video',
  },
  {
    key: 'apify',
    name: 'Apify Web Scraping',
    description: 'Scrape leads from Google Maps, LinkedIn & more',
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-500',
    icon: <ApifyIcon />,
    setupPath: '/apify-setup',
    apiEndpoint: '/apify/integration',
    category: 'scraping',
  },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  social: { label: 'Social Media', color: 'bg-blue-100 text-blue-700' },
  search: { label: 'Search', color: 'bg-green-100 text-green-700' },
  video: { label: 'Video', color: 'bg-red-100 text-red-700' },
  b2b: { label: 'B2B', color: 'bg-purple-100 text-purple-700' },
  scraping: { label: 'Web Scraping', color: 'bg-emerald-100 text-emerald-700' },
};

export default function AdIntegrationsPage() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Record<string, Integration[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setIsLoading(true);
    try {
      const results: Record<string, Integration[]> = {};
      await Promise.all(
        platforms.map(async (platform) => {
          try {
            const response = await api.get(platform.apiEndpoint);
            results[platform.key] = response.data.data || [];
          } catch {
            results[platform.key] = [];
          }
        })
      );
      setIntegrations(results);
    } catch {
      toast.error('Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (platform: PlatformConfig, integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    setDeletingId(integrationId);
    try {
      await api.delete(`${platform.apiEndpoint}/${integrationId}`);
      toast.success('Integration deleted');
      loadIntegrations();
    } catch {
      toast.error('Failed to delete integration');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSync = async (platform: PlatformConfig) => {
    setSyncing(platform.key);
    try {
      await api.post(`${platform.apiEndpoint}/sync`);
      toast.success(`${platform.name} synced successfully`);
      loadIntegrations();
    } catch {
      toast.error(`Failed to sync ${platform.name}`);
    } finally {
      setSyncing(null);
    }
  };

  const getIntegrationLabel = (platform: PlatformConfig, integration: Integration): string => {
    if (platform.key === 'facebook' || platform.key === 'instagram') {
      return integration.pageName || integration.instagramUsername || integration.pageId || 'Connected';
    }
    if (platform.key === 'linkedin' || platform.key === 'twitter') {
      return integration.adAccountName || integration.adAccountId || 'Connected';
    }
    if (platform.key === 'google') {
      return integration.customerName || integration.customerId || 'Connected';
    }
    if (platform.key === 'youtube') {
      return (integration as any).channelName || (integration as any).channelId || 'Connected';
    }
    if (platform.key === 'tiktok') {
      return (integration as any).advertiserName || (integration as any).advertiserId || 'Connected';
    }
    if (platform.key === 'apify') {
      return 'Web Scraping Active';
    }
    return 'Connected';
  };

  const connectedCount = Object.values(integrations).filter(arr => arr.length > 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">Ad Platform Integrations</h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Connect your advertising platforms to automatically capture and sync leads
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-primary-400">{connectedCount}</div>
              <div className="text-xs text-slate-400">Connected</div>
            </div>
            <div className="w-px h-8 bg-slate-700"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{platforms.length}</div>
              <div className="text-xs text-slate-400">Available</div>
            </div>
            <button
              onClick={loadIntegrations}
              className="ml-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/webhook-urls')}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors text-xs font-medium"
            >
              <SignalIcon className="h-3.5 w-3.5" />
              Webhook URLs
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500 rounded-md text-white">
              <SignalIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Real-time Sync</p>
              <p className="text-[10px] text-blue-500">Webhooks for instant capture</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500 rounded-md text-white">
              <ClockIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">Scheduled Sync</p>
              <p className="text-[10px] text-green-500">Auto-sync every 4 hours</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500 rounded-md text-white">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-purple-600 font-medium">Field Mapping</p>
              <p className="text-[10px] text-purple-500">Auto-map to CRM fields</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {platforms.map((platform) => {
          const platformIntegrations = integrations[platform.key] || [];
          const hasIntegration = platformIntegrations.length > 0;
          const category = categoryLabels[platform.category];

          return (
            <div
              key={platform.key}
              className={`group relative bg-white rounded-xl border transition-all duration-300 hover:shadow-lg ${
                hasIntegration ? 'border-green-200' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Status Indicator */}
              {hasIntegration && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                </div>
              )}

              <div className="p-3">
                {/* Platform Header */}
                <div className="flex items-start gap-2.5 mb-3">
                  <div className={`p-2 rounded-lg ${platform.iconBg} text-white shadow`}>
                    <div className="w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
                      {platform.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{platform.name}</h3>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${category.color}`}>
                      {category.label}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{platform.description}</p>

                {/* Connected Accounts */}
                {hasIntegration && (
                  <div className="mb-3 space-y-1.5">
                    {platformIntegrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 text-xs truncate">
                            {getIntegrationLabel(platform, integration)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {integration.lastSyncedAt
                              ? `Synced ${new Date(integration.lastSyncedAt).toLocaleDateString()}`
                              : `Added ${new Date(integration.createdAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => handleSync(platform)}
                            disabled={syncing === platform.key}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Sync Now"
                          >
                            <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing === platform.key ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => navigate(platform.setupPath)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="Configure"
                          >
                            <Cog6ToothIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(platform, integration.id)}
                            disabled={deletingId === integration.id}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            {deletingId === integration.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                            ) : (
                              <TrashIcon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => navigate(platform.setupPath)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    hasIntegration
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : `bg-gradient-to-r ${platform.gradient} text-white hover:shadow-md hover:scale-[1.02]`
                  }`}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  {hasIntegration ? 'Add Another' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3 text-sm">How It Works</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Connect Account', desc: 'Authenticate with platform' },
            { step: '2', title: 'Select Forms', desc: 'Choose lead forms to sync' },
            { step: '3', title: 'Map Fields', desc: 'Map fields to CRM' },
            { step: '4', title: 'Go Live', desc: 'Capture leads automatically' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-slate-900 text-xs">{item.title}</p>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
