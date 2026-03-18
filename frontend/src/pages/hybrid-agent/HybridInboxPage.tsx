import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Phone,
  Send,
  Search,
  User,
  PhoneCall,
  MessageCircle,
  Smartphone,
  RefreshCw,
  Bot,
} from 'lucide-react';
import api from '../../services/api';

interface Conversation {
  phone: string;
  leadId?: string;
  leadName?: string;
  lastMessage: string;
  lastChannel: 'WHATSAPP' | 'SMS' | 'CALL';
  lastTimestamp: string;
  unreadCount: number;
}

interface Message {
  id: string;
  channel: 'WHATSAPP' | 'SMS' | 'CALL';
  direction: 'INBOUND' | 'OUTBOUND';
  message: string;
  timestamp: string;
  status: string;
}

const channelIcons: Record<string, React.ReactNode> = {
  WHATSAPP: <MessageCircle size={16} className="text-green-600" />,
  SMS: <Smartphone size={16} className="text-blue-600" />,
  CALL: <PhoneCall size={16} className="text-purple-600" />,
};

const channelColors: Record<string, string> = {
  WHATSAPP: 'bg-green-100 text-green-700 border-green-200',
  SMS: 'bg-blue-100 text-blue-700 border-blue-200',
  CALL: 'bg-purple-100 text-purple-700 border-purple-200',
};

export const HybridInboxPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingAs, setSendingAs] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
    }
  }, [selectedPhone]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      // Get leads with recent activity
      const response = await api.get('/leads?limit=50&sort=updatedAt&order=desc');
      const leads = response.data.data?.leads || [];

      // Transform to conversations
      const convos: Conversation[] = leads
        .filter((lead: any) => lead.phone)
        .map((lead: any) => ({
          phone: lead.phone,
          leadId: lead.id,
          leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
          lastMessage: lead.lastContactNote || 'No messages yet',
          lastChannel: 'WHATSAPP',
          lastTimestamp: lead.updatedAt,
          unreadCount: 0,
        }));

      setConversations(convos);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (phone: string) => {
    try {
      setLoadingMessages(true);
      const response = await api.get(`/hybrid-agent/history/${encodeURIComponent(phone)}`);
      setMessages(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPhone) return;

    try {
      setSending(true);
      await api.post('/hybrid-agent/send', {
        phone: selectedPhone,
        message: newMessage,
        channel: sendingAs,
      });
      setNewMessage('');
      await fetchMessages(selectedPhone);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendAIResponse = async () => {
    if (!selectedPhone || messages.length === 0) return;

    const lastUserMessage = [...messages]
      .reverse()
      .find(m => m.direction === 'INBOUND');

    if (!lastUserMessage) return;

    try {
      setSending(true);
      await api.post('/hybrid-agent/respond', {
        phone: selectedPhone,
        userMessage: lastUserMessage.message,
        channel: sendingAs,
      });
      await fetchMessages(selectedPhone);
    } catch (err) {
      console.error('Failed to send AI response:', err);
    } finally {
      setSending(false);
    }
  };

  const handleInitiateCall = async () => {
    if (!selectedPhone) return;

    try {
      await api.post('/hybrid-agent/call', { phone: selectedPhone });
      alert('Call initiated!');
    } catch (err) {
      console.error('Failed to initiate call:', err);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.phone.includes(searchTerm) ||
    c.leadName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
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
    <div className="h-[calc(100vh-180px)] flex bg-white rounded-lg shadow border overflow-hidden">
      {/* Conversations List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Conversations</h2>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone or name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map(convo => (
              <div
                key={convo.phone}
                onClick={() => setSelectedPhone(convo.phone)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                  selectedPhone === convo.phone ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                    {convo.leadName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900 truncate">{convo.leadName}</p>
                      <span className="text-xs text-gray-500">{formatTime(convo.lastTimestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{convo.phone}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {channelIcons[convo.lastChannel]}
                      <span className="text-xs text-gray-500 truncate">{convo.lastMessage}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedPhone ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-medium">{selectedPhone}</p>
                  <p className="text-sm text-gray-500">
                    {messages.length} messages across all channels
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMessages(selectedPhone)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Refresh"
                >
                  <RefreshCw size={18} />
                </button>
                <button
                  onClick={handleInitiateCall}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Phone size={18} />
                  Call
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.direction === 'OUTBOUND'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white border rounded-bl-md'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${channelColors[msg.channel]}`}>
                          {msg.channel}
                        </span>
                        <span className={`text-xs ${msg.direction === 'OUTBOUND' ? 'text-blue-200' : 'text-gray-400'}`}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
              {/* Channel Selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-500">Send via:</span>
                <button
                  onClick={() => setSendingAs('WHATSAPP')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition ${
                    sendingAs === 'WHATSAPP'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </button>
                <button
                  onClick={() => setSendingAs('SMS')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition ${
                    sendingAs === 'SMS'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Smartphone size={14} />
                  SMS
                </button>
                <button
                  onClick={handleSendAIResponse}
                  disabled={sending}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 ml-auto"
                >
                  <Bot size={14} />
                  AI Reply
                </button>
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Type a message to send via ${sendingAs}...`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a contact from the list to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HybridInboxPage;
