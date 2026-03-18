import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface PartnerDashboard {
  partner: {
    id: string;
    companyName: string;
    tier: string;
    status: string;
    commissionRate: number;
  };
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    totalRevenue: number;
    totalCommission: number;
    pendingPayout: number;
  };
  monthly: {
    commissions: number;
    revenue: number;
    transactions: number;
    newCustomers: number;
  };
  limits: {
    maxCustomers: number;
    usedCustomers: number;
    maxAgentsPerCustomer: number;
  };
  recentActivity: Array<{
    id: string;
    activityType: string;
    description: string;
    createdAt: string;
  }>;
}

const tierColors: Record<string, string> = {
  BRONZE: 'bg-orange-100 text-orange-800',
  SILVER: 'bg-gray-100 text-gray-800',
  GOLD: 'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-purple-100 text-purple-800',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export const PartnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notPartner, setNotPartner] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/partner/dashboard');
      setDashboard(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotPartner(true);
      } else {
        toast.error('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (notPartner) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Become a Partner</h2>
        <p className="text-gray-600 mb-6">
          Join our partner program to earn commissions by reselling our AI agents to your customers.
        </p>
        <button
          onClick={() => navigate('/partner/apply')}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          Apply for Partnership
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const { partner, stats, monthly, limits, recentActivity } = dashboard;

  // Check if partner is pending
  if (partner.status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <ClockIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Under Review</h2>
        <p className="text-gray-600 mb-6">
          Your partner application is being reviewed. We'll notify you once it's approved.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Typical review time: 1-2 business days
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
          <p className="text-gray-600">{partner.companyName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierColors[partner.tier]}`}>
            {partner.tier} Partner
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[partner.status]}`}>
            {partner.status}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeCustomers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              {limits.maxCustomers === -1
                ? 'Unlimited'
                : `${limits.usedCustomers} / ${limits.maxCustomers}`}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue Generated</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CurrencyRupeeIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-green-600">
            +{formatCurrency(monthly.revenue)} this month
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCommission)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-purple-600">
            {partner.commissionRate}% commission rate
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payout</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pendingPayout)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/partner/payouts')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Request Payout
            </button>
          </div>
        </div>
      </div>

      {/* This Month Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Month</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">New Customers</p>
            <p className="text-xl font-bold text-gray-900">{monthly.newCustomers}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="text-xl font-bold text-gray-900">{monthly.transactions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(monthly.revenue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Commissions</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(monthly.commissions)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/partner/customers')}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <UsersIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium">Manage Customers</span>
            </button>
            <button
              onClick={() => navigate('/partner/commissions')}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <CurrencyRupeeIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium">View Commissions</span>
            </button>
            <button
              onClick={() => navigate('/marketplace')}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium">Agent Marketplace</span>
            </button>
            <button
              onClick={() => navigate('/partner/settings')}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <BuildingOfficeIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium">Partner Settings</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    {activity.activityType.includes('COMMISSION') ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : activity.activityType.includes('CUSTOMER') ? (
                      <UsersIcon className="h-5 w-5 text-blue-500" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-sm p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Upgrade Your Partnership</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((tier) => (
            <div
              key={tier}
              className={`p-4 rounded-lg ${
                tier === partner.tier
                  ? 'bg-white/20 border-2 border-white'
                  : 'bg-white/10'
              }`}
            >
              <p className="font-medium">{tier}</p>
              <p className="text-2xl font-bold">
                {tier === 'BRONZE' ? '15%' : tier === 'SILVER' ? '20%' : tier === 'GOLD' ? '25%' : '30%'}
              </p>
              <p className="text-sm opacity-80">Commission</p>
              {tier === partner.tier && (
                <span className="inline-block mt-2 text-xs bg-white text-primary-600 px-2 py-1 rounded">
                  Current
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboardPage;
