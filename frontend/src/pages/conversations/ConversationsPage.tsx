import React, { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Conversation {
  id: string;
  leadId: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactName: string | null;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'VOICE' | 'WEB_CHAT';
  status: 'OPEN' | 'PENDING' | 'CLOSED' | 'RESOLVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  subject: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [search, statusFilter, channelFilter]);

  const fetchConversations = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (channelFilter) params.channel = channelFilter;

      const response = await api.get('/conversations', { params });
      setConversations(response.data.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      case 'RESOLVED': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'SMS': return 'bg-blue-100 text-blue-700';
      case 'WHATSAPP': return 'bg-green-100 text-green-700';
      case 'EMAIL': return 'bg-purple-100 text-purple-700';
      case 'VOICE': return 'bg-orange-100 text-orange-700';
      case 'WEB_CHAT': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-600 mt-1">Track and manage all customer conversations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone, email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="PENDING">Pending</option>
          <option value="CLOSED">Closed</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Channels</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="EMAIL">Email</option>
          <option value="VOICE">Voice</option>
          <option value="WEB_CHAT">Web Chat</option>
        </select>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Conversations</h3>
          <p className="text-gray-600 mt-1">Conversations will appear here when customers reach out</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserCircleIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {conversation.contactName || conversation.contactPhone || conversation.contactEmail || 'Unknown'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getChannelColor(conversation.channel)}`}>
                          {conversation.channel}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {conversation.subject || `${conversation.messageCount} messages`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{formatDate(conversation.lastMessageAt)}</div>
                    <div className="text-xs text-gray-400 mt-1">{conversation.messageCount} msgs</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <ConversationDetailModal
          conversation={selectedConversation}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </div>
  );
};

// Conversation Detail Modal
interface ConversationDetailModalProps {
  conversation: Conversation;
  onClose: () => void;
}

const ConversationDetailModal: React.FC<ConversationDetailModalProps> = ({ conversation, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [conversation.id]);

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/conversations/${conversation.id}/messages`);
      setMessages(response.data.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {conversation.contactName || conversation.contactPhone || conversation.contactEmail}
            </h2>
            <p className="text-sm text-gray-500">{conversation.channel} conversation</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No messages yet</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.direction === 'OUTBOUND'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.direction === 'OUTBOUND' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;
