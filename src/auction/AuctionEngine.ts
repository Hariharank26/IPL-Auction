import {
  AuctionPlayer,
  AuctionState,
  BidHistoryEntry,
  PurchasedPlayer,
  RoomState,
  SquadStrengthScores,
  TeamAuctionResult,
  TeamId
} from '../types/auction';
import {
  AUCTION_CONFIG,
  AUCTION_FORMAT_CONFIGS,
  getNextRequiredBidLakhs,
  getFormatConfig,
  normalizeGameMode
} from '../data/config';
import { PLAYERS_POOL, getPlayersPoolForFormat } from '../data/players';
import { BotEngine } from './BotEngine';
import { autoSelectPlayingLineup } from '../utils/squadBuilder';
import { nanoid } from 'nanoid';

export class AuctionEngine {
  private roomState: RoomState;
  private onStateChange: (state: RoomState) => void;
  private timerHandle: NodeJS.Timeout | null = null;
  private botBidTimers: NodeJS.Timeout[] = [];
  private isProcessingCommand = false;

  constructor(roomState: RoomState, onStateChange: (state: RoomState) => void) {
    this.roomState = roomState;
    this.onStateChange = onStateChange;
  }

  public getRoomState(): RoomState {
    return this.roomState;
  }

  /**
   * Initializes the auction: randomizes player sequence and starts the first reveal
   */
  public startAuction(): void {
    if (this.roomState.auctionState !== 'WAITING') {
      return;
    }

    // Clone and jumble/shuffle player pool for selected format
    const pool = [...getPlayersPoolForFormat(this.roomState.format)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const auctionPlayers: AuctionPlayer[] = pool.map((p, idx) => ({
      ...p,
      status: 'WAITING',
      sequence: idx + 1
    }));

    this.roomState.players = auctionPlayers;
    this.roomState.currentPlayerIndex = 0;
    this.roomState.status = 'AUCTION';
    this.roomState.bidHistory = [];
    this.roomState.results = undefined;

    this.startPlayerReveal();
  }

  /**
   * Starts the PLAYER_REVEAL state for the current player
   */
  private startPlayerReveal(): void {
    this.clearAllTimers();

    const currentIdx = this.roomState.currentPlayerIndex;

    // Check if all 6 teams have reached squad capacity (7 players each) OR if all players completed
    if (this.areAllTeamsFull()) {
      this.completeAuction('ALL_TEAMS_FULL');
      return;
    }

    if (currentIdx >= this.roomState.players.length) {
      this.completeAuction('ALL_PLAYERS_COMPLETED');
      return;
    }

    const player = this.roomState.players[currentIdx];
    player.status = 'ACTIVE';
    this.roomState.currentPlayer = player;
    this.roomState.currentBid = 0;
    this.roomState.highestBidderTeamId = null;
    this.roomState.highestBidderName = null;
    this.roomState.bidHistory = [];
    this.roomState.auctionState = 'PLAYER_REVEAL';
    this.roomState.lastActionMessage = `${this.roomState.isAcceleratedRound ? '⚡ [Accelerated] ' : ''}Player Reveal: ${player.name} (${player.role}) - Base Price ₹${(player.basePrice / 100).toFixed(2)} Cr`;

    this.emitUpdate();

    // After REVEAL_SECONDS, open BIDDING
    this.timerHandle = setTimeout(() => {
      this.startBidding();
    }, AUCTION_CONFIG.TIMERS.REVEAL_SECONDS * 1000);
  }

  /**
   * Enters BIDDING state and sets bidding deadline
   */
  private startBidding(): void {
    this.clearAllTimers();
    this.roomState.auctionState = 'BIDDING';
    const now = Date.now();
    this.roomState.biddingEndsAt = now + (AUCTION_CONFIG.TIMERS.BIDDING_SECONDS * 1000);
    this.roomState.countdownSeconds = AUCTION_CONFIG.TIMERS.BIDDING_SECONDS;
    this.roomState.lastActionMessage = `Bidding open for ${this.roomState.currentPlayer?.name}!`;

    this.emitUpdate();
    this.startCountdownLoop();
    this.scheduleBotBids();
  }

  /**
   * 1-second interval loop updating countdown and triggering SOLD/UNSOLD when timer expires
   */
  private startCountdownLoop(): void {
    if (this.timerHandle) clearInterval(this.timerHandle);

    this.timerHandle = setInterval(() => {
      if (this.roomState.auctionState !== 'BIDDING') {
        clearInterval(this.timerHandle!);
        return;
      }

      const now = Date.now();
      const remainingMs = this.roomState.biddingEndsAt - now;
      const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      this.roomState.countdownSeconds = secondsLeft;

      if (remainingMs <= 0) {
        clearInterval(this.timerHandle!);
        this.handleTimerExpired();
      } else {
        this.emitUpdate();
      }
    }, 200);
  }

  /**
   * Validates and executes a bid from a team (human or bot)
   */
  public placeBid(teamId: TeamId, amount: number, bidderName: string): { success: boolean; error?: string } {
    if (this.isProcessingCommand) {
      return { success: false, error: 'Auction busy, please retry.' };
    }
    this.isProcessingCommand = true;

    try {
      if (this.roomState.auctionState !== 'BIDDING') {
        return { success: false, error: 'Bidding is not currently open.' };
      }

      const player = this.roomState.currentPlayer;
      if (!player) {
        return { success: false, error: 'No active player in auction.' };
      }

      const team = this.roomState.teams[teamId];
      if (!team) {
        return { success: false, error: 'Invalid team.' };
      }

      const formatConfig = getFormatConfig(this.roomState.format);
      if (team.squad.length >= formatConfig.maxSquad) {
        return { success: false, error: `Your squad is already full (${formatConfig.maxSquad}/${formatConfig.maxSquad} players).` };
      }

      // Ensure team reserves at least base price (50L) for each remaining player to reach minSquad
      const remainingSlotsToMin = Math.max(0, formatConfig.minSquad - (team.squad.length + 1));
      const minReserveRequired = remainingSlotsToMin * 50;
      if (team.remainingPurse - amount < minReserveRequired) {
        return {
          success: false,
          error: `Purse reserve required: Keep at least ₹${(minReserveRequired / 100).toFixed(2)} Cr for remaining players to reach minimum squad (${formatConfig.minSquad}).`
        };
      }

      if (amount > team.remainingPurse) {
        return { success: false, error: 'Bid exceeds remaining purse.' };
      }

      const requiredMin = getNextRequiredBidLakhs(this.roomState.currentBid, player.basePrice);
      if (amount < requiredMin) {
        return { success: false, error: `Bid must be at least ₹${(requiredMin / 100).toFixed(2)} Cr.` };
      }

      if (this.roomState.highestBidderTeamId === teamId) {
        return { success: false, error: 'You are already the highest bidder.' };
      }

      // Accept bid!
      this.roomState.currentBid = amount;
      this.roomState.highestBidderTeamId = teamId;
      this.roomState.highestBidderName = bidderName;
      this.roomState.lastActionMessage = `${team.teamConfig.name} bids ₹${(amount / 100).toFixed(2)} Cr!`;

      // Extend countdown if late bid (within last 3 seconds)
      const now = Date.now();
      const remainingMs = this.roomState.biddingEndsAt - now;
      if (remainingMs < 3000) {
        this.roomState.biddingEndsAt = now + (AUCTION_CONFIG.TIMERS.LATE_BID_EXTENSION_SECONDS * 1000);
      }

      // Record activity history
      const historyEntry: BidHistoryEntry = {
        id: nanoid(8),
        teamId: team.teamId,
        teamAbbr: team.teamConfig.abbr,
        bidderName,
        amount,
        timestamp: Date.now()
      };
      this.roomState.bidHistory = [historyEntry, ...this.roomState.bidHistory].slice(0, 3);

      this.emitUpdate();

      // Trigger bot evaluations after any accepted bid
      this.scheduleBotBids();

      return { success: true };
    } finally {
      this.isProcessingCommand = false;
    }
  }

  /**
   * Schedules AI bot bidding checks
   */
  private scheduleBotBids(): void {
    // Clear pending bot timers from previous bid level
    this.botBidTimers.forEach(t => clearTimeout(t));
    this.botBidTimers = [];

    if (this.roomState.auctionState !== 'BIDDING') return;

    const player = this.roomState.currentPlayer;
    if (!player) return;

    const remainingPlayersInPool = this.roomState.players.length - this.roomState.currentPlayerIndex;

    // Evaluate each bot team
    Object.values(this.roomState.teams).forEach(team => {
      if (team.controllerType === 'BOT') {
        const decision = BotEngine.evaluateBidDecision(
          team,
          player,
          this.roomState.currentBid,
          this.roomState.highestBidderTeamId,
          remainingPlayersInPool,
          this.roomState.format
        );

        if (decision.action === 'BID') {
          const timer = setTimeout(() => {
            // Re-verify before placing bid
            if (this.roomState.auctionState !== 'BIDDING') return;
            if (this.roomState.highestBidderTeamId === team.teamId) return;
            const nextRequired = getNextRequiredBidLakhs(this.roomState.currentBid, player.basePrice);
            if (nextRequired <= decision.maxWillingBidLakhs && nextRequired <= team.remainingPurse) {
              this.placeBid(team.teamId, nextRequired, `${team.teamConfig.abbr} Bot (${team.botPersonality || 'AI'})`);
            }
          }, decision.delayMs);

          this.botBidTimers.push(timer);
        }
      }
    });
  }

  /**
   * Handles timer expiration: SOLD if there is a bidder, UNSOLD if no bidder
   */
  private handleTimerExpired(): void {
    this.clearAllTimers();

    const player = this.roomState.currentPlayer;
    if (!player) return;

    const winnerId = this.roomState.highestBidderTeamId;
    const finalPrice = this.roomState.currentBid;

    if (winnerId && finalPrice > 0) {
      // SOLD!
      const winningTeam = this.roomState.teams[winnerId];
      if (winningTeam) {
        // Deduct purse
        winningTeam.remainingPurse -= finalPrice;

        // Add player to winning team squad
        const purchased: PurchasedPlayer = {
          playerId: player.id,
          name: player.name,
          displayName: player.displayName,
          role: player.role,
          playerType: player.playerType,
          overallRating: player.overallRating,
          battingRating: player.battingRating,
          bowlingRating: player.bowlingRating,
          fieldingRating: player.fieldingRating,
          starRating: player.starRating,
          isIndian: player.isIndian,
          price: finalPrice,
          imageUrl: player.imageUrl
        };
        winningTeam.squad.push(purchased);

        player.status = 'SOLD';
        player.soldToTeamId = winnerId;
        player.soldPrice = finalPrice;
        player.soldToControllerName = winningTeam.participantName;

        this.roomState.auctionState = 'SOLD';
        this.roomState.lastActionMessage = `SOLD! ${player.name} to ${winningTeam.teamConfig.name} for ₹${(finalPrice / 100).toFixed(2)} Cr`;

        this.addChatMessage({
          id: nanoid(8),
          senderName: 'Auctioneer',
          message: `🔨 SOLD! ${player.name} to ${winningTeam.teamConfig.name} for ₹${(finalPrice / 100).toFixed(2)} Cr!`,
          type: 'SYSTEM',
          timestamp: Date.now()
        });

        // Trigger occasional bot reaction
        if (finalPrice >= 1200) {
          const randomBot = Object.values(this.roomState.teams).find(t => t.controllerType === 'BOT' && t.teamId !== winnerId);
          if (randomBot) {
            setTimeout(() => {
              this.addChatMessage({
                id: nanoid(8),
                senderName: `${randomBot.teamConfig.abbr} Bot`,
                teamId: randomBot.teamId,
                teamAbbr: randomBot.teamConfig.abbr,
                message: '💰 Massive purchase! What a splash!',
                type: 'REACTION',
                timestamp: Date.now()
              });
              this.emitUpdate();
            }, 600);
          }
        } else if (finalPrice <= player.basePrice + 100 && player.overallRating >= 85) {
          const randomBot = Object.values(this.roomState.teams).find(t => t.controllerType === 'BOT' && t.teamId !== winnerId);
          if (randomBot) {
            setTimeout(() => {
              this.addChatMessage({
                id: nanoid(8),
                senderName: `${randomBot.teamConfig.abbr} Bot`,
                teamId: randomBot.teamId,
                teamAbbr: randomBot.teamConfig.abbr,
                message: '😱 Absolute steal for that price!',
                type: 'REACTION',
                timestamp: Date.now()
              });
              this.emitUpdate();
            }, 600);
          }
        }
      }
    } else {
      // UNSOLD
      player.status = 'UNSOLD';
      this.roomState.auctionState = 'UNSOLD';
      this.roomState.lastActionMessage = `UNSOLD! No bids received for ${player.name}`;

      this.addChatMessage({
        id: nanoid(8),
        senderName: 'Auctioneer',
        message: `❌ UNSOLD: ${player.name} (Base ₹${(player.basePrice / 100).toFixed(2)} Cr)`,
        type: 'SYSTEM',
        timestamp: Date.now()
      });
    }

    this.emitUpdate();

    // Transition to next player or end auction
    const transitionTime = this.roomState.auctionState === 'SOLD'
      ? AUCTION_CONFIG.TIMERS.SOLD_TRANSITION_SECONDS
      : AUCTION_CONFIG.TIMERS.UNSOLD_TRANSITION_SECONDS;

    // Check if all 6 teams now have filled their 7-player squads
    if (this.areAllTeamsFull()) {
      this.roomState.lastActionMessage = '🏆 All 6 Franchises have completed their squads (7 players each)! AUCTION IS ENDED.';
      this.addChatMessage({
        id: nanoid(8),
        senderName: 'Auctioneer',
        message: '🏆 All 6 Franchises have completed their 7-player squads! AUCTION IS ENDED. Calculating Top 5 Picks rankings...',
        type: 'SYSTEM',
        timestamp: Date.now()
      });
      this.emitUpdate();

      this.timerHandle = setTimeout(() => {
        this.completeAuction('ALL_TEAMS_FULL');
      }, transitionTime * 1000);
      return;
    }

    // Check if all 60 players in the catalog have been completed
    if (this.roomState.currentPlayerIndex + 1 >= this.roomState.players.length) {
      this.roomState.lastActionMessage = '🏁 All 60 players completed! AUCTION IS ENDED.';
      this.addChatMessage({
        id: nanoid(8),
        senderName: 'Auctioneer',
        message: '🏁 All 60 Players Completed! AUCTION IS ENDED. Calculating Top 5 Picks rankings...',
        type: 'SYSTEM',
        timestamp: Date.now()
      });
      this.emitUpdate();

      this.timerHandle = setTimeout(() => {
        this.completeAuction('ALL_PLAYERS_COMPLETED');
      }, transitionTime * 1000);
      return;
    }

    this.timerHandle = setTimeout(() => {
      this.roomState.currentPlayerIndex += 1;
      this.startPlayerReveal();
    }, transitionTime * 1000);
  }

  /**
   * Checks if all 6 teams have reached the maximum squad size for the active format
   */
  private areAllTeamsFull(): boolean {
    const formatConfig = getFormatConfig(this.roomState.format);
    return Object.values(this.roomState.teams).every(t => t.squad.length >= formatConfig.maxSquad);
  }

  /**
   * Completes the auction and calculates final rankings based strictly on Top 5 / Playing XI picks
   */
  public completeAuction(reason: 'ALL_PLAYERS_COMPLETED' | 'ALL_TEAMS_FULL' | 'MANUAL_CONCLUDED' = 'ALL_PLAYERS_COMPLETED'): void {
    this.clearAllTimers();
    this.roomState.auctionState = 'COMPLETED';
    this.roomState.status = 'RESULTS';
    this.roomState.currentPlayer = null;
    this.roomState.completionReason = reason;

    const formatConfig = getFormatConfig(this.roomState.format);
    const reasonText = reason === 'ALL_TEAMS_FULL'
      ? `All 6 Franchise Squads are now complete (${formatConfig.maxSquad} players each)!`
      : reason === 'MANUAL_CONCLUDED'
      ? 'Auction officially concluded!'
      : `All ${formatConfig.totalPlayers} Auction Lots Completed!`;

    const isMega = formatConfig.id === 'Mega';
    const rankingBasis = isMega ? 'Playing XI (11 Players)' : 'Playing Squad (Top 5)';
    this.roomState.lastActionMessage = `🏆 AUCTION IS ENDED! ${reasonText} Rankings calculated strictly by ${rankingBasis}!`;

    this.addChatMessage({
      id: nanoid(8),
      senderName: 'Auctioneer',
      message: `🏆 AUCTION IS ENDED! ${reasonText} Standings calculated strictly by ${rankingBasis}.`,
      type: 'SYSTEM',
      timestamp: Date.now()
    });

    // Calculate rankings based on active format
    this.roomState.results = this.calculateFinalResults();

    this.emitUpdate();
  }

  /**
   * Concludes the auction immediately and drafts remaining players for teams with < minSquad players
   * so every franchise has at least the minimum squad required
   */
  public concludeAuction(): void {
    this.clearAllTimers();

    const formatConfig = getFormatConfig(this.roomState.format);
    const teams = Object.values(this.roomState.teams);
    const unpurchased = this.roomState.players.filter(p => p.status === 'WAITING' || p.status === 'UNSOLD');

    // Auto-draft remaining available players for any team under minSquad players
    let pIdx = 0;
    teams.forEach(t => {
      while (t.squad.length < formatConfig.minSquad && pIdx < unpurchased.length) {
        const player = unpurchased[pIdx];
        if (t.remainingPurse >= player.basePrice) {
          player.status = 'SOLD';
          t.remainingPurse -= player.basePrice;
          t.squad.push({
            playerId: player.id,
            name: player.name,
            displayName: player.displayName,
            role: player.role,
            playerType: player.playerType,
            overallRating: player.overallRating,
            battingRating: player.battingRating,
            bowlingRating: player.bowlingRating,
            fieldingRating: player.fieldingRating,
            starRating: player.starRating,
            isIndian: player.isIndian,
            price: player.basePrice,
            imageUrl: player.imageUrl
          });
        }
        pIdx++;
      }
    });

    this.completeAuction('MANUAL_CONCLUDED');
  }

  /**
   * Calculates Rankings strictly based on each team's tactical Playing Lineup (Playing XI for Mega, Top 5 for Blitz)
   */
  public calculateFinalResults(): TeamAuctionResult[] {
    const formatConfig = getFormatConfig(this.roomState.format);
    const teams = Object.values(this.roomState.teams);
    const results: TeamAuctionResult[] = [];

    // Find tournament extremes for award badges
    let mostExpensivePlayerPrice = 0;
    let mostExpensiveTeamId: TeamId | null = null;
    let biggestBargainValue = 0;
    let biggestBargainTeamId: TeamId | null = null;

    teams.forEach(team => {
      const squadSize = team.squad.length;
      const isEliminated = squadSize < formatConfig.minSquad;

      // Select optimal playing squad adhering to format rules
      const squadSelection = autoSelectPlayingLineup(team.squad, this.roomState.format);
      const playingPicks = squadSelection.playingLineup;
      const benchPicks = squadSelection.bench;

      const playingTotalRating = playingPicks.reduce((sum, p) => sum + p.overallRating, 0);
      const playingAvgRating = playingPicks.length > 0 ? parseFloat((playingTotalRating / playingPicks.length).toFixed(1)) : 0;
      const playingTotalCost = playingPicks.reduce((sum, p) => sum + p.price, 0);

      let avgOverall = 0;
      let avgBat = 0;
      let avgBowl = 0;
      let avgField = 0;
      let avgStar = 0;
      let totalValueScore = 0;

      if (squadSize > 0) {
        avgOverall = team.squad.reduce((sum, p) => sum + p.overallRating, 0) / squadSize;
        avgBat = team.squad.reduce((sum, p) => sum + p.battingRating, 0) / squadSize;
        avgBowl = team.squad.reduce((sum, p) => sum + p.bowlingRating, 0) / squadSize;
        avgField = team.squad.reduce((sum, p) => sum + p.fieldingRating, 0) / squadSize;
        avgStar = (team.squad.reduce((sum, p) => sum + p.starRating, 0) / (squadSize * 5)) * 100;

        const totalSpent = formatConfig.startingPurseLakhs - team.remainingPurse;
        const totalRatingPoints = team.squad.reduce((sum, p) => sum + p.overallRating, 0);
        totalValueScore = totalSpent > 0 ? Math.min(100, (totalRatingPoints / totalSpent) * 1500) : 50;

        // Check expensive and bargain players
        team.squad.forEach(p => {
          if (p.price > mostExpensivePlayerPrice) {
            mostExpensivePlayerPrice = p.price;
            mostExpensiveTeamId = team.teamId;
          }
          const bargainRatio = p.overallRating / Math.max(50, p.price);
          if (bargainRatio > biggestBargainValue) {
            biggestBargainValue = bargainRatio;
            biggestBargainTeamId = team.teamId;
          }
        });
      }

      // Balance Score: reward having balanced squad roles and adhering to constraints
      const bats = team.squad.filter(p => p.role === 'BATSMAN').length;
      const wks = team.squad.filter(p => p.role === 'WICKETKEEPER').length;
      const ars = team.squad.filter(p => p.role === 'ALL_ROUNDER').length;
      const bowls = team.squad.filter(p => p.role === 'FAST_BOWLER' || p.role === 'SPIN_BOWLER').length;

      let balanceScore = 0;
      if (bats >= (formatConfig.id === 'Mega' ? 3 : 2)) balanceScore += 25;
      if (wks >= 1) balanceScore += 25;
      if (ars >= 1) balanceScore += 25;
      if (bowls >= 2) balanceScore += 25;

      const remainingPurseScore = Math.min(100, (team.remainingPurse / formatConfig.startingPurseLakhs) * 100);
      const finalWeightedScore = isEliminated ? 0 : playingTotalRating;

      const scores: SquadStrengthScores = {
        overallScore: Math.round(playingAvgRating || avgOverall),
        battingScore: Math.round(avgBat),
        bowlingScore: Math.round(avgBowl),
        fieldingScore: Math.round(avgField),
        balanceScore: Math.round(balanceScore),
        valueScore: Math.round(totalValueScore),
        starScore: Math.round(avgStar),
        remainingPurseScore: Math.round(remainingPurseScore),
        finalWeightedScore: parseFloat(finalWeightedScore.toFixed(1))
      };

      results.push({
        teamId: team.teamId,
        teamConfig: team.teamConfig,
        controllerName: team.participantName,
        controllerType: team.controllerType,
        status: isEliminated ? 'ELIMINATED' : 'QUALIFIED',
        squadSize,
        remainingPurse: team.remainingPurse,
        top5TotalRating: playingTotalRating,
        top5AvgRating: playingAvgRating,
        top5TotalCost: playingTotalCost,
        top5Picks: playingPicks,
        benchPicks,
        scores,
        rank: 0,
        awards: []
      });
    });

    // Sort: QUALIFIED teams first strictly by Top 5 Total Rating descending!
    // Tie-breaker 1: Remaining purse (budget efficiency)
    // Tie-breaker 2: Highest individual top pick marquee rating
    results.sort((a, b) => {
      if (a.status === 'QUALIFIED' && b.status === 'ELIMINATED') return -1;
      if (a.status === 'ELIMINATED' && b.status === 'QUALIFIED') return 1;
      if (a.status === 'QUALIFIED' && b.status === 'QUALIFIED') {
        const aTop5 = a.top5TotalRating ?? 0;
        const bTop5 = b.top5TotalRating ?? 0;
        if (bTop5 !== aTop5) {
          return bTop5 - aTop5;
        }
        if (b.remainingPurse !== a.remainingPurse) {
          return b.remainingPurse - a.remainingPurse;
        }
        const aBest = a.top5Picks?.[0]?.overallRating ?? 0;
        const bBest = b.top5Picks?.[0]?.overallRating ?? 0;
        return bBest - aBest;
      }
      return b.squadSize - a.squadSize;
    });

    // Assign rank #1 to #6
    results.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    // Assign awards among qualified teams
    const qualified = results.filter(r => r.status === 'QUALIFIED');
    if (qualified.length > 0) {
      qualified[0].awards.push('🏆 TOP 5 PICKS CHAMPION');
      
      const bestBatting = [...qualified].sort((a, b) => b.scores.battingScore - a.scores.battingScore)[0];
      if (bestBatting) bestBatting.awards.push('🏏 BEST BATTING LINEUP');

      const bestBowling = [...qualified].sort((a, b) => b.scores.bowlingScore - a.scores.bowlingScore)[0];
      if (bestBowling) bestBowling.awards.push('🔥 LETHAL BOWLING ATTACK');

      const bestValue = [...qualified].sort((a, b) => b.scores.valueScore - a.scores.valueScore)[0];
      if (bestValue) bestValue.awards.push('💎 SMART VALUE BUYER');
    }

    if (mostExpensiveTeamId) {
      const target = results.find(r => r.teamId === mostExpensiveTeamId);
      if (target) target.awards.push('💰 BIG SPENDER (Highest Buy)');
    }

    if (biggestBargainTeamId) {
      const target = results.find(r => r.teamId === biggestBargainTeamId);
      if (target) target.awards.push('🏷️ BARGAIN HUNTER');
    }

    return results;
  }

  public addChatMessage(msg: {
    id: string;
    senderName: string;
    teamId?: TeamId;
    teamAbbr?: string;
    message: string;
    type?: 'CHAT' | 'REACTION' | 'SYSTEM';
    timestamp: number;
  }): void {
    if (!this.roomState.chatMessages) {
      this.roomState.chatMessages = [];
    }
    const fullMsg = {
      ...msg,
      type: msg.type || 'CHAT'
    };
    this.roomState.chatMessages = [fullMsg, ...this.roomState.chatMessages].slice(0, 50);
  }

  public sendChatMessage(
    senderName: string,
    teamId: TeamId | undefined,
    message: string,
    type: 'CHAT' | 'REACTION' | 'SYSTEM' = 'CHAT'
  ): void {
    const team = teamId ? this.roomState.teams[teamId] : undefined;
    this.addChatMessage({
      id: nanoid(8),
      senderName,
      teamId,
      teamAbbr: team?.teamConfig.abbr,
      message,
      type,
      timestamp: Date.now()
    });
    this.emitUpdate();
  }

  public clearAllTimers(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    this.botBidTimers.forEach(t => clearTimeout(t));
    this.botBidTimers = [];
  }

  private emitUpdate(): void {
    this.onStateChange(this.roomState);
  }
}
