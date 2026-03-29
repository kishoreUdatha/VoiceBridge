import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket URL derived from API URL - falls back to relative URL in production if not set
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '');
  }
  // In production, use relative URL; in development, use localhost
  return import.meta.env.PROD ? '' : 'http://localhost:3000';
};

const SOCKET_URL = getSocketUrl();

interface CallStatus {
  callId: string;
  status: string;
  phoneNumber: string;
  contactName?: string;
  duration?: number;
  agentId?: string;
  timestamp: string;
}

interface NewLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  source: string;
  score?: number;
  timestamp: string;
}

interface AnalyticsUpdate {
  activeCalls: number;
  callsToday: number;
  leadsToday: number;
  conversionRate: number;
  timestamp: string;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  const [activeCalls, setActiveCalls] = useState<CallStatus[]>([]);
  const [recentLeads, setRecentLeads] = useState<NewLead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsUpdate | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: string; timestamp: string }>>([]);

  const addNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev.slice(-9), { id, message, type, timestamp: new Date().toISOString() }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    // Use cookies for authentication instead of localStorage
    // Socket.IO will automatically send cookies with withCredentials: true
    const socket = io(SOCKET_URL, {
      withCredentials: true, // Send cookies for authentication
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      addNotification('Connected to real-time updates', 'success');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      addNotification('Disconnected from real-time updates', 'warning');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // User events
    socket.on('user:connected', (data: { userId: string; activeUsers: number }) => {
      setActiveUsers(data.activeUsers);
    });

    socket.on('user:disconnected', (data: { userId: string; activeUsers: number }) => {
      setActiveUsers(data.activeUsers);
    });

    // Call events
    socket.on('call:started', (data: CallStatus) => {
      setActiveCalls(prev => [...prev, data]);
      addNotification(`Call started: ${data.contactName || data.phoneNumber}`, 'info');
    });

    socket.on('call:ended', (data: CallStatus) => {
      setActiveCalls(prev => prev.filter(c => c.callId !== data.callId));
      addNotification(`Call ended: ${data.contactName || data.phoneNumber}`, 'info');
    });

    socket.on('call:status', (data: CallStatus) => {
      setActiveCalls(prev => {
        const exists = prev.find(c => c.callId === data.callId);
        if (exists) {
          return prev.map(c => c.callId === data.callId ? data : c);
        }
        if (data.status === 'in-progress' || data.status === 'ringing') {
          return [...prev, data];
        }
        return prev.filter(c => c.callId !== data.callId);
      });
    });

    socket.on('call:updated', (data: CallStatus) => {
      setActiveCalls(prev => prev.map(c => c.callId === data.callId ? { ...c, ...data } : c));
    });

    // Lead events
    socket.on('lead:new', (data: NewLead) => {
      setRecentLeads(prev => [data, ...prev.slice(0, 9)]);
      addNotification(`New lead: ${data.firstName} ${data.lastName}`, 'success');
    });

    socket.on('lead:updated', (_data: { id: string; changes: unknown }) => {
      addNotification(`Lead updated`, 'info');
    });

    // Analytics events
    socket.on('analytics:update', (data: AnalyticsUpdate) => {
      setAnalytics(data);
    });

    // Appointment events
    socket.on('appointment:update', (data: { contactName: string; status: string; type: string }) => {
      addNotification(`Appointment ${data.status}: ${data.contactName}`, 'info');
    });

    return () => {
      socket.disconnect();
    };
  }, [addNotification]);

  const emitCallStart = useCallback((data: { callId: string; phoneNumber: string; contactName?: string }) => {
    socketRef.current?.emit('call:start', data);
  }, []);

  const emitCallEnd = useCallback((data: { callId: string; duration?: number }) => {
    socketRef.current?.emit('call:end', data);
  }, []);

  const emitCallUpdate = useCallback((data: { callId: string; status: string; duration?: number }) => {
    socketRef.current?.emit('call:update', data);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    isConnected,
    activeUsers,
    activeCalls,
    recentLeads,
    analytics,
    notifications,
    emitCallStart,
    emitCallEnd,
    emitCallUpdate,
    dismissNotification,
  };
}
