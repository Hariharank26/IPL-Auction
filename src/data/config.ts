import { AuctionSessionFormat, GameMode } from '../types/auction';

export interface AuctionFormatConfig {
  id: GameMode;
  name: string;
  badge: string;
  description: string;
  startingPurseLakhs: number; // 5000 (₹50 Cr) vs 12000 (₹120 Cr)
  startingPurseCr: number; // 50 vs 120
  minSquad: number; // 5 vs 11
  maxSquad: number; // 7 vs 18
  totalPlayers: number; // 60 vs 130
  matchOvers: number; // 10 vs 20
  playingSquadCount: number; // 5 vs 11
  overseasRuleDesc: string;
  lineupRules: {
    maxOverseas: number;
    minWicketKeepers: number;
    minBowlers: number;
  };
}

export const BLITZ_FORMAT_CONFIG: AuctionFormatConfig = {
  id: 'Blitz',
  name: 'Blitz',
  badge: '7 PLAYERS • 10 OVERS • 5-PLAYER PLAYING SQUAD',
  description: 'Fast-paced 7-player squad (min 5) with ₹50 Cr purse from 60 star players. Followed by high-octane 10-over matches with a 5-player playing squad!',
  startingPurseLakhs: 5000,
  startingPurseCr: 50,
  minSquad: 5,
  maxSquad: 7,
  totalPlayers: 60,
  matchOvers: 10,
  playingSquadCount: 5,
  overseasRuleDesc: 'Max 3 Overseas players in Playing Squad',
  lineupRules: {
    maxOverseas: 3,
    minWicketKeepers: 1,
    minBowlers: 1,
  }
};

export const MEGA_FORMAT_CONFIG: AuctionFormatConfig = {
  id: 'Mega',
  name: 'Mega',
  badge: '18 PLAYERS • 20 OVERS • 11-PLAYER PLAYING XI',
  description: 'Full 18-player squad (min 11) with ₹120 Cr purse from 130 star players. Full 20-over matches with Playing XI selection (Max 4 Overseas, 1+ Wicketkeeper, 2+ Bowlers)!',
  startingPurseLakhs: 12000,
  startingPurseCr: 120,
  minSquad: 11,
  maxSquad: 18,
  totalPlayers: 130,
  matchOvers: 20,
  playingSquadCount: 11,
  overseasRuleDesc: 'Official IPL Rule: Max 4 Overseas in Playing XI',
  lineupRules: {
    maxOverseas: 4,
    minWicketKeepers: 1,
    minBowlers: 2,
  }
};

export const AUCTION_FORMAT_CONFIGS: Record<string, AuctionFormatConfig> = {
  Blitz: BLITZ_FORMAT_CONFIG,
  Mega: MEGA_FORMAT_CONFIG,
  MINI_7: BLITZ_FORMAT_CONFIG,
  MEGA_18: MEGA_FORMAT_CONFIG,
};

export function normalizeGameMode(format?: string | null): GameMode {
  if (!format) return 'Blitz';
  if (format === 'Mega' || format === 'MEGA_18') return 'Mega';
  return 'Blitz';
}

export function getFormatConfig(format?: string | null): AuctionFormatConfig {
  const mode = normalizeGameMode(format);
  return AUCTION_FORMAT_CONFIGS[mode];
}

export const AUCTION_CONFIG = {
  STARTING_PURSE_LAKHS: 5000, // ₹50.00 Cr default (Quick session)
  MIN_SQUAD: 5,
  MAX_SQUAD: 7,
  TOTAL_PLAYERS: 60,
  INDIAN_COUNT: 40,
  OVERSEAS_COUNT: 20,
  TIMERS: {
    REVEAL_SECONDS: 3,
    BIDDING_SECONDS: 12,
    LATE_BID_EXTENSION_SECONDS: 4,
    SOLD_TRANSITION_SECONDS: 4,
    UNSOLD_TRANSITION_SECONDS: 3,
  },
  RESULT_WEIGHTS: {
    OVERALL_QUALITY: 0.50,
    SQUAD_BALANCE: 0.20,
    VALUE_EFFICIENCY: 0.15,
    STAR_IMPACT: 0.10,
    REMAINING_PURSE: 0.05,
  },
};

/**
 * Converts lakhs integer (e.g. 750) to formatted crore text: "₹7.50 Cr"
 */
export function formatCurrencyCr(lakhs: number): string {
  const crores = lakhs / 100;
  return `₹${crores.toFixed(2)} Cr`;
}

/**
 * Converts crores (number) to lakhs integer
 */
export function croresToLakhs(crores: number): number {
  return Math.round(crores * 100);
}

/**
 * Given the current bid in lakhs, returns the required next minimum bid in lakhs.
 * ₹0.5 Cr – ₹5 Cr: ₹0.25 Cr increment (25 lakhs)
 * ₹5 Cr – ₹10 Cr: ₹0.5 Cr increment (50 lakhs)
 * Above ₹10 Cr: ₹1 Cr increment (100 lakhs)
 */
export function getNextRequiredBidLakhs(currentBidLakhs: number, basePriceLakhs: number): number {
  if (currentBidLakhs === 0) {
    return basePriceLakhs;
  }
  let increment = 25;
  if (currentBidLakhs >= 1000) {
    increment = 100;
  } else if (currentBidLakhs >= 500) {
    increment = 50;
  }
  return currentBidLakhs + increment;
}

/**
 * Returns available bid options for a team given their remaining purse and current bid
 */
export function getAvailableBidOptions(currentBidLakhs: number, basePriceLakhs: number, remainingPurseLakhs: number): number[] {
  const minNext = getNextRequiredBidLakhs(currentBidLakhs, basePriceLakhs);
  if (minNext > remainingPurseLakhs) {
    return [];
  }
  const options: number[] = [minNext];
  
  // Provide 3 incremental bidding buttons (e.g. Min next, +0.5 Cr, +1 Cr)
  let secondOption = minNext + (minNext >= 500 ? 50 : 25);
  let thirdOption = minNext + (minNext >= 1000 ? 100 : 50);
  
  if (secondOption <= remainingPurseLakhs && !options.includes(secondOption)) {
    options.push(secondOption);
  }
  if (thirdOption <= remainingPurseLakhs && !options.includes(thirdOption)) {
    options.push(thirdOption);
  }
  return options;
}
