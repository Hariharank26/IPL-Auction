import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { RoomService } from './src/rooms/RoomService';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  PlaceBidPayload,
  SelectTeamPayload
} from './src/types/auction';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // Create HTTP & Socket.IO server
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Register broadcast callback from RoomService
  RoomService.setBroadcastCallback((roomCode, state) => {
    io.to(roomCode.toUpperCase()).emit('auction:state', state);
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Create a new room (Single Player or Multiplayer)
    socket.on('room:create', (payload: CreateRoomPayload, callback) => {
      try {
        const { roomState, error } = RoomService.createRoom(payload);
        if (error || !roomState) {
          return callback && callback({ success: false, error });
        }

        socket.join(roomState.roomCode);
        callback && callback({ success: true, roomState });
        io.to(roomState.roomCode).emit('auction:state', roomState);
      } catch (err: any) {
        callback && callback({ success: false, error: err?.message || 'Server error creating room' });
      }
    });

    // Join room
    socket.on('room:join', (payload: JoinRoomPayload, callback) => {
      try {
        const { roomState, error } = RoomService.joinRoom(payload);
        if (error || !roomState) {
          return callback && callback({ success: false, error });
        }

        socket.join(roomState.roomCode);
        callback && callback({ success: true, roomState });
        io.to(roomState.roomCode).emit('auction:state', roomState);
      } catch (err: any) {
        callback && callback({ success: false, error: err?.message || 'Server error joining room' });
      }
    });

    // Select/claim an available team in lobby
    socket.on('team:select', (payload: SelectTeamPayload, callback) => {
      try {
        const { roomState, error } = RoomService.selectTeam(payload);
        if (error || !roomState) {
          return callback && callback({ success: false, error });
        }

        callback && callback({ success: true, roomState });
        io.to(roomState.roomCode).emit('auction:state', roomState);
      } catch (err: any) {
        callback && callback({ success: false, error: err?.message || 'Server error selecting team' });
      }
    });

    // Start auction
    socket.on('auction:start', ({ roomCode, sessionId }: { roomCode: string; sessionId: string }, callback) => {
      try {
        const result = RoomService.startAuction(roomCode, sessionId);
        if (!result.success) {
          return callback && callback({ success: false, error: result.error });
        }
        callback && callback({ success: true });
      } catch (err: any) {
        callback && callback({ success: false, error: err?.message || 'Server error starting auction' });
      }
    });

    // Place a bid
    socket.on('auction:bid', (payload: PlaceBidPayload, callback) => {
      try {
        const result = RoomService.placeBid(payload);
        if (!result.success) {
          return callback && callback({ success: false, error: result.error });
        }
        callback && callback({ success: true });
      } catch (err: any) {
        callback && callback({ success: false, error: err?.message || 'Server error placing bid' });
      }
    });

    // Chat / Reaction
    socket.on('chat:send', (payload: any, callback) => {
      try {
        const result = RoomService.sendChatMessage(payload);
        if (!result.success) {
          return callback && callback({ success: false, error: result.error });
        }
        callback && callback({ success: true });
      } catch (err: any) {
        callback && callback({ success: false, error: err?.message || 'Server error sending chat' });
      }
    });

    // Session reconnect
    socket.on('session:reconnect', ({ sessionId }: { sessionId: string }, callback) => {
      try {
        const roomState = RoomService.handleReconnect(sessionId);
        if (roomState) {
          socket.join(roomState.roomCode);
          callback && callback({ success: true, roomState });
          io.to(roomState.roomCode).emit('auction:state', roomState);
        } else {
          callback && callback({ success: false, error: 'Session not found' });
        }
      } catch (err: any) {
        callback && callback({ success: false, error: 'Reconnection error' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  // Vite middleware for development or Express static for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🏏 IPL Auction Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
