import {
  AuctionPlayer,
  BotPersonality,
  RoomTeam,
  TeamId,
  AuctionSessionFormat
} from '../types/auction';
import { AUCTION_CONFIG, AUCTION_FORMAT_CONFIGS, getNextRequiredBidLakhs } from '../data/config';

export interface BotDecision {
  action: 'BID' | 'PASS';
  maxWillingBidLakhs: number;
  delayMs: number;
}

export class BotEngine {
  /**
   * Calculates the maximum valuation (in Lakhs) a bot team is willing to pay for the player,
   * taking into account format (7-player ₹50 Cr vs 18-player ₹120 Cr), personality,
   * remaining purse, squad composition, and risk.
   */
  public static calculateMaxValuation(
    botTeam: RoomTeam,
    player: AuctionPlayer,
    remainingPlayersInPool: number,
    format: AuctionSessionFormat = 'MINI_7'
  ): number {
    const isMega = format === 'MEGA_18';
    const formatConfig = AUCTION_FORMAT_CONFIGS[format] || AUCTION_FORMAT_CONFIGS.MINI_7;
    const maxSquad = formatConfig.maxSquad;
    const personality: BotPersonality = botTeam.botPersonality || 'BALANCED';
    const currentSquadSize = botTeam.squad.length;
    const remainingPurse = botTeam.remainingPurse;

    // If squad is already full, cannot bid
    if (currentSquadSize >= maxSquad) {
      return 0;
    }

    // Squad overseas limit:
    // In 18-player mode: max 8 overseas allowed in total squad (playing XI gets 4)
    // In 7-player mode: max 3 overseas allowed in squad
    const maxOverseasInSquad = isMega ? 8 : 3;
    const currentOverseasCount = botTeam.squad.filter(p => !p.isIndian).length;
    if (!player.isIndian && currentOverseasCount >= maxOverseasInSquad) {
      return 0;
    }

    // Base market valuation scaled:
    // For 7-player Blitz (₹50 Cr purse):
    // 95+ -> ~850-1050 Lakhs (₹8.5 - ₹10.5 Cr)
    // 90-94 -> ~600-800 Lakhs (₹6 - ₹8 Cr)
    // 85-89 -> ~360-560 Lakhs (₹3.6 - ₹5.6 Cr)
    // 80-84 -> ~180-320 Lakhs (₹1.8 - ₹3.2 Cr)
    //
    // For 18-player Mega (₹120 Cr purse):
    // 95+ -> ~1600-2400 Lakhs (₹16.0 - ₹24.0 Cr, realistic IPL mega auction records)
    // 90-94 -> ~1100-1650 Lakhs (₹11.0 - ₹16.5 Cr)
    // 85-89 -> ~650-1100 Lakhs (₹6.5 - ₹11.0 Cr)
    // 80-84 -> ~350-650 Lakhs (₹3.5 - ₹6.5 Cr)
    // <80 -> base price to ~350 Lakhs
    let baseValuation = 0;
    if (isMega) {
      if (player.overallRating >= 95) {
        baseValuation = 1600 + (player.overallRating - 95) * 160;
      } else if (player.overallRating >= 90) {
        baseValuation = 1100 + (player.overallRating - 90) * 100;
      } else if (player.overallRating >= 85) {
        baseValuation = 650 + (player.overallRating - 85) * 90;
      } else if (player.overallRating >= 80) {
        baseValuation = 350 + (player.overallRating - 80) * 60;
      } else {
        baseValuation = Math.max(player.basePrice, 150 + (player.overallRating - 70) * 20);
      }
    } else {
      if (player.overallRating >= 95) {
        baseValuation = 850 + (player.overallRating - 95) * 60;
      } else if (player.overallRating >= 90) {
        baseValuation = 600 + (player.overallRating - 90) * 50;
      } else if (player.overallRating >= 85) {
        baseValuation = 360 + (player.overallRating - 85) * 40;
      } else if (player.overallRating >= 80) {
        baseValuation = 180 + (player.overallRating - 80) * 35;
      } else {
        baseValuation = Math.max(player.basePrice, 100 + (player.overallRating - 70) * 12);
      }
    }

    let marketValuation = baseValuation + (player.starRating * (isMega ? 45 : 25));
    marketValuation = Math.max(marketValuation, player.basePrice * 1.10);

    // Role scarcity/need bonus
    const roleCount = botTeam.squad.filter(p => p.role === player.role).length;
    let roleMultiplier = 1.0;
    if (roleCount === 0) {
      roleMultiplier = 1.15; // Essential first pick in role
    } else if (isMega ? roleCount <= 2 : roleCount === 1) {
      roleMultiplier = 0.95;
    } else if (isMega ? roleCount >= 4 : roleCount >= 2) {
      roleMultiplier = 0.65; // Diminishing returns so bots don't hoard redundant positions
    }

    // Personality specific modifiers
    let personalityMultiplier = 1.0;
    switch (personality) {
      case 'AGGRESSIVE':
        personalityMultiplier = 1.15;
        if (player.starRating >= 4 || player.overallRating >= 90) {
          personalityMultiplier = 1.20;
        }
        break;
      case 'STAR_COLLECTOR':
        if (player.playerType === 'LEGEND' || player.starRating === 5) {
          personalityMultiplier = 1.20;
        } else if (player.starRating >= 4) {
          personalityMultiplier = 1.10;
        } else {
          personalityMultiplier = 0.85;
        }
        break;
      case 'YOUTH_SCOUT':
        if (player.playerType === 'YOUNGSTER') {
          personalityMultiplier = 1.20;
        } else if (player.playerType === 'CURRENT' && player.overallRating >= 88) {
          personalityMultiplier = 1.05;
        } else {
          personalityMultiplier = 0.85;
        }
        break;
      case 'VALUE_HUNTER':
        personalityMultiplier = 0.85;
        break;
      case 'BALANCED':
      default:
        personalityMultiplier = 1.0;
        break;
    }

    let finalValuation = marketValuation * roleMultiplier * personalityMultiplier;

    // Add controlled randomness (+/- 8%)
    const randVariance = 0.92 + Math.random() * 0.16;
    finalValuation = finalValuation * randVariance;

    // Smart budget constraint check:
    // 1) Reserve enough for remaining slots to hit min squad
    const reservePerSlot = isMega ? 100 : 250;
    const slotsRemainingToMax = Math.max(1, maxSquad - currentSquadSize);
    const reservedForOtherSlots = (slotsRemainingToMax - 1) * reservePerSlot;
    const maxSpendAfterReserve = Math.max(player.basePrice, remainingPurse - reservedForOtherSlots);

    // 2) Max purse share per purchase
    let maxPurseSharePct = isMega ? 0.22 : 0.26;
    if (currentSquadSize >= 2) {
      maxPurseSharePct = isMega ? 0.28 : 0.32;
    }
    const maxPurseShareSpend = Math.floor(remainingPurse * maxPurseSharePct);

    // 3) Absolute rating ceiling
    let ratingCeiling = isMega ? 600 : 300;
    if (player.overallRating >= 95) {
      ratingCeiling = isMega ? 2500 : 1150;
    } else if (player.overallRating >= 90) {
      ratingCeiling = isMega ? 1800 : 850;
    } else if (player.overallRating >= 85) {
      ratingCeiling = isMega ? 1200 : 550;
    } else if (player.overallRating >= 80) {
      ratingCeiling = isMega ? 750 : 350;
    } else {
      ratingCeiling = Math.max(player.basePrice * 1.5, isMega ? 450 : 200);
    }

    const absoluteMaxSpend = Math.min(ratingCeiling, maxPurseShareSpend, maxSpendAfterReserve);
    const ceiling = Math.min(finalValuation, Math.max(player.basePrice, absoluteMaxSpend));

    return Math.floor(ceiling);
  }

