import { TeamId, PlayerRole, PurchasedPlayer } from './auction';

export interface SimulatedPlayerStats {
  playerId: string;
  name: string;
  displayName: string;
  role: PlayerRole;
  teamId: TeamId;
  imageUrl: string;
  isIndian: boolean;
  matches: number;
  runs: number;
  ballsFaced: number;
  highestScore: number;
  highestScoreNotOut: boolean;
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  battingAvg: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  maidens: number;
  economy: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  threeWickets: number;
  fiveWickets: number;
  mvpPoints: number;
}

export interface InningsTopBatter {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isNotOut: boolean;
}

export interface InningsTopBowler {
  playerId: string;
  name: string;
  wickets: number;
  runs: number;
  overs: number;
  maidens: number;
}

export interface InningsScore {
  teamId: TeamId;
  runs: number;
  wickets: number;
  overs: number; // e.g. 20.0 or 19.3
  runRate: number;
  topBatters: InningsTopBatter[];
  topBowlers: InningsTopBowler[];
}

export type MatchStage = 'LEAGUE' | 'QUALIFIER_1' | 'ELIMINATOR' | 'QUALIFIER_2' | 'FINAL';

export interface SimulatedMatch {
  id: string;
  matchNumber: number;
  stage: MatchStage;
  title: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  venue: string;
  tossWinnerId: TeamId;
  tossDecision: 'BAT' | 'BOWL';
  innings1: InningsScore;
  innings2: InningsScore;
  winnerTeamId: TeamId;
  marginText: string; // e.g. "CSK WON BY 6 RUNS"
  potm: {
    playerId: string;
    name: string;
    teamId: TeamId;
    performance: string;
  };
  isCompleted: boolean;
}

export interface PointsTableEntry {
  teamId: TeamId;
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
  form: Array<'W' | 'L'>;
}

export interface TeamRoster {
  teamId: TeamId;
  players: PurchasedPlayer[];
}
