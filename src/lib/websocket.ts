/**
 * CargoBit Real-time Tracking WebSocket Server
 * 
 * Features:
 * - Live transport tracking
 * - Driver location updates
 * - Status change notifications
 * - Risk alerts
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';

// ===========================================
// TYPES
// ===========================================
interface TrackingUpdate {
  transportId: string;
  location: {
    lat: number;
    lng: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  };
  status?: string;
  eta?: number;  // minutes
}

interface RiskAlert {
  transportId: string;
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  score: number;
  triggeredRules: string[];
  timestamp: string;
}

interface StatusUpdate {
  transportId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: string;
}

// ===========================================
// WEBSOCKET SERVER
// ===========================================
let io: SocketIOServer | null = null;

// Room management
const rooms = new Map<string, Set<string>>();  // transportId -> Set of socketIds

export function initWebSocketServer(httpServer: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
  });

  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    // In production, validate JWT token here
    if (!token && process.env.NODE_ENV === 'production') {
      return next(new Error('Authentication required'));
    }
    
    next();
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join transport tracking room
    socket.on('track:join', (transportId: string) => {
      socket.join(`transport:${transportId}`);
      
      if (!rooms.has(transportId)) {
        rooms.set(transportId, new Set());
      }
      rooms.get(transportId)!.add(socket.id);
      
      console.log(`📍 Client ${socket.id} joined tracking for transport ${transportId}`);
      
      // Send last known location
      socket.emit('track:init', {
        transportId,
        message: 'Connected to tracking stream',
      });
    });

    // Leave transport tracking room
    socket.on('track:leave', (transportId: string) => {
      socket.leave(`transport:${transportId}`);
      
      const room = rooms.get(transportId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(transportId);
        }
      }
      
      console.log(`📍 Client ${socket.id} left tracking for transport ${transportId}`);
    });

    // Driver sends location update
    socket.on('driver:location', async (data: TrackingUpdate) => {
      const { transportId, location } = data;
      
      // Broadcast to all clients tracking this transport
      io?.to(`transport:${transportId}`).emit('track:update', {
        transportId,
        location,
        timestamp: new Date().toISOString(),
      });

      // Store in database (async)
      try {
        const { prisma } = await import('@/lib/db');
        await prisma.trackingPoint.create({
          data: {
            transportId,
            driverId: socket.handshake.auth.driverId || 'unknown',
            latitude: location.lat,
            longitude: location.lng,
            speed: location.speed,
            heading: location.heading,
          },
        });
      } catch (error) {
        console.error('Failed to store tracking point:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      // Clean up rooms
      rooms.forEach((sockets, transportId) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            rooms.delete(transportId);
          }
        }
      });
    });
  });

  return io;
}

// ===========================================
// BROADCAST FUNCTIONS
// ===========================================

/**
 * Broadcast risk alert to all clients tracking a transport
 */
export function broadcastRiskAlert(alert: RiskAlert) {
  if (!io) return;
  
  io.to(`transport:${alert.transportId}`).emit('risk:alert', alert);
}

/**
 * Broadcast status update to all clients tracking a transport
 */
export function broadcastStatusUpdate(update: StatusUpdate) {
  if (!io) return;
  
  io.to(`transport:${update.transportId}`).emit('status:update', update);
}

/**
 * Broadcast new offer notification
 */
export function broadcastNewOffer(transportId: string, offer: any) {
  if (!io) return;
  
  io.to(`transport:${transportId}`).emit('offer:new', offer);
}

/**
 * Send notification to specific user
 */
export function sendUserNotification(userId: string, notification: any) {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('notification', notification);
}

// ===========================================
// NEXT.JS API ROUTE COMPATIBILITY
// ===========================================

// For Next.js App Router compatibility
export function getIO() {
  return io;
}

export default io;
