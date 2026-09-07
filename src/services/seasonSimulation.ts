import { TeamId, PurchasedPlayer, RoomTeam } from '../types/auction';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import { PLAYERS_POOL } from '../data/players';
import {
  SimulatedMatch,
  PointsTableEntry,
  SimulatedPlayerStats,
  TeamRoster,
  InningsScore,
  InningsTopBatter,
  InningsTopBowler
} from '../types/simulation';

const TEAM_VENUES: Record<TeamId, string> = {
  MI: 'Wankhede Stadium, Mumbai',
  CSK: 'M. A. Chidambaram Stadium, Chennai',
  RCB: 'M. Chinnaswamy Stadium, Bengaluru',
  SRH: 'Rajiv Gandhi Stadium, Hyderabad',
  GT: 'Narendra Modi Stadium, Ahmedabad',
  KKR: 'Eden Gardens, Kolkata'
};

// Default franchise star retainers to ensure every team has an iconic, 11-player squad
const FRANCHISE_DEFAULTS: Record<TeamId, string[]> = {
  MI: ['Rohit Sharma', 'Jasprit Bumrah', 'Hardik Pandya', 'Suryakumar Yadav', 'Tilak Varma', 'Ishan Kishan', 'Tim David', 'Gerald Coetzee', 'Piyush Chawla', 'Jasprit Bumrah', 'Nuwan Thushara'],
  CSK: ['MS Dhoni', 'Ruturaj Gaikwad', 'Ravindra Jadeja', 'Shivam Dube', 'Matheesha Pathirana', 'Mustafizur Rahman', 'Rachin Ravindra', 'Shardul Thakur', 'Deepak Chahar', 'Tushar Deshpande', 'Ajinkya Rahane'],
  RCB: ['Virat Kohli', 'Mohammed Siraj', 'Glenn Maxwell', 'Faf du Plessis', 'Rajat Patidar', 'Dinesh Karthik', 'Cameron Green', 'Yash Dayal', 'Will Jacks', 'Lockie Ferguson', 'Karn Sharma'],
  SRH: ['Heinrich Klaasen', 'Pat Cummins', 'Travis Head', 'Abhishek Sharma', 'Bhuvneshwar Kumar', 'T. Natarajan', 'Nitish Kumar Reddy', 'Aiden Markram', 'Mayank Agarwal', 'Shahbaz Ahmed', 'Jaydev Unadkat'],
  GT: ['Shubman Gill', 'Rashid Khan', 'Mohammed Shami', 'David Miller', 'Rahul Tewatia', 'Sai Sudharsan', 'Mohit Sharma', 'Noor Ahmad', 'Kane Williamson', 'Wriddhiman Saha', 'Umesh Yadav'],
  KKR: ['Andre Russell', 'Sunil Narine', 'Rinku Singh', 'Shreyas Iyer', 'Mitchell Starc', 'Varun Chakaravarthy', 'Venkatesh Iyer', 'Harshit Rana', 'Phil Salt', 'Ramandeep Singh', 'Nitish Rana']
};

/**
 * Ensures each team has a full 11-man playing squad using auction picks first,
 * then backfilling with iconic franchise stars or pool players.
 */
