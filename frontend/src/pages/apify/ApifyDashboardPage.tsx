import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  UsersIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ScraperConfig {
  id: string;
  name: string;
  scraperType: string;
  actorId: string;
  scheduleEnabled: boolean;
  scheduleInterval: string;
  nextScheduledAt: string | null;
  totalLeadsScraped: number;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    scrapeJobs: number;
  };
}

interface ScrapeJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  totalItems: number;
  importedItems: number;
  duplicateItems: number;
  failedItems: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  bulkImportId: string | null;
  config: {
    name: string;
    scraperType: string;
  } | null;
}

interface Stats {
  totalScrapers: number;
  activeScrapers: number;
  totalJobs: number;
  totalLeadsScraped: number;
  jobsByStatus: Record<string, number>;
  recentJobs: ScrapeJob[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
  RUNNING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: ArrowPathIcon },
  SUCCEEDED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: ExclamationTriangleIcon },
};

const SCRAPER_TYPE_LABELS: Record<string, string> = {
  GOOGLE_MAPS: 'Google Maps',
  LINKEDIN_COMPANY: 'LinkedIn Companies',
  LINKEDIN_PEOPLE: 'LinkedIn People',
  YELLOW_PAGES: 'Yellow Pages',
  CUSTOM: 'Custom',
};

const SCRAPER_TYPE_COLORS: Record<string, string> = {
  GOOGLE_MAPS: 'bg-blue-100 text-blue-800',
  LINKEDIN_COMPANY: 'bg-sky-100 text-sky-800',
  LINKEDIN_PEOPLE: 'bg-cyan-100 text-cyan-800',
  YELLOW_PAGES: 'bg-yellow-100 text-yellow-800',
  CUSTOM: 'bg-gray-100 text-gray-800',
};

