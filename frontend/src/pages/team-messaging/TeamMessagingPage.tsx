import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  BellIcon,
  CheckCircleIcon,
  TrashIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetType: 'ALL' | 'TEAM' | 'ROLE' | 'INDIVIDUAL';
  createdAt: string;
  expiresAt?: string;
  isRead: boolean;
  isPinned: boolean;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface UnreadCounts {
  announcements: number;
  messages: number;
  total: number;
}

export default function TeamMessagingPage() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ announcements: 0, messages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    priority: 'NORMAL' as const,
    targetType: 'ALL' as 'ALL' | 'TEAM' | 'ROLE',
    sendPushNotification: true,
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchUnreadCounts();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/team-messaging/announcements');
      setAnnouncements(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await api.get('/team-messaging/unread');
      setUnreadCounts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/team-messaging/announcements/${id}/read`);
      setAnnouncements(prev =>
        prev.map(a => a.id === id ? { ...a, isRead: true } : a)
      );
      fetchUnreadCounts();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await api.delete(`/team-messaging/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  const createAnnouncement = async () => {
    try {
      const response = await api.post('/team-messaging/announcements', newAnnouncement);
      setAnnouncements(prev => [response.data.data, ...prev]);
      setShowCreateModal(false);
      setNewAnnouncement({
        title: '',
        message: '',
        priority: 'NORMAL',
        targetType: 'ALL',
        sendPushNotification: true,
      });
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'LOW': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'TEAM': return <UserGroupIcon className="h-4 w-4" />;
      case 'INDIVIDUAL': return <UserIcon className="h-4 w-4" />;
      default: return <MegaphoneIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Communication</h1>
          <p className="text-slate-500">Announcements and team messages</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          New Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <MegaphoneIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Unread Announcements</p>
              <p className="text-xl font-bold text-slate-900">{unreadCounts.announcements}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Unread Messages</p>
              <p className="text-xl font-bold text-slate-900">{unreadCounts.messages}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <BellIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Notifications</p>
              <p className="text-xl font-bold text-slate-900">{unreadCounts.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Announcements</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center">
              <MegaphoneIcon className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-slate-500">No announcements yet</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-6 ${!announcement.isRead ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        {getTargetIcon(announcement.targetType)}
                        {announcement.targetType === 'ALL' ? 'Everyone' : announcement.targetType}
                      </span>
                      {announcement.isPinned && (
                        <span className="text-xs text-amber-600">Pinned</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">
                      {announcement.title}
                    </h3>
                    <p className="mt-1 text-slate-600 whitespace-pre-wrap">
                      {announcement.message}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                      {announcement.creator && (
                        <span>
                          By {announcement.creator.firstName} {announcement.creator.lastName}
                        </span>
                      )}
                      <span>
                        {new Date(announcement.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!announcement.isRead && (
                      <button
                        onClick={() => markAsRead(announcement.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-green-600"
                        title="Mark as read"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">New Announcement</h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Announcement title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Message</label>
                <textarea
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Type your message..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Priority</label>
                  <select
                    value={newAnnouncement.priority}
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Send To</label>
                  <select
                    value={newAnnouncement.targetType}
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, targetType: e.target.value as any }))}
                    className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="ALL">Everyone</option>
                    <option value="TEAM">My Team</option>
                    <option value="ROLE">By Role</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendPush"
                  checked={newAnnouncement.sendPushNotification}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, sendPushNotification: e.target.checked }))}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="sendPush" className="text-sm text-slate-700">
                  Send push notification
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={createAnnouncement}
                disabled={!newAnnouncement.title || !newAnnouncement.message}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Create Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