export function buildTeamRosters(teamsRecord: Record<TeamId, RoomTeam>): Record<TeamId, TeamRoster> {
  const rosters: Record<TeamId, TeamRoster> = {} as Record<TeamId, TeamRoster>;
  const usedPlayerIds = new Set<string>();

  // 1. Assign players bought in auction
  ALL_TEAM_IDS.forEach((tId) => {
    const roomTeam = teamsRecord[tId];
    const squad: PurchasedPlayer[] = roomTeam ? [...roomTeam.squad] : [];
    squad.forEach((p) => usedPlayerIds.add(p.playerId));
    rosters[tId] = { teamId: tId, players: squad };
  });

  // 2. Backfill each team up to at least 11 players
  ALL_TEAM_IDS.forEach((tId) => {
    const currentList = rosters[tId].players;
    if (currentList.length < 11) {
      // First try franchise defaults
      const defaults = FRANCHISE_DEFAULTS[tId] || [];
      for (const name of defaults) {
        if (currentList.length >= 11) break;
        const poolPlayer = PLAYERS_POOL.find((p) => p.name.toLowerCase() === name.toLowerCase());
        if (poolPlayer && !usedPlayerIds.has(poolPlayer.id)) {
          usedPlayerIds.add(poolPlayer.id);
          currentList.push({
            playerId: poolPlayer.id,
            name: poolPlayer.name,
            displayName: poolPlayer.displayName,
            role: poolPlayer.role,
            playerType: poolPlayer.playerType,
            overallRating: poolPlayer.overallRating,
            battingRating: poolPlayer.battingRating,
            bowlingRating: poolPlayer.bowlingRating,
            fieldingRating: poolPlayer.fieldingRating,
            starRating: poolPlayer.starRating,
            isIndian: poolPlayer.isIndian,
            price: poolPlayer.basePrice,
            imageUrl: poolPlayer.imageUrl
          });
        }
      }

      // If still fewer than 11, backfill with remaining available players from pool
      if (currentList.length < 11) {
        for (const poolPlayer of PLAYERS_POOL) {
          if (currentList.length >= 11) break;
          if (!usedPlayerIds.has(poolPlayer.id)) {
            usedPlayerIds.add(poolPlayer.id);
            currentList.push({
              playerId: poolPlayer.id,
              name: poolPlayer.name,
              displayName: poolPlayer.displayName,
              role: poolPlayer.role,
              playerType: poolPlayer.playerType,
              overallRating: poolPlayer.overallRating,
              battingRating: poolPlayer.battingRating,
              bowlingRating: poolPlayer.bowlingRating,
              fieldingRating: poolPlayer.fieldingRating,
              starRating: poolPlayer.starRating,
              isIndian: poolPlayer.isIndian,
              price: poolPlayer.basePrice,
              imageUrl: poolPlayer.imageUrl
            });
          }
        }
      }
    }
  });

  return rosters;
}

/**
 * Initializes empty stats map for all players in all team rosters.
 */
export function initializePlayerStats(rosters: Record<TeamId, TeamRoster>): Record<string, SimulatedPlayerStats> {
  const statsMap: Record<string, SimulatedPlayerStats> = {};

  Object.values(rosters).forEach((roster) => {
    roster.players.forEach((p) => {
      if (!statsMap[p.playerId]) {
        statsMap[p.playerId] = {
          playerId: p.playerId,
          name: p.name,
          displayName: p.displayName,
          role: p.role,
          teamId: roster.teamId,
          imageUrl: p.imageUrl,
          isIndian: p.isIndian,
          matches: 0,
          runs: 0,
          ballsFaced: 0,
          highestScore: 0,
          highestScoreNotOut: false,
          fifties: 0,
          hundreds: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          battingAvg: 0,
          wickets: 0,
          oversBowled: 0,
          runsConceded: 0,
          maidens: 0,
          economy: 0,
          bestBowlingWickets: 0,
          bestBowlingRuns: 99,
          threeWickets: 0,
          fiveWickets: 0,
          mvpPoints: 0
        };
      }
    });
  });

  return statsMap;
}

/**
 * Generates official double round-robin league schedule for all 6 teams (30 matches total).
 */
export function generateLeagueSchedule(): SimulatedMatch[] {
  const matches: SimulatedMatch[] = [];
  let matchNum = 1;

  // Leg 1 (Home)
  for (let i = 0; i < ALL_TEAM_IDS.length; i++) {
    for (let j = i + 1; j < ALL_TEAM_IDS.length; j++) {
      const home = ALL_TEAM_IDS[i];
      const away = ALL_TEAM_IDS[j];
      matches.push(createEmptyMatch(matchNum++, 'LEAGUE', `Match ${matchNum - 1}`, home, away));
    }
  }

  // Leg 2 (Reverse Away)
  for (let i = 0; i < ALL_TEAM_IDS.length; i++) {
    for (let j = i + 1; j < ALL_TEAM_IDS.length; j++) {
      const home = ALL_TEAM_IDS[j];
      const away = ALL_TEAM_IDS[i];
      matches.push(createEmptyMatch(matchNum++, 'LEAGUE', `Match ${matchNum - 1}`, home, away));
    }
  }

  // Shuffle slightly so teams don't play the same opponent back-to-back
  return interleaveSchedule(matches);
}

