export type TeamId = 'MI' | 'CSK' | 'RCB' | 'SRH' | 'GT' | 'KKR';

export type PlayerRole =
  | 'BATSMAN'
  | 'WICKETKEEPER'
  | 'ALL_ROUNDER'
  | 'FAST_BOWLER'
  | 'SPIN_BOWLER';

export type PlayerType = 'LEGEND' | 'CURRENT' | 'YOUNGSTER';

export type PlayerStatus = 'WAITING' | 'ACTIVE' | 'SOLD' | 'UNSOLD';

export type BotPersonality =
  | 'AGGRESSIVE'
  | 'BALANCED'
  | 'VALUE_HUNTER'
  | 'STAR_COLLECTOR'
  | 'YOUTH_SCOUT';

export type ControllerType = 'HUMAN' | 'BOT';

export type AuctionState =
  | 'WAITING'
  | 'PLAYER_REVEAL'
  | 'BIDDING'
  | 'SOLD'
  | 'UNSOLD'
  | 'TRANSITION'
  | 'COMPLETED';

export type RoomMode = 'SINGLE_PLAYER' | 'SINGLE' | 'MULTIPLAYER';

export type GameMode = 'Blitz' | 'Mega';
export type AuctionSessionFormat = GameMode | 'MINI_7' | 'MEGA_18';

export interface SquadValidationResult {
  isQualified: boolean;
  canFieldValidLineup: boolean;
  squadCount: number;
  minSquad: number;
  maxSquad: number;
  playingSquadCount: number;
  overseasCount: number;
  maxOverseas: number;
  wicketKeepersCount: number;
  minWicketKeepers: number;
  bowlersCount: number;
  minBowlers: number;
  batsmenCount: number;
  allRoundersCount: number;
  warnings: string[];
  playingLineup: PurchasedPlayer[];
  bench: PurchasedPlayer[];
}

export interface TeamConfig {
  id: TeamId;
  name: string;
  shortName: string;
  abbr: TeamId;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  description: string;
}

export interface PlayerStats {
  matches: number;
  battingAvg?: number;
  strikeRate?: number;
  runs?: number;
  highestScore?: string;
  bowlingEconomy?: number;
  wickets?: number;
  bowlingAvg?: number;
  bestBowling?: string;
  fifties?: number;
  hundreds?: number;
}

export interface PlayerData {
  id: string;
  name: string;
  displayName: string;
  nationality: string;
  isIndian: boolean;
  isOverseas: boolean;
  role: PlayerRole;
  playerType: PlayerType;
  basePrice: number; // in lakhs: 100 = ₹1.00 Cr, 50 = ₹0.50 Cr, 200 = ₹2.00 Cr
  overallRating: number;
  battingRating: number;
  bowlingRating: number;
  fieldingRating: number;
  starRating: number; // 1 to 5
  imageUrl: string;
  stats?: PlayerStats;
}

export interface AuctionPlayer extends PlayerData {
  status: PlayerStatus;
  soldToTeamId?: TeamId;
  soldPrice?: number;
  soldToControllerName?: string;
  sequence: number;
}

export interface PurchasedPlayer {
  playerId: string;
  name: string;
  displayName: string;
  role: PlayerRole;
  playerType: PlayerType;
  overallRating: number;
  battingRating: number;
  bowlingRating: number;
  fieldingRating: number;
  starRating: number;
  isIndian: boolean;
  price: number; // in lakhs
  imageUrl: string;
}

export interface RoomTeam {
  id: string;
  teamId: TeamId;
  teamConfig: TeamConfig;
  participantName: string;
  controllerType: ControllerType;
  botPersonality?: BotPersonality;
  startingPurse: number; // 5000 lakhs = ₹50.00 Cr
  remainingPurse: number; // in lakhs
  squad: PurchasedPlayer[];
  isConnected: boolean;
  sessionId?: string;
}

export interface BidHistoryEntry {
  id: string;
  teamId: TeamId;
  teamAbbr: string;
  bidderName: string;
  amount: number; // in lakhs
  timestamp: number;
}

export interface SquadStrengthScores {
  overallScore: number;
  battingScore: number;
  bowlingScore: number;
  fieldingScore: number;
  balanceScore: number;
  valueScore: number;
  starScore: number;
  remainingPurseScore: number;
  finalWeightedScore: number;
}

export interface TeamAuctionResult {
  teamId: TeamId;
  teamConfig: TeamConfig;
  controllerName: string;
  controllerType: ControllerType;
  status: 'QUALIFIED' | 'ELIMINATED';
  squadSize: number;
  remainingPurse: number;
  top5TotalRating?: number;
  top5AvgRating?: number;
  top5TotalCost?: number;
  top5Picks?: PurchasedPlayer[];
  benchPicks?: PurchasedPlayer[];
  scores: SquadStrengthScores;
  rank: number;
  awards: string[];
}

export interface ChatMessage {
  id: string;
  senderName: string;
  teamId?: TeamId;
  teamAbbr?: string;
  message: string;
  type: 'CHAT' | 'REACTION' | 'SYSTEM';
  timestamp: number;
}

export interface RoomState {
  roomCode: string;
  mode: RoomMode;
  format: AuctionSessionFormat;
  status: 'HOME' | 'LOBBY' | 'ACTIVE' | 'AUCTION' | 'COMPLETED' | 'RESULTS';
  hostSessionId: string;
  teams: Record<TeamId, RoomTeam>;
  players: AuctionPlayer[];
  auctionState: AuctionState;
  currentPlayerIndex: number;
  currentPlayer: AuctionPlayer | null;
  currentBid: number; // in lakhs
  highestBidderTeamId: TeamId | null;
  highestBidderName: string | null;
  biddingEndsAt: number; // Unix timestamp ms
  countdownSeconds: number;
  bidHistory: BidHistoryEntry[];
  results?: TeamAuctionResult[];
  lastActionMessage?: string;
  isAcceleratedRound?: boolean;
  chatMessages?: ChatMessage[];
  completionReason?: 'ALL_PLAYERS_COMPLETED' | 'ALL_TEAMS_FULL' | 'MANUAL_CONCLUDED';
}

export interface SendChatPayload {
  roomCode: string;
  teamId?: TeamId;
  senderName: string;
  message: string;
  type?: 'CHAT' | 'REACTION' | 'SYSTEM';
  sessionId: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  username: string;
  sessionId: string;
}

export interface CreateRoomPayload {
  mode: RoomMode;
  format?: AuctionSessionFormat;
  username: string;
  sessionId: string;
  selectedTeamId: TeamId;
}

export interface SelectTeamPayload {
  roomCode: string;
  teamId: TeamId;
  sessionId: string;
}

export interface PlaceBidPayload {
  roomCode: string;
  teamId: TeamId;
  amount: number;
  sessionId: string;
}
