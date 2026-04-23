/**
 * CargoBit WebSocket Server
 * 
 * Real-time WebSocket server with Redis Pub/Sub for horizontal scaling.
 * Broadcasts job status, tracking, and dispute updates to connected clients.
 * 
 * Architecture:
 * - Uses Redis Pub/Sub for cross-instance communication
 * - Maintains client connections per WebSocket instance
 * - Channel-based subscriptions: job:{job_id}, tracking:{job_id}
 */

import { Server as WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import {
  getSubscriber,
  JobUpdatePayload,
  TrackingUpdatePayload,
} from './redis-websocket.service';

// ============================================
// TYPES
// ============================================

interface Client {
  ws: WebSocket;
  subscriptions: Set<string>;
  userId?: string;
}

interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  channel: string;
}

interface AuthMessage {
  type: 'auth';
  token: string;
}

type WsMessage = SubscriptionMessage | AuthMessage;

// ============================================
// WEBSOCKET MANAGER
// ============================================

class WebSocketManager {
  private clients: Map<WebSocket, Client> = new Map();
  private wss: WebSocketServer | null = null;
  private redisUnsubscribe: (() => Promise<void>) | null = null;

  /**
   * Initialize WebSocket server.
   */
  init(server: import('http').Server): WebSocketServer {
    this.wss = new WebSocketServer({ noServer: true });
    
    // Handle upgrade requests
    server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit('connection', ws, request);
      });
    });
    
    // Handle new connections
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });
    
    // Subscribe to Redis channels
    this.subscribeRedis();
    
    console.log('[WS] WebSocket server initialized');
    return this.wss;
  }

  /**
   * Handle new WebSocket connection.
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const client: Client = {
      ws,
      subscriptions: new Set(),
    };
    
    this.clients.set(ws, client);
    console.log(`[WS] Client connected. Total: ${this.clients.size}`);
    
    // Handle messages from client
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WsMessage;
        this.handleMessage(ws, message);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });
    
    // Handle disconnect
    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`[WS] Client disconnected. Total: ${this.clients.size}`);
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Handle messages from clients.
   */
  private handleMessage(ws: WebSocket, message: WsMessage): void {
    const client = this.clients.get(ws);
    if (!client) return;
    
    switch (message.type) {
      case 'subscribe':
        this.subscribeClient(client, message.channel);
        break;
        
      case 'unsubscribe':
        this.unsubscribeClient(client, message.channel);
        break;
        
      case 'auth':
        // TODO: Validate JWT token and set userId
        // For now, just acknowledge
        ws.send(JSON.stringify({ type: 'auth_success' }));
        break;
    }
  }

  /**
   * Subscribe client to a channel.
   */
  private subscribeClient(client: Client, channel: string): void {
    client.subscriptions.add(channel);
    client.ws.send(JSON.stringify({
      type: 'subscribed',
      channel,
    }));
    console.log(`[WS] Client subscribed to ${channel}`);
  }

  /**
   * Unsubscribe client from a channel.
   */
  private unsubscribeClient(client: Client, channel: string): void {
    client.subscriptions.delete(channel);
    client.ws.send(JSON.stringify({
      type: 'unsubscribed',
      channel,
    }));
  }

  /**
   * Subscribe to Redis Pub/Sub and forward messages to clients.
   */
  private subscribeRedis(): void {
    const redis = getSubscriber();
    
    // Subscribe to all job and tracking channels
    redis.psubscribe('job:*', 'tracking:*', 'dispute:*', (err) => {
      if (err) {
        console.error('[WS] Failed to subscribe to Redis:', err);
        return;
      }
      console.log('[WS] Subscribed to Redis channels');
    });
    
    redis.on('pmessage', (pattern, channel, message) => {
      this.broadcastToSubscribers(channel, message);
    });
  }

  /**
   * Broadcast message to all clients subscribed to a channel.
   */
  private broadcastToSubscribers(channel: string, message: string): void {
    let sent = 0;
    
    for (const [ws, client] of this.clients) {
      if (client.subscriptions.has(channel)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sent++;
        }
      }
    }
    
    if (sent > 0) {
      console.log(`[WS] Broadcast to ${sent} clients on ${channel}`);
    }
  }

  /**
   * Broadcast to all connected clients.
   */
  broadcastAll(message: object): void {
    const data = JSON.stringify(message);
    
    for (const [ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  /**
   * Get stats about connected clients.
   */
  getStats(): { totalClients: number; channels: Record<string, number> } {
    const channels: Record<string, number> = {};
    
    for (const [, client] of this.clients) {
      for (const channel of client.subscriptions) {
        channels[channel] = (channels[channel] || 0) + 1;
      }
    }
    
    return {
      totalClients: this.clients.size,
      channels,
    };
  }

  /**
   * Close all connections and cleanup.
   */
  async close(): Promise<void> {
    // Unsubscribe from Redis
    if (this.redisUnsubscribe) {
      await this.redisUnsubscribe();
    }
    
    // Close all client connections
    for (const [ws] of this.clients) {
      ws.close();
    }
    this.clients.clear();
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    console.log('[WS] WebSocket server closed');
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const wsManager = new WebSocketManager();
export { WebSocketServer };