function interleaveSchedule(matches: SimulatedMatch[]): SimulatedMatch[] {
  const result: SimulatedMatch[] = [];
  const leg1 = matches.slice(0, 15);
  const leg2 = matches.slice(15);

  for (let i = 0; i < 15; i++) {
    result.push(leg1[i]);
    result.push(leg2[i]);
  }

  // Re-number sequentially
  result.forEach((m, idx) => {
    m.matchNumber = idx + 1;
    m.title = `Match ${idx + 1}`;
  });

  return result;
}

function createEmptyMatch(
  matchNumber: number,
  stage: SimulatedMatch['stage'],
  title: string,
  homeTeamId: TeamId,
  awayTeamId: TeamId
): SimulatedMatch {
  return {
    id: `sim_m_${matchNumber}`,
    matchNumber,
    stage,
    title,
    homeTeamId,
    awayTeamId,
    venue: TEAM_VENUES[homeTeamId] || 'Eden Gardens, Kolkata',
    tossWinnerId: homeTeamId,
    tossDecision: 'BAT',
    innings1: {
      teamId: homeTeamId,
      runs: 0,
      wickets: 0,
      overs: 20.0,
      runRate: 0,
      topBatters: [],
      topBowlers: []
    },
    innings2: {
      teamId: awayTeamId,
      runs: 0,
      wickets: 0,
      overs: 20.0,
      runRate: 0,
      topBatters: [],
      topBowlers: []
    },
    winnerTeamId: homeTeamId,
    marginText: '',
    potm: {
      playerId: '',
      name: '',
      teamId: homeTeamId,
      performance: ''
    },
    isCompleted: false
  };
}

/**
 * Simulates an individual match using actual player ratings and probability engine.
 */
export function simulateSingleMatch(
  match: SimulatedMatch,
  rosters: Record<TeamId, TeamRoster>,
  statsMap: Record<string, SimulatedPlayerStats>
): SimulatedMatch {
  if (match.isCompleted) return match;

  const teamAId = match.homeTeamId;
  const teamBId = match.awayTeamId;
  const rosterA = rosters[teamAId]?.players || [];
  const rosterB = rosters[teamBId]?.players || [];

  // Toss
  const tossWinnerId = Math.random() > 0.5 ? teamAId : teamBId;
  const tossDecision: 'BAT' | 'BOWL' = Math.random() > 0.45 ? 'BAT' : 'BOWL';

  const batFirstId = tossDecision === 'BAT' ? tossWinnerId : (tossWinnerId === teamAId ? teamBId : teamAId);
  const batSecondId = batFirstId === teamAId ? teamBId : teamAId;

  const batFirstRoster = batFirstId === teamAId ? rosterA : rosterB;
  const batSecondRoster = batSecondId === teamAId ? rosterA : rosterB;

  // Innings 1 Simulation
  const inn1 = simulateInnings(batFirstId, batFirstRoster, batSecondRoster, undefined);

  // Innings 2 Simulation (Chasing target: inn1.runs + 1)
  const inn2 = simulateInnings(batSecondId, batSecondRoster, batFirstRoster, inn1.runs + 1);

  // Determine Winner & Margin
  let winnerId: TeamId;
  let marginText = '';

  if (inn2.runs >= inn1.runs + 1) {
    winnerId = batSecondId;
    const wicketsLeft = 10 - inn2.wickets;
    const ballsRemaining = Math.max(0, Math.round((20.0 - inn2.overs) * 6));
    const ballsText = ballsRemaining > 0 ? ` (${ballsRemaining} balls left)` : '';
    marginText = `${TEAMS[winnerId].abbr} WON BY ${wicketsLeft} WICKET${wicketsLeft > 1 ? 'S' : ''}${ballsText}`;
  } else if (inn2.runs === inn1.runs) {
    // Super Over tie-breaker
    winnerId = Math.random() > 0.5 ? batFirstId : batSecondId;
    marginText = `${TEAMS[winnerId].abbr} WON VIA SUPER OVER THRILLER!`;
  } else {
    winnerId = batFirstId;
    const runsMargin = inn1.runs - inn2.runs;
    marginText = `${TEAMS[winnerId].abbr} WON BY ${runsMargin} RUN${runsMargin > 1 ? 'S' : ''}`;
  }

  // Update Player Season Stats
  updateSeasonStatsForInnings(inn1, statsMap);
  updateSeasonStatsForInnings(inn2, statsMap);

  // Select Player of the Match from the winning team
  const potm = determinePlayerOfTheMatch(winnerId, inn1, inn2);

  const completedMatch: SimulatedMatch = {
    ...match,
    tossWinnerId,
    tossDecision,
    innings1: inn1,
    innings2: inn2,
    winnerTeamId: winnerId,
    marginText,
    potm,
    isCompleted: true
  };

  return completedMatch;
}

