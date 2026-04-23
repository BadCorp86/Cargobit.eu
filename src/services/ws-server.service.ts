/**
 * CargoBit WebSocket Service mit Redis Subscriber Loop
 * 
 * Subscriber-Seite (WS-Service):
 * - hält Websocket-Connections
 * - subscribed einmalig auf Redis
 * - verteilt eingehende Redis-Messages an passende Channels
 * 
 * Architektur:
 * API-Services: publishen Events nach Redis (PUBLISH channel payload)
 * WS-Service: subscribed auf Redis-Channels und broadcastet an Websocket-Clients
 * So skalierst du horizontal, ohne dass WS-Nodes voneinander wissen müssen.
 * 
 * Python equivalent:
 * ```python
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

interface ClientConnection {
  ws: WebSocket;
  channels: Set<string>;
  userId?: string;
  userRole?: string;
  connectedAt: Date;
  lastActivity: Date;
}

interface Stats {
  totalConnections: number;
  channelSubscriptions: Record<string, number>;
  messagesBroadcast: number;
  uptime: number;
}

// ============================================
// CONFIGURATION
// ============================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET = process.env.JWT_SECRET || 'cargobit-jwt-secret-key-change-in-production';

// Channels to subscribe via pattern
const SUBSCRIBE_PATTERNS = [
  'job:*',
  'user:*',
  'transport:*',
  'tracking:*',
  'bid:*',
  'match:*',
  'dispute:*',
];

// ============================================
// CONNECTION MANAGER
// ============================================

/**
 * Connection Manager - manages WebSocket connections per channel.
 * 
 * Python equivalent:
 * ```python
 * class ConnectionManager:
 *     def __init__(self):
 *         self.channels: Dict[str, Set[WebSocket]] = {}
 * ```
 */
