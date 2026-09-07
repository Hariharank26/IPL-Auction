import {
  BotPersonality,
  CreateRoomPayload,
  JoinRoomPayload,
  PlaceBidPayload,
  RoomMode,
  RoomState,
  RoomTeam,
  SelectTeamPayload,
  TeamId,
  AuctionSessionFormat
} from '../types/auction';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import { AUCTION_CONFIG, AUCTION_FORMAT_CONFIGS, getFormatConfig } from '../data/config';
import { AuctionEngine } from '../auction/AuctionEngine';
import { nanoid } from 'nanoid';

const BOT_PERSONALITIES: BotPersonality[] = [
  'AGGRESSIVE',
  'BALANCED',
  'VALUE_HUNTER',
  'STAR_COLLECTOR',
  'YOUTH_SCOUT'
];

export class RoomService {
  private static rooms: Map<string, RoomState> = new Map();
  private static engines: Map<string, AuctionEngine> = new Map();
  private static broadcastCallback: (roomCode: string, state: RoomState) => void = () => {};

  public static setBroadcastCallback(cb: (roomCode: string, state: RoomState) => void): void {
    this.broadcastCallback = cb;
  }

  /**
   * Creates a new auction room (Single Player or Multiplayer)
   */
  public static createRoom(payload: CreateRoomPayload): { roomState: RoomState; error?: string } {
    // Short 6-char readable room code
    const roomCode = nanoid(6).toUpperCase();
    const formatConfig = getFormatConfig(payload.format || 'Blitz');
    const format: AuctionSessionFormat = formatConfig.id;
    const startingPurse = formatConfig.startingPurseLakhs;

    // Initialize all 6 IPL teams
    const teams: Record<TeamId, RoomTeam> = {} as Record<TeamId, RoomTeam>;
    const shuffledPersonalities = [...BOT_PERSONALITIES, 'BALANCED'].sort(() => Math.random() - 0.5);

    ALL_TEAM_IDS.forEach((tId, idx) => {
      const isSelectedByCreator = tId === payload.selectedTeamId;
      teams[tId] = {
        id: `${roomCode}_${tId}`,
        teamId: tId,
        teamConfig: TEAMS[tId],
        participantName: isSelectedByCreator ? payload.username : `AI ${TEAMS[tId].shortName}`,
        controllerType: isSelectedByCreator ? 'HUMAN' : 'BOT',
        botPersonality: isSelectedByCreator ? undefined : (shuffledPersonalities[idx] as BotPersonality),
        startingPurse,
        remainingPurse: startingPurse,
        squad: [],
        isConnected: isSelectedByCreator,
        sessionId: isSelectedByCreator ? payload.sessionId : undefined
      };
    });

    const newRoom: RoomState = {
      roomCode,
      mode: payload.mode,
      format,
      status: 'LOBBY',
      hostSessionId: payload.sessionId,
      teams,
      players: [],
      auctionState: 'WAITING',
      currentPlayerIndex: 0,
      currentPlayer: null,
      currentBid: 0,
      highestBidderTeamId: null,
      highestBidderName: null,
      biddingEndsAt: 0,
      countdownSeconds: 0,
      bidHistory: [],
      lastActionMessage: 'Room created. Waiting for auction to start...'
    };

    this.rooms.set(roomCode, newRoom);

    // Create and attach Auction Engine
    const engine = new AuctionEngine(newRoom, (updatedState) => {
      this.broadcastCallback(roomCode, updatedState);
    });
    this.engines.set(roomCode, engine);

    return { roomState: newRoom };
  }

  /**
   * Retrieves room state by code
   */
  public static getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  /**
   * Joins an existing room in LOBBY mode
   */
  public static joinRoom(payload: JoinRoomPayload): { roomState?: RoomState; error?: string } {
    const code = payload.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      return { error: 'Room not found. Please check your room code.' };
    }

    // Check if player is reconnecting to an already assigned team
    const existingTeam = Object.values(room.teams).find(t => t.sessionId === payload.sessionId);
    if (existingTeam) {
      existingTeam.isConnected = true;
      existingTeam.participantName = payload.username;
      return { roomState: room };
    }

    // Find first available BOT slot if in LOBBY
    const firstBotTeam = Object.values(room.teams).find(t => t.controllerType === 'BOT');
    if (firstBotTeam && room.status === 'LOBBY') {
      firstBotTeam.controllerType = 'HUMAN';
      firstBotTeam.participantName = payload.username;
      firstBotTeam.sessionId = payload.sessionId;
      firstBotTeam.isConnected = true;
      firstBotTeam.botPersonality = undefined;
    }

