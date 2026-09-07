import { io, Socket } from 'socket.io-client';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  PlaceBidPayload,
  RoomState,
  SelectTeamPayload
} from '../types/auction';

class SocketClientService {
  private socket: Socket | null = null;
  private onStateCallback: ((state: RoomState) => void) | null = null;

  public connect(onStateChange: (state: RoomState) => void): Socket {
    if (this.socket && this.socket.connected) {
      this.onStateCallback = onStateChange;
      return this.socket;
    }

    this.onStateCallback = onStateChange;

    // Connect to same host/port
    this.socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Connected to IPL Auction realtime server:', this.socket?.id);
    });

    this.socket.on('auction:state', (state: RoomState) => {
      if (this.onStateCallback) {
        this.onStateCallback(state);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
    });

    return this.socket;
  }

  public createRoom(payload: CreateRoomPayload): Promise<{ success: boolean; roomState?: RoomState; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('room:create', payload, (response: any) => {
        resolve(response);
      });
    });
  }

  public joinRoom(payload: JoinRoomPayload): Promise<{ success: boolean; roomState?: RoomState; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('room:join', payload, (response: any) => {
        resolve(response);
      });
    });
  }

  public selectTeam(payload: SelectTeamPayload): Promise<{ success: boolean; roomState?: RoomState; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('team:select', payload, (response: any) => {
        resolve(response);
      });
    });
  }

  public startAuction(roomCode: string, sessionId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('auction:start', { roomCode, sessionId }, (response: any) => {
        resolve(response);
      });
    });
  }

  public placeBid(payload: PlaceBidPayload): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('auction:bid', payload, (response: any) => {
        resolve(response);
      });
    });
  }

  public sendChat(payload: {
    roomCode: string;
    senderName: string;
    teamId?: string;
    message: string;
    type?: 'CHAT' | 'REACTION' | 'SYSTEM';
    sessionId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('chat:send', payload, (response: any) => {
        resolve(response);
      });
    });
  }

  public reconnectSession(sessionId: string): Promise<{ success: boolean; roomState?: RoomState; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('session:reconnect', { sessionId }, (response: any) => {
        resolve(response);
      });
    });
  }
}

export const socketClient = new SocketClientService();
