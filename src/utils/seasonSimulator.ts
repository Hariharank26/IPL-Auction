import { TeamId, AuctionSessionFormat, PurchasedPlayer, RoomTeam } from '../types/auction';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import {
  MatchTeamInnings,
  PlayerBattingScore,
  PlayerBowlingScore,
  SimulatedMatch,
  PointsTableEntry,
  OrangeCapLeader,
  PurpleCapLeader,
  MVPLeader,
  SeasonState,
  MatchStage
} from '../types/season';
import { autoSelectPlayingLineup } from './squadBuilder';

// Realistic cricket dismissal descriptions
const DISMISSAL_METHODS = [
  'c & b',
  'b',
  'c keeper b',
  'c deep midwicket b',
  'c long-on b',
  'lbw b',
  'st keeper b',
  'c backward point b',
  'c cover b'
];

/**
 * Generates the full season schedule:
 * - League Phase: Each team plays matches
 * - Playoffs Phase: Qualifier 1, Eliminator, Qualifier 2, Final
 */
export function generateSeasonSchedule(
  teams: Record<TeamId, RoomTeam>,
  format: AuctionSessionFormat = 'MINI_7'
): SimulatedMatch[] {
  const teamIds = ALL_TEAM_IDS;
  const matches: SimulatedMatch[] = [];
  let matchNumber = 1;

  // Double Round Robin (Each pair plays 2 matches: home and away) -> 30 matches
  // For Quick format (MINI_7), single round-robin (15 matches) so it's super brisk!
  const isMega = format === 'MEGA_18';
  const rounds = isMega ? 2 : 1;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const homeId = r % 2 === 0 ? teamIds[i] : teamIds[j];
        const awayId = r % 2 === 0 ? teamIds[j] : teamIds[i];

        matches.push({
          id: `match_${matchNumber}`,
          matchNumber,
          stage: 'LEAGUE',
          stageLabel: `Match ${matchNumber}`,
          homeTeamId: homeId,
          awayTeamId: awayId,
          isCompleted: false
        });
        matchNumber++;
      }
    }
  }

  // Shuffle league matches slightly so the same teams don't play back-to-back
  for (let i = matches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [matches[i], matches[j]] = [matches[j], matches[i]];
  }

  // Re-number sequentially
  matches.forEach((m, idx) => {
    m.matchNumber = idx + 1;
    m.stageLabel = `Match ${idx + 1}`;
  });

  return matches;
}

/**
 * Initializes the Points Table for all 6 teams
 */
export function initializePointsTable(): PointsTableEntry[] {
  return ALL_TEAM_IDS.map(tId => ({
    teamId: tId,
    teamName: TEAMS[tId].name,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    points: 0,
    netRunRate: 0,
    runsScored: 0,
    oversFaced: 0,
    runsConceded: 0,
    oversBowled: 0,
    form: []
  }));
}

/**
 * Simulates a single innings realistically ball-by-ball / phase-by-phase
 */
