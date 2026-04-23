/**
 * CargoBit WebSocket Subscriber Service
 * 
 * Subscriber-Seite (WS-Service):
 * - hält Websocket-Verbindungen
 * - subscribed auf Redis-Channels (PSUBSCRIBE job:* user:*)
 * - broadcastet eingehende Events an Clients
 * 
 * Architecture:
 * API-Nodes → Redis PUBLISH → WS-Nodes broadcast → Clients
 * 
 * Python equivalent:
 * ```python
 * from typing import Dict, Set
 * from fastapi import WebSocket, WebSocketDisconnect
 * import json
 * 
 * class ConnectionManager:
 *     def __init__(self):
 *         self.channels: Dict[str, Set[WebSocket]] = {}
 *     
 *     async def connect(self, websocket: WebSocket, channels: list[str]):
 *         await websocket.accept()
 *         for ch in channels:
 *             self.channels.setdefault(ch, set()).add(websocket)
 *     
 *     def disconnect(self, websocket: WebSocket):
 *         for ch, conns in list(self.channels.items()):
 *             if websocket in conns:
 *                 conns.remove(websocket)
 *                 if not conns:
 *                     del self.channels[ch]
 *     
 *     async def broadcast(self, channel: str, message: dict):
 *         for ws in list(self.channels.get(channel, [])):
 *             try:
 *                 await ws.send_text(json.dumps(message))
 *             except WebSocketDisconnect:
 *                 self.disconnect(ws)
 * ```
 */

import { WebSocket, WebSocketServer } from 'ws';
import Redis from 'ioredis';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import jwt from 'jsonwebtoken';

// ============================================
// TYPES
// ============================================

interface ClientInfo {
  ws: WebSocket;
  userId?: string;
  userRole?: string;
  connectedAt: Date;
  lastActivity: Date;
}

interface WsStats {
  totalConnections: number;
  channelSubscriptions: Record<string, number>;
  messagesBroadcast: number;
  uptime: number;
}

interface WsMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'auth';
  channel?: string;
  token?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET = process.env.JWT_SECRET || 'cargobit-jwt-secret-key-change-in-production';

// Pattern subscribe channels (Python: psubscribe("job:*", "user:*"))
const SUBSCRIBE_PATTERNS = ['job:*', 'user:*', 'tracking:*', 'bid:*', 'match:*', 'dispute:*'];

// ============================================
// CONNECTION MANAGER CLASS
// ============================================

/**
 * ConnectionManager - manages WebSocket connections per channel.
 * 
 * Python equivalent:
 * ```python
 * class ConnectionManager:
 *     def __init__(self):
 *         self.channels: Dict[str, Set[WebSocket]] = {}
 * ```
 */
export class ConnectionManager {
  // Map channel -> Set of WebSocket connections
  private channels: Map<string, Set<WebSocket>> = new Map();
  // Map WebSocket -> ClientInfo
  private clients: Map<WebSocket, ClientInfo> = new Map();
  
  private messagesBroadcast = 0;
  private startTime = Date.now();

  /**
   * Get all channels.
   */
  getChannels(): Map<string, Set<WebSocket>> {
    return this.channels;
  }

  /**
   * Get client info for a WebSocket.
   */
  getClient(ws: WebSocket): ClientInfo | undefined {
    return this.clients.get(ws);
  }

  /**
   * Connect a new WebSocket client.
   * 
   * Python equivalent:
   * ```python
   * async def connect(self, websocket: WebSocket, channels: list[str]):
   *     await websocket.accept()
   *     for ch in channels:
   *         self.channels.setdefault(ch, set()).add(websocket)
   * ```
   */
  async connect(
    ws: WebSocket,
    options: {
      channels?: string[];
      userId?: string;
      userRole?: string;
    }
  ): Promise<void> {
    const clientInfo: ClientInfo = {
      ws,
      userId: options.userId,
      userRole: options.userRole,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };
    
    this.clients.set(ws, clientInfo);
    
    // Subscribe to requested channels
    for (const ch of options.channels || []) {
      this.addToChannel(ws, ch);
    }
    
    console.log(`[WS] Client connected. User: ${options.userId || 'anonymous'}. Total: ${this.clients.size}`);
  }

