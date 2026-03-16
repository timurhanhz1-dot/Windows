import WebSocket from 'ws';
import Redis from 'ioredis';
import http from 'http';

interface Client {
  id: string;
  userId: string;
  ws: WebSocket;
  rooms: Set<string>;
  lastPing: number;
}

interface Message {
  type: string;
  payload: any;
  room?: string;
  userId?: string;
  timestamp: number;
}

class WebSocketServer {
  private wss: WebSocket.Server;
  private redis: Redis;
  private clients: Map<string, Client> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private port: number;

  constructor(port: number = 8080) {
    this.port = port;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    const server = http.createServer();
    this.wss = new WebSocket.Server({ server });
    
    this.setupWebSocketServer();
    this.setupRedis();
    this.startHeartbeat();
    
    server.listen(port, () => {
      console.log(`WebSocket server running on port ${port}`);
    });
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateId();
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId') || 'anonymous';
      
      const client: Client = {
        id: clientId,
        userId,
        ws,
        rooms: new Set(),
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);
      
      ws.on('message', (data: string) => {
        this.handleMessage(client, JSON.parse(data));
      });

      ws.on('close', () => {
        this.handleDisconnect(client);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      this.sendToClient(client, {
        type: 'connected',
        payload: { clientId, userId },
        timestamp: Date.now()
      });
    });
  }

  private setupRedis() {
    // Subscribe to Redis channels for cross-instance communication
    this.redis.subscribe('natureco:websocket:broadcast');
    this.redis.subscribe('natureco:websocket:room:*');
    
    this.redis.on('message', (channel, message) => {
      const data = JSON.parse(message);
      
      if (channel === 'natureco:websocket:broadcast') {
        this.broadcast(data.type, data.payload, data.excludeUserId);
      } else if (channel.startsWith('natureco:websocket:room:')) {
        const room = channel.split(':').pop();
        this.sendToRoom(room, data.type, data.payload, data.excludeUserId);
      }
    });
  }

  private handleMessage(client: Client, message: Message) {
    switch (message.type) {
      case 'join_room':
        this.joinRoom(client, message.payload.room);
        break;
      case 'leave_room':
        this.leaveRoom(client, message.payload.room);
        break;
      case 'message':
        this.handleChatMessage(client, message);
        break;
      case 'ping':
        this.handlePing(client);
        break;
      case 'typing':
        this.handleTyping(client, message);
        break;
      case 'live_stream':
        this.handleLiveStream(client, message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private joinRoom(client: Client, room: string) {
    if (!client.rooms.has(room)) {
      client.rooms.add(room);
      
      if (!this.rooms.has(room)) {
        this.rooms.set(room, new Set());
      }
      this.rooms.get(room)!.add(client.id);
      
      // Notify others in room
      this.sendToRoom(room, 'user_joined', {
        userId: client.userId,
        userCount: this.rooms.get(room)?.size || 0
      }, client.userId);
      
      // Send room info to client
      this.sendToClient(client, {
        type: 'room_joined',
        payload: { room, userCount: this.rooms.get(room)?.size || 0 },
        timestamp: Date.now()
      });
    }
  }

  private leaveRoom(client: Client, room: string) {
    if (client.rooms.has(room)) {
      client.rooms.delete(room);
      this.rooms.get(room)?.delete(client.id);
      
      if (this.rooms.get(room)?.size === 0) {
        this.rooms.delete(room);
      } else {
        // Notify others in room
        this.sendToRoom(room, 'user_left', {
          userId: client.userId,
          userCount: this.rooms.get(room)?.size || 0
        }, client.userId);
      }
    }
  }

  private handleChatMessage(client: Client, message: Message) {
    const chatMessage = {
      id: this.generateId(),
      userId: client.userId,
      content: message.payload.content,
      room: message.payload.room,
      timestamp: Date.now()
    };

    // Store in Redis for persistence
    this.redis.lpush(`chat:${message.payload.room}`, JSON.stringify(chatMessage));
    this.redis.ltrim(`chat:${message.payload.room}`, 0, 999); // Keep last 1000 messages

    // Broadcast to room
    this.sendToRoom(message.payload.room, 'chat_message', chatMessage);
    
    // Also broadcast to Redis for other instances
    this.redis.publish('natureco:websocket:room:' + message.payload.room, JSON.stringify({
      type: 'chat_message',
      payload: chatMessage,
      excludeUserId: client.userId
    }));
  }

  private handleTyping(client: Client, message: Message) {
    this.sendToRoom(message.payload.room, 'typing', {
      userId: client.userId,
      isTyping: message.payload.isTyping
    }, client.userId);
  }

  private handleLiveStream(client: Client, message: Message) {
    const streamData = {
      streamId: message.payload.streamId,
      userId: client.userId,
      action: message.payload.action, // start, stop, viewer_join, viewer_leave
      timestamp: Date.now()
    };

    // Broadcast to all instances
    this.redis.publish('natureco:websocket:broadcast', JSON.stringify({
      type: 'live_stream',
      payload: streamData
    }));
  }

  private handlePing(client: Client) {
    client.lastPing = Date.now();
    this.sendToClient(client, {
      type: 'pong',
      payload: { timestamp: Date.now() },
      timestamp: Date.now()
    });
  }

  private handleDisconnect(client: Client) {
    // Leave all rooms
    client.rooms.forEach(room => {
      this.leaveRoom(client, room);
    });
    
    this.clients.delete(client);
  }

  private sendToClient(client: Client, message: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private sendToRoom(room: string, type: string, payload: any, excludeUserId?: string) {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client && client.userId !== excludeUserId) {
          this.sendToClient(client, {
            type,
            payload,
            timestamp: Date.now()
          });
        }
      });
    }
  }

  private broadcast(type: string, payload: any, excludeUserId?: string) {
    this.clients.forEach(client => {
      if (client.userId !== excludeUserId) {
        this.sendToClient(client, {
          type,
          payload,
          timestamp: Date.now()
        });
      }
    });
  }

  private startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > 30000) { // 30 seconds timeout
          client.ws.terminate();
          this.handleDisconnect(client);
        }
      });
    }, 10000); // Check every 10 seconds
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Start server
const server = new WebSocketServer(parseInt(process.env.WS_PORT || '8080'));

export default server;