export function simulateInnings(
  battingLineup: PurchasedPlayer[],
  bowlingLineup: PurchasedPlayer[],
  maxOvers: number,
  targetScore?: number
): MatchTeamInnings {
  const maxWickets = battingLineup.length - 1; // 10 wickets for 11 players, 4 wickets for 5 players
  const battingScores: PlayerBattingScore[] = battingLineup.map(p => ({
    playerId: p.playerId,
    name: p.displayName || p.name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false
  }));

  // Identify bowlers: specialist bowlers & all-rounders
  const bowlers = bowlingLineup
    .filter(p => p.role === 'FAST_BOWLER' || p.role === 'SPIN_BOWLER' || p.role === 'ALL_ROUNDER')
    .sort((a, b) => b.bowlingRating - a.bowlingRating);

  // Fallback: If not enough bowlers, take anyone except primary wicketkeeper
  const availableBowlers = bowlers.length >= 3 ? bowlers : bowlingLineup.slice(-5);
  const maxOversPerBowler = maxOvers === 10 ? 2 : 4;

  const bowlingScores: Map<string, PlayerBowlingScore> = new Map();
  availableBowlers.forEach(b => {
    bowlingScores.set(b.playerId, {
      playerId: b.playerId,
      name: b.displayName || b.name,
      overs: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
      dots: 0
    });
  });

  let totalRuns = 0;
  let totalWickets = 0;
  let ballsBowled = 0;

  let onStrikeIdx = 0;
  let nonStrikeIdx = 1;
  let nextBatterIdx = 2;

  let currentBowlerIndex = 0;

  // Ball-by-ball simulation over total overs
  for (let over = 1; over <= maxOvers; over++) {
    if (totalWickets >= maxWickets) break;
    if (targetScore && totalRuns >= targetScore) break;

    // Pick bowler for this over (rotate through top 4-5 bowlers)
    const bowlerPlayer = availableBowlers[currentBowlerIndex % availableBowlers.length];
    currentBowlerIndex++;
    const bScore = bowlingScores.get(bowlerPlayer.playerId)!;

    let overRuns = 0;
    let overWickets = 0;
    let overDots = 0;

    for (let ball = 1; ball <= 6; ball++) {
      if (totalWickets >= maxWickets) break;
      if (targetScore && totalRuns >= targetScore) break;

      ballsBowled++;
      const striker = battingScores[onStrikeIdx];
      const strikerPlayer = battingLineup[onStrikeIdx];
      striker.balls++;

      // Match phase adjustments:
      // Powerplay: Overs 1-3 for 10-over match, 1-6 for 20-over match
      const isPowerplay = over <= (maxOvers === 10 ? 3 : 6);
      const isDeath = over >= (maxOvers === 10 ? 8 : 16);

      // Batter and bowler effectiveness
      const batPow = (strikerPlayer?.battingRating || 75) / 100;
      const bowlPow = (bowlerPlayer?.bowlingRating || 75) / 100;

      // Calculate ball outcome probabilities
      // Wicket probability:
      let wicketProb = 0.045 + (1 - batPow) * 0.04 + bowlPow * 0.02;
      if (isDeath) wicketProb *= 1.35; // aggressive slogging at the death

      // Boundary probabilities:
      let boundarySixProb = 0.04 + batPow * 0.06 - bowlPow * 0.03;
      let boundaryFourProb = 0.10 + batPow * 0.10 - bowlPow * 0.04;
      if (isPowerplay) boundaryFourProb *= 1.25;
      if (isDeath) {
        boundarySixProb *= 1.40;
        boundaryFourProb *= 1.15;
      }

      const roll = Math.random();

      if (roll < wicketProb) {
        // WICKET!
        striker.isOut = true;
        striker.dismissal = `${DISMISSAL_METHODS[Math.floor(Math.random() * DISMISSAL_METHODS.length)]} ${bowlerPlayer.displayName || bowlerPlayer.name}`;
        totalWickets++;
        overWickets++;
        bScore.wickets++;

        if (totalWickets < maxWickets && nextBatterIdx < battingScores.length) {
          onStrikeIdx = nextBatterIdx;
          nextBatterIdx++;
        }
      } else if (roll < wicketProb + boundarySixProb) {
        // SIX!
        striker.runs += 6;
        striker.sixes++;
        totalRuns += 6;
        overRuns += 6;
      } else if (roll < wicketProb + boundarySixProb + boundaryFourProb) {
        // FOUR!
        striker.runs += 4;
        striker.fours++;
        totalRuns += 4;
        overRuns += 4;
      } else {
        // Regular scoring or dot ball
        const dotProb = 0.35 + bowlPow * 0.15 - batPow * 0.10;
        const subRoll = Math.random();

        if (subRoll < dotProb) {
          // DOT BALL
          overDots++;
        } else if (subRoll < dotProb + 0.45) {
          // 1 RUN
          striker.runs += 1;
          totalRuns += 1;
          overRuns += 1;
          // Rotate strike
          const temp = onStrikeIdx;
          onStrikeIdx = nonStrikeIdx;
          nonStrikeIdx = temp;
        } else if (subRoll < dotProb + 0.65) {
          // 2 RUNS
          striker.runs += 2;
          totalRuns += 2;
          overRuns += 2;
        } else {
          // 3 RUNS
          striker.runs += 3;
          totalRuns += 3;
          overRuns += 3;
          const temp = onStrikeIdx;
          onStrikeIdx = nonStrikeIdx;
          nonStrikeIdx = temp;
        }
      }
    }

    // End of over updates
    bScore.overs += 1;
    bScore.runsConceded += overRuns;
    bScore.dots += overDots;
    if (overRuns === 0) {
      bScore.maidens += 1;
    }

    // Rotate strike at end of over
    const temp = onStrikeIdx;
    onStrikeIdx = nonStrikeIdx;
    nonStrikeIdx = temp;
  }

  // Calculate strike rates and economies
  battingScores.forEach(b => {
    b.strikeRate = b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(1)) : 0;
  });

  const finalBowling = Array.from(bowlingScores.values()).filter(b => b.overs > 0);
  finalBowling.forEach(b => {
    b.economy = b.overs > 0 ? parseFloat((b.runsConceded / b.overs).toFixed(2)) : 0;
  });

  const fullOvers = Math.floor(ballsBowled / 6);
  const remainingBalls = ballsBowled % 6;
  const oversPlayedFloat = parseFloat(`${fullOvers}.${remainingBalls}`);

  return {
    teamId: battingLineup[0] ? (battingLineup[0] as any).teamId || 'MI' : 'MI',
    teamName: '',
    totalRuns,
    totalWickets,
    oversPlayed: oversPlayedFloat,
    maxOvers,
    batting: battingScores.filter(b => b.balls > 0 || b.isOut),
    bowling: finalBowling
  };
}