  /**
   * Disconnect a WebSocket client.
   * 
   * Python equivalent:
   * ```python
   * def disconnect(self, websocket: WebSocket):
   *     for ch, conns in list(self.channels.items()):
   *         if websocket in conns:
   *             conns.remove(websocket)
   *             if not conns:
   *                 del self.channels[ch]
   * ```
   */
  disconnect(ws: WebSocket): void {
    // Remove from all channels
    for (const [channel, conns] of Array.from(this.channels.entries())) {
      if (conns.has(ws)) {
        conns.delete(ws);
        if (conns.size === 0) {
          this.channels.delete(channel);
        }
      }
    }
    
    this.clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${this.clients.size}`);
  }

  /**
   * Add WebSocket to a channel.
   */
  private addToChannel(ws: WebSocket, channel: string): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(ws);
    
    // Update client's last activity
    const client = this.clients.get(ws);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  /**
   * Subscribe to additional channel.
   */
  subscribe(ws: WebSocket, channel: string): void {
    this.addToChannel(ws, channel);
    this.sendToClient(ws, {
      type: 'subscribed',
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsubscribe from channel.
   */
  unsubscribe(ws: WebSocket, channel: string): void {
    const conns = this.channels.get(channel);
    if (conns) {
      conns.delete(ws);
      if (conns.size === 0) {
        this.channels.delete(channel);
      }
    }
    
    this.sendToClient(ws, {
      type: 'unsubscribed',
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast message to all connections on a channel.
   * 
   * Python equivalent:
   * ```python
   * async def broadcast(self, channel: str, message: dict):
   *     for ws in list(self.channels.get(channel, [])):
   *         try:
   *             await ws.send_text(json.dumps(message))
   *         except WebSocketDisconnect:
   *             self.disconnect(ws)
   * ```
   */
  async broadcast(channel: string, message: Record<string, unknown>): Promise<number> {
    const conns = this.channels.get(channel);
    if (!conns || conns.size === 0) return 0;
    
    const messageStr = JSON.stringify(message);
    let sent = 0;
    const toRemove: WebSocket[] = [];
    
    for (const ws of Array.from(conns)) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
          sent++;
        } catch {
          toRemove.push(ws);
        }
      } else {
        toRemove.push(ws);
      }
    }
    
    // Clean up disconnected clients
    for (const ws of toRemove) {
      this.disconnect(ws);
    }
    
    this.messagesBroadcast += sent;
    return sent;
  }

  /**
   * Send message to a single client.
   */
  sendToClient(ws: WebSocket, message: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get statistics.
   */
  getStats(): WsStats {
    const channelSubscriptions: Record<string, number> = {};
    
    for (const [channel, conns] of this.channels) {
      channelSubscriptions[channel] = conns.size;
    }
    
    return {
      totalConnections: this.clients.size,
      channelSubscriptions,
      messagesBroadcast: this.messagesBroadcast,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

// ============================================
// REDIS SUBSCRIBER LOOP
// ============================================

/**
 * Redis Subscriber Loop.
 * 
 * Python equivalent:
 * ```python
 * async def redis_subscriber_loop():
 *     pubsub = redis_client.pubsub()
 *     pubsub.psubscribe("job:*", "user:*")  # Pattern-Subscribe
 *     
 *     loop = asyncio.get_event_loop()
 *     
 *     while True:
 *         message = await loop.run_in_executor(None, pubsub.get_message, True, 1.0)
 *         if not message or message["type"] not in ("message", "pmessage"):
 *             continue
 *         
 *         channel = message["channel"]
 *         data = json.loads(message["data"])
 *         await ws_manager.broadcast(channel, data)
 * ```
 */
export class RedisSubscriberLoop {
  private subscriber: Redis | null = null;
  private running = false;
  private manager: ConnectionManager;

  constructor(manager: ConnectionManager) {
    this.manager = manager;
  }

  /**
   * Start the Redis subscriber loop.
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn('[Redis Subscriber] Already running');
      return;
    }
    
    this.subscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for subscriber mode
      retryStrategy: (times) => {
        if (times > 10) {
          console.error('[Redis Subscriber] Connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });
    
    this.subscriber.on('connect', () => console.log('[Redis Subscriber] Connected'));
    this.subscriber.on('error', (err) => console.error('[Redis Subscriber] Error:', err));
    
    // Pattern subscribe (Python: psubscribe("job:*", "user:*"))
    await this.subscriber.psubscribe(...SUBSCRIBE_PATTERNS);
    console.log(`[Redis Subscriber] Subscribed to patterns: ${SUBSCRIBE_PATTERNS.join(', ')}`);
    
    this.running = true;
    
    // Set up message handler
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handleMessage(channel, message);
    });
  }

  /**
   * Handle incoming Redis message.
   */
  private async handleMessage(channel: string, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      const sent = await this.manager.broadcast(channel, data);
      
      if (sent > 0) {
        console.log(`[WS] Broadcast ${channel} → ${sent} clients`);
      }
    } catch (error) {
      console.error(`[Redis Subscriber] Failed to handle message on ${channel}:`, error);
    }
  }

  /**
   * Stop the subscriber loop.
   */
  async stop(): Promise<void> {
    this.running = false;
    
    if (this.subscriber) {
      await this.subscriber.punsubscribe();
      await this.subscriber.quit();
      this.subscriber = null;
    }
    
    console.log('[Redis Subscriber] Stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}

// ============================================
// WEBSOCKET SERVER
// ============================================

/**
 * WebSocket Server with Redis integration.
 * 
 * Python equivalent (FastAPI):
 * ```python
 * app = FastAPI()
 * 
 * @app.on_event("startup")
 * async def startup_event():
 *     asyncio.create_task(redis_subscriber_loop())
 * 
 * @app.websocket("/ws")
 * async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
 *     user = verify_jwt(token)
 *     channels = [f"user:{user.id}"]
 *     await ws_manager.connect(websocket, channels)
 *     
 *     try:
 *         while True:
 *             await websocket.receive_text()  # optional
 *     except WebSocketDisconnect:
 *         ws_manager.disconnect(websocket)
 * ```
 */
export class WSServer {
  private wss: WebSocketServer | null = null;
  private manager: ConnectionManager;
  private redisLoop: RedisSubscriberLoop;

  constructor() {
    this.manager = new ConnectionManager();
    this.redisLoop = new RedisSubscriberLoop(this.manager);
  }

  /**
   * Initialize WebSocket server.
   */
  async init(server: import('http').Server): Promise<WebSocketServer> {
    this.wss = new WebSocketServer({ noServer: true });
    
    // Handle HTTP upgrade requests
    server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit('connection', ws, request);
      });
    });
    
    // Handle WebSocket connections
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });
    
    // Start Redis subscriber loop (Python: startup_event)
    await this.redisLoop.start();
    
    console.log('[WS Server] Initialized on /ws');
    return this.wss;
  }

  /**
   * Handle new WebSocket connection.
   * 
   * Python equivalent:
   * ```python
   * @app.websocket("/ws")
   * async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
   *     user = verify_jwt(token)
   *     channels = [f"user:{user.id}"]
   *     await ws_manager.connect(websocket, channels)
   * ```
   */
  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    // Parse query parameters
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    let channels = url.searchParams.get('channels')?.split(',').filter(Boolean) || [];
    
    // Verify JWT token
    let userId: string | undefined;
    let userRole: string | undefined;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId?: string;
          id?: string;
          role?: string;
        };
        userId = decoded.userId || decoded.id;
        userRole = decoded.role;
        
        // Auto-subscribe to user's personal channel
        if (userId) {
          const userChannel = `user:${userId}`;
          if (!channels.includes(userChannel)) {
            channels.push(userChannel);
          }
        }
      } catch (error) {
        console.warn('[WS] Invalid token, allowing anonymous connection');
        // Send auth error but don't close connection
        this.manager.sendToClient(ws, {
          type: 'auth_error',
          message: 'Invalid token',
        });
      }
    }
    
    // Accept connection
    await this.manager.connect(ws, { channels, userId, userRole });
    
    // Send welcome message
    this.manager.sendToClient(ws, {
      type: 'connected',
      userId,
      channels,
      timestamp: new Date().toISOString(),
    });
    
    // Handle incoming messages from client
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WsMessage;
        this.handleClientMessage(ws, message);
      } catch (error) {
        console.error('[WS] Invalid message format:', error);
        this.manager.sendToClient(ws, {
          type: 'error',
          message: 'Invalid message format',
        });
      }
    });
    
    // Handle disconnect
    ws.on('close', () => {
      this.manager.disconnect(ws);
    });
    
    ws.on('error', (error) => {
      console.error('[WS] Connection error:', error);
      this.manager.disconnect(ws);
    });
  }

  /**
   * Handle messages from client.
   */
  private handleClientMessage(ws: WebSocket, message: WsMessage): void {
    const client = this.manager.getClient(ws);
    if (client) {
      client.lastActivity = new Date();
    }
    
    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          this.manager.subscribe(ws, message.channel);
        }
        break;
        
      case 'unsubscribe':
        if (message.channel) {
          this.manager.unsubscribe(ws, message.channel);
        }
        break;
        
      case 'ping':
        this.manager.sendToClient(ws, {
          type: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;
        
      case 'auth':
        // Re-authentication with new token
        if (message.token) {
          try {
            const decoded = jwt.verify(message.token, JWT_SECRET) as {
              userId?: string;
              id?: string;
              role?: string;
            };
            const userId = decoded.userId || decoded.id;
            const userChannel = `user:${userId}`;
            
            if (userId && client) {
              client.userId = userId;
              client.userRole = decoded.role;
              this.manager.subscribe(ws, userChannel);
              
              this.manager.sendToClient(ws, {
                type: 'auth_success',
                userId,
              });
            }
          } catch {
            this.manager.sendToClient(ws, {
              type: 'auth_error',
              message: 'Invalid token',
            });
          }
        }
        break;
    }
  }

  /**
   * Get server statistics.
   */
  getStats(): WsStats {
    return this.manager.getStats();
  }

  /**
   * Get the underlying manager.
   */
  getManager(): ConnectionManager {
    return this.manager;
  }

  /**
   * Graceful shutdown.
   */
  async shutdown(): Promise<void> {
    await this.redisLoop.stop();
    
    if (this.wss) {
      // Close all connections
      for (const ws of this.wss.clients) {
        ws.close(1001, 'Server shutting down');
      }
      this.wss.close();
      this.wss = null;
    }
    
    console.log('[WS Server] Shutdown complete');
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const wsServer = new WSServer();
