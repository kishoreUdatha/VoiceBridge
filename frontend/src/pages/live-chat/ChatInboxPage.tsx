/**
 * Chat Inbox Page
 * Manage live chat conversations with visitors
 */

import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  User,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
  ArrowRightCircle,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Globe,
  Bot,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ChatSession {
  id: string;
  visitorId: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  status: 'active' | 'waiting' | 'closed';
  assignedAgentId?: string;
  leadId?: string;
  source: string;
  pageUrl?: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

interface ChatMessage {
  id: string;
  sender: 'visitor' | 'bot' | 'agent';
  content: string;
  metadata?: any;
  createdAt: string;
}

interface ChatStats {
  totalSessions: number;
  activeSessions: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTime: number;
}

export default function ChatInboxPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'waiting' | 'closed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    // Poll for new messages
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.id);
    }
  }, [selectedSession?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        api.get('/live-chat/sessions', {
          params: { status: filter === 'all' ? undefined : filter },
        }),
        api.get('/live-chat/stats'),
      ]);
      setSessions(sessionsRes.data.data.sessions);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await api.get(`/live-chat/sessions/${sessionId}/messages`);
      setMessages(response.data.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedSession || !newMessage.trim()) return;

    setSending(true);
    try {
      await api.post(`/live-chat/sessions/${selectedSession.id}/messages`, {
        content: newMessage.trim(),
      });
      setNewMessage('');
      loadMessages(selectedSession.id);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const assignToMe = async (sessionId: string) => {
    try {
      await api.post(`/live-chat/sessions/${sessionId}/assign`);
      toast.success('Chat assigned to you');
      loadData();
    } catch (error) {
      toast.error('Failed to assign chat');
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      await api.post(`/live-chat/sessions/${sessionId}/close`);
      toast.success('Chat closed');
      loadData();
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (error) {
      toast.error('Failed to close chat');
    }
  };

  const convertToLead = async (sessionId: string) => {
    try {
      const response = await api.post(`/live-chat/sessions/${sessionId}/convert`);
      toast.success('Lead created successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to create lead');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        session.visitorName?.toLowerCase().includes(search) ||
        session.visitorEmail?.toLowerCase().includes(search) ||
        session.visitorPhone?.includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chat Inbox</h1>
            <p className="text-sm text-gray-500">
              {stats?.activeSessions || 0} active conversations
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.totalSessions}</div>
              <div className="text-xs text-gray-500">Total Chats</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.convertedLeads}</div>
              <div className="text-xs text-gray-500">Converted</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary-600">{stats.conversionRate}%</div>
              <div className="text-xs text-gray-500">Conv Rate</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Sessions List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Search & Filter */}
          <div className="p-3 border-b border-gray-200 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex gap-1">
              {['all', 'active', 'waiting', 'closed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`flex-1 px-2 py-1 text-xs rounded-lg capitalize ${
                    filter === f
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto">
            {filteredSessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations found</p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedSession?.id === session.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 truncate">
                          {session.visitorName || 'Visitor'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(session.updatedAt)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {session.visitorEmail || session.visitorPhone || 'No contact info'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                        {session.status === 'waiting' && (
                          <span className="text-xs text-yellow-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Needs response
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedSession ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {selectedSession.visitorName || 'Visitor'}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {selectedSession.visitorEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedSession.visitorEmail}
                      </span>
                    )}
                    {selectedSession.visitorPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedSession.visitorPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedSession.status === 'waiting' && (
                  <button
                    onClick={() => assignToMe(selectedSession.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    Take Over
                  </button>
                )}
                {!selectedSession.leadId && (
                  <button
                    onClick={() => convertToLead(selectedSession.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    <ArrowRightCircle className="w-4 h-4" />
                    Create Lead
                  </button>
                )}
                {selectedSession.status !== 'closed' && (
                  <button
                    onClick={() => closeSession(selectedSession.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message, index) => {
                const isVisitor = message.sender === 'visitor';
                const isBot = message.sender === 'bot';
                const showDate =
                  index === 0 ||
                  formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="text-center text-xs text-gray-400 my-4">
                        {formatDate(message.createdAt)}
                      </div>
                    )}
                    <div className={`flex ${isVisitor ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          isVisitor
                            ? 'bg-white border border-gray-200 text-gray-900'
                            : isBot
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-primary-600 text-white'
                        }`}
                      >
                        {isBot && (
                          <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                            <Bot className="w-3 h-3" />
                            Bot
                          </div>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <div
                          className={`text-xs mt-1 ${
                            isVisitor ? 'text-gray-400' : isBot ? 'text-purple-400' : 'text-primary-200'
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {selectedSession.status !== 'closed' && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
