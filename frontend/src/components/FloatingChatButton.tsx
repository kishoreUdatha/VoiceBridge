/**
 * Floating Chat Button
 * Shows at bottom-right corner for quick access to live chat inbox
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, X, Users, Settings } from 'lucide-react';
import api from '../services/api';

interface ChatStats {
  activeSessions: number;
  waitingSessions: number;
}

export default function FloatingChatButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<ChatStats>({ activeSessions: 0, waitingSessions: 0 });
  const [loading, setLoading] = useState(true);

  // Don't show on live-chat pages (already viewing chat)
  const isOnChatPage = location.pathname.startsWith('/live-chat');

  useEffect(() => {
    if (!isOnChatPage) {
      loadStats();
      // Poll for updates every 30 seconds
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isOnChatPage]);

  const loadStats = async () => {
    try {
      const response = await api.get('/live-chat/stats');
      setStats({
        activeSessions: response.data.data?.activeSessions || 0,
        waitingSessions: response.data.data?.waitingSessions || 0,
      });
    } catch (error) {
      // Silently fail - chat might not be set up
      console.log('Chat stats not available');
    } finally {
      setLoading(false);
    }
  };

  const totalPending = stats.activeSessions + stats.waitingSessions;

  // Don't render on chat pages
  if (isOnChatPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden mb-2 animate-in slide-in-from-bottom-2">
          <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <h3 className="font-semibold">Live Chat</h3>
            <p className="text-sm text-green-100">Manage visitor conversations</p>
          </div>

          <div className="p-2">
            {/* Stats */}
            <div className="flex items-center justify-around p-3 bg-gray-50 rounded-lg mb-2">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{stats.activeSessions}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-600">{stats.waitingSessions}</p>
                <p className="text-xs text-gray-500">Waiting</p>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                navigate('/live-chat');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Chat Inbox</p>
                <p className="text-xs text-gray-500">View all conversations</p>
              </div>
              {totalPending > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {totalPending}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                navigate('/live-chat/settings');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Widget Settings</p>
                <p className="text-xs text-gray-500">Configure chat widget</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-800'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}

        {/* Badge for pending chats */}
        {!isOpen && totalPending > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {totalPending > 9 ? '9+' : totalPending}
          </span>
        )}
      </button>
    </div>
  );
}
