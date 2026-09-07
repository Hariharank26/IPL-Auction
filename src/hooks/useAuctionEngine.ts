import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  AuctionPlayer,
  AuctionSessionFormat,
  GameMode,
  PurchasedPlayer,
  RoomState,
  RoomTeam,
  SquadValidationResult,
  TeamId
} from '../types/auction';
import { RoomService } from '../rooms/RoomService';
import { socketClient } from '../services/socketClient';
import { soundManager } from '../utils/audio';
import { nanoid } from 'nanoid';
import { TEAMS } from '../data/teams';
import {
  AUCTION_CONFIG,
  getFormatConfig,
  normalizeGameMode,
  AuctionFormatConfig
} from '../data/config';
import { validateSquad } from '../utils/squadBuilder';

interface SoldOverlayState {
  player: AuctionPlayer;
  winnerTeam: RoomTeam;
  soldPrice: number;
}

interface UnsoldOverlayState {
  player: AuctionPlayer;
}

const getInitialHomeState = (defaultFormat: AuctionSessionFormat = 'Blitz'): RoomState => {
  const normFormat = normalizeGameMode(defaultFormat);
  return {
    roomCode: 'IPL2026',
    mode: 'SINGLE',
    format: normFormat,
    status: 'HOME',
    hostSessionId: '',
    teams: {} as Record<TeamId, RoomTeam>,
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
    lastActionMessage: 'Welcome to IPL Auction 2026'
  };
};