    return { roomState: room };
  }

  /**
   * Allows a user to select or switch to an available team in the LOBBY
   */
  public static selectTeam(payload: SelectTeamPayload): { roomState?: RoomState; error?: string } {
    const code = payload.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      return { error: 'Room not found.' };
    }

    if (room.status !== 'LOBBY') {
      return { error: 'Cannot change teams after auction has started.' };
    }

    const targetTeam = room.teams[payload.teamId];
    if (!targetTeam) {
      return { error: 'Invalid team selected.' };
    }

    // If target team is already claimed by another human
    if (targetTeam.controllerType === 'HUMAN' && targetTeam.sessionId !== payload.sessionId) {
      return { error: `${targetTeam.teamConfig.name} is already taken by ${targetTeam.participantName}.` };
    }

    // Release any previously held team by this user
    Object.values(room.teams).forEach(t => {
      if (t.sessionId === payload.sessionId) {
        t.controllerType = 'BOT';
        t.participantName = `AI ${t.teamConfig.shortName}`;
        t.sessionId = undefined;
        t.botPersonality = 'BALANCED';
      }
    });

    // Assign new target team
    targetTeam.controllerType = 'HUMAN';
    targetTeam.participantName = 'Player';
    targetTeam.sessionId = payload.sessionId;
    targetTeam.isConnected = true;
    targetTeam.botPersonality = undefined;

    return { roomState: room };
  }

  /**
   * Starts the auction (only callable by host or in single player)
   */
  public static startAuction(roomCode: string, sessionId: string): { success: boolean; error?: string } {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);
    const engine = this.engines.get(code);

    if (!room || !engine) {
      return { success: false, error: 'Room not found.' };
    }

    if (room.hostSessionId !== sessionId && room.mode === 'MULTIPLAYER') {
      return { success: false, error: 'Only the room host can start the auction.' };
    }

    // Ensure all 6 teams are assigned (any unselected teams become AI bots)
    Object.values(room.teams).forEach((t, idx) => {
      if (t.controllerType === 'BOT' || !t.sessionId) {
        t.controllerType = 'BOT';
        t.participantName = `AI ${t.teamConfig.shortName}`;
        t.botPersonality = t.botPersonality || (BOT_PERSONALITIES[idx % BOT_PERSONALITIES.length]);
      }
    });

    engine.startAuction();
    return { success: true };
  }

  /**
   * Delegates a bid command to the authoritative AuctionEngine
   */
  public static placeBid(payload: PlaceBidPayload): { success: boolean; error?: string } {
    const code = payload.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    const engine = this.engines.get(code);

    if (!room || !engine) {
      return { success: false, error: 'Room not found.' };
    }

    const team = room.teams[payload.teamId];
    if (!team) {
      return { success: false, error: 'Team not found.' };
    }

    // Ensure the player is authorized to bid for this team
    if (team.controllerType === 'HUMAN' && team.sessionId !== payload.sessionId) {
      return { success: false, error: 'You do not control this team.' };
    }

    return engine.placeBid(payload.teamId, payload.amount, team.participantName);
  }

  /**
   * Sends a chat message or reaction
   */
  public static sendChatMessage(payload: {
    roomCode: string;
    senderName: string;
    teamId?: TeamId;
    message: string;
    type?: 'CHAT' | 'REACTION' | 'SYSTEM';
  }): { success: boolean; error?: string } {
    const code = payload.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    const engine = this.engines.get(code);

    if (!room || !engine) {
      return { success: false, error: 'Room not found.' };
    }

    engine.sendChatMessage(payload.senderName, payload.teamId, payload.message, payload.type);
    return { success: true };
  }

  /**
   * Concludes the auction immediately and triggers Top 5 rankings
   */
  public static concludeAuction(roomCode: string): { success: boolean; error?: string } {
    const code = roomCode.toUpperCase();
    const engine = this.engines.get(code);
    if (!engine) {
      return { success: false, error: 'Room not found.' };
    }
    engine.concludeAuction();
    return { success: true };
  }

  /**
   * Handles player disconnect and reconnection
   */
  public static handleDisconnect(sessionId: string): void {
    this.rooms.forEach(room => {
      Object.values(room.teams).forEach(team => {
        if (team.sessionId === sessionId) {
          team.isConnected = false;
        }
      });
    });
  }

  public static handleReconnect(sessionId: string): RoomState | undefined {
    for (const room of this.rooms.values()) {
      for (const team of Object.values(room.teams)) {
        if (team.sessionId === sessionId) {
          team.isConnected = true;
          return room;
        }
      }
    }
    return undefined;
  }
}
