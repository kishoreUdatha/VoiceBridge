/**
 * Unified Inbox Page
 * Multi-channel communication inbox with WhatsApp, Email, SMS, Calls, and Chat
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  InboxIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  PhoneIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { unifiedInboxService, UnifiedMessage, InboxStats } from '../../services/unified-inbox.service';

const CHANNEL_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  whatsapp: {
    icon: ChatBubbleLeftRightIcon,
    color: 'text-green-600',
    bg: 'bg-green-100',
    label: 'WhatsApp',
  },
  email: {
    icon: EnvelopeIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    label: 'Email',
  },
  sms: {
    icon: DevicePhoneMobileIcon,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    label: 'SMS',
  },
  call: {
    icon: PhoneIcon,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    label: 'Call',
  },
  chat: {
    icon: ChatBubbleOvalLeftEllipsisIcon,
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
    label: 'Chat',
  },
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function UnifiedInboxPage() {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<UnifiedMessage | null>(null);
  const [selectedLeadConversation, setSelectedLeadConversation] = useState<UnifiedMessage[]>([]);

  const [filters, setFilters] = useState<{
    channel: string;
    direction: 'inbound' | 'outbound' | '';
    search: string;
    unreadOnly: boolean;
  }>({
    channel: '',
    direction: '',
    search: '',
    unreadOnly: false,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [messagesData, statsData] = await Promise.all([
        unifiedInboxService.getMessages({
          channel: filters.channel || undefined,
          direction: filters.direction || undefined,
          search: filters.search || undefined,
          unreadOnly: filters.unreadOnly,
          limit: 100,
        }),
        unifiedInboxService.getStats(),
      ]);
      setMessages(messagesData.messages);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch inbox data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadLeadConversation = async (leadId: string) => {
    try {
      const conversation = await unifiedInboxService.getLeadConversation(leadId);
      setSelectedLeadConversation(conversation);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleMessageClick = (message: UnifiedMessage) => {
    setSelectedMessage(message);
    if (message.leadId) {
      loadLeadConversation(message.leadId);
    } else {
      setSelectedLeadConversation([message]);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <InboxIcon className="h-6 w-6 text-indigo-600" />
              Unified Inbox
            </h1>
            <p className="text-sm text-gray-500">
              All communications in one place
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm whitespace-nowrap">
              <span className="text-gray-500">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm whitespace-nowrap">
              <ExclamationCircleIcon className="h-4 w-4" />
              <span>{stats.unreplied} unreplied</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm whitespace-nowrap">
              <ClockIcon className="h-4 w-4" />
              <span>{stats.todayCount} today</span>
            </div>
            {Object.entries(stats.byChannel).map(([channel, count]) => {
              const config = CHANNEL_CONFIG[channel];
              if (!config || count === 0) return null;
              return (
                <div
                  key={channel}
                  className={`flex items-center gap-2 px-3 py-1.5 ${config.bg} ${config.color} rounded-lg text-sm whitespace-nowrap`}
                >
                  <config.icon className="h-4 w-4" />
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search messages, contacts..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={filters.channel}
            onChange={e => setFilters(prev => ({ ...prev, channel: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="call">Calls</option>
            <option value="chat">Chat</option>
          </select>

          <select
            value={filters.direction}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                direction: e.target.value as 'inbound' | 'outbound' | '',
              }))
            }
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.unreadOnly}
              onChange={e => setFilters(prev => ({ ...prev, unreadOnly: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Unread only
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages List */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <InboxIcon className="h-12 w-12 text-gray-300 mb-3" />
              <p>No messages found</p>
            </div>
          ) : (
            messages.map(message => {
              const config = CHANNEL_CONFIG[message.channel];
              const isSelected = selectedMessage?.id === message.id;

              return (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                  } ${!message.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {message.leadName || message.leadPhone || message.leadEmail || 'Unknown'}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {message.direction === 'inbound' ? (
                          <ArrowDownTrayIcon className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowUpTrayIcon className="h-3 w-3 text-blue-500" />
                        )}
                        <span className="text-xs text-gray-500 capitalize">{config.label}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {message.subject || message.content}
                      </p>
                      {message.channel === 'call' && message.metadata?.duration && (
                        <span className="text-xs text-gray-400">
                          Duration: {formatDuration(message.metadata.duration)}
                        </span>
                      )}
                    </div>
                    {!message.read && (
                      <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Conversation Panel */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedMessage ? (
            <>
              {/* Contact Header */}
              <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedMessage.leadName || 'Unknown Contact'}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {selectedMessage.leadPhone && <span>{selectedMessage.leadPhone}</span>}
                      {selectedMessage.leadEmail && <span>{selectedMessage.leadEmail}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversation Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedLeadConversation.map(msg => {
                  const config = CHANNEL_CONFIG[msg.channel];
                  const isOutbound = msg.direction === 'outbound';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isOutbound
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <config.icon
                            className={`h-3.5 w-3.5 ${isOutbound ? 'text-indigo-200' : config.color}`}
                          />
                          <span
                            className={`text-xs ${isOutbound ? 'text-indigo-200' : 'text-gray-500'}`}
                          >
                            {config.label}
                          </span>
                          {msg.userName && (
                            <span
                              className={`text-xs ${
                                isOutbound ? 'text-indigo-200' : 'text-gray-500'
                              }`}
                            >
                              by {msg.userName}
                            </span>
                          )}
                        </div>

                        {msg.subject && (
                          <p
                            className={`font-medium text-sm mb-1 ${
                              isOutbound ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {msg.subject}
                          </p>
                        )}

                        <p className={`text-sm ${isOutbound ? 'text-white' : 'text-gray-800'}`}>
                          {msg.content}
                        </p>

                        {msg.channel === 'call' && msg.metadata?.recordingUrl && (
                          <div className="mt-2">
                            <button
                              onClick={() => window.open(msg.metadata?.recordingUrl, '_blank')}
                              className={`flex items-center gap-1 text-xs ${
                                isOutbound
                                  ? 'text-indigo-200 hover:text-white'
                                  : 'text-indigo-600 hover:text-indigo-800'
                              }`}
                            >
                              <PlayIcon className="h-3.5 w-3.5" />
                              Play Recording
                            </button>
                          </div>
                        )}

                        {msg.metadata?.mediaUrl && msg.channel === 'whatsapp' && (
                          <div className="mt-2">
                            {msg.metadata.mediaType?.startsWith('image') ? (
                              <img
                                src={msg.metadata.mediaUrl}
                                alt="Media"
                                className="max-w-full rounded"
                              />
                            ) : (
                              <a
                                href={msg.metadata.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs underline ${
                                  isOutbound ? 'text-indigo-200' : 'text-indigo-600'
                                }`}
                              >
                                View Attachment
                              </a>
                            )}
                          </div>
                        )}

                        <div
                          className={`flex items-center justify-between mt-2 text-xs ${
                            isOutbound ? 'text-indigo-200' : 'text-gray-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOutbound && (
                            <span className="flex items-center gap-1">
                              {msg.status === 'delivered' || msg.status === 'read' ? (
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                              ) : (
                                <ClockIcon className="h-3.5 w-3.5" />
                              )}
                              {msg.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <InboxIcon className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg">Select a message to view</p>
              <p className="text-sm">
                Choose a conversation from the list to see details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
