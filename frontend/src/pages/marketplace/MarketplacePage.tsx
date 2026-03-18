import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  CpuChipIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface AgentTemplate {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  industry: string;
  category: string | null;
  tags: string[];
  priceType: string;
  oneTimePrice: number | null;
  monthlyPrice: number | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  viewCount: number;
  installCount: number;
  averageRating: number | null;
  ratingCount: number;
  creatorType: string;
  publishedAt: string | null;
}

interface MarketplaceStats {
  totalTemplates: number;
  totalInstalls: number;
  totalRevenue: number;
  topTemplates: AgentTemplate[];
  industryStats: { industry: string; count: number }[];
}

const industries = [
  { value: '', label: 'All Industries' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'ECOMMERCE', label: 'E-commerce' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'CUSTOMER_CARE', label: 'Customer Care' },
  { value: 'IT_RECRUITMENT', label: 'IT Recruitment' },
  { value: 'CUSTOM', label: 'Custom' },
];

const priceTypes = [
  { value: '', label: 'All Prices' },
  { value: 'FREE', label: 'Free' },
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

export const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [featuredTemplates, setFeaturedTemplates] = useState<AgentTemplate[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    industry: '',
    priceType: '',
    sortBy: 'popular',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [filters, search]);

  const fetchData = async () => {
    try {
      const [featuredRes, statsRes] = await Promise.all([
        api.get('/marketplace/featured'),
        api.get('/marketplace/stats'),
      ]);
      setFeaturedTemplates(featuredRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to load marketplace data');
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.priceType) params.append('priceType', filters.priceType);
      params.append('sortBy', filters.sortBy);
      params.append('limit', '12');

      const response = await api.get(`/marketplace/templates?${params.toString()}`);
      setTemplates(response.data.data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (template: AgentTemplate) => {
    if (template.priceType === 'FREE') return 'Free';
    if (template.priceType === 'ONE_TIME' && template.oneTimePrice) {
      return `₹${template.oneTimePrice.toLocaleString()}`;
    }
    if (template.monthlyPrice) {
      return `₹${template.monthlyPrice.toLocaleString()}/mo`;
    }
    return 'Free';
  };

  const renderRating = (rating: number | null, count: number) => {
    if (!rating || count === 0) return null;
    return (
      <div className="flex items-center gap-1">
        <StarIconSolid className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
        <span className="text-sm text-gray-500">({count})</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-4">AI Agent Marketplace</h1>
          <p className="text-lg opacity-90 mb-6">
            Discover ready-to-use AI agents for your business. Install with one click
            and start automating customer conversations.
          </p>
          <div className="relative max-w-xl">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.totalTemplates}</p>
            <p className="text-sm text-gray-500">AI Agents</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {stats.totalInstalls.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Installs</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {stats.industryStats.length}
            </p>
            <p className="text-sm text-gray-500">Industries</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">24/7</p>
            <p className="text-sm text-gray-500">AI Availability</p>
          </div>
        </div>
      )}

      {/* Featured Agents */}
      {featuredTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-900">Featured Agents</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredTemplates.slice(0, 3).map((template) => (
              <div
                key={template.id}
                onClick={() => navigate(`/marketplace/${template.slug}`)}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="h-32 bg-gradient-to-r from-primary-500 to-purple-500 relative">
                  {template.bannerUrl && (
                    <img
                      src={template.bannerUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                    Featured
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      {template.iconUrl ? (
                        <img
                          src={template.iconUrl}
                          alt=""
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        <CpuChipIcon className="h-6 w-6 text-primary-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.industry}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {template.shortDescription}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    {renderRating(template.averageRating, template.ratingCount)}
                    <span className="font-semibold text-primary-600">
                      {formatPrice(template)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          <select
            value={filters.industry}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {industries.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind.label}
              </option>
            ))}
          </select>
          <select
            value={filters.priceType}
            onChange={(e) => setFilters({ ...filters, priceType: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {priceTypes.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* All Agents Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Agents</h2>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No agents found</p>
            <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => navigate(`/marketplace/${template.slug}`)}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {template.iconUrl ? (
                        <img
                          src={template.iconUrl}
                          alt=""
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        <CpuChipIcon className="h-6 w-6 text-primary-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {template.name}
                        </h3>
                        {template.isVerified && (
                          <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{template.industry}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {template.shortDescription || 'AI-powered voice agent for your business'}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      {template.installCount}
                    </span>
                    {renderRating(template.averageRating, template.ratingCount)}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span
                      className={`text-sm font-medium ${
                        template.priceType === 'FREE'
                          ? 'text-green-600'
                          : 'text-primary-600'
                      }`}
                    >
                      {formatPrice(template)}
                    </span>
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="bg-gray-900 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Create Your Own AI Agent</h2>
        <p className="text-gray-300 mb-6 max-w-xl mx-auto">
          Build custom AI agents and sell them on the marketplace. Earn up to 70% revenue share.
        </p>
        <button
          onClick={() => navigate('/marketplace/create')}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          Start Creating
        </button>
      </div>
    </div>
  );
};

export default MarketplacePage;