function simulateInnings(
  batTeamId: TeamId,
  battingRoster: PurchasedPlayer[],
  bowlingRoster: PurchasedPlayer[],
  target?: number
): InningsScore {
  // Sort batting lineup: openers & batsmen first, then keepers, all-rounders, bowlers
  const batters = [...battingRoster].sort((a, b) => (b.battingRating || 50) - (a.battingRating || 50));
  // Sort bowlers: pace & spin specialists and all-rounders first
  const bowlers = [...bowlingRoster].sort((a, b) => (b.bowlingRating || 50) - (a.bowlingRating || 50));

  const topBatters: InningsTopBatter[] = [];
  const topBowlers: InningsTopBowler[] = [];

  let totalRuns = 0;
  let wickets = 0;
  let ballsBowled = 0;
  const maxBalls = 120; // 20 overs

  // Simulate top 5-7 batsmen
  const activeBattersCount = Math.min(batters.length, 7);
  for (let i = 0; i < activeBattersCount; i++) {
    if (ballsBowled >= maxBalls || wickets >= 10) break;
    if (target && totalRuns >= target) break;

    const batter = batters[i];
    const skill = batter.battingRating || 75;

    // Remaining balls allocated to this batsman
    const maxAvailableBalls = Math.min(
      Math.floor(Math.random() * 32) + 12,
      maxBalls - ballsBowled
    );

    let bRuns = 0;
    let bBalls = 0;
    let bFours = 0;
    let bSixes = 0;
    let isOut = false;

    for (let b = 0; b < maxAvailableBalls; b++) {
      bBalls++;
      ballsBowled++;

      // Ball outcome probability
      const roll = Math.random() * 100;
      const boundaryChance = (skill - 50) * 0.45; // ~10-22%
      const sixChance = (skill - 60) * 0.22; // ~4-8%
      const wicketChance = Math.max(3, 9 - (skill - 60) * 0.1);

      if (roll < wicketChance && i < activeBattersCount - 1 && bBalls > 4) {
        isOut = true;
        wickets++;
        break;
      } else if (roll < wicketChance + sixChance) {
        bRuns += 6;
        bSixes++;
        totalRuns += 6;
      } else if (roll < wicketChance + sixChance + boundaryChance) {
        bRuns += 4;
        bFours++;
        totalRuns += 4;
      } else if (roll < 75) {
        const singles = Math.random() > 0.4 ? 1 : 2;
        bRuns += singles;
        totalRuns += singles;
      }

      if (target && totalRuns >= target) break;
    }

    topBatters.push({
      playerId: batter.playerId,
      name: batter.name,
      runs: bRuns,
      balls: bBalls,
      fours: bFours,
      sixes: bSixes,
      isNotOut: !isOut
    });
  }

  // Assign wickets and overs to top bowlers
  const activeBowlers = bowlers.slice(0, 5);
  let wicketsAllocated = 0;
  activeBowlers.forEach((bowler, idx) => {
    const bWickets =
      idx === 0
        ? Math.min(wickets, Math.floor(Math.random() * 3) + 1)
        : Math.min(wickets - wicketsAllocated, Math.floor(Math.random() * 2));

    wicketsAllocated += bWickets;
    const overs = 4;
    const runsConceded = Math.round(
      Math.max(18, (totalRuns / 5) * (1 + (Math.random() * 0.4 - 0.2)))
    );

    topBowlers.push({
      playerId: bowler.playerId,
      name: bowler.name,
      wickets: bWickets,
      runs: runsConceded,
      overs,
      maidens: Math.random() > 0.85 ? 1 : 0
    });
  });

  const oversDecimal = +(Math.floor(ballsBowled / 6) + (ballsBowled % 6) / 10).toFixed(1);
  const effectiveOvers = ballsBowled / 6;
  const runRate = effectiveOvers > 0 ? +(totalRuns / effectiveOvers).toFixed(2) : 0;

  return {
    teamId: batTeamId,
    runs: totalRuns,
    wickets: Math.min(10, wickets),
    overs: oversDecimal,
    runRate,
    topBatters: topBatters.sort((a, b) => b.runs - a.runs),
    topBowlers: topBowlers.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
  };
}

