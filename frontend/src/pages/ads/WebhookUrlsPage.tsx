import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon,
  LinkIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface WebhookInfo {
  platform: string;
  name: string;
  icon: React.ReactNode;
  gradient: string;
  webhookUrl: string;
  verifyToken?: string;
  instructions: string[];
  status: 'active' | 'inactive' | 'loading' | 'error';
  isConnected: boolean;
}

// Platform Icons
const FacebookIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const platformConfigs = [
  {
    platform: 'facebook',
    name: 'Facebook Ads',
    icon: <FacebookIcon />,
    gradient: 'from-blue-500 to-blue-600',
    apiEndpoint: '/facebook/webhook-url',
    integrationsEndpoint: '/facebook/integrations',
  },
  {
    platform: 'instagram',
    name: 'Instagram Ads',
    icon: <InstagramIcon />,
    gradient: 'from-pink-500 via-purple-500 to-orange-400',
    apiEndpoint: '/instagram/webhook-url',
    integrationsEndpoint: '/instagram/integrations',
  },
  {
    platform: 'linkedin',
    name: 'LinkedIn Ads',
    icon: <LinkedInIcon />,
    gradient: 'from-blue-700 to-blue-800',
    apiEndpoint: '/linkedin/webhook-url',
    integrationsEndpoint: '/linkedin/integrations',
  },
  {
    platform: 'google',
    name: 'Google Ads',
    icon: <GoogleIcon />,
    gradient: 'from-blue-500 via-green-500 to-yellow-500',
    apiEndpoint: '/google-ads/webhook-url',
    integrationsEndpoint: '/google-ads/integrations',
  },
  {
    platform: 'youtube',
    name: 'YouTube Ads',
    icon: <YouTubeIcon />,
    gradient: 'from-red-500 to-red-600',
    apiEndpoint: '/youtube/webhook-url',
    integrationsEndpoint: '/youtube/integrations',
  },
  {
    platform: 'twitter',
    name: 'Twitter / X Ads',
    icon: <TwitterIcon />,
    gradient: 'from-slate-800 to-slate-900',
    apiEndpoint: '/twitter/webhook-url',
    integrationsEndpoint: '/twitter/integrations',
  },
  {
    platform: 'tiktok',
    name: 'TikTok Ads',
    icon: <TikTokIcon />,
    gradient: 'from-pink-500 via-red-500 to-cyan-400',
    apiEndpoint: '/tiktok/webhook-url',
    integrationsEndpoint: '/tiktok/integrations',
  },
];

