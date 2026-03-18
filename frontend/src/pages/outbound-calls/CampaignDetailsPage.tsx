import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  PhoneIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  callingMode: string;
  totalContacts: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  leadsGenerated: number;
  maxConcurrentCalls: number;
  callsBetweenHours: { start: number; end: number };
  retryAttempts: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    industry: string;
  };
}

interface CampaignCall {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  outcome?: string;
  duration?: number;
  sentiment?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const outcomeLabels: Record<string, string> = {
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUESTED: 'Callback',
  NEEDS_FOLLOWUP: 'Follow-up',
  CONVERTED: 'Converted',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  VOICEMAIL: 'Voicemail',
};

export const CampaignDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [calls, setCalls] = useState<CampaignCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchCampaignDetails();
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      const [campaignRes, callsRes] = await Promise.all([
        api.get(`/outbound-calls/campaigns/${id}`),
        api.get(`/outbound-calls/calls?campaignId=${id}&limit=50`),
      ]);

      if (campaignRes.data.success) {
        setCampaign(campaignRes.data.data);
      }
      if (callsRes.data.success) {
        setCalls(callsRes.data.data.calls || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async () => {
    try {
      setActionLoading(true);
      await api.post(`/outbound-calls/campaigns/${id}/start`);
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const pauseCampaign = async () => {
    try {
      setActionLoading(true);
      await api.post(`/outbound-calls/campaigns/${id}/pause`);
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to pause campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCampaign = async () => {
    try {
      setActionLoading(true);
      await api.delete(`/outbound-calls/campaigns/${id}`);
      navigate('/outbound-calls');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
      setShowDeleteConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 text-sm">Campaign not found</p>
        <button
          onClick={() => navigate('/outbound-calls')}
          className="mt-2 text-primary-600 hover:underline text-xs"
        >
          Back to AI Calling
        </button>
      </div>
    );
  }

  const progressPercent = campaign.totalContacts > 0
    ? Math.round((campaign.completedCalls / campaign.totalContacts) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/outbound-calls')}
          className="flex items-center text-xs text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5 mr-1" />
          Back to AI Calling
        </button>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{campaign.name}</h1>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[campaign.status]}`}>
                {campaign.status}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                campaign.callingMode === 'MANUAL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {campaign.callingMode === 'MANUAL' ? 'Manual' : 'Auto'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Agent: {campaign.agent?.name || '-'} • Created {formatDate(campaign.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={fetchCampaignDetails} className="btn btn-outline btn-sm text-xs p-1.5">
              <ArrowPathIcon className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => navigate(`/outbound-calls/campaigns/${id}/analytics`)}
              className="btn btn-outline btn-sm text-xs flex items-center gap-1"
            >
              <ChartBarIcon className="h-3.5 w-3.5" />
              Analytics
            </button>

            {campaign.status !== 'RUNNING' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-outline btn-sm text-xs text-red-600 border-red-300 hover:bg-red-50"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            )}

            {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED') && (
              <button
                onClick={startCampaign}
                disabled={actionLoading}
                className="btn btn-sm text-xs bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
              >
                <PlayIcon className="h-3.5 w-3.5" />
                {campaign.status === 'PAUSED' ? 'Resume' : 'Start'}
              </button>
            )}

            {campaign.status === 'RUNNING' && campaign.callingMode === 'AUTOMATIC' && (
              <button
                onClick={pauseCampaign}
                disabled={actionLoading}
                className="btn btn-sm text-xs bg-yellow-600 hover:bg-yellow-700 text-white flex items-center gap-1"
              >
                <PauseIcon className="h-3.5 w-3.5" />
                Pause
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <div className="card p-2">
          <p className="text-xs text-gray-500">Total Contacts</p>
          <p className="text-lg font-semibold text-gray-900">{campaign.totalContacts}</p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Calls Made</p>
          <p className="text-lg font-semibold text-blue-600">{campaign.completedCalls}</p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Successful</p>
          <p className="text-lg font-semibold text-green-600">{campaign.successfulCalls}</p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Failed</p>
          <p className="text-lg font-semibold text-red-600">{campaign.failedCalls}</p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Leads</p>
          <p className="text-lg font-semibold text-purple-600">{campaign.leadsGenerated}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card p-2 mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-700">Progress</span>
          <span className="text-xs text-gray-500">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>{campaign.completedCalls} completed</span>
          <span>{campaign.totalContacts - campaign.completedCalls} remaining</span>
        </div>
      </div>

      {/* Settings & Calls */}
      <div className="grid lg:grid-cols-3 gap-3">
        {/* Settings */}
        <div className="card p-3">
          <h2 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
            <Cog6ToothIcon className="h-3.5 w-3.5" />
            Settings
          </h2>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Agent</span>
              <span className="font-medium flex items-center gap-1">
                <CpuChipIcon className="h-3 w-3" />
                {campaign.agent?.name || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mode</span>
              <span className="font-medium">{campaign.callingMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hours</span>
              <span className="font-medium">
                {campaign.callsBetweenHours?.start || 9}:00 - {campaign.callsBetweenHours?.end || 18}:00
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Retries</span>
              <span className="font-medium">{campaign.retryAttempts}</span>
            </div>
            {campaign.startedAt && (
              <div className="flex justify-between pt-1 border-t">
                <span className="text-gray-500">Started</span>
                <span className="font-medium">{formatDate(campaign.startedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Calls */}
        <div className="lg:col-span-2 card">
          <div className="p-2 border-b flex justify-between items-center">
            <h2 className="text-xs font-semibold text-gray-900">Recent Calls</h2>
            <span className="text-[10px] text-gray-500">{calls.length} calls</span>
          </div>

          {calls.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <PhoneIcon className="mx-auto mb-1 text-gray-300 h-8 w-8" />
              <p className="text-xs">No calls made yet</p>
            </div>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => navigate(`/outbound-calls/calls/${call.id}`)}
                >
                  <div>
                    <p className="text-xs font-medium text-gray-900">{call.contactName || call.phoneNumber}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1 py-0.5 rounded ${
                        call.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        call.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {call.status}
                      </span>
                      {call.outcome && (
                        <span className="text-[10px] text-gray-500">
                          {outcomeLabels[call.outcome] || call.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{formatDuration(call.duration)}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-red-100 mb-3">
                <TrashIcon className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Delete Campaign</h3>
              <p className="text-xs text-gray-500 mb-4">
                Delete "<strong>{campaign.name}</strong>" with {campaign.totalContacts} contacts?
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-outline btn-sm text-xs"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={deleteCampaign}
                disabled={actionLoading}
                className="btn btn-sm text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetailsPage;
