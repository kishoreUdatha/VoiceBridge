import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  KeyIcon,
  Cog6ToothIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

const EXAMPLE_PROMPTS: Record<string, { text: string; icon: string }[]> = {
  google_maps: [
    { text: 'Find restaurants in Mumbai', icon: '🍽️' },
    { text: 'Get gyms and fitness centers in Bangalore', icon: '💪' },
    { text: 'Find real estate agents in Hyderabad', icon: '🏠' },
    { text: 'Scrape hotels in Goa', icon: '🏨' },
    { text: 'Find dental clinics in Chennai', icon: '🦷' },
    { text: 'Get car dealers in Ahmedabad', icon: '🚗' },
  ],
  linkedin_company: [
    { text: 'Find software companies in Bangalore', icon: '💻' },
    { text: 'Get fintech startups in Mumbai', icon: '🏦' },
    { text: 'Find marketing agencies in Delhi', icon: '📊' },
    { text: 'Get IT consulting firms in Hyderabad', icon: '🖥️' },
    { text: 'Find healthcare companies in Pune', icon: '🏥' },
    { text: 'Get e-commerce companies in Chennai', icon: '🛒' },
  ],
  linkedin_people: [
    { text: 'Find CTOs in Bangalore startups', icon: '👔' },
    { text: 'Get marketing managers in Mumbai', icon: '📈' },
    { text: 'Find HR directors in Delhi', icon: '👥' },
    { text: 'Get sales heads in Hyderabad', icon: '💼' },
    { text: 'Find product managers in Pune', icon: '🎯' },
    { text: 'Get founders in Indian tech', icon: '🚀' },
  ],
  yellow_pages: [
    { text: 'Find plumbers in Delhi', icon: '🔧' },
    { text: 'Get electricians in Mumbai', icon: '⚡' },
    { text: 'Find lawyers in Bangalore', icon: '⚖️' },
    { text: 'Get accountants in Chennai', icon: '📑' },
    { text: 'Find contractors in Hyderabad', icon: '🏗️' },
    { text: 'Get movers and packers in Pune', icon: '📦' },
  ],
};

interface ScrapeResult {
  searchQueries: string[];
  scraperType: string;
  scraperId?: string;
  scrapeJobId?: string;
  jobId?: string;
  status?: string;
}

interface RecentJob {
  id: string;
  status: string;
  recordsScraped: number;
  createdAt: string;
  config?: { name: string };
}

const SCRAPE_SOURCES = [
  { id: 'google_maps', name: 'Google Maps', icon: MapPinIcon, color: 'text-red-500', description: 'Local businesses' },
  { id: 'linkedin_company', name: 'LinkedIn Companies', icon: BuildingOfficeIcon, color: 'text-blue-600', description: 'B2B companies' },
  { id: 'linkedin_people', name: 'LinkedIn People', icon: UserGroupIcon, color: 'text-blue-600', description: 'Professionals' },
  { id: 'yellow_pages', name: 'Yellow Pages', icon: BookOpenIcon, color: 'text-yellow-600', description: 'Business directory' },
];

