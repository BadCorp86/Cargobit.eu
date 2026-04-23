/**
 * CargoBit WebSocket API Documentation
 * 
 * WebSocket endpoint for real-time updates.
 * Connect via: ws://localhost:3000/ws?token=JWT_TOKEN
 * 
 * Architecture:
 * ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 * │  API Services   │────▶│     Redis       │────▶│  WS Service     │
 * │  (Publisher)    │     │   Pub/Sub       │     │  (Subscriber)   │
 * └─────────────────┘     └─────────────────┘     └─────────────────┘
 *                                                          │
 *                                                          ▼
 *                                                 ┌─────────────────┐
 *                                                 │  WS Clients     │
 *                                                 │  (Browser/App)  │
 *                                                 └─────────────────┘
 * 
 * CHANNELS:
 * - job:{job_id}       - Job status updates
 * - user:{user_id}     - Personal notifications
 * - transport:{id}     - Transport updates
 * - tracking:{job_id}  - GPS tracking
 * - bid:{transport_id} - New bids
 * - dispute:{id}       - Dispute updates
 * 
 * CLIENT PROTOCOL:
 * 
 * 1. Connect with JWT:
 *    ws://localhost:3000/ws?token=YOUR_JWT_TOKEN
 * 
 * 2. Subscribe to channels:
 *    { "type": "subscribe", "channel": "job:abc123" }
 * 
 * 3. Unsubscribe from channels:
 *    { "type": "unsubscribe", "channel": "job:abc123" }
 * 
 * 4. Ping/Pong:
 *    { "type": "ping" } → { "type": "pong", "timestamp": "..." }
 * 
 * SERVER MESSAGES:
 * 
 * Connection confirmation:
 * { "type": "connected", "timestamp": "..." }
 * 
 * Subscription confirmation:
 * { "type": "subscribed", "channel": "job:abc123" }
 * 
 * Job status update:
 * {
 *   "jobId": "abc123",
 *   "status": "IN_TRANSIT",
 *   "previousStatus": "ASSIGNED",
 *   "timestamp": "2026-04-20T12:34:56Z"
 * }
 * 
 * New bid notification:
 * {
 *   "type": "NEW_BID",
 *   "transportId": "xyz789",
 *   "bidId": "bid123",
 *   "driverId": "driver456",
 *   "price": 450.00
 * }
 * 
 * Job match notification:
 * {
 *   "type": "JOB_MATCH",
 *   "transportId": "xyz789",
 *   "driverId": "driver456",
 *   "score": 0.85,
 *   "rank": 1
 * }
 * 
 * Tracking update:
 * {
 *   "jobId": "abc123",
 *   "driverId": "driver456",
 *   "latitude": 52.5200,
 *   "longitude": 13.4050,
 *   "speed": 65.5,
 *   "heading": 180
 * }
 */

// Note: Next.js API routes don't support WebSocket natively.
// Use the standalone WebSocket server in server.ts or the ws-server.service.ts

export const WS_CONFIG = {
  // WebSocket endpoint
  ENDPOINT: '/ws',
  
  // Query params
  PARAMS: {
    TOKEN: 'token',       // JWT token for authentication
    CHANNELS: 'channels', // Comma-separated channels to auto-subscribe
  },
  
  // Client message types
  CLIENT_TYPES: {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    PING: 'ping',
  },
  
  // Server message types
  SERVER_TYPES: {
    CONNECTED: 'connected',
    SUBSCRIBED: 'subscribed',
    UNSUBSCRIBED: 'unsubscribed',
    PONG: 'pong',
    ERROR: 'error',
  },
  
  // Channel patterns (Redis pattern subscribe)
  CHANNEL_PATTERNS: [
    'job:*',
    'user:*',
    'transport:*',
    'tracking:*',
    'bid:*',
    'match:*',
    'dispute:*',
  ],
};

// Example client code:
/*
// Browser/React
const ws = new WebSocket(`ws://localhost:3000/ws?token=${jwtToken}`);

ws.onopen = () => {
  // Subscribe to job updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'job:abc123'
  }));
  
  // Subscribe to personal notifications
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: `user:${userId}`
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('WebSocket message:', data);
  
  if (data.type === 'JOB_MATCH') {
    // Show notification to driver
  } else if (data.jobId) {
    // Job status update
  }
};
*/