export const useAuctionEngine = () => {
  const [mySessionId] = useState(() => nanoid(10));
  const [roomState, setRoomState] = useState<RoomState>(() => getInitialHomeState('Blitz'));
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [soldOverlayData, setSoldOverlayData] = useState<SoldOverlayState | null>(null);
  const [unsoldOverlayData, setUnsoldOverlayData] = useState<UnsoldOverlayState | null>(null);

  const prevAuctionStateRef = useRef(roomState.auctionState);
  const prevCountdownRef = useRef(roomState.countdownSeconds);

  // Active Game Mode & Configuration ('Blitz' or 'Mega')
  const gameMode: GameMode = normalizeGameMode(roomState.format);
  const formatConfig: AuctionFormatConfig = getFormatConfig(gameMode);
  const isBlitz = gameMode === 'Blitz';
  const isMega = gameMode === 'Mega';

  // Squad Building Rules & Team Size Constraints
  const squadConstraints = useMemo(() => ({
    mode: gameMode,
    name: formatConfig.name,
    badge: formatConfig.badge,
    description: formatConfig.description,
    minSquad: formatConfig.minSquad, // 5 (Blitz) vs 11 (Mega)
    maxSquad: formatConfig.maxSquad, // 7 (Blitz) vs 18 (Mega)
    playingSquadCount: formatConfig.playingSquadCount, // 5 vs 11
    matchOvers: formatConfig.matchOvers, // 10 vs 20
    startingPurseCr: formatConfig.startingPurseCr, // 50 vs 120
    startingPurseLakhs: formatConfig.startingPurseLakhs, // 5000 vs 12000
    totalPlayers: formatConfig.totalPlayers, // 60 vs 130
    lineupRules: formatConfig.lineupRules,
    overseasRuleDesc: formatConfig.overseasRuleDesc
  }), [gameMode, formatConfig]);

  // Sync audio toggle with soundManager
  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      soundManager.setEnabled(next);
      return next;
    });
  }, []);

  // Register broadcast callbacks for RoomService and Socket.IO
  useEffect(() => {
    RoomService.setBroadcastCallback((roomCode, updatedState) => {
      setRoomState({ ...updatedState });
    });

    socketClient.connect((updatedState) => {
      setRoomState({ ...updatedState });
    });
  }, []);

  // Monitor state changes for sound and overlays
  useEffect(() => {
    const prevState = prevAuctionStateRef.current;
    const currState = roomState.auctionState;

    if (prevState !== currState || roomState.status === 'RESULTS' || roomState.status === 'COMPLETED') {
      if (currState === 'PLAYER_REVEAL' || currState === 'COMPLETED' || roomState.status === 'RESULTS' || roomState.status === 'COMPLETED') {
        setSoldOverlayData(null);
        setUnsoldOverlayData(null);
        if (currState === 'PLAYER_REVEAL') {
          soundManager.playRevealSound();
        }
      } else if (currState === 'SOLD' && roomState.currentPlayer && roomState.highestBidderTeamId) {
        soundManager.playSoldSound();
        const winnerTeam = roomState.teams[roomState.highestBidderTeamId];
        if (winnerTeam) {
          setSoldOverlayData({
            player: roomState.currentPlayer,
            winnerTeam,
            soldPrice: roomState.currentBid
          });
        }
      } else if (currState === 'UNSOLD' && roomState.currentPlayer) {
        soundManager.playUnsoldSound();
        setUnsoldOverlayData({
          player: roomState.currentPlayer
        });
      }
      prevAuctionStateRef.current = currState;
    }

    // Tick sound for last 3 seconds
    if (
      roomState.auctionState === 'BIDDING' &&
      roomState.countdownSeconds <= 3 &&
      roomState.countdownSeconds > 0 &&
      roomState.countdownSeconds !== prevCountdownRef.current
    ) {
      soundManager.playTickSound();
    }
    prevCountdownRef.current = roomState.countdownSeconds;
  }, [roomState]);

  // Identify my team in the current room
  const myTeamEntry = (Object.values(roomState.teams) as RoomTeam[]).find(
    (t) => t.sessionId === mySessionId && t.controllerType === 'HUMAN'
  );
  const myTeamId = myTeamEntry?.teamId;
  const myTeam = myTeamEntry || null;

  // Actions
  const startSinglePlayer = useCallback((username: string, teamId: TeamId, format: AuctionSessionFormat = 'Blitz') => {
    const { roomState: newRoom } = RoomService.createRoom({
      mode: 'SINGLE',
      username,
      selectedTeamId: teamId,
      sessionId: mySessionId,
      format
    });
    if (newRoom) {
      setRoomState(newRoom);
      RoomService.startAuction(newRoom.roomCode, mySessionId);
    }
  }, [mySessionId]);

  const createMultiplayerRoom = useCallback((username: string, teamId: TeamId, format: AuctionSessionFormat = 'Blitz') => {
    socketClient.createRoom({
      mode: 'MULTIPLAYER',
      username,
      selectedTeamId: teamId,
      sessionId: mySessionId,
      format
    }).then((res) => {
      if (res.success && res.roomState) {
        setRoomState(res.roomState);
      } else {
        const { roomState: newRoom } = RoomService.createRoom({
          mode: 'MULTIPLAYER',
          username,
          selectedTeamId: teamId,
          sessionId: mySessionId,
          format
        });
        if (newRoom) setRoomState(newRoom);
      }
    });

    const { roomState: newRoom } = RoomService.createRoom({
      mode: 'MULTIPLAYER',
      username,
      selectedTeamId: teamId,
      sessionId: mySessionId,
      format
    });
    if (newRoom) {
      setRoomState(newRoom);
    }
  }, [mySessionId]);

  const joinMultiplayerRoom = useCallback((roomCode: string, username: string): boolean => {
    socketClient.joinRoom({
      roomCode,
      username,
      sessionId: mySessionId
    }).then((res) => {
      if (res.success && res.roomState) {
        setRoomState(res.roomState);
      }
    });

    const res = RoomService.joinRoom({
      roomCode,
      username,
      sessionId: mySessionId
    });
    if (res.roomState) {
      setRoomState({ ...res.roomState });
      return true;
    }
    return false;
  }, [mySessionId]);

  const claimTeamInLobby = useCallback((teamId: TeamId) => {
    socketClient.selectTeam({
      roomCode: roomState.roomCode,
      teamId,
      sessionId: mySessionId
    });

    const res = RoomService.selectTeam({
      roomCode: roomState.roomCode,
      teamId,
      sessionId: mySessionId
    });
    if (res.roomState) {
      setRoomState({ ...res.roomState });
    }
  }, [roomState.roomCode, mySessionId]);

  const startAuction = useCallback(() => {
    socketClient.startAuction(roomState.roomCode, mySessionId);
    RoomService.startAuction(roomState.roomCode, mySessionId);
  }, [roomState.roomCode, mySessionId]);

  const canTeamBid = useCallback((teamId: TeamId, amount: number): { canBid: boolean; reason?: string } => {
    const team = roomState.teams[teamId];
    if (!team) return { canBid: false, reason: 'Team not found' };
    if (team.squad.length >= squadConstraints.maxSquad) {
      return { canBid: false, reason: `Squad limit reached (${squadConstraints.maxSquad}/${squadConstraints.maxSquad} players)` };
    }
    if (amount > team.remainingPurse) {
      return { canBid: false, reason: 'Bid exceeds remaining purse' };
    }
    const neededForMin = Math.max(0, squadConstraints.minSquad - (team.squad.length + 1));
    const minReserveNeeded = neededForMin * 50;
    if (team.remainingPurse - amount < minReserveNeeded) {
      return {
        canBid: false,
        reason: `Purse reserve required: Keep at least ₹${(minReserveNeeded / 100).toFixed(2)} Cr for remaining players to reach minimum squad (${squadConstraints.minSquad})`
      };
    }
    return { canBid: true };
  }, [roomState.teams, squadConstraints]);

  const placeBid = useCallback((amount: number) => {
    if (!myTeamId) return;
    socketClient.placeBid({
      roomCode: roomState.roomCode,
      teamId: myTeamId,
      amount,
      sessionId: mySessionId
    });
    RoomService.placeBid({
      roomCode: roomState.roomCode,
      teamId: myTeamId,
      amount,
      sessionId: mySessionId
    });
  }, [roomState.roomCode, myTeamId, mySessionId]);

  const sendChat = useCallback((message: string, type: 'CHAT' | 'REACTION' | 'SYSTEM' = 'CHAT') => {
    const senderName = myTeam?.participantName || 'Manager';
    const teamId = myTeamId;
    socketClient.sendChat({
      roomCode: roomState.roomCode,
      senderName,
      teamId,
      message,
      type,
      sessionId: mySessionId
    });
    RoomService.sendChatMessage({
      roomCode: roomState.roomCode,
      senderName,
      teamId,
      message,
      type
    });
  }, [roomState.roomCode, myTeam, myTeamId, mySessionId]);

  const concludeAuction = useCallback(() => {
    RoomService.concludeAuction(roomState.roomCode);
  }, [roomState.roomCode]);

  const restartAuction = useCallback(() => {
    setSoldOverlayData(null);
    setUnsoldOverlayData(null);
    if (myTeamId && myTeam) {
      startSinglePlayer(myTeam.participantName || 'Manager', myTeamId, roomState.format);
    } else {
      setRoomState(getInitialHomeState(roomState.format));
    }
  }, [myTeamId, myTeam, roomState.format, startSinglePlayer]);

  const leaveRoom = useCallback(() => {
    setSoldOverlayData(null);
    setUnsoldOverlayData(null);
    setRoomState(getInitialHomeState('Blitz'));
  }, []);

  const mySquadValidation = useMemo<SquadValidationResult | null>(() => {
    if (!myTeam) return null;
    return validateSquad(myTeam.squad, gameMode);
  }, [myTeam, gameMode]);

  return {
    roomState,
    gameMode,
    isBlitz,
    isMega,
    squadConstraints,
    formatConfig,
    canTeamBid,
    validateSquad: (squad: PurchasedPlayer[]) => validateSquad(squad, gameMode),
    mySquadValidation,
    mySessionId,
    myTeamId,
    myTeam,
    teams: roomState.teams,
    currentPlayer: roomState.currentPlayer,
    currentBid: roomState.currentBid,
    highestBidderTeamId: roomState.highestBidderTeamId,
    highestBidderName: roomState.highestBidderName,
    bidHistory: roomState.bidHistory,
    lastActionMessage: roomState.lastActionMessage,
    countdownSeconds: roomState.countdownSeconds,
    soldOverlayData,
    unsoldOverlayData,
    dismissSoldOverlay: () => setSoldOverlayData(null),
    dismissUnsoldOverlay: () => setUnsoldOverlayData(null),
    isSoundEnabled,
    toggleSound,
    startSinglePlayer,
    createMultiplayerRoom,
    joinMultiplayerRoom,
    claimTeamInLobby,
    startAuction,
    placeBid,
    sendChat,
    restartAuction,
    leaveRoom,
    concludeAuction
  };
};