/**
 * Simulates a complete head-to-head match between two teams
 */
export function simulateMatch(
  match: SimulatedMatch,
  teams: Record<TeamId, RoomTeam>,
  format: AuctionSessionFormat = 'MINI_7'
): SimulatedMatch {
  const homeTeam = teams[match.homeTeamId];
  const awayTeam = teams[match.awayTeamId];
  const maxOvers = format === 'MEGA_18' ? 20 : 10;

  // Tactical Playing Lineup selection (11 players for MEGA_18, 5 for MINI_7)
  const homeSquadSelection = autoSelectPlayingLineup(homeTeam.squad, format);
  const awaySquadSelection = autoSelectPlayingLineup(awayTeam.squad, format);

  // Home Innings (Batting First)
  const homeInnings = simulateInnings(
    homeSquadSelection.playingLineup,
    awaySquadSelection.playingLineup,
    maxOvers
  );
  homeInnings.teamId = match.homeTeamId;
  homeInnings.teamName = homeTeam.teamConfig.name;

  // Away Innings (Chasing Target)
  const target = homeInnings.totalRuns + 1;
  const awayInnings = simulateInnings(
    awaySquadSelection.playingLineup,
    homeSquadSelection.playingLineup,
    maxOvers,
    target
  );
  awayInnings.teamId = match.awayTeamId;
  awayInnings.teamName = awayTeam.teamConfig.name;

  // Determine Match Outcome
  let winnerTeamId: TeamId | 'TIE';
  let marginText = '';

  if (awayInnings.totalRuns >= target) {
    winnerTeamId = match.awayTeamId;
    const wicketsLeft = (format === 'MEGA_18' ? 10 : 4) - awayInnings.totalWickets;
    const maxBalls = maxOvers * 6;
    const ballsFaced = Math.floor(awayInnings.oversPlayed) * 6 + Math.round((awayInnings.oversPlayed % 1) * 10);
    const ballsLeft = Math.max(0, maxBalls - ballsFaced);
    marginText = `${awayTeam.teamConfig.abbr} WON BY ${wicketsLeft} WICKETS${ballsLeft > 0 ? ` (${ballsLeft} balls left)` : ''}`;
  } else if (homeInnings.totalRuns > awayInnings.totalRuns) {
    winnerTeamId = match.homeTeamId;
    const runMargin = homeInnings.totalRuns - awayInnings.totalRuns;
    marginText = `${homeTeam.teamConfig.abbr} WON BY ${runMargin} RUNS`;
  } else {
    // Super Over tie-breaker
    winnerTeamId = Math.random() > 0.5 ? match.homeTeamId : match.awayTeamId;
    const winAbbr = TEAMS[winnerTeamId].abbr;
    marginText = `MATCH TIED! ${winAbbr} WON IN SUPER OVER`;
  }

  // Determine Player of the Match
  let potm = {
    playerId: '',
    name: 'Star Player',
    teamId: winnerTeamId,
    summary: 'Match Winning Performance'
  };

  const winningInnings = winnerTeamId === match.homeTeamId ? homeInnings : awayInnings;
  const topBatter = [...winningInnings.batting].sort((a, b) => b.runs - a.runs)[0];
  const topBowler = [...winningInnings.bowling].sort((a, b) => b.wickets !== a.wickets ? b.wickets - a.wickets : a.economy - b.economy)[0];

  if (topBatter && (!topBowler || topBatter.runs >= 45 || topBatter.runs * 2 > (topBowler.wickets * 25))) {
    potm = {
      playerId: topBatter.playerId,
      name: topBatter.name,
      teamId: winningInnings.teamId,
      summary: `${topBatter.runs} runs (${topBatter.balls} balls, ${topBatter.fours}x4, ${topBatter.sixes}x6)`
    };
  } else if (topBowler) {
    potm = {
      playerId: topBowler.playerId,
      name: topBowler.name,
      teamId: winningInnings.teamId,
      summary: `${topBowler.wickets}/${topBowler.runsConceded} (${topBowler.overs} ov, Econ: ${topBowler.economy})`
    };
  }

  return {
    ...match,
    homeInnings,
    awayInnings,
    winnerTeamId,
    marginText,
    playerOfTheMatch: potm,
    isCompleted: true
  };
}

