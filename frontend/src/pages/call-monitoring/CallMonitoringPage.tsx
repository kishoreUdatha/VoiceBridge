import React, { useState, useEffect } from 'react';
import {
  Headphones,
  MessageSquare,
  PhoneForwarded,
  Phone,
  PhoneOff,
  User,
  Clock,
  Mic,
  MicOff,
  Users,
  Activity,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

interface ActiveCall {
  id: string;
  callSid: string;
  agentId: string;
  agentName: string;
  callerNumber: string;
  callerName: string | null;
  queueName: string | null;
  startTime: string;
  duration: number;
  status: 'RINGING' | 'IN_PROGRESS' | 'ON_HOLD';
  isMonitored: boolean;
  monitoredBy: string | null;
  monitoringMode: 'LISTEN' | 'WHISPER' | 'BARGE' | null;
}

interface MonitoringSession {
  sessionId: string;
  callId: string;
  mode: 'LISTEN' | 'WHISPER' | 'BARGE';
  startedAt: string;
  isMuted: boolean;
}

interface AgentStatus {
  userId: string;
  name: string;
  status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'AWAY' | 'OFFLINE';
  currentCallId: string | null;
  callsToday: number;
  avgHandleTime: number;
  lastStatusChange: string;
}

export const CallMonitoringPage: React.FC = () => {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [currentSession, setCurrentSession] = useState<MonitoringSession | null>(null);
  const [selectedCall, setSelectedCall] = useState<ActiveCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update call durations every second
    const timer = setInterval(() => {
      setActiveCalls((calls) =>
        calls.map((call) => ({
          ...call,
          duration: Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [callsRes, agentsRes] = await Promise.all([
        fetch('/api/monitoring/active-calls'),
        fetch('/api/call-queues/agents/status'),
      ]);

      if (callsRes.ok) {
        const data = await callsRes.json();
        setActiveCalls(data.data || []);
      }

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgentStatuses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startMonitoring = async (callId: string, mode: 'LISTEN' | 'WHISPER' | 'BARGE') => {
    try {
      const response = await fetch(`/api/monitoring/${callId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSession({
          sessionId: data.data.id,
          callId,
          mode,
          startedAt: new Date().toISOString(),
          isMuted: false,
        });
        loadData();
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const stopMonitoring = async () => {
    if (!currentSession) return;

    try {
      await fetch(`/api/monitoring/${currentSession.sessionId}/stop`, {
        method: 'POST',
      });
      setCurrentSession(null);
      setSelectedCall(null);
      loadData();
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const switchMode = async (mode: 'LISTEN' | 'WHISPER' | 'BARGE') => {
    if (!currentSession) return;

    try {
      const endpoint = mode === 'WHISPER' ? 'whisper' : mode === 'BARGE' ? 'barge' : 'listen';
      await fetch(`/api/monitoring/${currentSession.sessionId}/${endpoint}`, {
        method: 'POST',
      });
      setCurrentSession({ ...currentSession, mode });
    } catch (error) {
      console.error('Failed to switch mode:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real implementation, this would mute the audio stream
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-500';
      case 'ON_CALL':
        return 'bg-blue-500';
      case 'WRAP_UP':
        return 'bg-yellow-500';
      case 'AWAY':
        return 'bg-orange-500';
      case 'OFFLINE':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getCallStatusBadge = (status: string) => {
    switch (status) {
      case 'RINGING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Ringing</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">In Progress</span>;
      case 'ON_HOLD':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">On Hold</span>;
      default:
        return null;
    }
  };

  const filteredCalls = activeCalls.filter((call) => {
    const matchesSearch =
      call.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.callerNumber.includes(searchQuery) ||
      (call.callerName && call.callerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredAgents = agentStatuses.filter((agent) => {
    if (statusFilter === 'all') return true;
    return agent.status === statusFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Monitoring</h1>
          <p className="text-gray-600">Monitor active calls and agent performance in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">{activeCalls.length} Active Calls</span>
          </div>
          <button
            onClick={loadData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Monitoring Session */}
      {currentSession && (
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                {currentSession.mode === 'LISTEN' && <Headphones className="w-6 h-6" />}
                {currentSession.mode === 'WHISPER' && <MessageSquare className="w-6 h-6" />}
                {currentSession.mode === 'BARGE' && <PhoneForwarded className="w-6 h-6" />}
              </div>
              <div>
                <div className="font-semibold">
                  Monitoring: {selectedCall?.agentName}
                </div>
                <div className="text-purple-200 text-sm">
                  {selectedCall?.callerName || selectedCall?.callerNumber} |{' '}
                  {formatDuration(selectedCall?.duration || 0)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mode Switcher */}
              <div className="flex bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => switchMode('LISTEN')}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                    currentSession.mode === 'LISTEN' ? 'bg-white text-purple-600' : 'text-white'
                  }`}
                >
                  <Headphones className="w-4 h-4" />
                  Listen
                </button>
                <button
                  onClick={() => switchMode('WHISPER')}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                    currentSession.mode === 'WHISPER' ? 'bg-white text-purple-600' : 'text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Whisper
                </button>
                <button
                  onClick={() => switchMode('BARGE')}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                    currentSession.mode === 'BARGE' ? 'bg-white text-purple-600' : 'text-white'
                  }`}
                >
                  <PhoneForwarded className="w-4 h-4" />
                  Barge
                </button>
              </div>

              {/* Mute Toggle */}
              <button
                onClick={toggleMute}
                className={`p-3 rounded-lg ${isMuted ? 'bg-red-500' : 'bg-white/20'}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* End Monitoring */}
              <button
                onClick={stopMonitoring}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End
              </button>
            </div>
          </div>

          {/* Mode Description */}
          <div className="mt-4 p-3 bg-white/10 rounded-lg text-sm">
            {currentSession.mode === 'LISTEN' && (
              <span>You are listening silently. Neither the agent nor the caller can hear you.</span>
            )}
            {currentSession.mode === 'WHISPER' && (
              <span>You can speak to the agent privately. The caller cannot hear you.</span>
            )}
            {currentSession.mode === 'BARGE' && (
              <span>You are in a 3-way call. Both the agent and caller can hear you.</span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by agent name, caller number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="RINGING">Ringing</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Calls List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Active Calls ({filteredCalls.length})
          </h2>

          {filteredCalls.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active calls</h3>
              <p className="text-gray-500">Active calls will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className={`bg-white rounded-xl border p-4 transition-colors ${
                    selectedCall?.id === call.id
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{call.agentName}</div>
                        <div className="text-sm text-gray-500">
                          {call.callerName || 'Unknown'} | {call.callerNumber}
                        </div>
                        {call.queueName && (
                          <div className="text-xs text-gray-400">Queue: {call.queueName}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          {getCallStatusBadge(call.status)}
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="font-mono">{formatDuration(call.duration)}</span>
                        </div>
                      </div>

                      {call.isMonitored && call.monitoredBy !== 'me' && (
                        <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          Being monitored
                        </div>
                      )}

                      {!currentSession && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedCall(call);
                              startMonitoring(call.id, 'LISTEN');
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Listen"
                          >
                            <Headphones className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCall(call);
                              startMonitoring(call.id, 'WHISPER');
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Whisper"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCall(call);
                              startMonitoring(call.id, 'BARGE');
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Barge"
                          >
                            <PhoneForwarded className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Status Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Agent Status
          </h2>

          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {filteredAgents.map((agent) => (
              <div key={agent.userId} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(
                        agent.status
                      )}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{agent.name}</div>
                    <div className="text-xs text-gray-500">
                      {agent.status === 'ON_CALL' && agent.currentCallId
                        ? 'On active call'
                        : agent.status.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-900">{agent.callsToday} calls</div>
                    <div className="text-gray-500 text-xs">
                      {Math.floor(agent.avgHandleTime / 60)}m avg
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredAgents.length === 0 && (
              <div className="p-8 text-center text-gray-500">No agents found</div>
            )}
          </div>

          {/* Status Legend */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Status Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-600">Available</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-gray-600">On Call</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-gray-600">Wrap Up</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-gray-600">Away</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
                <span className="text-gray-600">Offline</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {agentStatuses.filter((a) => a.status === 'AVAILABLE').length}
                </div>
                <div className="text-xs text-gray-500">Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {agentStatuses.filter((a) => a.status === 'ON_CALL').length}
                </div>
                <div className="text-xs text-gray-500">On Call</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {agentStatuses.filter((a) => a.status === 'WRAP_UP').length}
                </div>
                <div className="text-xs text-gray-500">Wrap Up</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {agentStatuses.filter((a) => a.status === 'OFFLINE').length}
                </div>
                <div className="text-xs text-gray-500">Offline</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