  /**
   * Decides whether a bot team will bid on the current player at the current bid price.
   */
  public static evaluateBidDecision(
    botTeam: RoomTeam,
    player: AuctionPlayer,
    currentBid: number,
    highestBidderTeamId: TeamId | null,
    remainingPlayersInPool: number,
    format: AuctionSessionFormat = 'MINI_7'
  ): BotDecision {
    const formatConfig = AUCTION_FORMAT_CONFIGS[format] || AUCTION_FORMAT_CONFIGS.MINI_7;
    const maxSquad = formatConfig.maxSquad;
    const minSquad = formatConfig.minSquad;
    const isMega = format === 'MEGA_18';

    // Never bid against ourselves
    if (highestBidderTeamId === botTeam.teamId) {
      return { action: 'PASS', maxWillingBidLakhs: 0, delayMs: 0 };
    }

    // Cannot bid if squad full
    if (botTeam.squad.length >= maxSquad) {
      return { action: 'PASS', maxWillingBidLakhs: 0, delayMs: 0 };
    }

    // Squad overseas limit check:
    const maxOverseasInSquad = isMega ? 8 : 3;
    const currentOverseas = botTeam.squad.filter(p => !p.isIndian).length;
    if (!player.isIndian && currentOverseas >= maxOverseasInSquad) {
      return { action: 'PASS', maxWillingBidLakhs: 0, delayMs: 0 };
    }

    const nextRequiredBid = getNextRequiredBidLakhs(currentBid, player.basePrice);

    // Ensure bidding leaves enough reserve purse for minimum required squad slots
    const minSlotsRemaining = Math.max(1, minSquad - botTeam.squad.length);
    const reservePerMinSlot = isMega ? 75 : 150;
    const requiredReserveForOtherMinSlots = (minSlotsRemaining - 1) * reservePerMinSlot;
    if (nextRequiredBid > botTeam.remainingPurse - requiredReserveForOtherMinSlots) {
      return { action: 'PASS', maxWillingBidLakhs: 0, delayMs: 0 };
    }

    // Cannot bid if cannot afford
    if (nextRequiredBid > botTeam.remainingPurse) {
      return { action: 'PASS', maxWillingBidLakhs: 0, delayMs: 0 };
    }

    const maxValuation = this.calculateMaxValuation(botTeam, player, remainingPlayersInPool, format);

    if (nextRequiredBid <= maxValuation) {
      // Calculate realistic delay (800ms to 2400ms)
      const baseDelay = 800 + Math.floor(Math.random() * 1600);
      return {
        action: 'BID',
        maxWillingBidLakhs: maxValuation,
        delayMs: baseDelay
      };
    }

    return { action: 'PASS', maxWillingBidLakhs: maxValuation, delayMs: 0 };
  }
}
