import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Types
interface User {
  id: string
  name: string
  role: 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'SHIPPER' | 'SUPPORT'
  companyName?: string
}

interface TrackingUpdate {
  shipmentId: string
  lat: number
  lng: number
  speed?: number
  heading?: number
  timestamp: Date
  locationName?: string
}

interface AuctionUpdate {
  auctionId: string
  type: 'new_bid' | 'auction_ended' | 'auction_started' | 'auction_cancelled'
  data: {
    amount?: number
    bidderName?: string
    winnerId?: string
    winnerName?: string
  }
}

interface Notification {
  userId: string
  type: 'shipment' | 'auction' | 'express' | 'system' | 'chat'
  title: string
  message: string
  data?: Record<string, unknown>
}

// Connected users map
const connectedUsers = new Map<string, { user: User; socketId: string }>()

// Room subscriptions
const trackingRooms = new Map<string, Set<string>>() // shipmentId -> Set of socketIds
const auctionRooms = new Map<string, Set<string>>() // auctionId -> Set of socketIds

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9)

// Log with timestamp
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// Handle connection
io.on('connection', (socket: Socket) => {
  log(`Client connected: ${socket.id}`)

  // ============================================
  // Authentication
  // ============================================
  socket.on('authenticate', (data: { user: User; token: string }) => {
    const { user, token } = data

    // In production, validate the token here
    // For now, we trust the client-provided user info

    // Store user info
    connectedUsers.set(socket.id, { user, socketId: socket.id })

    // Join user-specific room for notifications
    socket.join(`user:${user.id}`)

    // Join role-specific room
    socket.join(`role:${user.role}`)

    log(`User authenticated: ${user.name} (${user.role})`)

    socket.emit('authenticated', {
      success: true,
      message: 'Successfully authenticated'
    })
  })

  // ============================================
  // GPS Tracking
  // ============================================

  // Subscribe to shipment tracking
  socket.on('subscribe:tracking', (data: { shipmentId: string }) => {
    const { shipmentId } = data

    if (!trackingRooms.has(shipmentId)) {
      trackingRooms.set(shipmentId, new Set())
    }
    trackingRooms.get(shipmentId)!.add(socket.id)

    socket.join(`tracking:${shipmentId}`)

    log(`Client ${socket.id} subscribed to tracking: ${shipmentId}`)

    socket.emit('subscribed:tracking', { shipmentId, success: true })
  })

  // Unsubscribe from shipment tracking
  socket.on('unsubscribe:tracking', (data: { shipmentId: string }) => {
    const { shipmentId } = data

    socket.leave(`tracking:${shipmentId}`)

    const room = trackingRooms.get(shipmentId)
    if (room) {
      room.delete(socket.id)
      if (room.size === 0) {
        trackingRooms.delete(shipmentId)
      }
    }

    log(`Client ${socket.id} unsubscribed from tracking: ${shipmentId}`)
  })

  // Receive GPS update from driver
  socket.on('tracking:update', (data: TrackingUpdate) => {
    const { shipmentId, lat, lng, speed, heading, timestamp, locationName } = data

    // Broadcast to all subscribers
    io.to(`tracking:${shipmentId}`).emit('tracking:position', {
      shipmentId,
      lat,
      lng,
      speed,
      heading,
      timestamp: timestamp || new Date(),
      locationName,
    })

    log(`Tracking update for shipment ${shipmentId}: ${lat}, ${lng}`)
  })

  // ============================================
  // Auction System
  // ============================================

  // Subscribe to auction updates
  socket.on('subscribe:auction', (data: { auctionId: string }) => {
    const { auctionId } = data

    if (!auctionRooms.has(auctionId)) {
      auctionRooms.set(auctionId, new Set())
    }
    auctionRooms.get(auctionId)!.add(socket.id)

    socket.join(`auction:${auctionId}`)

    log(`Client ${socket.id} subscribed to auction: ${auctionId}`)

    socket.emit('subscribed:auction', { auctionId, success: true })
  })

  // Unsubscribe from auction
  socket.on('unsubscribe:auction', (data: { auctionId: string }) => {
    const { auctionId } = data

    socket.leave(`auction:${auctionId}`)

    const room = auctionRooms.get(auctionId)
    if (room) {
      room.delete(socket.id)
      if (room.size === 0) {
        auctionRooms.delete(auctionId)
      }
    }

    log(`Client ${socket.id} unsubscribed from auction: ${auctionId}`)
  })

  // New bid placed (called by API after database update)
  socket.on('auction:bid', (data: AuctionUpdate) => {
    const { auctionId, type, data: bidData } = data

    // Broadcast to all auction subscribers
    io.to(`auction:${auctionId}`).emit('auction:update', {
      auctionId,
      type,
      data: bidData,
      timestamp: new Date(),
    })

    log(`Auction ${auctionId} update: ${type}`)
  })

  // Auction ended notification
  socket.on('auction:end', (data: { auctionId: string; winnerId?: string; winnerName?: string; winningBid: number }) => {
    const { auctionId, winnerId, winnerName, winningBid } = data

    // Broadcast to all auction subscribers
    io.to(`auction:${auctionId}`).emit('auction:ended', {
      auctionId,
      winnerId,
      winnerName,
      winningBid,
      timestamp: new Date(),
    })

    // Notify winner specifically
    if (winnerId) {
      io.to(`user:${winnerId}`).emit('notification', {
        type: 'auction',
        title: 'Auktion gewonnen!',
        message: `Sie haben die Auktion für ${winningBid} EUR gewonnen.`,
        data: { auctionId, winningBid },
      })
    }

    log(`Auction ${auctionId} ended. Winner: ${winnerName || 'None'}`)
  })

  // ============================================
  // Notifications
  // ============================================

  // Send notification to specific user (called by API)
  socket.on('notification:send', (data: Notification) => {
    const { userId, type, title, message, data: notificationData } = data

    io.to(`user:${userId}`).emit('notification', {
      type,
      title,
      message,
      data: notificationData,
      timestamp: new Date(),
    })

    log(`Notification sent to user ${userId}: ${title}`)
  })

  // Broadcast to all users of a role
  socket.on('notification:broadcast:role', (data: { role: string; type: string; title: string; message: string }) => {
    const { role, type, title, message } = data

    io.to(`role:${role}`).emit('notification', {
      type,
      title,
      message,
      timestamp: new Date(),
    })

    log(`Broadcast to role ${role}: ${title}`)
  })

  // ============================================
  // Express Transport Alerts
  // ============================================

  // New express transport created
  socket.on('express:new', (data: { expressId: string; pickupPlace: string; deliveryPlace: string; weight: number; price: number; expiresAt: Date }) => {
    // Notify all dispatchers and drivers
    io.to('role:DISPATCHER').emit('express:alert', {
      ...data,
      timestamp: new Date(),
    })
    io.to('role:DRIVER').emit('express:alert', {
      ...data,
      timestamp: new Date(),
    })

    log(`New express transport alert: ${data.pickupPlace} -> ${data.deliveryPlace}`)
  })

  // Express transport accepted
  socket.on('express:accepted', (data: { expressId: string; acceptedBy: string; acceptedByName: string }) => {
    const { expressId, acceptedBy, acceptedByName } = data

    // Notify all subscribers
    io.to(`express:${expressId}`).emit('express:update', {
      expressId,
      status: 'accepted',
      acceptedBy,
      acceptedByName,
      timestamp: new Date(),
    })

    log(`Express transport ${expressId} accepted by ${acceptedByName}`)
  })

  // ============================================
  // Chat System
  // ============================================

  // Join a chat room
  socket.on('chat:join', (data: { roomId: string; user: User }) => {
    const { roomId, user } = data

    socket.join(`chat:${roomId}`)

    // Notify others in the room
    socket.to(`chat:${roomId}`).emit('chat:user_joined', {
      userId: user.id,
      userName: user.name,
      timestamp: new Date(),
    })

    log(`User ${user.name} joined chat room ${roomId}`)
  })

  // Leave a chat room
  socket.on('chat:leave', (data: { roomId: string; user: User }) => {
    const { roomId, user } = data

    socket.leave(`chat:${roomId}`)

    socket.to(`chat:${roomId}`).emit('chat:user_left', {
      userId: user.id,
      userName: user.name,
      timestamp: new Date(),
    })

    log(`User ${user.name} left chat room ${roomId}`)
  })

  // Send chat message
  socket.on('chat:message', (data: { roomId: string; senderId: string; senderName: string; message: string }) => {
    const { roomId, senderId, senderName, message } = data

    io.to(`chat:${roomId}`).emit('chat:message', {
      id: generateId(),
      roomId,
      senderId,
      senderName,
      message,
      timestamp: new Date(),
    })

    log(`Chat message in ${roomId} from ${senderName}: ${message.substring(0, 50)}...`)
  })

  // Typing indicator
  socket.on('chat:typing', (data: { roomId: string; userId: string; userName: string }) => {
    const { roomId, userId, userName } = data

    socket.to(`chat:${roomId}`).emit('chat:typing', {
      roomId,
      userId,
      userName,
    })
  })

  // ============================================
  // Admin Events
  // ============================================

  // Admin broadcast to all users
  socket.on('admin:broadcast', (data: { title: string; message: string; type: string }) => {
    const userInfo = connectedUsers.get(socket.id)

    if (userInfo?.user.role !== 'ADMIN') {
      socket.emit('error', { message: 'Unauthorized' })
      return
    }

    io.emit('notification', {
      type: data.type || 'system',
      title: data.title,
      message: data.message,
      timestamp: new Date(),
    })

    log(`Admin broadcast: ${data.title}`)
  })

  // ============================================
  // Disconnect
  // ============================================
  socket.on('disconnect', () => {
    const userInfo = connectedUsers.get(socket.id)

    if (userInfo) {
      const { user } = userInfo

      // Remove from all tracking rooms
      trackingRooms.forEach((sockets, shipmentId) => {
        sockets.delete(socket.id)
      })

      // Remove from all auction rooms
      auctionRooms.forEach((sockets, auctionId) => {
        sockets.delete(socket.id)
      })

      log(`User disconnected: ${user.name} (${user.role})`)
    } else {
      log(`Client disconnected: ${socket.id}`)
    }

    connectedUsers.delete(socket.id)
  })

  // Error handling
  socket.on('error', (error) => {
    log(`Socket error (${socket.id}): ${error.message}`)
  })
})

// Start server
const PORT = 3003
httpServer.listen(PORT, () => {
  log(`WebSocket server running on port ${PORT}`)
  log('Available events:')
  log('  - authenticate')
  log('  - subscribe:tracking / unsubscribe:tracking')
  log('  - tracking:update')
  log('  - subscribe:auction / unsubscribe:auction')
  log('  - auction:bid / auction:end')
  log('  - notification:send / notification:broadcast:role')
  log('  - express:new / express:accepted')
  log('  - chat:join / chat:leave / chat:message / chat:typing')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    log('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    log('WebSocket server closed')
    process.exit(0)
  })
})