export default function ApifyDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [scrapers, setScrapers] = useState<ScraperConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, scrapersRes] = await Promise.all([
        api.get('/apify/stats'),
        api.get('/apify/scrapers'),
      ]);

      setStats(statsRes.data.data);
      setScrapers(scrapersRes.data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunScraper = async (scraperId: string) => {
    try {
      setRunningJobs(prev => new Set(prev).add(scraperId));
      await api.post(`/apify/scrapers/${scraperId}/run`);
      toast.success('Scrape job started');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start scrape');
    } finally {
      setRunningJobs(prev => {
        const next = new Set(prev);
        next.delete(scraperId);
        return next;
      });
    }
  };

  const handleToggleActive = async (scraper: ScraperConfig) => {
    try {
      await api.put(`/apify/scrapers/${scraper.id}`, {
        isActive: !scraper.isActive,
      });
      toast.success(scraper.isActive ? 'Scraper paused' : 'Scraper activated');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update scraper');
    }
  };

  const handleDelete = async (scraperId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scraper? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(scraperId);
      await api.delete(`/apify/scrapers/${scraperId}`);
      toast.success('Scraper deleted');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete scraper');
    } finally {
      setDeletingId(null);
    }
  };

  const formatRelativeTime = (date: string | null) => {
    if (!date) return '-';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const style = STATUS_STYLES[status];
    if (!style) return null;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
        <Icon className="h-2.5 w-2.5 mr-0.5" />
        {status === 'SUCCEEDED' ? 'Done' : status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Apify Web Scraping</h1>
          <p className="text-xs text-gray-500">Automated lead generation from web sources</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/apify-smart')}
            className="btn btn-sm flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            <SparklesIcon className="h-4 w-4" />
            Smart Scrape
          </button>
          <button
            onClick={() => navigate('/apify-new-scraper')}
            className="btn btn-primary btn-sm flex items-center gap-1 text-xs"
          >
            <PlusIcon className="h-4 w-4" />
            New Scraper
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="card p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded">
              <CubeIcon className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Scrapers</p>
              <p className="text-lg font-semibold">
                {stats?.activeScrapers || 0}
                <span className="text-xs font-normal text-gray-400">/{stats?.totalScrapers || 0}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="card p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <UsersIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Leads Scraped</p>
              <p className="text-lg font-semibold">{stats?.totalLeadsScraped?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded">
              <ChartBarIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Jobs</p>
              <p className="text-lg font-semibold">{stats?.totalJobs || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Successful</p>
              <p className="text-lg font-semibold">{stats?.jobsByStatus?.SUCCEEDED || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrapers Table */}
      <div className="card mb-4">
        <div className="card-header py-2">
          <h2 className="text-sm font-medium">Scraper Configurations</h2>
        </div>

        {scrapers.length === 0 ? (
          <div className="p-8 text-center">
            <CubeIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 mb-1">No Scrapers Configured</p>
            <p className="text-xs text-gray-500 mb-3">Create your first scraper to start generating leads.</p>
            <button
              onClick={() => navigate('/apify-new-scraper')}
              className="btn btn-primary btn-sm text-xs"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Create Scraper
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Schedule</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Leads</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Last Run</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scrapers.map((scraper) => (
                  <tr key={scraper.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">{scraper.name}</div>
                      <div className="text-[10px] text-gray-400">{scraper._count.scrapeJobs} jobs</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${SCRAPER_TYPE_COLORS[scraper.scraperType] || 'bg-gray-100 text-gray-800'}`}>
                        {SCRAPER_TYPE_LABELS[scraper.scraperType] || scraper.scraperType}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {scraper.scheduleEnabled ? (
                        <div>
                          <span className="text-xs font-medium text-emerald-600">{scraper.scheduleInterval}</span>
                          {scraper.nextScheduledAt && (
                            <div className="text-[10px] text-gray-400">Next: {formatRelativeTime(scraper.nextScheduledAt)}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-900">{scraper.totalLeadsScraped.toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {scraper.lastRunAt ? formatRelativeTime(scraper.lastRunAt) : <span className="text-gray-400">Never</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getStatusBadge(scraper.lastRunStatus)}
                      {!scraper.lastRunStatus && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${scraper.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {scraper.isActive ? 'Active' : 'Paused'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRunScraper(scraper.id)}
                          disabled={runningJobs.has(scraper.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                          title="Run Now"
                        >
                          {runningJobs.has(scraper.id) ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            <PlayIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleActive(scraper)}
                          className={`p-1 rounded ${scraper.isActive ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={scraper.isActive ? 'Pause' : 'Activate'}
                        >
                          <PauseIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/apify-jobs?configId=${scraper.id}`)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="View Jobs"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(scraper.id, e)}
                          disabled={deletingId === scraper.id}
                          className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Jobs */}
      {stats?.recentJobs && stats.recentJobs.length > 0 && (
        <div className="card">
          <div className="card-header py-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent Jobs</h2>
            <button
              onClick={() => navigate('/apify-jobs')}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              View All
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {stats.recentJobs.map((job) => {
              const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.PENDING;
              const StatusIcon = statusStyle.icon;

              return (
                <div
                  key={job.id}
                  className="px-3 py-2 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${statusStyle.bg}`}>
                      <StatusIcon className={`h-3 w-3 ${statusStyle.text}`} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-900">
                        {job.config?.name || 'Unknown Scraper'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {job.config?.scraperType ? SCRAPER_TYPE_LABELS[job.config.scraperType] : 'Custom'}
                        {' - '}
                        {formatRelativeTime(job.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {job.status === 'SUCCEEDED' && (
                      <div className="text-[10px]">
                        <span className="text-green-600 font-medium">{job.importedItems}</span>
                        <span className="text-gray-400"> imported</span>
                        {job.duplicateItems > 0 && (
                          <span className="text-gray-300 ml-1">({job.duplicateItems} dup)</span>
                        )}
                      </div>
                    )}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      {job.status === 'SUCCEEDED' ? 'Done' : job.status}
                    </span>
                    {job.status === 'SUCCEEDED' && job.bulkImportId && (
                      <button
                        onClick={() => navigate(`/apify-records/${job.id}?bulkImportId=${job.bulkImportId}`)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Records"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