export default function WebhookUrlsPage() {
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setIsLoading(true);
    const results: WebhookInfo[] = [];

    // Get the base URL from the first successful API call or use window location
    const apiBaseUrl = window.location.origin.includes('localhost')
      ? 'http://localhost:3001'
      : window.location.origin;

    for (const config of platformConfigs) {
      try {
        // Try to get webhook URL from API
        const response = await api.get(config.apiEndpoint);
        const data = response.data.data;

        // Check if platform has active integrations
        let isConnected = false;
        try {
          const intResponse = await api.get(config.integrationsEndpoint);
          const integrations = intResponse.data.data || [];
          isConnected = integrations.length > 0;
        } catch {
          isConnected = false;
        }

        results.push({
          platform: config.platform,
          name: config.name,
          icon: config.icon,
          gradient: config.gradient,
          webhookUrl: data.webhookUrl || `${apiBaseUrl}/api/ads/${config.platform}/webhook`,
          verifyToken: data.verifyToken,
          instructions: data.instructions || [],
          status: 'active',
          isConnected,
        });
      } catch {
        // If API fails, generate default webhook URL
        results.push({
          platform: config.platform,
          name: config.name,
          icon: config.icon,
          gradient: config.gradient,
          webhookUrl: `${apiBaseUrl}/api/ads/${config.platform}/webhook`,
          verifyToken: undefined,
          instructions: [
            `1. Go to ${config.name} Developer Console`,
            '2. Navigate to Webhooks section',
            '3. Add the webhook URL above',
            '4. Subscribe to lead events',
          ],
          status: 'inactive',
          isConnected: false,
        });
      }
    }

    setWebhooks(results);
    setIsLoading(false);
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading webhook URLs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-xl p-5 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LinkIcon className="h-6 w-6" />
              <h1 className="text-xl font-bold">Webhook URLs</h1>
            </div>
            <p className="text-indigo-100 text-sm">
              Copy these URLs to configure webhooks in your ad platforms. Leads will automatically sync to your CRM.
            </p>
          </div>
          <button
            onClick={loadWebhooks}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-800">How to use these webhooks:</p>
          <ol className="mt-1 text-blue-700 list-decimal list-inside space-y-0.5">
            <li>Copy the Webhook URL for your ad platform</li>
            <li>Go to the platform's Developer Console / Business Manager</li>
            <li>Paste the URL in the webhook configuration</li>
            <li>Use the Verify Token (if provided) for authentication</li>
            <li>Subscribe to "leadgen" or lead form events</li>
          </ol>
        </div>
      </div>

      {/* Webhook Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {webhooks.map((webhook) => (
          <div
            key={webhook.platform}
            className={`bg-white rounded-xl border overflow-hidden ${
              webhook.isConnected ? 'border-green-200' : 'border-slate-200'
            }`}
          >
            {/* Platform Header */}
            <div className={`bg-gradient-to-r ${webhook.gradient} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {webhook.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{webhook.name}</h3>
                    <p className="text-xs text-white/80">
                      {webhook.isConnected ? 'Connected & Active' : 'Not Connected'}
                    </p>
                  </div>
                </div>
                {webhook.isConnected && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500 rounded-full text-xs">
                    <ShieldCheckIcon className="h-3 w-3" />
                    Active
                  </div>
                )}
              </div>
            </div>

            {/* Webhook Details */}
            <div className="p-4 space-y-4">
              {/* Webhook URL */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Webhook URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhook.webhookUrl}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(webhook.webhookUrl, `${webhook.platform}-url`)}
                    className={`p-2 rounded-lg transition-colors ${
                      copiedField === `${webhook.platform}-url`
                        ? 'bg-green-100 text-green-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Copy URL"
                  >
                    {copiedField === `${webhook.platform}-url` ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Verify Token (if available) */}
              {webhook.verifyToken && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Verify Token
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhook.verifyToken}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(webhook.verifyToken!, `${webhook.platform}-token`)}
                      className={`p-2 rounded-lg transition-colors ${
                        copiedField === `${webhook.platform}-token`
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Copy Token"
                    >
                      {copiedField === `${webhook.platform}-token` ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {webhook.instructions.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2">Setup Instructions:</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {webhook.instructions.slice(0, 4).map((instruction, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-slate-400">{index + 1}.</span>
                        <span>{instruction.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Reference Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Quick Reference - All Webhook Endpoints</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Platform</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Webhook Endpoint</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Method</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {webhooks.map((webhook) => (
                <tr key={webhook.platform} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{webhook.icon}</span>
                      <span className="font-medium text-slate-900">{webhook.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700">
                      {webhook.webhookUrl}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      POST
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {webhook.isConnected ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                        Not Setup
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => copyToClipboard(webhook.webhookUrl, `table-${webhook.platform}`)}
                      className={`p-1.5 rounded transition-colors ${
                        copiedField === `table-${webhook.platform}`
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {copiedField === `table-${webhook.platform}` ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3 text-sm">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-slate-700">Facebook/Instagram</p>
            <p className="text-xs text-slate-500 mt-1">
              Go to Facebook Developer Console → Your App → Webhooks → Add "Page" webhook → Subscribe to "leadgen"
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Google Ads</p>
            <p className="text-xs text-slate-500 mt-1">
              Go to Google Ads → Tools → Linked accounts → Configure webhook for Lead Form Extensions
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-700">LinkedIn</p>
            <p className="text-xs text-slate-500 mt-1">
              Go to LinkedIn Marketing Solutions → Lead Gen Forms → Integrations → Add webhook URL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