/**
 * Updates Points Table, Orange Cap, Purple Cap, and MVP standings after matches
 */
export function recalculateSeasonStandings(
  completedMatches: SimulatedMatch[],
  format: AuctionSessionFormat = 'MINI_7'
): {
  pointsTable: PointsTableEntry[];
  orangeCapList: OrangeCapLeader[];
  purpleCapList: PurpleCapLeader[];
  mvpList: MVPLeader[];
} {
  const table = initializePointsTable();
  const tableMap = new Map<TeamId, PointsTableEntry>();
  table.forEach(entry => tableMap.set(entry.teamId, entry));

  const batterStatsMap = new Map<string, {
    playerId: string;
    name: string;
    teamId: TeamId;
    runs: number;
    balls: number;
    matches: number;
    highestScore: number;
    fours: number;
    sixes: number;
  }>();

  const bowlerStatsMap = new Map<string, {
    playerId: string;
    name: string;
    teamId: TeamId;
    wickets: number;
    runsConceded: number;
    overs: number;
    matches: number;
    bestWickets: number;
    bestRuns: number;
  }>();

  completedMatches.filter(m => m.isCompleted && m.homeInnings && m.awayInnings).forEach(m => {
    const homeEntry = tableMap.get(m.homeTeamId);
    const awayEntry = tableMap.get(m.awayTeamId);

    if (homeEntry && awayEntry && m.homeInnings && m.awayInnings) {
      // Only count league matches for points table
      if (m.stage === 'LEAGUE') {
        homeEntry.played += 1;
        awayEntry.played += 1;

        homeEntry.runsScored += m.homeInnings.totalRuns;
        homeEntry.oversFaced += Math.floor(m.homeInnings.oversPlayed) + ((m.homeInnings.oversPlayed % 1) * 10 / 6);
        homeEntry.runsConceded += m.awayInnings.totalRuns;
        homeEntry.oversBowled += Math.floor(m.awayInnings.oversPlayed) + ((m.awayInnings.oversPlayed % 1) * 10 / 6);

        awayEntry.runsScored += m.awayInnings.totalRuns;
        awayEntry.oversFaced += Math.floor(m.awayInnings.oversPlayed) + ((m.awayInnings.oversPlayed % 1) * 10 / 6);
        awayEntry.runsConceded += m.homeInnings.totalRuns;
        awayEntry.oversBowled += Math.floor(m.homeInnings.oversPlayed) + ((m.homeInnings.oversPlayed % 1) * 10 / 6);

        if (m.winnerTeamId === m.homeTeamId) {
          homeEntry.won += 1;
          homeEntry.points += 2;
          homeEntry.form.unshift('W');
          awayEntry.lost += 1;
          awayEntry.form.unshift('L');
        } else if (m.winnerTeamId === m.awayTeamId) {
          awayEntry.won += 1;
          awayEntry.points += 2;
          awayEntry.form.unshift('W');
          homeEntry.lost += 1;
          homeEntry.form.unshift('L');
        } else {
          homeEntry.tied += 1;
          homeEntry.points += 1;
          homeEntry.form.unshift('T');
          awayEntry.tied += 1;
          awayEntry.points += 1;
          awayEntry.form.unshift('T');
        }

        homeEntry.form = homeEntry.form.slice(0, 5);
        awayEntry.form = awayEntry.form.slice(0, 5);
      }

      // Collect batting & bowling data for Orange & Purple caps
      [m.homeInnings, m.awayInnings].forEach(inn => {
        inn.batting.forEach(b => {
          let bEntry = batterStatsMap.get(b.playerId);
          if (!bEntry) {
            bEntry = {
              playerId: b.playerId,
              name: b.name,
              teamId: inn.teamId,
              runs: 0,
              balls: 0,
              matches: 0,
              highestScore: 0,
              fours: 0,
              sixes: 0
            };
            batterStatsMap.set(b.playerId, bEntry);
          }
          bEntry.runs += b.runs;
          bEntry.balls += b.balls;
          bEntry.matches += 1;
          bEntry.highestScore = Math.max(bEntry.highestScore, b.runs);
          bEntry.fours += b.fours;
          bEntry.sixes += b.sixes;
        });

        inn.bowling.forEach(bw => {
          let bwEntry = bowlerStatsMap.get(bw.playerId);
          if (!bwEntry) {
            bwEntry = {
              playerId: bw.playerId,
              name: bw.name,
              teamId: inn.teamId,
              wickets: 0,
              runsConceded: 0,
              overs: 0,
              matches: 0,
              bestWickets: 0,
              bestRuns: 999
            };
            bowlerStatsMap.set(bw.playerId, bwEntry);
          }
          bwEntry.wickets += bw.wickets;
          bwEntry.runsConceded += bw.runsConceded;
          bwEntry.overs += bw.overs;
          bwEntry.matches += 1;
          if (bw.wickets > bwEntry.bestWickets || (bw.wickets === bwEntry.bestWickets && bw.runsConceded < bwEntry.bestRuns)) {
            bwEntry.bestWickets = bw.wickets;
            bwEntry.bestRuns = bw.runsConceded;
          }
        });
      });
    }
  });

  // Calculate Net Run Rate
  table.forEach(entry => {
    if (entry.played > 0 && entry.oversFaced > 0 && entry.oversBowled > 0) {
      const forRate = entry.runsScored / entry.oversFaced;
      const againstRate = entry.runsConceded / entry.oversBowled;
      entry.netRunRate = parseFloat((forRate - againstRate).toFixed(3));
    }
  });

  // Sort points table: Points descending, then NRR descending
  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.netRunRate - a.netRunRate;
  });

  // Build Orange Cap Leaderboard
  const orangeCapList: OrangeCapLeader[] = Array.from(batterStatsMap.values())
    .map(b => ({
      playerId: b.playerId,
      name: b.name,
      teamId: b.teamId,
      runs: b.runs,
      matches: b.matches,
      highestScore: b.highestScore,
      strikeRate: b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(1)) : 0,
      fours: b.fours,
      sixes: b.sixes
    }))
    .sort((a, b) => b.runs !== a.runs ? b.runs - a.runs : b.strikeRate - a.strikeRate);

  // Build Purple Cap Leaderboard
  const purpleCapList: PurpleCapLeader[] = Array.from(bowlerStatsMap.values())
    .map(bw => ({
      playerId: bw.playerId,
      name: bw.name,
      teamId: bw.teamId,
      wickets: bw.wickets,
      matches: bw.matches,
      economy: bw.overs > 0 ? parseFloat((bw.runsConceded / bw.overs).toFixed(2)) : 0,
      bestBowling: `${bw.bestWickets}/${bw.bestRuns}`
    }))
    .sort((a, b) => b.wickets !== a.wickets ? b.wickets - a.wickets : a.economy - b.economy);

  // Build MVP Leaderboard (Runs: 1 pt each, Wickets: 25 pts each, Fours: 1 pt, Sixes: 2 pts)
  const mvpMap = new Map<string, MVPLeader>();
  orangeCapList.forEach(b => {
    mvpMap.set(b.playerId, {
      playerId: b.playerId,
      name: b.name,
      teamId: b.teamId,
      mvpPoints: b.runs + (b.fours * 1) + (b.sixes * 2),
      runs: b.runs,
      wickets: 0,
      summary: `${b.runs} Runs`
    });
  });

  purpleCapList.forEach(bw => {
    const existing = mvpMap.get(bw.playerId);
    if (existing) {
      existing.wickets = bw.wickets;
      existing.mvpPoints += (bw.wickets * 25);
      existing.summary = `${existing.runs} Runs & ${bw.wickets} Wkts`;
    } else {
      mvpMap.set(bw.playerId, {
        playerId: bw.playerId,
        name: bw.name,
        teamId: bw.teamId,
        mvpPoints: bw.wickets * 25,
        runs: 0,
        wickets: bw.wickets,
        summary: `${bw.wickets} Wickets`
      });
    }
  });

  const mvpList: MVPLeader[] = Array.from(mvpMap.values()).sort((a, b) => b.mvpPoints - a.mvpPoints);

  return {
    pointsTable: table,
    orangeCapList,
    purpleCapList,
    mvpList
  };
}

