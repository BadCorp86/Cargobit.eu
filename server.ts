/**
 * CargoBit WebSocket Server Entry Point
 * 
 * Standalone WebSocket server with Redis Pub/Sub.
 * Run with: npx tsx server.ts
 * 
 * Architecture:
 * API-Services: publishen Events nach Redis (PUBLISH channel payload)
 * WS-Service: subscribed auf Redis-Channels und broadcastet an Websocket-Clients
 * So skalierst du horizontal, ohne dass WS-Nodes voneinander wissen müssen.
 * 
 * Python equivalent (FastAPI):
 * ```python
 * app = FastAPI()
 * 
 * @app.on_event("startup")
 * async def startup_event():
 *     asyncio.create_task(redis_subscriber_loop())
 * ```
 */

import { createServer } from 'http';
import { wsServer } from './src/services/ws-subscriber.service';

const PORT = process.env.WS_PORT || 3001;

async function main() {
  const server = createServer((req, res) => {
    // Health check endpoint
    if (req.url === '/health') {
      const stats = wsServer.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        ...stats,
      }));
      return;
    }
    
    // Stats endpoint
    if (req.url === '/stats') {
      const stats = wsServer.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      return;
    }
    
    // Default: 404
    res.writeHead(404);
    res.end('Not found');
  });
  
  // Initialize WebSocket server
  await wsServer.init(server);
  
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  CargoBit WebSocket Server                      ║
╠════════════════════════════════════════════════════════════════╣
║  WebSocket: ws://localhost:${PORT}/ws?token=JWT                    ║
║  Health:    http://localhost:${PORT}/health                        ║
║  Stats:     http://localhost:${PORT}/stats                         ║
╠════════════════════════════════════════════════════════════════╣
║  Redis Channels:                                                ║
║  - job:*          Job status updates                           ║
║  - user:*         Personal notifications                        ║
║  - transport:*    Transport updates                             ║
║  - tracking:*     GPS tracking                                  ║
║  - bid:*          New bids                                      ║
║  - match:*        Job match notifications                       ║
║  - dispute:*      Dispute updates                               ║
╚════════════════════════════════════════════════════════════════╝
    `);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await wsServer.shutdown();
    server.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down...');
    await wsServer.shutdown();
    server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start WebSocket server:', error);
  process.exit(1);
});
