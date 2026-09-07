import { TeamId, AuctionSessionFormat } from './auction';

export interface PlayerBattingScore {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissal?: string;
}

export interface PlayerBowlingScore {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  dots: number;
}

export interface MatchTeamInnings {
  teamId: TeamId;
  teamName: string;
  totalRuns: number;
  totalWickets: number;
  oversPlayed: number; // e.g. 19.4 or 10.0
  maxOvers: number; // 10 or 20
  batting: PlayerBattingScore[];
  bowling: PlayerBowlingScore[];
}

export type MatchStage = 'LEAGUE' | 'QUALIFIER_1' | 'ELIMINATOR' | 'QUALIFIER_2' | 'FINAL';

export interface SimulatedMatch {
  id: string;
  matchNumber: number;
  stage: MatchStage;
  stageLabel: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeInnings?: MatchTeamInnings;
  awayInnings?: MatchTeamInnings;
  winnerTeamId?: TeamId | 'TIE';
  marginText?: string;
  playerOfTheMatch?: {
    playerId: string;
    name: string;
    teamId: TeamId;
    summary: string;
  };
  isCompleted: boolean;
}

export interface PointsTableEntry {
  teamId: TeamId;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  netRunRate: number;
  runsScored: number;
  oversFaced: number;
  runsConceded: number;
  oversBowled: number;
  form: ('W' | 'L' | 'T')[];
}

export interface OrangeCapLeader {
  playerId: string;
  name: string;
  teamId: TeamId;
  runs: number;
  matches: number;
  highestScore: number;
  strikeRate: number;
  fours: number;
  sixes: number;
}

export interface PurpleCapLeader {
  playerId: string;
  name: string;
  teamId: TeamId;
  wickets: number;
  matches: number;
  economy: number;
  bestBowling: string;
}

export interface MVPLeader {
  playerId: string;
  name: string;
  teamId: TeamId;
  mvpPoints: number;
  runs: number;
  wickets: number;
  summary: string;
}

export interface SeasonState {
  format: AuctionSessionFormat;
  matchOvers: number; // 10 for MINI_7, 20 for MEGA_18
  playingSquadCount: number; // 5 for MINI_7, 11 for MEGA_18
  matches: SimulatedMatch[];
  currentMatchIndex: number;
  pointsTable: PointsTableEntry[];
  orangeCapList: OrangeCapLeader[];
  purpleCapList: PurpleCapLeader[];
  mvpList: MVPLeader[];
  isSeasonCompleted: boolean;
  championTeamId?: TeamId;
  runnerUpTeamId?: TeamId;
}