function updateSeasonStatsForInnings(inn: InningsScore, statsMap: Record<string, SimulatedPlayerStats>) {
  // Update Batters
  inn.topBatters.forEach((tb) => {
    const s = statsMap[tb.playerId];
    if (s) {
      s.matches += 1;
      s.runs += tb.runs;
      s.ballsFaced += tb.balls;
      s.fours += tb.fours;
      s.sixes += tb.sixes;
      if (tb.runs >= 100) s.hundreds += 1;
      else if (tb.runs >= 50) s.fifties += 1;

      if (tb.runs > s.highestScore) {
        s.highestScore = tb.runs;
        s.highestScoreNotOut = tb.isNotOut;
      }

      s.strikeRate = s.ballsFaced > 0 ? +((s.runs / s.ballsFaced) * 100).toFixed(2) : 0;
      s.battingAvg = s.matches > 0 ? +(s.runs / s.matches).toFixed(2) : s.runs;
      // MVP Points: 1 pt/run, 2.5 pts/four, 3.5 pts/six, 10 bonus for 50+, 25 bonus for 100+
      s.mvpPoints += tb.runs * 1 + tb.fours * 2.5 + tb.sixes * 3.5 + (tb.runs >= 50 ? 10 : 0) + (tb.runs >= 100 ? 25 : 0);
    }
  });

  // Update Bowlers
  inn.topBowlers.forEach((tb) => {
    const s = statsMap[tb.playerId];
    if (s) {
      s.wickets += tb.wickets;
      s.oversBowled += tb.overs;
      s.runsConceded += tb.runs;
      s.maidens += tb.maidens;
      if (tb.wickets >= 5) s.fiveWickets += 1;
      else if (tb.wickets >= 3) s.threeWickets += 1;

      if (
        tb.wickets > s.bestBowlingWickets ||
        (tb.wickets === s.bestBowlingWickets && tb.runs < s.bestBowlingRuns)
      ) {
        s.bestBowlingWickets = tb.wickets;
        s.bestBowlingRuns = tb.runs;
      }

      s.economy = s.oversBowled > 0 ? +(s.runsConceded / s.oversBowled).toFixed(2) : 0;
      // MVP Points: 25 pts/wicket, 20 bonus for maiden, 30 bonus for 3+ wickets, 50 for 5+ wickets
      s.mvpPoints += tb.wickets * 25 + tb.maidens * 20 + (tb.wickets >= 3 ? 30 : 0) + (tb.wickets >= 5 ? 50 : 0);
    }
  });
}

function determinePlayerOfTheMatch(
  winnerTeamId: TeamId,
  inn1: InningsScore,
  inn2: InningsScore
): SimulatedMatch['potm'] {
  const winnerBatters = (inn1.teamId === winnerTeamId ? inn1.topBatters : inn2.topBatters) || [];
  const winnerBowlers = (inn1.teamId === winnerTeamId ? inn2.topBowlers : inn1.topBowlers) || [];

  const bestBatter = winnerBatters[0];
  const bestBowler = winnerBowlers[0];

  if (bestBowler && bestBowler.wickets >= 3) {
    return {
      playerId: bestBowler.playerId,
      name: bestBowler.name,
      teamId: winnerTeamId,
      performance: `${bestBowler.wickets}/${bestBowler.runs} (${bestBowler.overs} ov)`
    };
  }

  if (bestBatter && bestBatter.runs >= 45) {
    return {
      playerId: bestBatter.playerId,
      name: bestBatter.name,
      teamId: winnerTeamId,
      performance: `${bestBatter.runs}* (${bestBatter.balls} balls)`
    };
  }

  // Fallback to whichever is highest
  if (bestBatter) {
    return {
      playerId: bestBatter.playerId,
      name: bestBatter.name,
      teamId: winnerTeamId,
      performance: `${bestBatter.runs} runs (${bestBatter.balls}b)`
    };
  }

  return {
    playerId: 'hero',
    name: TEAMS[winnerTeamId].shortName,
    teamId: winnerTeamId,
    performance: 'Match Winning Effort'
  };
}