/**
 * Dynamically schedules playoff matches once previous stage matches conclude
 */
export function checkAndSchedulePlayoffs(
  matches: SimulatedMatch[],
  pointsTable: PointsTableEntry[]
): SimulatedMatch[] {
  const updatedMatches = [...matches];
  const leagueMatches = updatedMatches.filter(m => m.stage === 'LEAGUE');
  const allLeagueCompleted = leagueMatches.length > 0 && leagueMatches.every(m => m.isCompleted);

  if (!allLeagueCompleted) {
    return updatedMatches;
  }

  // Check if Qualifier 1 and Eliminator exist
  const q1 = updatedMatches.find(m => m.stage === 'QUALIFIER_1');
  const elim = updatedMatches.find(m => m.stage === 'ELIMINATOR');

  if (!q1 && !elim && pointsTable.length >= 4) {
    // Schedule Qualifier 1 (1st vs 2nd) and Eliminator (3rd vs 4th)
    const nextMatchNum = updatedMatches.length + 1;
    updatedMatches.push({
      id: `playoff_q1`,
      matchNumber: nextMatchNum,
      stage: 'QUALIFIER_1',
      stageLabel: 'Qualifier 1 (1st vs 2nd)',
      homeTeamId: pointsTable[0].teamId,
      awayTeamId: pointsTable[1].teamId,
      isCompleted: false
    });

    updatedMatches.push({
      id: `playoff_elim`,
      matchNumber: nextMatchNum + 1,
      stage: 'ELIMINATOR',
      stageLabel: 'Eliminator (3rd vs 4th)',
      homeTeamId: pointsTable[2].teamId,
      awayTeamId: pointsTable[3].teamId,
      isCompleted: false
    });

    return updatedMatches;
  }

  // Check if Qualifier 2 needs to be scheduled
  const q2 = updatedMatches.find(m => m.stage === 'QUALIFIER_2');
  if (q1?.isCompleted && elim?.isCompleted && !q2) {
    const q1Loser = q1.winnerTeamId === q1.homeTeamId ? q1.awayTeamId : q1.homeTeamId;
    const elimWinner = elim.winnerTeamId as TeamId;

    if (q1Loser && elimWinner) {
      const nextMatchNum = updatedMatches.length + 1;
      updatedMatches.push({
        id: `playoff_q2`,
        matchNumber: nextMatchNum,
        stage: 'QUALIFIER_2',
        stageLabel: 'Qualifier 2 (Q1 Loser vs Elim Winner)',
        homeTeamId: q1Loser,
        awayTeamId: elimWinner,
        isCompleted: false
      });
      return updatedMatches;
    }
  }

  // Check if Final needs to be scheduled
  const finalMatch = updatedMatches.find(m => m.stage === 'FINAL');
  if (q1?.isCompleted && q2?.isCompleted && !finalMatch) {
    const q1Winner = q1.winnerTeamId as TeamId;
    const q2Winner = q2.winnerTeamId as TeamId;

    if (q1Winner && q2Winner) {
      const nextMatchNum = updatedMatches.length + 1;
      updatedMatches.push({
        id: `playoff_final`,
        matchNumber: nextMatchNum,
        stage: 'FINAL',
        stageLabel: 'GRAND FINAL 🏆',
        homeTeamId: q1Winner,
        awayTeamId: q2Winner,
        isCompleted: false
      });
      return updatedMatches;
    }
  }

  return updatedMatches;
}

