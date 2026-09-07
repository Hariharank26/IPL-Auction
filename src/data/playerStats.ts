import { PlayerData, PlayerStats } from '../types/auction';

// Comprehensive key T20 & IPL career statistics for all players in the pool
const PLAYER_STATS_MAP: Record<string, PlayerStats> = {
  'Virat Kohli': {
    matches: 252,
    runs: 8004,
    battingAvg: 38.6,
    strikeRate: 131.9,
    highestScore: '113',
    hundreds: 8,
    fifties: 55
  },
  'Rohit Sharma': {
    matches: 257,
    runs: 6628,
    battingAvg: 29.7,
    strikeRate: 131.1,
    highestScore: '109*',
    hundreds: 2,
    fifties: 43
  },
  'MS Dhoni': {
    matches: 264,
    runs: 5243,
    battingAvg: 39.1,
    strikeRate: 137.5,
    highestScore: '84*',
    fifties: 24
  },
  'Jasprit Bumrah': {
    matches: 133,
    wickets: 165,
    bowlingEconomy: 6.48,
    bowlingAvg: 22.5,
    bestBowling: '5/10'
  },
  'Ravindra Jadeja': {
    matches: 240,
    runs: 2959,
    battingAvg: 27.4,
    strikeRate: 129.6,
    wickets: 160,
    bowlingEconomy: 7.60,
    bestBowling: '5/16'
  },
  'Hardik Pandya': {
    matches: 137,
    runs: 2525,
    battingAvg: 30.1,
    strikeRate: 145.8,
    wickets: 64,
    bowlingEconomy: 8.35,
    bestBowling: '3/17'
  },
  'Suryakumar Yadav': {
    matches: 150,
    runs: 3594,
    battingAvg: 35.2,
    strikeRate: 145.3,
    highestScore: '103*',
    hundreds: 2,
    fifties: 24
  },
  'KL Rahul': {
    matches: 132,
    runs: 4683,
    battingAvg: 45.5,
    strikeRate: 134.6,
    highestScore: '132*',
    hundreds: 4,
    fifties: 37
  },
  'Rishabh Pant': {
    matches: 111,
    runs: 3284,
    battingAvg: 34.6,
    strikeRate: 148.9,
    highestScore: '128*',
    hundreds: 1,
    fifties: 18
  },
  'Mohammed Shami': {
    matches: 110,
    wickets: 127,
    bowlingEconomy: 8.44,
    bowlingAvg: 26.8,
    bestBowling: '4/11'
  },

  // Indian Current Stars
  'Shubman Gill': {
    matches: 103,
    runs: 3216,
    battingAvg: 37.8,
    strikeRate: 135.7,
    highestScore: '129',
    hundreds: 3,
    fifties: 20
  },
  'Yashasvi Jaiswal': {
    matches: 52,
    runs: 1607,
    battingAvg: 32.1,
    strikeRate: 150.7,
    highestScore: '124',
    hundreds: 2,
    fifties: 9
  },
  'Mohammed Siraj': {
    matches: 93,
    wickets: 93,
    bowlingEconomy: 8.47,
    bowlingAvg: 28.2,
    bestBowling: '4/21'
  },
  'Kuldeep Yadav': {
    matches: 84,
    wickets: 87,
    bowlingEconomy: 7.82,
    bowlingAvg: 23.5,
    bestBowling: '4/14'
  },
  'Axar Patel': {
    matches: 150,
    runs: 1653,
    battingAvg: 21.5,
    strikeRate: 130.8,
    wickets: 123,
    bowlingEconomy: 7.24,
    bestBowling: '4/21'
  },
  'Ruturaj Gaikwad': {
    matches: 66,
    runs: 2380,
    battingAvg: 38.4,
    strikeRate: 136.9,
    highestScore: '108*',
    hundreds: 2,
    fifties: 18
  },
  'Sanju Samson': {
    matches: 167,
    runs: 4419,
    battingAvg: 30.7,
    strikeRate: 138.9,
    highestScore: '119',
    hundreds: 3,
    fifties: 25
  },
  'Arshdeep Singh': {
    matches: 65,
    wickets: 76,
    bowlingEconomy: 8.70,
    bowlingAvg: 24.5,
    bestBowling: '5/32'
  },
  'Yuzvendra Chahal': {
    matches: 160,
    wickets: 205,
    bowlingEconomy: 7.84,
    bowlingAvg: 22.4,
    bestBowling: '5/40'
  },
  'Shreyas Iyer': {
    matches: 116,
    runs: 3127,
    battingAvg: 32.2,
    strikeRate: 127.5,
    highestScore: '96',
    fifties: 21
  },
  'Ishan Kishan': {
    matches: 105,
    runs: 2644,
    battingAvg: 28.4,
    strikeRate: 135.8,
    highestScore: '99',
    fifties: 16
  },
  'Washington Sundar': {
    matches: 60,
    runs: 378,
    battingAvg: 18.2,
    strikeRate: 118.5,
    wickets: 37,
    bowlingEconomy: 7.54,
    bestBowling: '3/16'
  },
  'Shivam Dube': {
    matches: 65,
    runs: 1502,
    battingAvg: 28.6,
    strikeRate: 142.1,
    highestScore: '95*',
    wickets: 16,
    bowlingEconomy: 8.80
  },
  'Prasidh Krishna': {
    matches: 51,
    wickets: 49,
    bowlingEconomy: 8.92,
    bowlingAvg: 31.4,
    bestBowling: '4/30'
  },
  'Ravi Bishnoi': {
    matches: 52,
    wickets: 63,
    bowlingEconomy: 7.80,
    bowlingAvg: 25.1,
    bestBowling: '4/24'
  },
  'Avesh Khan': {
    matches: 63,
    wickets: 64,
    bowlingEconomy: 8.68,
    bowlingAvg: 28.5,
    bestBowling: '4/24'
  },
  'Khaleel Ahmed': {
    matches: 57,
    wickets: 74,
    bowlingEconomy: 8.52,
    bowlingAvg: 24.2,
    bestBowling: '3/21'
  },
  'Varun Chakaravarthy': {
    matches: 71,
    wickets: 83,
    bowlingEconomy: 7.56,
    bowlingAvg: 22.8,
    bestBowling: '5/20'
  },

  // Indian Youngsters
  'Rinku Singh': {
    matches: 46,
    runs: 893,
    battingAvg: 36.4,
    strikeRate: 143.2,
    highestScore: '67*',
    fifties: 4
  },
  'Tilak Varma': {
    matches: 38,
    runs: 1156,
    battingAvg: 38.2,
    strikeRate: 139.4,
    highestScore: '84*',
    fifties: 6
  },
  'Abhishek Sharma': {
    matches: 63,
    runs: 1377,
    battingAvg: 25.8,
    strikeRate: 155.3,
    highestScore: '75',
    fifties: 7,
    wickets: 9,
    bowlingEconomy: 8.20
  },
  'Mayank Yadav': {
    matches: 4,
    wickets: 7,
    bowlingEconomy: 6.85,
    bowlingAvg: 12.1,
    bestBowling: '3/14'
  },
  'Dhruv Jurel': {
    matches: 28,
    runs: 347,
    battingAvg: 25.4,
    strikeRate: 140.2,
    highestScore: '52',
    fifties: 2
  },
  'Harshit Rana': {
    matches: 21,
    wickets: 25,
    bowlingEconomy: 8.85,
    bowlingAvg: 22.4,
    bestBowling: '3/24'
  },
  'Nitish Kumar Reddy': {
    matches: 15,
    runs: 303,
    battingAvg: 33.3,
    strikeRate: 142.8,
    highestScore: '64',
    fifties: 2,
    wickets: 3,
    bowlingEconomy: 8.40
  },
  'Sai Sudharsan': {
    matches: 25,
    runs: 1039,
    battingAvg: 47.1,
    strikeRate: 139.2,
    highestScore: '103',
    hundreds: 1,
    fifties: 6
  },
  'Yash Dayal': {
    matches: 29,
    wickets: 28,
    bowlingEconomy: 8.90,
    bowlingAvg: 30.1,
    bestBowling: '3/20'
  },
  'Jitesh Sharma': {
    matches: 40,
    runs: 735,
    battingAvg: 24.5,
    strikeRate: 151.2,
    highestScore: '49*',
    fifties: 1
  },
  'Ramandeep Singh': {
    matches: 20,
    runs: 220,
    battingAvg: 22.1,
    strikeRate: 162.5,
    highestScore: '35*',
    wickets: 6,
    bowlingEconomy: 8.90
  },
  'Prabhsimran Singh': {
    matches: 34,
    runs: 756,
    battingAvg: 22.8,
    strikeRate: 138.4,
    highestScore: '103',
    hundreds: 1,
    fifties: 3
  },

  // Overseas Superstars
  'Travis Head': {
    matches: 25,
    runs: 887,
    battingAvg: 33.8,
    strikeRate: 168.4,
    highestScore: '102',
    hundreds: 1,
    fifties: 5
  },
  'Heinrich Klaasen': {
    matches: 35,
    runs: 993,
    battingAvg: 37.6,
    strikeRate: 168.3,
    highestScore: '104',
    hundreds: 1,
    fifties: 6
  },
  'Pat Cummins': {
    matches: 58,
    runs: 515,
    battingAvg: 18.5,
    strikeRate: 148.2,
    wickets: 63,
    bowlingEconomy: 8.54,
    bestBowling: '4/34'
  },
  'Rashid Khan': {
    matches: 121,
    wickets: 149,
    bowlingEconomy: 6.82,
    bowlingAvg: 21.8,
    bestBowling: '4/24',
    runs: 540,
    strikeRate: 145.2
  },
  'Jos Buttler': {
    matches: 107,
    runs: 3582,
    battingAvg: 38.1,
    strikeRate: 147.5,
    highestScore: '124',
    hundreds: 7,
    fifties: 19
  },
  'Nicholas Pooran': {
    matches: 76,
    runs: 1769,
    battingAvg: 32.4,
    strikeRate: 157.2,
    highestScore: '89',
    fifties: 9
  },
  'Mitchell Starc': {
    matches: 41,
    wickets: 51,
    bowlingEconomy: 8.80,
    bowlingAvg: 25.8,
    bestBowling: '4/15'
  },
  'Sunil Narine': {
    matches: 177,
    runs: 1534,
    battingAvg: 16.5,
    strikeRate: 159.6,
    highestScore: '109',
    hundreds: 1,
    fifties: 5,
    wickets: 180,
    bowlingEconomy: 6.73,
    bestBowling: '5/19'
  },
  'Glenn Maxwell': {
    matches: 134,
    runs: 2771,
    battingAvg: 24.8,
    strikeRate: 156.7,
    highestScore: '95',
    fifties: 18,
    wickets: 37,
    bowlingEconomy: 8.25
  },
  'Trent Boult': {
    matches: 104,
    wickets: 121,
    bowlingEconomy: 8.29,
    bowlingAvg: 26.5,
    bestBowling: '4/18'
  },
  'Kagiso Rabada': {
    matches: 80,
    wickets: 117,
    bowlingEconomy: 8.42,
    bowlingAvg: 22.1,
    bestBowling: '4/21'
  },
  'Phil Salt': {
    matches: 21,
    runs: 654,
    battingAvg: 34.2,
    strikeRate: 165.8,
    highestScore: '89*',
    fifties: 6
  },
  'Will Jacks': {
    matches: 8,
    runs: 230,
    battingAvg: 32.5,
    strikeRate: 175.4,
    highestScore: '100*',
    hundreds: 1,
    fifties: 1
  },
  'Marco Jansen': {
    matches: 21,
    runs: 185,
    battingAvg: 18.5,
    strikeRate: 135.2,
    wickets: 20,
    bowlingEconomy: 8.85,
    bestBowling: '3/16'
  },
  'Tristan Stubbs': {
    matches: 18,
    runs: 378,
    battingAvg: 35.8,
    strikeRate: 158.4,
    highestScore: '71*',
    fifties: 3
  },
  'Matheesha Pathirana': {
    matches: 20,
    wickets: 34,
    bowlingEconomy: 7.88,
    bowlingAvg: 19.8,
    bestBowling: '4/28'
  },
  'Tim David': {
    matches: 38,
    runs: 659,
    battingAvg: 29.4,
    strikeRate: 170.2,
    highestScore: '46',
    fifties: 0
  },
  'Gerald Coetzee': {
    matches: 10,
    wickets: 13,
    bowlingEconomy: 9.10,
    bowlingAvg: 25.2,
    bestBowling: '4/34'
  },
  'Jake Fraser-McGurk': {
    matches: 9,
    runs: 330,
    battingAvg: 36.8,
    strikeRate: 234.0,
    highestScore: '84',
    fifties: 4
  },
  'Noor Ahmad': {
    matches: 23,
    wickets: 24,
    bowlingEconomy: 7.75,
    bowlingAvg: 24.6,
    bestBowling: '3/37'
  }
};