export default function ApifySmartScrapePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [alsoFindEmails, setAlsoFindEmails] = useState(true); // Default to true
  const [selectedSource, setSelectedSource] = useState('google_maps');

  // Integration state
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [apiToken, setApiToken] = useState('');
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Stats
  const [stats, setStats] = useState<{
    totalLeadsScraped: number;
    totalJobs: number;
    recentJobs: RecentJob[];
  } | null>(null);

  useEffect(() => {
    checkIntegration();
  }, []);

  const checkIntegration = async () => {
    try {
      const [integrationRes, statsRes] = await Promise.all([
        api.get('/apify/integration'),
        api.get('/apify/stats').catch(() => ({ data: { data: null } })),
      ]);

      setIsConfigured(!!integrationRes.data.data);
      if (statsRes.data.data) {
        setStats(statsRes.data.data);
      }
    } catch {
      setIsConfigured(false);
    }
  };

  const handleSaveToken = async () => {
    if (!apiToken.trim()) {
      toast.error('Please enter your API token');
      return;
    }

    setIsTestingToken(true);
    try {
      const testRes = await api.post('/apify/test-connection', { apiToken });
      if (testRes.data.data?.user) {
        await api.post('/apify/integration', { apiToken });
        toast.success(`Connected as ${testRes.data.data.user.username}`);
        setIsConfigured(true);
        setShowSettings(false);
        setApiToken('');
        checkIntegration();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid API token');
    } finally {
      setIsTestingToken(false);
    }
  };

  const handleSmartScrape = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want to scrape');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await api.post('/apify/smart-scrape', {
        prompt,
        extractEmails: alsoFindEmails,
        source: selectedSource
      });
      setResult(response.data.data);

      const sourceName = SCRAPE_SOURCES.find(s => s.id === selectedSource)?.name || 'Selected source';
      if (alsoFindEmails) {
        toast.success(`Scraping from ${sourceName}! Emails will be extracted automatically.`);
      } else {
        toast.success(`Scraping from ${sourceName}! Results will appear in Raw Imports.`);
      }
      checkIntegration(); // Refresh stats
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start scrape');
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isConfigured === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Not configured - show simple setup
  if (!isConfigured && !showSettings) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
            <SparklesIcon className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Smart Scrape</h1>
          <p className="text-xs text-gray-500 mt-1">
            Scrape leads from Google Maps, LinkedIn, and more with AI
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <KeyIcon className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">Connect Apify Account</span>
          </div>

          <p className="text-[10px] text-gray-500 mb-3">
            Get your API token from{' '}
            <a
              href="https://console.apify.com/account/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              Apify Console → Settings → API
            </a>
          </p>

          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="apify_api_..."
            className="w-full px-3 py-2 text-xs border rounded-lg mb-3"
          />

          <button
            onClick={handleSaveToken}
            disabled={isTestingToken || !apiToken.trim()}
            className="w-full py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isTestingToken ? (
              <>
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect & Start Scraping'
            )}
          </button>
        </div>

        <p className="text-[10px] text-center text-gray-400 mt-4">
          Free tier available • No credit card required
        </p>
      </div>
    );
  }

  // Main scraping interface
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-purple-600" />
          <h1 className="text-sm font-semibold text-gray-900">Smart Scrape</h1>
          <span className="text-[10px] text-gray-400">AI-powered lead scraping</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <Cog6ToothIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs inline-flex items-center gap-3">
          <span className="text-green-600 text-[10px]">● Connected</span>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="New token..."
            className="px-2 py-1 text-xs border rounded w-48"
          />
          <button
            onClick={handleSaveToken}
            disabled={isTestingToken || !apiToken.trim()}
            className="px-2 py-1 text-[10px] bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {isTestingToken ? 'Updating...' : 'Update'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column - Main Input */}
        <div className="lg:col-span-2 space-y-3">
          {/* Source Selector */}
          <div className="bg-white rounded-lg border p-3 mb-3">
            <div className="text-[10px] font-medium text-gray-500 uppercase mb-2">Scrape From</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SCRAPE_SOURCES.map((source) => {
                const Icon = source.icon;
                const isSelected = selectedSource === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-indigo-600' : source.color}`} />
                    <div className="text-left">
                      <div className="text-xs font-medium">{source.name}</div>
                      <div className="text-[10px] text-gray-400">{source.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Input */}
          <div className="bg-white rounded-lg border p-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selectedSource === 'linkedin_company'
                  ? "e.g., Find software companies in Bangalore"
                  : selectedSource === 'linkedin_people'
                  ? "e.g., Find marketing managers in Mumbai"
                  : selectedSource === 'yellow_pages'
                  ? "e.g., Find plumbers in Delhi"
                  : "e.g., Find restaurants in Mumbai"
              }
              className="w-full px-2 py-1.5 text-sm border-0 focus:ring-0 resize-none placeholder-gray-400"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSmartScrape();
                }
              }}
            />
            <div className="flex items-center justify-between pt-2 border-t">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoFindEmails}
                  onChange={(e) => setAlsoFindEmails(e.target.checked)}
                  className="h-3 w-3 text-purple-600 rounded border-gray-300"
                />
                <EnvelopeIcon className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] text-gray-600">Find emails</span>
              </label>
              <button
                onClick={handleSmartScrape}
                disabled={isProcessing || !prompt.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <><ArrowPathIcon className="h-3 w-3 animate-spin" /> Scraping...</>
                ) : (
                  <><MagnifyingGlassIcon className="h-3 w-3" /> Scrape</>
                )}
              </button>
            </div>
          </div>

          {/* Example Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {(EXAMPLE_PROMPTS[selectedSource] || EXAMPLE_PROMPTS.google_maps).map((example, index) => (
              <button
                key={index}
                onClick={() => setPrompt(example.text)}
                className="px-2 py-1 text-[10px] bg-white border text-gray-600 rounded-full hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors flex items-center gap-1"
              >
                <span>{example.icon}</span>
                <span>{example.text}</span>
              </button>
            ))}
          </div>

          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">Scraping Started!</span>
                  <span className="text-[10px] text-green-600">{result.scraperType.replace('_', ' ')}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(result.scraperId ? `/apify-jobs?configId=${result.scraperId}` : '/apify-jobs')}
                    className="px-2 py-1 text-[10px] font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                  >
                    View Progress
                  </button>
                  <button onClick={() => navigate('/raw-imports')} className="px-2 py-1 text-[10px] font-medium text-white bg-green-600 rounded hover:bg-green-700">
                    View Leads
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & Recent */}
        <div className="space-y-3">
          {/* Quick Stats */}
          {stats && (
            <div className="bg-white rounded-lg border p-3">
              <div className="text-[10px] font-medium text-gray-500 uppercase mb-2">Stats</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats.totalLeadsScraped}</div>
                  <div className="text-[10px] text-gray-500">Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats.totalJobs}</div>
                  <div className="text-[10px] text-gray-500">Jobs</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats.recentJobs?.length || 0}</div>
                  <div className="text-[10px] text-gray-500">Recent</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Jobs */}
          {stats?.recentJobs && stats.recentJobs.length > 0 && (
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-gray-500 uppercase">Recent Scrapes</span>
                <button onClick={() => navigate('/apify-jobs')} className="text-[10px] text-purple-600 hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-1.5">
                {stats.recentJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-1 text-xs">
                    <span className="text-gray-700 truncate max-w-[120px]">{job.config?.name || 'Smart Scrape'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{job.recordsScraped}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        job.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' :
                        job.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                        job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
