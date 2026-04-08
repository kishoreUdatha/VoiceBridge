/**
 * Activity Feed Page
 * Team collaboration with activity feed, mentions, and notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BellIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  AtSymbolIcon,
  UserIcon,
  DocumentTextIcon,
  PhoneIcon,
  CurrencyRupeeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { collaborationService, Activity, Mention } from '../../services/collaboration.service';

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATE: DocumentTextIcon,
  UPDATE: ArrowPathIcon,
  COMMENT: ChatBubbleLeftIcon,
  MENTION: AtSymbolIcon,
  ASSIGN: UserIcon,
  CALL: PhoneIcon,
  PAYMENT: CurrencyRupeeIcon,
  TAG: TagIcon,
  STATUS_CHANGE: CheckCircleIcon,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-600',
  UPDATE: 'bg-blue-100 text-blue-600',
  COMMENT: 'bg-purple-100 text-purple-600',
  MENTION: 'bg-pink-100 text-pink-600',
  ASSIGN: 'bg-yellow-100 text-yellow-600',
  CALL: 'bg-cyan-100 text-cyan-600',
  PAYMENT: 'bg-emerald-100 text-emerald-600',
  TAG: 'bg-orange-100 text-orange-600',
  STATUS_CHANGE: 'bg-indigo-100 text-indigo-600',
};

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'mentions'>('feed');
  const [filter, setFilter] = useState<{
    entityType?: string;
    userId?: string;
  }>({});
  const [unreadMentions, setUnreadMentions] = useState(0);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const { activities: data } = await collaborationService.getActivityFeed({
        ...filter,
        limit: 50,
      });
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchMentions = useCallback(async () => {
    try {
      const data = await collaborationService.getMentions(false);
      setMentions(data);
      setUnreadMentions(data.filter(m => !m.isRead).length);
    } catch (error) {
      console.error('Failed to fetch mentions:', error);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchMentions();
  }, [fetchActivities, fetchMentions]);

  const markMentionAsRead = async (mentionId: string) => {
    try {
      await collaborationService.markMentionsRead([mentionId]);
      setMentions(prev =>
        prev.map(m => (m.id === mentionId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m))
      );
      setUnreadMentions(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark mention as read:', error);
    }
  };

  const markAllMentionsAsRead = async () => {
    const unreadIds = mentions.filter(m => !m.isRead).map(m => m.id);
    if (unreadIds.length === 0) return;

    try {
      await collaborationService.markMentionsRead(unreadIds);
      setMentions(prev =>
        prev.map(m => ({ ...m, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadMentions(0);
    } catch (error) {
      console.error('Failed to mark all mentions as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityDescription = (activity: Activity) => {
    const userName = `${activity.user.firstName} ${activity.user.lastName}`;
    const entityName = activity.entityName || activity.entityType;

    switch (activity.action) {
      case 'CREATE':
        return `${userName} created a new ${activity.entityType.toLowerCase()} "${entityName}"`;
      case 'UPDATE':
        return `${userName} updated ${activity.entityType.toLowerCase()} "${entityName}"`;
      case 'COMMENT':
        return `${userName} commented on ${activity.entityType.toLowerCase()} "${entityName}"`;
      case 'MENTION':
        return `${userName} mentioned you in a comment`;
      case 'ASSIGN':
        return `${userName} assigned ${activity.entityType.toLowerCase()} "${entityName}"`;
      case 'CALL':
        return `${userName} made a call to "${entityName}"`;
      case 'PAYMENT':
        return `${userName} recorded a payment for "${entityName}"`;
      case 'STATUS_CHANGE':
        return `${userName} changed status of "${entityName}"`;
      default:
        return `${userName} performed action on ${activity.entityType.toLowerCase()}`;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserGroupIcon className="h-7 w-7 text-indigo-600" />
            Activity Feed
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with team activities and mentions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchActivities();
              fetchMentions();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('feed')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'feed'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClockIcon className="h-5 w-5" />
            Activity Feed
          </button>
          <button
            onClick={() => setActiveTab('mentions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'mentions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {unreadMentions > 0 ? (
              <BellAlertIcon className="h-5 w-5 text-red-500" />
            ) : (
              <BellIcon className="h-5 w-5" />
            )}
            Mentions
            {unreadMentions > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadMentions}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Filters (for Activity Feed) */}
      {activeTab === 'feed' && (
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filter.entityType || ''}
              onChange={e => setFilter(prev => ({ ...prev, entityType: e.target.value || undefined }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              <option value="Lead">Leads</option>
              <option value="Payment">Payments</option>
              <option value="Call">Calls</option>
              <option value="Task">Tasks</option>
            </select>
          </div>
        </div>
      )}

      {/* Mentions Header */}
      {activeTab === 'mentions' && unreadMentions > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={markAllMentionsAsRead}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      ) : activeTab === 'feed' ? (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            activities.map(activity => {
              const IconComponent = ACTION_ICONS[activity.action] || DocumentTextIcon;
              const colorClass = ACTION_COLORS[activity.action] || 'bg-gray-100 text-gray-600';

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{getActivityDescription(activity)}</p>
                    {activity.details?.preview && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        "{activity.details.preview}"
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{formatTimeAgo(activity.createdAt)}</span>
                      <span className="capitalize">{activity.entityType}</span>
                    </div>
                  </div>
                  {activity.user.avatar ? (
                    <img
                      src={activity.user.avatar}
                      alt={`${activity.user.firstName} ${activity.user.lastName}`}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-indigo-600">
                        {activity.user.firstName[0]}
                        {activity.user.lastName[0]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {mentions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <AtSymbolIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No mentions yet</p>
            </div>
          ) : (
            mentions.map(mention => (
              <div
                key={mention.id}
                onClick={() => !mention.isRead && markMentionAsRead(mention.id)}
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  mention.isRead
                    ? 'bg-white border-gray-200'
                    : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    mention.isRead ? 'bg-gray-100 text-gray-500' : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  <AtSymbolIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  {mention.activity && (
                    <>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">
                          {mention.activity.user.firstName} {mention.activity.user.lastName}
                        </span>{' '}
                        mentioned you
                      </p>
                      {mention.activity.details?.preview && (
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          "{mention.activity.details.preview}"
                        </p>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{formatTimeAgo(mention.createdAt)}</span>
                    {mention.isRead && mention.readAt && (
                      <span className="flex items-center gap-1">
                        <CheckCircleIcon className="h-3 w-3" />
                        Read
                      </span>
                    )}
                  </div>
                </div>
                {!mention.isRead && (
                  <span className="h-2 w-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
