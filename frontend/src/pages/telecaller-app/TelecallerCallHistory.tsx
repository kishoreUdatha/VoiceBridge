import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Call {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  outcome?: string;
  duration?: number;
  sentiment?: string;
  summary?: string;
  createdAt: string;
  lead?: {
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
  };
}

const TelecallerCallHistory: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const res = await api.get('/telecaller/calls?limit=50');
      setCalls(res.data.data.calls || []);
    } catch (error: any) {
      console.error('Error fetching calls:', error);
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'INTERESTED':
      case 'CONVERTED':
        return 'bg-green-100 text-green-700';
      case 'NOT_INTERESTED':
        return 'bg-red-100 text-red-700';
      case 'CALLBACK':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return { emoji: '😊', color: 'text-green-600' };
      case 'negative':
        return { emoji: '😞', color: 'text-red-600' };
      default:
        return { emoji: '😐', color: 'text-gray-500' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-6">
        <h1 className="text-2xl font-bold">Call History</h1>
        <p className="text-blue-100 mt-1">{calls.length} calls recorded</p>
      </div>

      {/* Calls List */}
      <div className="px-4 mt-4">
        <div className="space-y-3">
          {calls.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
              No calls recorded yet
            </div>
          ) : (
            calls.map((call) => (
              <div
                key={call.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedCall(call)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">
                      {call.contactName || call.lead?.firstName || call.phoneNumber}
                    </h3>
                    <p className="text-gray-500 text-sm">{call.phoneNumber}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {call.outcome && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getOutcomeColor(call.outcome)}`}>
                          {call.outcome.replace('_', ' ')}
                        </span>
                      )}
                      {call.sentiment && (
                        <span className={`text-xs ${getSentimentEmoji(call.sentiment).color}`}>
                          {getSentimentEmoji(call.sentiment).emoji}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono text-gray-700">{formatDuration(call.duration)}</div>
                    <div className="text-xs text-gray-400">{formatDate(call.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Call Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Call Details</h2>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-blue-600">
                      {(selectedCall.contactName || selectedCall.phoneNumber).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    {selectedCall.contactName || 'Unknown'}
                  </h3>
                  <p className="text-gray-500">{selectedCall.phoneNumber}</p>
                </div>
              </div>

              {/* Call Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-gray-800">{formatDuration(selectedCall.duration)}</div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`text-lg font-semibold ${
                    selectedCall.outcome === 'INTERESTED' || selectedCall.outcome === 'CONVERTED'
                      ? 'text-green-600'
                      : selectedCall.outcome === 'NOT_INTERESTED'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {selectedCall.outcome?.replace('_', ' ') || '-'}
                  </div>
                  <div className="text-xs text-gray-500">Outcome</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`text-lg font-semibold ${getSentimentEmoji(selectedCall.sentiment).color}`}>
                    {selectedCall.sentiment || '-'}
                  </div>
                  <div className="text-xs text-gray-500">Sentiment</div>
                </div>
              </div>

              {/* Summary/Transcript */}
              {selectedCall.summary && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Call Summary</h4>
                  <div className="bg-gray-50 rounded-xl p-4 text-gray-600 text-sm">
                    {selectedCall.summary}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-center text-gray-400 text-sm">
                {new Date(selectedCall.createdAt).toLocaleString()}
              </div>

              {/* Call Again Button */}
              {selectedCall.lead && (
                <Link
                  to={`/telecaller-app/call/${selectedCall.lead.id}`}
                  className="block w-full py-4 bg-green-500 hover:bg-green-600 text-white text-center rounded-xl font-semibold transition-colors"
                >
                  Call Again
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-around">
          <Link to="/telecaller-app" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/telecaller-app/calls" className="flex flex-col items-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs mt-1">History</span>
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="text-xs mt-1">Exit</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TelecallerCallHistory;
