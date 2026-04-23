/**
 * CargoBit WebSocket React Hook
 * 
 * React hooks for WebSocket client connections.
 * 
 * Usage:
 * ```tsx
 * const { status, subscribe, unsubscribe, messages } = useWebSocket();
 * 
 * // Subscribe to job updates
 * subscribe('job:abc123');
 * 
 * // Process incoming messages
 * useEffect(() => {
 *   if (messages.length > 0) {
 *     const latest = messages[messages.length - 1];
 *     console.log('New message:', latest);
 *   }
 * }, [messages]);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  channel?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface UseWebSocketOptions {
  url?: string;
  token?: string | null;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  status: WebSocketStatus;
  messages: WebSocketMessage[];
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  send: (message: Record<string, unknown>) => void;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
}

// ============================================
// WEBSOCKET HOOK
// ============================================

/**
 * React hook for WebSocket connections.
 * 
 * Example:
 * ```python
 * # Python equivalent (frontend JavaScript):
 * const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
 * ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', channel: 'job:123' }));
 * ws.onmessage = (event) => console.log(JSON.parse(event.data));
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url,
    token,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    if (url) return url;
    
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' 
      ? 'wss:' 
      : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws`;
    
    if (token) {
      return `${wsUrl}?token=${encodeURIComponent(token)}`;
    }
    
    return wsUrl;
  }, [url, token]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Send message
  const send = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Subscribe to channel
  const subscribe = useCallback((channel: string) => {
    send({ type: 'subscribe', channel });
  }, [send]);

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: string) => {
    send({ type: 'unsubscribe', channel });
  }, [send]);

  // Connect
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setStatus('connecting');
    
    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        setStatus('connected');
        reconnectAttempts.current = 0;
        console.log('[WS] Connected to', wsUrl);
        onConnect?.();
      };
      
      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setMessages((prev) => [...prev, message]);
          onMessage?.(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };
      
      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        setStatus('disconnected');
        console.log('[WS] Disconnected:', event.code, event.reason);
        onDisconnect?.();
        
        // Auto-reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`[WS] Reconnecting (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);
            connect();
          }, reconnectInterval);
        }
      };
      
      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        
        setStatus('error');
        console.error('[WS] Error:', error);
        onError?.(error);
      };
      
      wsRef.current = ws;
    } catch (error) {
      setStatus('error');
      console.error('[WS] Failed to connect:', error);
    }
  }, [getWebSocketUrl, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setStatus('disconnected');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoConnect) {
      connect();
    }
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when token changes
  useEffect(() => {
    if (status === 'connected' && token) {
      // Re-authenticate with new token
      send({ type: 'auth', token });
    }
  }, [token, status, send]);

  return {
    status,
    messages,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
    clearMessages,
  };
}

// ============================================
// JOB SUBSCRIPTION HOOK
// ============================================

export interface UseJobSubscriptionOptions {
  jobId: string;
  token?: string | null;
  onUpdate?: (update: { jobId: string; status: string; metadata?: Record<string, unknown> }) => void;
}

/**
 * Hook to subscribe to job status updates.
 */
export function useJobSubscription(options: UseJobSubscriptionOptions) {
  const { jobId, token, onUpdate } = options;
  
  const { status, messages, subscribe, unsubscribe } = useWebSocket({
    token,
    onMessage: (message) => {
      if (message.jobId === jobId && onUpdate) {
        onUpdate(message as Parameters<typeof onUpdate>[0]);
      }
    },
  });
  
  // Subscribe to job channel when connected
  useEffect(() => {
    if (status === 'connected' && jobId) {
      subscribe(`job:${jobId}`);
      
      return () => {
        unsubscribe(`job:${jobId}`);
      };
    }
  }, [status, jobId, subscribe, unsubscribe]);
  
  return {
    status,
    messages: messages.filter((m) => m.jobId === jobId || m.channel === `job:${jobId}`),
  };
}

// ============================================
// USER NOTIFICATIONS HOOK
// ============================================

export interface UseUserNotificationsOptions {
  userId: string;
  token?: string | null;
  onNotification?: (notification: { userId: string; message: string; type: string }) => void;
}

/**
 * Hook to subscribe to user notifications.
 */
export function useUserNotifications(options: UseUserNotificationsOptions) {
  const { userId, token, onNotification } = options;
  
  const { status, messages, subscribe, unsubscribe } = useWebSocket({
    token,
    onMessage: (message) => {
      if (message.userId === userId && onNotification) {
        onNotification(message as Parameters<typeof onNotification>[0]);
      }
    },
  });
  
  // Subscribe to user channel when connected
  useEffect(() => {
    if (status === 'connected' && userId) {
      subscribe(`user:${userId}`);
      
      return () => {
        unsubscribe(`user:${userId}`);
      };
    }
  }, [status, userId, subscribe, unsubscribe]);
  
  return {
    status,
    notifications: messages.filter((m) => m.userId === userId || m.channel === `user:${userId}`),
  };
}

// ============================================
// TRACKING HOOK
// ============================================

export interface TrackingUpdate {
  jobId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface UseTrackingOptions {
  jobId: string;
  token?: string | null;
  onUpdate?: (update: TrackingUpdate) => void;
}

/**
 * Hook to subscribe to GPS tracking updates.
 */
export function useTracking(options: UseTrackingOptions) {
  const { jobId, token, onUpdate } = options;
  
  const { status, messages, subscribe, unsubscribe } = useWebSocket({
    token,
    onMessage: (message) => {
      if ('latitude' in message && 'longitude' in message && onUpdate) {
        onUpdate(message as TrackingUpdate);
      }
    },
  });
  
  // Subscribe to tracking channel
  useEffect(() => {
    if (status === 'connected' && jobId) {
      subscribe(`tracking:${jobId}`);
      
      return () => {
        unsubscribe(`tracking:${jobId}`);
      };
    }
  }, [status, jobId, subscribe, unsubscribe]);
  
  return {
    status,
    updates: messages.filter((m) => 'latitude' in m) as TrackingUpdate[],
  };
}

// ============================================
// EXPORT
// ============================================

export default useWebSocket;