export function getPlayerStats(player: PlayerData): PlayerStats {
  if (player.stats) return player.stats;
  if (PLAYER_STATS_MAP[player.name]) return PLAYER_STATS_MAP[player.name];

  // Dynamic fallback generation based on ratings and role
  const isBat = player.role === 'BATSMAN' || player.role === 'WICKETKEEPER';
  const isBowl = player.role === 'FAST_BOWLER' || player.role === 'SPIN_BOWLER';
  const isAR = player.role === 'ALL_ROUNDER';

  const matches = Math.floor((player.overallRating / 100) * 120 + 15);

  const stats: PlayerStats = { matches };

  if (isBat || isAR) {
    stats.battingAvg = parseFloat(((player.battingRating / 100) * 35 + 10).toFixed(1));
    stats.strikeRate = parseFloat(((player.battingRating / 100) * 60 + 110).toFixed(1));
    stats.runs = Math.floor(matches * (stats.battingAvg * 0.7));
    stats.highestScore = `${Math.floor((player.battingRating / 100) * 50 + 50)}`;
  }

  if (isBowl || isAR) {
    stats.bowlingEconomy = parseFloat((10.5 - (player.bowlingRating / 100) * 3.5).toFixed(2));
    stats.wickets = Math.floor(matches * ((player.bowlingRating / 100) * 1.1));
    stats.bowlingAvg = parseFloat((35 - (player.bowlingRating / 100) * 12).toFixed(1));
    stats.bestBowling = `4/${Math.floor(20 + Math.random() * 15)}`;
  }

  return stats;
}