class ConnectionManager {
  private connections: Map<WebSocket, ClientConnection> = new Map();
  private channels: Map<string, Set<WebSocket>> = new Map();
  private messagesBroadcast = 0;
  private startTime = Date.now();

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
    options: { channels?: string[]; userId?: string; userRole?: string }
  ): Promise<void> {
    const connection: ClientConnection = {
      ws,
      channels: new Set(options.channels || []),
      userId: options.userId,
      userRole: options.userRole,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };
    
    this.connections.set(ws, connection);
    
    // Subscribe to requested channels
    for (const channel of connection.channels) {
      this.subscribeToChannel(ws, channel);
    }
    
    console.log(`[WS] Client connected. User: ${options.userId || 'anonymous'}. Total: ${this.connections.size}`);
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
    const connection = this.connections.get(ws);
    if (!connection) return;
    
    // Remove from all channels
    for (const channel of connection.channels) {
      const channelSet = this.channels.get(channel);
      if (channelSet) {
        channelSet.delete(ws);
        if (channelSet.size === 0) {
          this.channels.delete(channel);
        }
      }
    }
    
    this.connections.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${this.connections.size}`);
  }

  /**
   * Subscribe connection to additional channel.
   */
  subscribeToChannel(ws: WebSocket, channel: string): void {
    const connection = this.connections.get(ws);
    if (!connection) return;
    
    connection.channels.add(channel);
    
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(ws);
    
    console.log(`[WS] Client subscribed to ${channel}`);
    
    // Send confirmation
    this.sendToClient(ws, {
      type: 'subscribed',
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsubscribe connection from channel.
   */
  unsubscribeFromChannel(ws: WebSocket, channel: string): void {
    const connection = this.connections.get(ws);
    if (!connection) return;
    
    connection.channels.delete(channel);
    
    const channelSet = this.channels.get(channel);
    if (channelSet) {
      channelSet.delete(ws);
      if (channelSet.size === 0) {
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
    const channelSet = this.channels.get(channel);
    if (!channelSet || channelSet.size === 0) return 0;
    
    const messageStr = JSON.stringify(message);
    let sent = 0;
    
    for (const ws of Array.from(channelSet)) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
          sent++;
        } catch (error) {
          console.error('[WS] Send error:', error);
          this.disconnect(ws);
        }
      } else {
        this.disconnect(ws);
      }
    }
    
    this.messagesBroadcast += sent;
    return sent;
  }

  /**
   * Send message to single client.
   */
  sendToClient(ws: WebSocket, message: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get connection stats.
   */
  getStats(): Stats {
    const channelSubscriptions: Record<string, number> = {};
    
    for (const [channel, connections] of this.channels) {
      channelSubscriptions[channel] = connections.size;
    }
    
    return {
      totalConnections: this.connections.size,
      channelSubscriptions,
      messagesBroadcast: this.messagesBroadcast,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Get connections for a user.
   */
  getUserConnections(userId: string): WebSocket[] {
    const result: WebSocket[] = [];
    for (const [ws, conn] of this.connections) {
      if (conn.userId === userId) {
        result.push(ws);
      }
    }
    return result;
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
class RedisSubscriberLoop {
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
    if (this.running) return;
    
    this.subscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for subscriber
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
    
    // Pattern subscribe to all channels
    await this.subscriber.psubscribe(...SUBSCRIBE_PATTERNS);
    console.log(`[Redis Subscriber] Subscribed to patterns: ${SUBSCRIBE_PATTERNS.join(', ')}`);
    
    this.running = true;
    
    // Start message processing loop
    this.processMessages();
  }

  /**
   * Process incoming Redis messages.
   */
  private async processMessages(): Promise<void> {
    if (!this.subscriber) return;
    
    while (this.running) {
      try {
        // Wait for messages
        await new Promise<void>((resolve) => {
          this.subscriber!.on('pmessage', (pattern, channel, message) => {
            this.handleMessage(channel, message);
          });
          
          // Timeout to allow loop interruption
          setTimeout(resolve, 100);
        });
      } catch (error) {
        console.error('[Redis Subscriber] Message processing error:', error);
        await this.sleep(1000);
      }
    }
  }

  /**
   * Handle a single Redis message.
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// WEBSOCKET SERVER
// ============================================

export class CargoBitWebSocketServer {
  private wss: WebSocketServer | null = null;
  private manager: ConnectionManager;
  private redisLoop: RedisSubscriberLoop;

  constructor() {
    this.manager = new ConnectionManager();
    this.redisLoop = new RedisSubscriberLoop(this.manager);
  }

  /**
   * Initialize WebSocket server with HTTP server.
   * 
   * Python equivalent (FastAPI):
   * ```python
   * @app.on_event("startup")
   * async def startup_event():
   *     asyncio.create_task(redis_subscriber_loop())
   * ```
   */
  async init(server: import('http').Server): Promise<WebSocketServer> {
    this.wss = new WebSocketServer({ noServer: true });
    
    // Handle upgrade requests
    server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit('connection', ws, request);
      });
    });
    
    // Handle connections
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });
    
    // Start Redis subscriber
    await this.redisLoop.start();
    
    console.log('[WS Server] Initialized');
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
   *     
   *     try:
   *         while True:
   *             await websocket.receive_text()  # optional
   *     except WebSocketDisconnect:
   *         ws_manager.disconnect(websocket)
   * ```
   */
  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    // Parse query parameters
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const channels = url.searchParams.get('channels')?.split(',') || [];
    
    // Verify JWT and extract user info
    let userId: string | undefined;
    let userRole: string | undefined;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; role?: string };
        userId = decoded.userId;
        userRole = decoded.role;
        
        // Auto-subscribe to user's personal channel
        if (userId && !channels.includes(`user:${userId}`)) {
          channels.push(`user:${userId}`);
        }
      } catch (error) {
        console.warn('[WS] Invalid token, allowing anonymous connection');
      }
    }
    
    // Accept connection
    await this.manager.connect(ws, { channels, userId, userRole });
    
    // Handle incoming messages (client can subscribe/unsubscribe)
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        console.error('[WS] Invalid message:', error);
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
  private handleClientMessage(ws: WebSocket, message: { type: string; channel?: string }): void {
    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          this.manager.subscribeToChannel(ws, message.channel);
        }
        break;
        
      case 'unsubscribe':
        if (message.channel) {
          this.manager.unsubscribeFromChannel(ws, message.channel);
        }
        break;
        
      case 'ping':
        this.manager.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
    }
  }

  /**
   * Get server stats.
   */
  getStats(): Stats {
    return this.manager.getStats();
  }

  /**
   * Shutdown server.
   */
  async shutdown(): Promise<void> {
    await this.redisLoop.stop();
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    console.log('[WS Server] Shutdown complete');
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const wsServer = new CargoBitWebSocketServer();
export { ConnectionManager };