/**
 * Calculates current Points Table and Net Run Rates from completed league matches.
 */
export function calculatePointsTable(matches: SimulatedMatch[]): PointsTableEntry[] {
  const tableMap: Record<TeamId, PointsTableEntry> = {} as any;

  ALL_TEAM_IDS.forEach((tId) => {
    tableMap[tId] = {
      teamId: tId,
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
    };
  });

  const leagueMatches = matches.filter((m) => m.stage === 'LEAGUE' && m.isCompleted);

  leagueMatches.forEach((m) => {
    const t1 = m.innings1.teamId;
    const t2 = m.innings2.teamId;

    const row1 = tableMap[t1];
    const row2 = tableMap[t2];

    if (!row1 || !row2) return;

    row1.played += 1;
    row2.played += 1;

    // Runs and Overs
    row1.runsScored += m.innings1.runs;
    row1.oversFaced += m.innings1.overs;
    row1.runsConceded += m.innings2.runs;
    row1.oversBowled += m.innings2.overs;

    row2.runsScored += m.innings2.runs;
    row2.oversFaced += m.innings2.overs;
    row2.runsConceded += m.innings1.runs;
    row2.oversBowled += m.innings1.overs;

    if (m.winnerTeamId === t1) {
      row1.won += 1;
      row1.points += 2;
      row1.form.push('W');
      row2.lost += 1;
      row2.form.push('L');
    } else if (m.winnerTeamId === t2) {
      row2.won += 1;
      row2.points += 2;
      row2.form.push('W');
      row1.lost += 1;
      row1.form.push('L');
    } else {
      row1.tied += 1;
      row2.tied += 1;
      row1.points += 1;
      row2.points += 1;
    }
  });

  // Calculate NRR
  Object.values(tableMap).forEach((row) => {
    const forRate = row.oversFaced > 0 ? row.runsScored / row.oversFaced : 0;
    const againstRate = row.oversBowled > 0 ? row.runsConceded / row.oversBowled : 0;
    row.netRunRate = +(forRate - againstRate).toFixed(3);
    // Keep last 5 matches in form
    row.form = row.form.slice(-5);
  });

  // Sort: Points DESC, then NRR DESC, then Wins DESC
  return Object.values(tableMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.netRunRate !== a.netRunRate) return b.netRunRate - a.netRunRate;
    return b.won - a.won;
  });
}

/**
 * Creates playoff fixtures once the league stage is completed.
 */
export function createPlayoffMatches(
  pointsTable: PointsTableEntry[],
  currentMatchCount: number
): SimulatedMatch[] {
  const top4 = pointsTable.slice(0, 4).map((p) => p.teamId);
  if (top4.length < 4) return [];

  const [rank1, rank2, rank3, rank4] = top4;

  const q1 = createEmptyMatch(
    currentMatchCount + 1,
    'QUALIFIER_1',
    'Qualifier 1 (Rank 1 vs Rank 2)',
    rank1,
    rank2
  );
  q1.venue = TEAM_VENUES[rank1] || 'Wankhede Stadium, Mumbai';

  const elim = createEmptyMatch(
    currentMatchCount + 2,
    'ELIMINATOR',
    'Eliminator (Rank 3 vs Rank 4)',
    rank3,
    rank4
  );
  elim.venue = TEAM_VENUES[rank3] || 'M. A. Chidambaram Stadium, Chennai';

  return [q1, elim];
}
