import { PurchasedPlayer, AuctionSessionFormat, SquadValidationResult } from '../types/auction';
import { AUCTION_FORMAT_CONFIGS, normalizeGameMode, getFormatConfig } from '../data/config';

export interface PlayingSquadSelection {
  playingLineup: PurchasedPlayer[];
  bench: PurchasedPlayer[];
  overseasCount: number;
  wicketKeeperCount: number;
  bowlerCount: number;
  allRounderCount: number;
  batsmanCount: number;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Automatically selects the strongest tactical Playing Lineup according to format rules:
 * - Mega (18 players): 11 playing squad, Max 4 Overseas, Min 1 Wicketkeeper, Min 2 Bowlers
 * - Blitz (7 players): 5 playing squad, Max 3 Overseas, Min 1 Wicketkeeper, Min 1 Bowler
 */
export function autoSelectPlayingLineup(
  squad: PurchasedPlayer[],
  format: AuctionSessionFormat = 'Blitz'
): PlayingSquadSelection {
  const mode = normalizeGameMode(format);
  const isMega = mode === 'Mega';
  const targetCount = isMega ? 11 : 5;
  const maxOverseas = isMega ? 4 : 3;

  if (squad.length <= targetCount) {
    const overseasCount = squad.filter(p => !p.isIndian).length;
    const wicketKeeperCount = squad.filter(p => p.role === 'WICKETKEEPER').length;
    const bowlerCount = squad.filter(p => p.role === 'FAST_BOWLER' || p.role === 'SPIN_BOWLER').length;
    const allRounderCount = squad.filter(p => p.role === 'ALL_ROUNDER').length;
    const batsmanCount = squad.filter(p => p.role === 'BATSMAN').length;

    const validationErrors: string[] = [];
    if (isMega) {
      if (overseasCount > maxOverseas) validationErrors.push(`Too many overseas players (${overseasCount}/${maxOverseas})`);
      if (wicketKeeperCount < 1) validationErrors.push('Requires at least 1 Wicketkeeper');
      if (bowlerCount < 2) validationErrors.push('Requires at least 2 Bowlers');
    }

    return {
      playingLineup: [...squad],
      bench: [],
      overseasCount,
      wicketKeeperCount,
      bowlerCount,
      allRounderCount,
      batsmanCount,
      isValid: validationErrors.length === 0,
      validationErrors
    };
  }

  // Tactical selection algorithm:
  // Step 1: Separate by roles and overseas status
  const sorted = [...squad].sort((a, b) => b.overallRating - a.overallRating);

  const selected: PurchasedPlayer[] = [];
  const selectedIds = new Set<string>();

  const canAdd = (player: PurchasedPlayer): boolean => {
    if (selectedIds.has(player.playerId)) return false;
    if (selected.length >= targetCount) return false;
    if (!player.isIndian) {
      const currentOverseas = selected.filter(p => !p.isIndian).length;
      if (currentOverseas >= maxOverseas) return false;
    }
    return true;
  };

  const addPlayer = (player: PurchasedPlayer) => {
    selected.push(player);
    selectedIds.add(player.playerId);
  };

  // Rule 1: At least 1 Wicketkeeper
  const bestWk = sorted.find(p => p.role === 'WICKETKEEPER' && canAdd(p));
  if (bestWk) {
    addPlayer(bestWk);
  }

  // Rule 2: At least 2 Bowlers (or 1 for MINI_7)
  const minBowlersReq = isMega ? 2 : 1;
  const bowlers = sorted.filter(p => (p.role === 'FAST_BOWLER' || p.role === 'SPIN_BOWLER'));
  for (const b of bowlers) {
    const currentBowlers = selected.filter(p => p.role === 'FAST_BOWLER' || p.role === 'SPIN_BOWLER').length;
    if (currentBowlers >= minBowlersReq) break;
    if (canAdd(b)) {
      addPlayer(b);
    }
  }

  // Rule 3: Pick best remaining players while respecting overseas cap
  for (const p of sorted) {
    if (selected.length >= targetCount) break;
    if (canAdd(p)) {
      addPlayer(p);
    }
  }

  // Fallback: If still not at targetCount (e.g. overseas cap blocked remaining), fill from any remaining
  if (selected.length < targetCount) {
    for (const p of sorted) {
      if (selected.length >= targetCount) break;
      if (!selectedIds.has(playerUniqueKey(p))) {
        selected.push(p);
        selectedIds.add(playerUniqueKey(p));
      }
    }
  }

  // Order the playing lineup logically for cricket:
  // Top Order: Batsmen & Top WKs
  // Middle Order: All-rounders & Batsmen
  // Lower Order: Bowlers
  const orderedLineup = orderBattingLineup(selected);

  const bench = squad.filter(p => !selected.some(sel => sel.playerId === p.playerId));

  const overseasCount = orderedLineup.filter(p => !p.isIndian).length;
  const wicketKeeperCount = orderedLineup.filter(p => p.role === 'WICKETKEEPER').length;
  const bowlerCount = orderedLineup.filter(p => p.role === 'FAST_BOWLER' || p.role === 'SPIN_BOWLER').length;
  const allRounderCount = orderedLineup.filter(p => p.role === 'ALL_ROUNDER').length;
  const batsmanCount = orderedLineup.filter(p => p.role === 'BATSMAN').length;

  const validationErrors: string[] = [];
  if (isMega) {
    if (overseasCount > maxOverseas) validationErrors.push(`Too many overseas players (${overseasCount}/${maxOverseas})`);
    if (wicketKeeperCount < 1) validationErrors.push('Requires at least 1 Wicketkeeper');
    if (bowlerCount < 2) validationErrors.push('Requires at least 2 Bowlers');
  }

  return {
    playingLineup: orderedLineup,
    bench,
    overseasCount,
    wicketKeeperCount,
    bowlerCount,
    allRounderCount,
    batsmanCount,
    isValid: validationErrors.length === 0,
    validationErrors
  };
}

function playerUniqueKey(p: PurchasedPlayer): string {
  return p.playerId;
}

/**
 * Organizes players in standard batting order (1 to 11 / 1 to 5)
 */
export function orderBattingLineup(players: PurchasedPlayer[]): PurchasedPlayer[] {
  const batsAndWk = players
    .filter(p => p.role === 'BATSMAN' || p.role === 'WICKETKEEPER')
    .sort((a, b) => b.battingRating - a.battingRating);

  const allRounders = players
    .filter(p => p.role === 'ALL_ROUNDER')
    .sort((a, b) => (b.battingRating + b.bowlingRating) - (a.battingRating + a.bowlingRating));

  const bowlers = players
    .filter(p => p.role === 'FAST_BOWLER' || p.role === 'SPIN_BOWLER')
    .sort((a, b) => b.bowlingRating - a.bowlingRating);

  return [...batsAndWk, ...allRounders, ...bowlers];
}

/**
 * Validates a squad against the chosen game mode constraints:
 * - Blitz: 7 max, 5 min, 5 playing squad, min 1 WK, min 1 Bowler, max 3 Overseas
 * - Mega: 18 max, 11 min, 11 playing XI, min 1 WK, min 2 Bowlers, max 4 Overseas
 */
export function validateSquad(
  squad: PurchasedPlayer[],
  format: AuctionSessionFormat = 'Blitz'
): SquadValidationResult {
  const config = getFormatConfig(format);
  const isMega = config.id === 'Mega';
  const squadCount = squad.length;
  const minSquad = config.minSquad;
  const maxSquad = config.maxSquad;
  const playingSquadCount = config.playingSquadCount;
  const maxOverseas = config.lineupRules.maxOverseas;
  const minWicketKeepers = config.lineupRules.minWicketKeepers;
  const minBowlers = config.lineupRules.minBowlers;

  const overseasCount = squad.filter(p => !p.isIndian).length;
  const wicketKeepersCount = squad.filter(p => p.role === 'WICKETKEEPER').length;
  const bowlersCount = squad.filter(p => p.role === 'FAST_BOWLER' || p.role === 'SPIN_BOWLER').length;
  const batsmenCount = squad.filter(p => p.role === 'BATSMAN').length;
  const allRoundersCount = squad.filter(p => p.role === 'ALL_ROUNDER').length;

  const selection = autoSelectPlayingLineup(squad, format);
  const warnings: string[] = [];

  if (squadCount < minSquad) {
    warnings.push(`Need ${minSquad - squadCount} more player${minSquad - squadCount > 1 ? 's' : ''} to meet minimum roster size (${minSquad})`);
  }
  if (wicketKeepersCount < minWicketKeepers) {
    warnings.push(`Need at least ${minWicketKeepers} Wicketkeeper for ${isMega ? 'Playing XI' : 'Playing Squad'}`);
  }
  if (bowlersCount < minBowlers) {
    warnings.push(`Need at least ${minBowlers} frontline Bowler${minBowlers > 1 ? 's' : ''}`);
  }
  if (selection.overseasCount > maxOverseas) {
    warnings.push(`Exceeds overseas limit in active lineup (${selection.overseasCount}/${maxOverseas})`);
  }

  const isQualified = squadCount >= minSquad;
  const canFieldValidLineup =
    squadCount >= playingSquadCount &&
    wicketKeepersCount >= minWicketKeepers &&
    bowlersCount >= minBowlers;

  return {
    isQualified,
    canFieldValidLineup,
    squadCount,
    minSquad,
    maxSquad,
    playingSquadCount,
    overseasCount,
    maxOverseas,
    wicketKeepersCount,
    minWicketKeepers,
    bowlersCount,
    minBowlers,
    batsmenCount,
    allRoundersCount,
    warnings,
    playingLineup: selection.playingLineup,
    bench: selection.bench
  };
}
