import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TeamId, RoomTeam } from '../types/auction';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import { getPlayerPhotoUrl, generatePlayerAvatarSvg } from '../data/playerPhotos';
import {
  SimulatedMatch,
  PointsTableEntry,
  SimulatedPlayerStats,
  TeamRoster
} from '../types/simulation';
import {
  buildTeamRosters,
  initializePlayerStats,
  generateLeagueSchedule,
  simulateSingleMatch,
  calculatePointsTable,
  createPlayoffMatches
} from '../services/seasonSimulation';
import { soundManager } from '../utils/audio';
import {
  Trophy,
  Award,
  Zap,
  Play,
  FastForward,
  RotateCcw,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Flame,
  Crown,
  Target,
  BarChart3,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SeasonSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Record<TeamId, RoomTeam>;
  myTeamId?: TeamId;
}

type SimulationTab = 'MATCHES' | 'POINTS_TABLE' | 'HONORS' | 'PLAYER_STATS' | 'PLAYOFFS';

export const SeasonSimulationModal: React.FC<SeasonSimulationModalProps> = ({
  isOpen,
  onClose,
  teams,
  myTeamId
}) => {
  // 1. Core State
  const [rosters, setRosters] = useState<Record<TeamId, TeamRoster>>({} as any);
  const [matches, setMatches] = useState<SimulatedMatch[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, SimulatedPlayerStats>>({});
  const [activeTab, setActiveTab] = useState<SimulationTab>('MATCHES');
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'MY_TEAM' | 'COMPLETED' | 'UPCOMING'>('ALL');
  const [selectedMatchForScorecard, setSelectedMatchForScorecard] = useState<SimulatedMatch | null>(null);
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'ALL' | TeamId>('ALL');
  const [playerSortKey, setPlayerSortKey] = useState<'runs' | 'wickets' | 'mvpPoints' | 'strikeRate' | 'economy'>('runs');
  const [isSimulatingAll, setIsSimulatingAll] = useState(false);
  const matchesListRef = useRef<HTMLDivElement>(null);

  // Initialize season when modal opens or teams change
  useEffect(() => {
    if (isOpen && matches.length === 0) {
      resetSeason();
    }
  }, [isOpen, teams]);

  const resetSeason = () => {
    const builtRosters = buildTeamRosters(teams);
    setRosters(builtRosters);
    const initialStats = initializePlayerStats(builtRosters);
    setStatsMap(initialStats);
    const schedule = generateLeagueSchedule();
    setMatches(schedule);
    setSelectedMatchForScorecard(null);
  };

  // Points table calculated from current completed matches
  const pointsTable = useMemo(() => {
    return calculatePointsTable(matches);
  }, [matches]);

  // Check if league stage is completed
  const completedLeagueMatches = useMemo(() => {
    return matches.filter((m) => m.stage === 'LEAGUE' && m.isCompleted);
  }, [matches]);

  const isLeagueStageCompleted = completedLeagueMatches.length === 30;

  // Add playoff fixtures once league completes
  useEffect(() => {
    if (isLeagueStageCompleted) {
      const hasPlayoffs = matches.some((m) => m.stage !== 'LEAGUE');
      if (!hasPlayoffs && pointsTable.length >= 4) {
        const playoffMatches = createPlayoffMatches(pointsTable, matches.length);
        setMatches((prev) => [...prev, ...playoffMatches]);
      }
    }
  }, [isLeagueStageCompleted, pointsTable, matches.length]);

  // Handle Playoff progression (Qualifier 2 and Final)
  useEffect(() => {
    const q1 = matches.find((m) => m.stage === 'QUALIFIER_1');
    const elim = matches.find((m) => m.stage === 'ELIMINATOR');
    const q2 = matches.find((m) => m.stage === 'QUALIFIER_2');
    const finalMatch = matches.find((m) => m.stage === 'FINAL');

    // Create Qualifier 2 when Q1 and Eliminator are done
    if (q1?.isCompleted && elim?.isCompleted && !q2) {
      const loserQ1 = q1.winnerTeamId === q1.homeTeamId ? q1.awayTeamId : q1.homeTeamId;
      const winnerElim = elim.winnerTeamId;
      const newQ2: SimulatedMatch = {
        id: `sim_m_${matches.length + 1}`,
        matchNumber: matches.length + 1,
        stage: 'QUALIFIER_2',
        title: 'Qualifier 2 (Loser Q1 vs Winner Eliminator)',
        homeTeamId: loserQ1,
        awayTeamId: winnerElim,
        venue: 'Narendra Modi Stadium, Ahmedabad',
        tossWinnerId: loserQ1,
        tossDecision: 'BAT',
        innings1: { teamId: loserQ1, runs: 0, wickets: 0, overs: 20.0, runRate: 0, topBatters: [], topBowlers: [] },
        innings2: { teamId: winnerElim, runs: 0, wickets: 0, overs: 20.0, runRate: 0, topBatters: [], topBowlers: [] },
        winnerTeamId: loserQ1,
        marginText: '',
        potm: { playerId: '', name: '', teamId: loserQ1, performance: '' },
        isCompleted: false
      };
      setMatches((prev) => [...prev, newQ2]);
    }

    // Create Grand Final when Q1 and Q2 are done
    if (q1?.isCompleted && q2?.isCompleted && !finalMatch) {
      const winnerQ1 = q1.winnerTeamId;
      const winnerQ2 = q2.winnerTeamId;
      const newFinal: SimulatedMatch = {
        id: `sim_m_${matches.length + 1}`,
        matchNumber: matches.length + 1,
        stage: 'FINAL',
        title: '🏆 IPL 2026 GRAND FINAL',
        homeTeamId: winnerQ1,
        awayTeamId: winnerQ2,
        venue: 'Narendra Modi Stadium, Ahmedabad',
        tossWinnerId: winnerQ1,
        tossDecision: 'BAT',
        innings1: { teamId: winnerQ1, runs: 0, wickets: 0, overs: 20.0, runRate: 0, topBatters: [], topBowlers: [] },
        innings2: { teamId: winnerQ2, runs: 0, wickets: 0, overs: 20.0, runRate: 0, topBatters: [], topBowlers: [] },
        winnerTeamId: winnerQ1,
        marginText: '',
        potm: { playerId: '', name: '', teamId: winnerQ1, performance: '' },
        isCompleted: false
      };
      setMatches((prev) => [...prev, newFinal]);
    }
  }, [matches]);

  // Champion determination
  const finalMatch = matches.find((m) => m.stage === 'FINAL' && m.isCompleted);
  const championTeamId = finalMatch?.winnerTeamId;

  // Confetti on final victory
  useEffect(() => {
    if (finalMatch?.isCompleted && championTeamId) {
      try {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.4 },
          colors: ['#D4F636', '#00F5D4', '#EAB308', '#3B82F6']
        });
        soundManager.playSold();
      } catch {
        // Confetti fallback
      }
    }
  }, [finalMatch?.isCompleted, championTeamId]);

  // Leaderboard Stats for Caps & MVP
  const allPlayerStats = useMemo(() => {
    return Object.values(statsMap);
  }, [statsMap]);

  const orangeCapPlayer = useMemo(() => {
    return [...allPlayerStats].sort((a, b) => b.runs - a.runs)[0];
  }, [allPlayerStats]);

  const purpleCapPlayer = useMemo(() => {
    return [...allPlayerStats].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)[0];
  }, [allPlayerStats]);

  const mvpPlayer = useMemo(() => {
    return [...allPlayerStats].sort((a, b) => b.mvpPoints - a.mvpPoints)[0];
  }, [allPlayerStats]);

  // Next upcoming match index
  const nextMatchIndex = matches.findIndex((m) => !m.isCompleted);

  // Play next single match
  const handlePlayNextMatch = () => {
    if (nextMatchIndex === -1) return;
    const matchToSim = matches[nextMatchIndex];
    const updated = simulateSingleMatch(matchToSim, rosters, statsMap);

    setMatches((prev) => {
      const copy = [...prev];
      copy[nextMatchIndex] = updated;
      return copy;
    });

    soundManager.playBid();
    setSelectedMatchForScorecard(updated);
  };

  // Fast Simulate next N matches
  const handleFastSimulate = (count: number) => {
    let simulatedCount = 0;
    const currentMatches = [...matches];
    const updatedStats = { ...statsMap };

    for (let i = 0; i < currentMatches.length; i++) {
      if (!currentMatches[i].isCompleted && simulatedCount < count) {
        currentMatches[i] = simulateSingleMatch(currentMatches[i], rosters, updatedStats);
        simulatedCount++;
      }
    }

    setMatches(currentMatches);
    setStatsMap(updatedStats);
    soundManager.playBid();
  };

  // Simulate Entire Season (League + Playoffs)
  const handleSimulateAll = () => {
    setIsSimulatingAll(true);
    let currentMatches = [...matches];
    let currentStats = { ...statsMap };

    // 1. Finish all league matches
    for (let i = 0; i < currentMatches.length; i++) {
      if (!currentMatches[i].isCompleted) {
        currentMatches[i] = simulateSingleMatch(currentMatches[i], rosters, currentStats);
      }
    }

    // 2. Compute Points table and generate Q1 & Eliminator
    const pt = calculatePointsTable(currentMatches);
    const playoffs = createPlayoffMatches(pt, currentMatches.length);
    if (playoffs.length === 2) {
      const q1 = simulateSingleMatch(playoffs[0], rosters, currentStats);
      const elim = simulateSingleMatch(playoffs[1], rosters, currentStats);
      currentMatches.push(q1, elim);

      // Q2
      const loserQ1 = q1.winnerTeamId === q1.homeTeamId ? q1.awayTeamId : q1.homeTeamId;
      const winnerElim = elim.winnerTeamId;
      const q2Unsim: SimulatedMatch = {
        id: `sim_m_${currentMatches.length + 1}`,
        matchNumber: currentMatches.length + 1,
        stage: 'QUALIFIER_2',
        title: 'Qualifier 2',
        homeTeamId: loserQ1,
        awayTeamId: winnerElim,
        venue: 'Narendra Modi Stadium, Ahmedabad',
        tossWinnerId: loserQ1,
        tossDecision: 'BAT',
        innings1: { teamId: loserQ1, runs: 0, wickets: 0, overs: 20.0, runRate: 0, topBatters: [], topBowlers: [] },
        innings2: { teamId: winnerElim, runs: 0, wickets: 0, overs: 20.0, runRate: 0, topBatters: [], topBowlers: [] },
        winnerTeamId: loserQ1,
        marginText: '',
        potm: { playerId: '', name: '', teamId: loserQ1, performance: '' },
        isCompleted: false
      };
      const q2 = simulateSingleMatch(q2Unsim, rosters, currentStats);
      currentMatches.push(q2);

      // Final
      const winnerQ1 = q1.winnerTeamId;
      const winnerQ2 = q2.winnerTeamId;
      const finalUnsim: SimulatedMatch = {
        id: `sim_m_${currentMatches.length + 1}`,
        matchNumber: currentMatches.length + 1,
        stage: 'FINAL',
        title: '🏆 IPL 2026 GRAND FINAL',
        homeTeamId: winnerQ1,
        awayTeamId: winnerQ2,
        venue: 'Narendra Modi Stadium, Ahmedabad',
        tossWinnerId: winnerQ1,
        tossDecision: 'BAT',
        innings1: { teamId: winnerQ1, runs: 0, wickets: 0, overs: 20.0, runRate: 0, topBatters: [], topBowlers: [] },
        innings2: { teamId: winnerQ2, runs: 0, wickets: 0, overs: 20.0, runRate: 0, topBatters: [], topBowlers: [] },
        winnerTeamId: winnerQ1,
        marginText: '',
        potm: { playerId: '', name: '', teamId: winnerQ1, performance: '' },
        isCompleted: false
      };
      const grandFinal = simulateSingleMatch(finalUnsim, rosters, currentStats);
      currentMatches.push(grandFinal);
    }

    setMatches(currentMatches);
    setStatsMap(currentStats);
    setIsSimulatingAll(false);
    setActiveTab('POINTS_TABLE');
    soundManager.playSold();
  };

  // Filtered matches for the matches tab
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (matchFilter === 'MY_TEAM' && myTeamId) {
        return m.homeTeamId === myTeamId || m.awayTeamId === myTeamId;
      }
      if (matchFilter === 'COMPLETED') return m.isCompleted;
      if (matchFilter === 'UPCOMING') return !m.isCompleted;
      return true;
    });
  }, [matches, matchFilter, myTeamId]);

  // Filtered and sorted players for player stats tab
  const filteredPlayers = useMemo(() => {
    return allPlayerStats
      .filter((p) => {
        const matchesQuery = p.name.toLowerCase().includes(searchPlayerQuery.toLowerCase());
        const matchesTeam = selectedTeamFilter === 'ALL' || p.teamId === selectedTeamFilter;
        return matchesQuery && matchesTeam;
      })
      .sort((a, b) => {
        if (playerSortKey === 'runs') return b.runs - a.runs;
        if (playerSortKey === 'wickets') return b.wickets - a.wickets;
        if (playerSortKey === 'mvpPoints') return b.mvpPoints - a.mvpPoints;
        if (playerSortKey === 'strikeRate') return b.strikeRate - a.strikeRate;
        if (playerSortKey === 'economy') return a.economy - b.economy;
        return 0;
      });
  }, [allPlayerStats, searchPlayerQuery, selectedTeamFilter, playerSortKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[#0b0c10] border border-white/10 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* 1. Header Toolbar */}
        <div className="px-3 sm:px-6 py-3.5 bg-[#10121a] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4F636]/10 border border-[#D4F636]/40 flex items-center justify-center text-[#D4F636] font-black text-base shadow-[0_0_15px_rgba(212,246,54,0.3)]">
              🏏
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-display uppercase">
                  IPL 2026 Season Simulation
                </h2>
                <span className="text-[10px] font-mono font-bold bg-[#D4F636]/20 text-[#D4F636] px-2 py-0.5 rounded-full border border-[#D4F636]/30 uppercase">
                  Engine Ready
                </span>
              </div>
              <p className="text-[11px] font-mono text-white/50">
                {matches.filter((m) => m.isCompleted).length} of {matches.length} Matches Simulated
                {championTeamId && (
                  <span className="ml-2 text-amber-400 font-bold">
                    • 🏆 {TEAMS[championTeamId].name} are Champions!
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {nextMatchIndex !== -1 && (
              <>
                <button
                  onClick={handlePlayNextMatch}
                  className="bg-[#D4F636] hover:bg-[#c2e42b] text-black font-black text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,246,54,0.35)] active:scale-95 cursor-pointer uppercase tracking-wider"
                  title="Simulate next scheduled fixture"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Play Next Match</span>
                </button>

                <button
                  onClick={() => handleFastSimulate(5)}
                  className="bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs px-3 py-1.5 rounded-xl border border-white/15 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                  title="Simulate next 5 fixtures"
                >
                  <FastForward className="w-3.5 h-3.5 text-[#00F5D4]" />
                  <span>+5 Matches</span>
                </button>

                <button
                  onClick={handleSimulateAll}
                  disabled={isSimulatingAll}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_25px_rgba(0,245,212,0.3)] active:scale-95 cursor-pointer uppercase tracking-wider"
                  title="Simulate full season & playoffs"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Simulate All Season</span>
                </button>
              </>
            )}

            <button
              onClick={resetSeason}
              className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white p-2 rounded-xl border border-white/10 transition-all cursor-pointer"
              title="Reset & Replay Season"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/70 p-2 rounded-xl border border-white/10 transition-all cursor-pointer"
              title="Close Simulation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="px-3 sm:px-6 bg-[#0e1017] border-b border-white/10 flex items-center gap-2 overflow-x-auto select-none shrink-0 py-2">
          <button
            onClick={() => setActiveTab('MATCHES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'MATCHES'
                ? 'bg-[#D4F636] text-black shadow-[0_0_15px_rgba(212,246,54,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fixtures & Results ({matches.filter((m) => m.isCompleted).length}/{matches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('POINTS_TABLE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'POINTS_TABLE'
                ? 'bg-[#D4F636] text-black shadow-[0_0_15px_rgba(212,246,54,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Points Table</span>
          </button>

          <button
            onClick={() => setActiveTab('HONORS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'HONORS'
                ? 'bg-[#D4F636] text-black shadow-[0_0_15px_rgba(212,246,54,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Caps & MVP</span>
          </button>

          <button
            onClick={() => setActiveTab('PLAYER_STATS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PLAYER_STATS'
                ? 'bg-[#D4F636] text-black shadow-[0_0_15px_rgba(212,246,54,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Player Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab('PLAYOFFS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PLAYOFFS'
                ? 'bg-[#D4F636] text-black shadow-[0_0_15px_rgba(212,246,54,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Playoffs & Finals</span>
          </button>
        </div>

        {/* 3. Tab Body Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#08090d]">
          {/* TAB 1: MATCHES & FIXTURES */}
          {activeTab === 'MATCHES' && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-[#12141d] p-1 rounded-xl border border-white/10">
                  {(['ALL', 'MY_TEAM', 'COMPLETED', 'UPCOMING'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setMatchFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                        matchFilter === filter
                          ? 'bg-white/15 text-[#D4F636]'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {filter === 'MY_TEAM' ? (myTeamId ? `${TEAMS[myTeamId].abbr} Matches` : 'My Team') : filter}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-mono text-white/50">
                  Showing {filteredMatches.length} Matches
                </div>
              </div>

              {/* Matches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMatches.map((match) => {
                  const home = TEAMS[match.homeTeamId];
                  const away = TEAMS[match.awayTeamId];
                  const isSelected = selectedMatchForScorecard?.id === match.id;

                  return (
                    <div
                      key={match.id}
                      onClick={() => match.isCompleted && setSelectedMatchForScorecard(match)}
                      className={`bg-[#10131d] border rounded-2xl p-3.5 transition-all flex flex-col justify-between relative overflow-hidden group shadow-lg ${
                        match.isCompleted
                          ? 'border-white/10 hover:border-[#D4F636]/60 cursor-pointer'
                          : 'border-white/5 opacity-80'
                      } ${isSelected ? 'ring-2 ring-[#00F5D4]' : ''}`}
                    >
                      {/* Top Bar: Match title & stage */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-white/60 pb-2 border-b border-white/5">
                        <span className="font-bold text-white/80">{match.title}</span>
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10 truncate max-w-[140px]">
                          {match.venue.split(',')[0]}
                        </span>
                      </div>

                      {/* Scoreboard: Home vs Away */}
                      <div className="py-3 space-y-2.5">
                        {/* Home Team */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow"
                              style={{ backgroundColor: home.primaryColor }}
                            >
                              {home.abbr}
                            </div>
                            <span className="font-bold text-sm text-white truncate font-display">
                              {home.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            {match.isCompleted ? (
                              <div className="font-mono">
                                <span className="font-black text-sm text-white">
                                  {match.innings1.teamId === match.homeTeamId
                                    ? `${match.innings1.runs}/${match.innings1.wickets}`
                                    : `${match.innings2.runs}/${match.innings2.wickets}`}
                                </span>
                                <span className="text-[10px] text-white/50 ml-1">
                                  ({match.innings1.teamId === match.homeTeamId ? match.innings1.overs : match.innings2.overs} ov)
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-mono text-white/30">—</span>
                            )}
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow"
                              style={{ backgroundColor: away.primaryColor }}
                            >
                              {away.abbr}
                            </div>
                            <span className="font-bold text-sm text-white truncate font-display">
                              {away.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            {match.isCompleted ? (
                              <div className="font-mono">
                                <span className="font-black text-sm text-white">
                                  {match.innings1.teamId === match.awayTeamId
                                    ? `${match.innings1.runs}/${match.innings1.wickets}`
                                    : `${match.innings2.runs}/${match.innings2.wickets}`}
                                </span>
                                <span className="text-[10px] text-white/50 ml-1">
                                  ({match.innings1.teamId === match.awayTeamId ? match.innings1.overs : match.innings2.overs} ov)
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-mono text-white/30">—</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Result & POTM Banner */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between min-h-[30px]">
                        {match.isCompleted ? (
                          <>
                            <div className="text-xs font-black uppercase text-[#D4F636] font-mono tracking-tight truncate max-w-[200px]">
                              {match.marginText}
                            </div>
                            <div className="text-[10px] font-mono text-white/70 bg-white/5 px-2 py-0.5 rounded border border-white/10 truncate max-w-[130px]">
                              ⭐ {match.potm.name}
                            </div>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between">
                            <span className="text-[11px] font-mono text-white/40 uppercase">Upcoming</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = simulateSingleMatch(match, rosters, statsMap);
                                setMatches((prev) => prev.map((m) => (m.id === match.id ? updated : m)));
                                soundManager.playBid();
                              }}
                              className="text-[10px] font-mono bg-white/10 hover:bg-[#D4F636] hover:text-black text-white px-2 py-1 rounded transition-colors font-bold uppercase cursor-pointer"
                            >
                              Play Now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: POINTS TABLE */}
          {activeTab === 'POINTS_TABLE' && (
            <div className="space-y-4">
              <div className="bg-[#10131d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-[#141724] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#D4F636]" />
                    <h3 className="text-sm sm:text-base font-black uppercase text-white font-display">
                      IPL 2026 Standings
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-white/60">
                    Top 4 Qualify for Playoffs (Q1 & Eliminator)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-[#0b0c10] text-white/50 border-b border-white/10 uppercase text-[11px]">
                        <th className="py-3 px-4">Pos</th>
                        <th className="py-3 px-4">Team</th>
                        <th className="py-3 px-3 text-center">P</th>
                        <th className="py-3 px-3 text-center">W</th>
                        <th className="py-3 px-3 text-center">L</th>
                        <th className="py-3 px-3 text-center">Pts</th>
                        <th className="py-3 px-4 text-center">NRR</th>
                        <th className="py-3 px-4 text-center">Recent Form</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pointsTable.map((row, idx) => {
                        const team = TEAMS[row.teamId];
                        const isTop4 = idx < 4;
                        const isMy = myTeamId === row.teamId;

                        return (
                          <tr
                            key={row.teamId}
                            className={`hover:bg-white/5 transition-colors ${
                              isMy ? 'bg-blue-600/10' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 font-black">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                                    isTop4
                                      ? idx < 2
                                        ? 'bg-[#D4F636] text-black font-black'
                                        : 'bg-[#00F5D4]/20 text-[#00F5D4] border border-[#00F5D4]/40'
                                      : 'bg-white/5 text-white/50'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow"
                                  style={{ backgroundColor: team.primaryColor }}
                                >
                                  {team.abbr}
                                </div>
                                <div>
                                  <span className="font-bold text-white text-sm block font-sans">
                                    {team.name}
                                  </span>
                                  {isMy && (
                                    <span className="text-[10px] text-[#D4F636] font-mono">
                                      (Your Franchise)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center font-bold text-white/90">
                              {row.played}
                            </td>
                            <td className="py-3.5 px-3 text-center font-black text-[#D4F636]">
                              {row.won}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-red-400">
                              {row.lost}
                            </td>
                            <td className="py-3.5 px-3 text-center font-black text-base text-white">
                              {row.points}
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono">
                              <span
                                className={`font-bold ${
                                  row.netRunRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {row.netRunRate > 0 ? `+${row.netRunRate.toFixed(3)}` : row.netRunRate.toFixed(3)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {row.form.length > 0 ? (
                                  row.form.map((res, i) => (
                                    <span
                                      key={i}
                                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                                        res === 'W'
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                      }`}
                                    >
                                      {res}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-white/30 text-[10px]">No games</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HONORS, CAPS & MVP */}
          {activeTab === 'HONORS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Orange Cap */}
                <div className="bg-[#12141f] border-2 border-amber-500/40 rounded-2xl p-4 shadow-[0_10px_35px_rgba(245,158,11,0.15)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <h3 className="font-display font-black text-base text-amber-400 uppercase tracking-tight">
                          Orange Cap
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded uppercase">
                        Most Runs
                      </span>
                    </div>

                    {orangeCapPlayer && orangeCapPlayer.runs > 0 ? (
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-amber-400/40 shrink-0">
                          <img
                            src={getPlayerPhotoUrl(orangeCapPlayer.name)}
                            alt={orangeCapPlayer.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = generatePlayerAvatarSvg(orangeCapPlayer.name, orangeCapPlayer.role);
                            }}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-black text-lg text-white truncate">
                            {orangeCapPlayer.name}
                          </h4>
                          <p className="text-xs font-mono font-bold text-amber-300">
                            {TEAMS[orangeCapPlayer.teamId].name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-white/60">
                            <span>{orangeCapPlayer.matches} Matches</span>
                            <span>•</span>
                            <span>SR: {orangeCapPlayer.strikeRate}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 py-6">Play matches to crown the Orange Cap.</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono text-white/50">Total Runs</span>
                    <span className="text-2xl font-black font-mono text-amber-400">
                      {orangeCapPlayer?.runs || 0}
                    </span>
                  </div>
                </div>

                {/* 2. Purple Cap */}
                <div className="bg-[#12141f] border-2 border-purple-500/40 rounded-2xl p-4 shadow-[0_10px_35px_rgba(168,85,247,0.15)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        <h3 className="font-display font-black text-base text-purple-400 uppercase tracking-tight">
                          Purple Cap
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded uppercase">
                        Most Wickets
                      </span>
                    </div>

                    {purpleCapPlayer && purpleCapPlayer.wickets > 0 ? (
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-purple-400/40 shrink-0">
                          <img
                            src={getPlayerPhotoUrl(purpleCapPlayer.name)}
                            alt={purpleCapPlayer.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = generatePlayerAvatarSvg(purpleCapPlayer.name, purpleCapPlayer.role);
                            }}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-black text-lg text-white truncate">
                            {purpleCapPlayer.name}
                          </h4>
                          <p className="text-xs font-mono font-bold text-purple-300">
                            {TEAMS[purpleCapPlayer.teamId].name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-white/60">
                            <span>Econ: {purpleCapPlayer.economy}</span>
                            <span>•</span>
                            <span>Best: {purpleCapPlayer.bestBowlingWickets}/{purpleCapPlayer.bestBowlingRuns}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 py-6">Play matches to crown the Purple Cap.</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono text-white/50">Total Wickets</span>
                    <span className="text-2xl font-black font-mono text-purple-400">
                      {purpleCapPlayer?.wickets || 0}
                    </span>
                  </div>
                </div>

                {/* 3. Tournament MVP */}
                <div className="bg-[#12141f] border-2 border-[#D4F636]/40 rounded-2xl p-4 shadow-[0_10px_35px_rgba(212,246,54,0.15)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#D4F636]/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⭐</span>
                        <h3 className="font-display font-black text-base text-[#D4F636] uppercase tracking-tight">
                          Tournament MVP
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[#D4F636]/20 text-[#D4F636] px-2 py-0.5 rounded uppercase">
                        Most Valuable Player
                      </span>
                    </div>

                    {mvpPlayer && mvpPlayer.mvpPoints > 0 ? (
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-[#D4F636]/40 shrink-0">
                          <img
                            src={getPlayerPhotoUrl(mvpPlayer.name)}
                            alt={mvpPlayer.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = generatePlayerAvatarSvg(mvpPlayer.name, mvpPlayer.role);
                            }}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-black text-lg text-white truncate">
                            {mvpPlayer.name}
                          </h4>
                          <p className="text-xs font-mono font-bold text-[#D4F636]">
                            {TEAMS[mvpPlayer.teamId].name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-white/60">
                            <span>{mvpPlayer.runs} Runs</span>
                            <span>•</span>
                            <span>{mvpPlayer.wickets} Wickets</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 py-6">Play matches to calculate MVP rankings.</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono text-white/50">Impact Index</span>
                    <span className="text-2xl font-black font-mono text-[#D4F636]">
                      {mvpPlayer?.mvpPoints.toFixed(0) || 0} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PLAYER LEADERBOARD */}
          {activeTab === 'PLAYER_STATS' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#10121a] p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm bg-black/50 px-3 py-1.5 rounded-xl border border-white/10">
                  <Search className="w-4 h-4 text-white/40 shrink-0" />
                  <input
                    type="text"
                    value={searchPlayerQuery}
                    onChange={(e) => setSearchPlayerQuery(e.target.value)}
                    placeholder="Search player name..."
                    className="bg-transparent text-xs text-white focus:outline-none w-full font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    {(['ALL', ...ALL_TEAM_IDS] as const).map((tId) => (
                      <button
                        key={tId}
                        onClick={() => setSelectedTeamFilter(tId)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                          selectedTeamFilter === tId
                            ? 'bg-[#D4F636] text-black'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {tId}
                      </button>
                    ))}
                  </div>

                  <select
                    value={playerSortKey}
                    onChange={(e) => setPlayerSortKey(e.target.value as any)}
                    className="bg-black/60 border border-white/15 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="runs">Sort: Most Runs</option>
                    <option value="wickets">Sort: Most Wickets</option>
                    <option value="mvpPoints">Sort: MVP Impact</option>
                    <option value="strikeRate">Sort: Strike Rate</option>
                    <option value="economy">Sort: Best Economy</option>
                  </select>
                </div>
              </div>

              {/* Player Roster Table */}
              <div className="bg-[#10131d] border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-[#0b0c10] text-white/50 border-b border-white/10 uppercase text-[11px]">
                        <th className="py-3 px-4">Player</th>
                        <th className="py-3 px-3 text-center">Team</th>
                        <th className="py-3 px-3 text-center">Mat</th>
                        <th className="py-3 px-3 text-center">Runs</th>
                        <th className="py-3 px-3 text-center">HS</th>
                        <th className="py-3 px-3 text-center">SR</th>
                        <th className="py-3 px-3 text-center">Wkts</th>
                        <th className="py-3 px-3 text-center">Econ</th>
                        <th className="py-3 px-4 text-center">MVP Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPlayers.slice(0, 50).map((p) => {
                        const team = TEAMS[p.teamId];
                        return (
                          <tr key={p.playerId} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
                                  <img
                                    src={getPlayerPhotoUrl(p.name)}
                                    alt={p.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = generatePlayerAvatarSvg(p.name, p.role);
                                    }}
                                    className="w-full h-full object-cover object-top"
                                  />
                                </div>
                                <div>
                                  <span className="font-bold text-white text-xs block font-sans">
                                    {p.name}
                                  </span>
                                  <span className="text-[10px] text-white/40 uppercase">
                                    {p.role.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                                style={{ backgroundColor: team.primaryColor }}
                              >
                                {team.abbr}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center text-white/80">{p.matches}</td>
                            <td className="py-3 px-3 text-center font-black text-[#D4F636]">{p.runs}</td>
                            <td className="py-3 px-3 text-center text-white/80">{p.highestScore}</td>
                            <td className="py-3 px-3 text-center text-cyan-300">{p.strikeRate}</td>
                            <td className="py-3 px-3 text-center font-black text-purple-400">{p.wickets}</td>
                            <td className="py-3 px-3 text-center text-white/80">{p.economy}</td>
                            <td className="py-3 px-4 text-center font-bold text-amber-300">
                              {p.mvpPoints.toFixed(0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PLAYOFFS & GRAND FINALS */}
          {activeTab === 'PLAYOFFS' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Championship Trophy Banner */}
              {championTeamId && (
                <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(251,191,36,0.3)] animate-in zoom-in-95 duration-500">
                  <span className="text-5xl block mb-2 animate-bounce">🏆</span>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase text-amber-300 font-display tracking-wide">
                    {TEAMS[championTeamId].name}
                  </h3>
                  <p className="text-sm font-mono font-bold text-white/80 uppercase tracking-widest mt-1">
                    IPL 2026 Mega Season Champions!
                  </p>
                </div>
              )}

              {/* Playoffs Tree Bracket */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Qualifier 1 */}
                <div className="bg-[#12141f] border border-white/10 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono">
                    <span className="font-bold text-[#D4F636] uppercase">Qualifier 1</span>
                    <span className="text-white/40">Winner to Final • Loser to Q2</span>
                  </div>
                  {matches.find((m) => m.stage === 'QUALIFIER_1') ? (
                    <PlayoffMatchCard match={matches.find((m) => m.stage === 'QUALIFIER_1')!} onSimulate={simulateSingleMatch} rosters={rosters} statsMap={statsMap} onUpdate={(m) => setMatches(prev => prev.map(x => x.id === m.id ? m : x))} />
                  ) : (
                    <div className="p-6 text-center text-xs font-mono text-white/40">
                      Unlocks after 30 League Matches
                    </div>
                  )}
                </div>

                {/* Eliminator */}
                <div className="bg-[#12141f] border border-white/10 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono">
                    <span className="font-bold text-rose-400 uppercase">Eliminator</span>
                    <span className="text-white/40">Winner to Q2 • Loser Knocked Out</span>
                  </div>
                  {matches.find((m) => m.stage === 'ELIMINATOR') ? (
                    <PlayoffMatchCard match={matches.find((m) => m.stage === 'ELIMINATOR')!} onSimulate={simulateSingleMatch} rosters={rosters} statsMap={statsMap} onUpdate={(m) => setMatches(prev => prev.map(x => x.id === m.id ? m : x))} />
                  ) : (
                    <div className="p-6 text-center text-xs font-mono text-white/40">
                      Unlocks after 30 League Matches
                    </div>
                  )}
                </div>

                {/* Qualifier 2 */}
                <div className="bg-[#12141f] border border-white/10 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono">
                    <span className="font-bold text-cyan-400 uppercase">Qualifier 2</span>
                    <span className="text-white/40">Winner to Final</span>
                  </div>
                  {matches.find((m) => m.stage === 'QUALIFIER_2') ? (
                    <PlayoffMatchCard match={matches.find((m) => m.stage === 'QUALIFIER_2')!} onSimulate={simulateSingleMatch} rosters={rosters} statsMap={statsMap} onUpdate={(m) => setMatches(prev => prev.map(x => x.id === m.id ? m : x))} />
                  ) : (
                    <div className="p-6 text-center text-xs font-mono text-white/40">
                      Awaiting Q1 and Eliminator Results
                    </div>
                  )}
                </div>

                {/* Grand Final */}
                <div className="bg-[#12141f] border-2 border-amber-400/60 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono">
                    <span className="font-bold text-amber-400 uppercase flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" /> Grand Final
                    </span>
                    <span className="text-white/40">Narendra Modi Stadium</span>
                  </div>
                  {matches.find((m) => m.stage === 'FINAL') ? (
                    <PlayoffMatchCard match={matches.find((m) => m.stage === 'FINAL')!} onSimulate={simulateSingleMatch} rosters={rosters} statsMap={statsMap} onUpdate={(m) => setMatches(prev => prev.map(x => x.id === m.id ? m : x))} />
                  ) : (
                    <div className="p-6 text-center text-xs font-mono text-white/40">
                      Awaiting Qualifier 2 Winner
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Detailed Match Scorecard Popover/Drawer */}
        {selectedMatchForScorecard && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <div className="bg-[#10131d] border border-white/20 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-[#141824] border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white font-display uppercase">
                    {selectedMatchForScorecard.title} Scorecard
                  </h3>
                  <p className="text-xs font-mono text-white/50">
                    {selectedMatchForScorecard.venue}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMatchForScorecard(null)}
                  className="text-white/60 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Result banner */}
                <div className="bg-[#D4F636]/10 border border-[#D4F636]/30 p-3 rounded-xl text-center">
                  <span className="font-mono font-black text-sm text-[#D4F636] uppercase">
                    {selectedMatchForScorecard.marginText}
                  </span>
                  <p className="text-[11px] font-mono text-white/70 mt-0.5">
                    Player of the Match: ⭐ {selectedMatchForScorecard.potm.name} ({selectedMatchForScorecard.potm.performance})
                  </p>
                </div>

                {/* Innings 1 */}
                <InningsDetailsCard innings={selectedMatchForScorecard.innings1} />

                {/* Innings 2 */}
                <InningsDetailsCard innings={selectedMatchForScorecard.innings2} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Playoff Card
function PlayoffMatchCard({
  match,
  onSimulate,
  rosters,
  statsMap,
  onUpdate
}: {
  match: SimulatedMatch;
  onSimulate: any;
  rosters: any;
  statsMap: any;
  onUpdate: (m: SimulatedMatch) => void;
}) {
  const home = TEAMS[match.homeTeamId];
  const away = TEAMS[match.awayTeamId];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center font-black text-[10px] text-white" style={{ backgroundColor: home.primaryColor }}>
            {home.abbr}
          </div>
          <span className="font-bold text-xs text-white">{home.name}</span>
        </div>
        <span className="font-mono font-black text-sm text-white">
          {match.isCompleted ? (match.innings1.teamId === home.id ? `${match.innings1.runs}/${match.innings1.wickets}` : `${match.innings2.runs}/${match.innings2.wickets}`) : '—'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center font-black text-[10px] text-white" style={{ backgroundColor: away.primaryColor }}>
            {away.abbr}
          </div>
          <span className="font-bold text-xs text-white">{away.name}</span>
        </div>
        <span className="font-mono font-black text-sm text-white">
          {match.isCompleted ? (match.innings1.teamId === away.id ? `${match.innings1.runs}/${match.innings1.wickets}` : `${match.innings2.runs}/${match.innings2.wickets}`) : '—'}
        </span>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
        {match.isCompleted ? (
          <span className="text-[11px] font-mono font-black text-[#D4F636] uppercase truncate">
            {match.marginText}
          </span>
        ) : (
          <button
            onClick={() => {
              const updated = onSimulate(match, rosters, statsMap);
              onUpdate(updated);
              soundManager.playSold();
            }}
            className="w-full bg-[#D4F636] hover:bg-[#c2e42b] text-black font-mono font-black text-xs py-1.5 rounded-lg transition-all uppercase"
          >
            Simulate Playoff
          </button>
        )}
      </div>
    </div>
  );
}

// Innings details card in scorecard
function InningsDetailsCard({ innings }: { innings: any }) {
  const team = TEAMS[innings.teamId as TeamId];
  return (
    <div className="bg-[#131622] border border-white/10 rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: team.primaryColor }}>
            {team.abbr}
          </div>
          <span className="font-bold text-xs text-white font-sans">{team.name} Innings</span>
        </div>
        <div className="font-mono">
          <span className="font-black text-base text-white">{innings.runs}/{innings.wickets}</span>
          <span className="text-xs text-white/50 ml-1">({innings.overs} ov)</span>
        </div>
      </div>

      {/* Top Batters */}
      <div>
        <span className="text-[10px] font-mono uppercase text-white/50 block mb-1">Key Batters</span>
        <div className="space-y-1">
          {innings.topBatters.slice(0, 3).map((b: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/80">{b.name} {b.isNotOut ? '*' : ''}</span>
              <span className="font-black text-white">{b.runs} <span className="text-white/40 font-normal">({b.balls}b, {b.fours}x4, {b.sixes}x6)</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Bowlers */}
      <div className="pt-2 border-t border-white/5">
        <span className="text-[10px] font-mono uppercase text-white/50 block mb-1">Key Bowlers</span>
        <div className="space-y-1">
          {innings.topBowlers.slice(0, 2).map((bw: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/80">{bw.name}</span>
              <span className="font-black text-purple-300">{bw.wickets}/{bw.runs} <span className="text-white/40 font-normal">({bw.overs} ov)</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
