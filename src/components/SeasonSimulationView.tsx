import React, { useState, useMemo } from 'react';
import { RoomState, TeamId, PurchasedPlayer, RoomTeam } from '../types/auction';
import {
  SimulatedMatch,
  SeasonState,
  PointsTableEntry,
  OrangeCapLeader,
  PurpleCapLeader,
  MVPLeader
} from '../types/season';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import { AUCTION_FORMAT_CONFIGS } from '../data/config';
import {
  generateSeasonSchedule,
  initializePointsTable,
  simulateMatch,
  recalculateSeasonStandings,
  checkAndSchedulePlayoffs
} from '../utils/seasonSimulator';
import { autoSelectPlayingLineup } from '../utils/squadBuilder';
import {
  Trophy,
  Play,
  FastForward,
  RotateCcw,
  Award,
  Users,
  Calendar,
  Flame,
  Target,
  Medal,
  ChevronRight,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Crown
} from 'lucide-react';

interface SeasonSimulationViewProps {
  roomState: RoomState;
  onBackToResults: () => void;
}

export const SeasonSimulationView: React.FC<SeasonSimulationViewProps> = ({
  roomState,
  onBackToResults
}) => {
  const format = roomState.format || 'MINI_7';
  const formatConfig = AUCTION_FORMAT_CONFIGS[format] || AUCTION_FORMAT_CONFIGS.MINI_7;
  const isMega = format === 'MEGA_18';

  // Identify user team
  const teamsList = Object.values(roomState.teams || {}) as RoomTeam[];
  const humanTeamEntry = teamsList.find(t => t.controllerType === 'HUMAN');
  const userTeamId = humanTeamEntry?.teamId || 'MI';

  // Initialize Season State
  const [seasonState, setSeasonState] = useState<SeasonState>(() => {
    const schedule = generateSeasonSchedule(roomState.teams, format);
    const table = initializePointsTable();
    return {
      format,
      matchOvers: formatConfig.matchOvers,
      playingSquadCount: formatConfig.playingSquadCount,
      matches: schedule,
      currentMatchIndex: 0,
      pointsTable: table,
      orangeCapList: [],
      purpleCapList: [],
      mvpList: [],
      isSeasonCompleted: false
    };
  });

  const [activeTab, setActiveTab] = useState<'MATCHES' | 'TABLE' | 'CAPS' | 'SQUADS' | 'PLAYOFFS'>('MATCHES');
  const [selectedScorecardMatch, setSelectedScorecardMatch] = useState<SimulatedMatch | null>(null);
  const [inspectTeamId, setInspectTeamId] = useState<TeamId>(userTeamId);

  // Helper to simulate one match
  const handleSimulateNextMatch = () => {
    const uncompletedIdx = seasonState.matches.findIndex(m => !m.isCompleted);
    if (uncompletedIdx === -1) {
      // Check if playoffs need to be added
      const withPlayoffs = checkAndSchedulePlayoffs(seasonState.matches, seasonState.pointsTable);
      if (withPlayoffs.length > seasonState.matches.length) {
        setSeasonState(prev => ({ ...prev, matches: withPlayoffs }));
      }
      return;
    }

    const matchToSim = seasonState.matches[uncompletedIdx];
    const finishedMatch = simulateMatch(matchToSim, roomState.teams, format);

    const nextMatches = [...seasonState.matches];
    nextMatches[uncompletedIdx] = finishedMatch;

    // Recalculate standings
    const standings = recalculateSeasonStandings(nextMatches, format);

    // Check playoffs progression
    const matchesWithPlayoffs = checkAndSchedulePlayoffs(nextMatches, standings.pointsTable);

    // Check if season is complete
    const finalMatch = matchesWithPlayoffs.find(m => m.stage === 'FINAL' && m.isCompleted);
    const championId = finalMatch?.winnerTeamId as TeamId | undefined;
    const runnerUpId = finalMatch ? (finalMatch.winnerTeamId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId) : undefined;

    setSeasonState({
      ...seasonState,
      matches: matchesWithPlayoffs,
      currentMatchIndex: uncompletedIdx + 1,
      pointsTable: standings.pointsTable,
      orangeCapList: standings.orangeCapList,
      purpleCapList: standings.purpleCapList,
      mvpList: standings.mvpList,
      isSeasonCompleted: !!finalMatch,
      championTeamId: championId,
      runnerUpTeamId: runnerUpId
    });
  };

  // Helper to simulate N matches in batch
  const handleSimulateBatch = (count: number) => {
    let currentMatches = [...seasonState.matches];
    let currentTable = [...seasonState.pointsTable];

    for (let step = 0; step < count; step++) {
      let uncompletedIdx = currentMatches.findIndex(m => !m.isCompleted);

      // Try scheduling playoffs if all league matches done
      if (uncompletedIdx === -1) {
        currentMatches = checkAndSchedulePlayoffs(currentMatches, currentTable);
        uncompletedIdx = currentMatches.findIndex(m => !m.isCompleted);
        if (uncompletedIdx === -1) break;
      }

      const matchToSim = currentMatches[uncompletedIdx];
      const finished = simulateMatch(matchToSim, roomState.teams, format);
      currentMatches[uncompletedIdx] = finished;

      const standings = recalculateSeasonStandings(currentMatches, format);
      currentTable = standings.pointsTable;
      currentMatches = checkAndSchedulePlayoffs(currentMatches, currentTable);
    }

    const finalStandings = recalculateSeasonStandings(currentMatches, format);
    const finalMatch = currentMatches.find(m => m.stage === 'FINAL' && m.isCompleted);
    const championId = finalMatch?.winnerTeamId as TeamId | undefined;
    const runnerUpId = finalMatch ? (finalMatch.winnerTeamId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId) : undefined;

    setSeasonState({
      ...seasonState,
      matches: currentMatches,
      currentMatchIndex: currentMatches.filter(m => m.isCompleted).length,
      pointsTable: finalStandings.pointsTable,
      orangeCapList: finalStandings.orangeCapList,
      purpleCapList: finalStandings.purpleCapList,
      mvpList: finalStandings.mvpList,
      isSeasonCompleted: !!finalMatch,
      championTeamId: championId,
      runnerUpTeamId: runnerUpId
    });
  };

  // Helper to simulate all remaining matches
  const handleSimulateAll = () => {
    handleSimulateBatch(50);
  };

  // Reset Season
  const handleResetSeason = () => {
    const schedule = generateSeasonSchedule(roomState.teams, format);
    const table = initializePointsTable();
    setSeasonState({
      format,
      matchOvers: formatConfig.matchOvers,
      playingSquadCount: formatConfig.playingSquadCount,
      matches: schedule,
      currentMatchIndex: 0,
      pointsTable: table,
      orangeCapList: [],
      purpleCapList: [],
      mvpList: [],
      isSeasonCompleted: false
    });
  };

  const completedCount = seasonState.matches.filter(m => m.isCompleted).length;
  const totalMatchesCount = seasonState.matches.length;
  const nextMatchToPlay = seasonState.matches.find(m => !m.isCompleted);

  // Playing squad analysis for inspected team
  const inspectedTeam = roomState.teams[inspectTeamId];
  const squadSelection = useMemo(() => {
    if (!inspectedTeam) return null;
    return autoSelectPlayingLineup(inspectedTeam.squad, format);
  }, [inspectedTeam, format]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToResults}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Return to Auction Results"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-wide">IPL 2025 SEASON SIMULATION</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {formatConfig.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isMega ? '20 Overs • 11 Players (Max 4 Overseas, 1+ WK, 2+ Bowlers)' : '10 Overs • 5 Players Playing'} • {completedCount} of {totalMatchesCount} matches simulated
              </p>
            </div>
          </div>

          {/* Quick Simulation Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!seasonState.isSeasonCompleted ? (
              <>
                <button
                  onClick={handleSimulateNextMatch}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Simulate Next</span>
                </button>
                <button
                  onClick={() => handleSimulateBatch(5)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <FastForward className="w-4 h-4 text-blue-400" />
                  <span>+5 Matches</span>
                </button>
                <button
                  onClick={handleSimulateAll}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow flex items-center gap-1.5 transition"
                >
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>Simulate All</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 font-semibold text-sm rounded-lg border border-emerald-500/40 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span>Season Completed!</span>
                </span>
                <button
                  onClick={handleResetSeason}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-800/80 pt-2 text-sm">
          <button
            onClick={() => setActiveTab('MATCHES')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'MATCHES' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Fixtures & Results</span>
          </button>
          <button
            onClick={() => setActiveTab('TABLE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'TABLE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Points Table</span>
          </button>
          <button
            onClick={() => setActiveTab('CAPS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CAPS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Orange & Purple Caps</span>
          </button>
          <button
            onClick={() => setActiveTab('SQUADS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SQUADS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Squads & Playing Lineup</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Champion Celebration Banner if Season Complete */}
        {seasonState.isSeasonCompleted && seasonState.championTeamId && (
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                <Crown className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">IPL 2025 CHAMPION</span>
                <h2 className="text-2xl md:text-3xl font-black text-white">
                  {TEAMS[seasonState.championTeamId].name} ({TEAMS[seasonState.championTeamId].abbr})
                </h2>
                <p className="text-sm text-slate-300">
                  {seasonState.championTeamId === userTeamId ? '🎉 Congratulations! Your franchise lifted the IPL 2025 Trophy!' : 'Crowned champions of the IPL 2025 Season Simulation!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Runner-Up</span>
                <span className="text-base font-semibold text-slate-200">
                  {seasonState.runnerUpTeamId ? TEAMS[seasonState.runnerUpTeamId].name : 'Contender'}
                </span>
              </div>
              <button
                onClick={handleResetSeason}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition shadow"
              >
                Play Another Season
              </button>
            </div>
          </div>
        )}

        {/* 1. MATCHES / FIXTURES VIEW */}
        {activeTab === 'MATCHES' && (
          <div className="space-y-4">
            {/* Next Match Banner */}
            {nextMatchToPlay && (
              <div className="bg-slate-900/80 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-400 tracking-wide uppercase">UPCOMING MATCH</span>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      <span>{TEAMS[nextMatchToPlay.homeTeamId].abbr}</span>
                      <span className="text-xs text-slate-500">VS</span>
                      <span>{TEAMS[nextMatchToPlay.awayTeamId].abbr}</span>
                      <span className="text-xs text-slate-400 ml-2 font-normal">({nextMatchToPlay.stageLabel})</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSimulateNextMatch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Simulate This Match</span>
                </button>
              </div>
            )}

            {/* List of Simulated & Scheduled Matches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seasonState.matches.map((m) => {
                const home = TEAMS[m.homeTeamId];
                const away = TEAMS[m.awayTeamId];
                const isUserMatch = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 transition ${
                      m.isCompleted
                        ? isUserMatch
                          ? 'bg-slate-900 border-amber-500/40 shadow-md'
                          : 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-900/30 border-slate-800/60 opacity-85'
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2 mb-3">
                      <span className="font-semibold text-slate-300">{m.stageLabel}</span>
                      {m.isCompleted ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Completed</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Scheduled</span>
                      )}
                    </div>

                    {/* Teams and Scores (User's exact specification format) */}
                    <div className="space-y-2">
                      {/* Home Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: home.primaryColor }}
                          />
                          <span className={`font-semibold ${m.winnerTeamId === m.homeTeamId ? 'text-white' : 'text-slate-400'}`}>
                            {home.name} ({home.abbr})
                          </span>
                          {m.homeTeamId === userTeamId && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">You</span>
                          )}
                        </div>
                        {m.homeInnings ? (
                          <div className="text-right">
                            <span className="text-base font-bold text-white">
                              {m.homeInnings.totalRuns}/{m.homeInnings.totalWickets}
                            </span>
                            <span className="text-xs text-slate-400 ml-1.5">
                              ({m.homeInnings.oversPlayed.toFixed(1)} ov)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: away.primaryColor }}
                          />
                          <span className={`font-semibold ${m.winnerTeamId === m.awayTeamId ? 'text-white' : 'text-slate-400'}`}>
                            {away.name} ({away.abbr})
                          </span>
                          {m.awayTeamId === userTeamId && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">You</span>
                          )}
                        </div>
                        {m.awayInnings ? (
                          <div className="text-right">
                            <span className="text-base font-bold text-white">
                              {m.awayInnings.totalRuns}/{m.awayInnings.totalWickets}
                            </span>
                            <span className="text-xs text-slate-400 ml-1.5">
                              ({m.awayInnings.oversPlayed.toFixed(1)} ov)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </div>
                    </div>

                    {/* Result Footer */}
                    {m.isCompleted && m.marginText && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-400 tracking-wide">
                          {m.marginText}
                        </span>
                        <button
                          onClick={() => setSelectedScorecardMatch(m)}
                          className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
                        >
                          <span>Scorecard</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. POINTS TABLE VIEW */}
        {activeTab === 'TABLE' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>IPL 2025 Official Standings</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Top 4 franchises qualify for the Championship Playoffs (Qualifier 1 & Eliminator)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Playoff Zone (Top 4)</span>
                </span>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-3">Pos</th>
                    <th className="py-3 px-3">Team</th>
                    <th className="py-3 px-3 text-center">P</th>
                    <th className="py-3 px-3 text-center">W</th>
                    <th className="py-3 px-3 text-center">L</th>
                    <th className="py-3 px-3 text-center">Pts</th>
                    <th className="py-3 px-3 text-center">NRR</th>
                    <th className="py-3 px-3 text-center">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {seasonState.pointsTable.map((teamRow, idx) => {
                    const isTop4 = idx < 4;
                    const isUserTeam = teamRow.teamId === userTeamId;
                    const teamConfig = TEAMS[teamRow.teamId];

                    return (
                      <tr
                        key={teamRow.teamId}
                        className={`transition ${
                          isUserTeam
                            ? 'bg-amber-500/10 hover:bg-amber-500/15'
                            : isTop4
                            ? 'bg-slate-900 hover:bg-slate-800/50'
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isTop4
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ backgroundColor: teamConfig.primaryColor }}
                            />
                            <span className="text-white font-bold">{teamConfig.name}</span>
                            <span className="text-xs text-slate-400">({teamConfig.abbr})</span>
                            {isUserTeam && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-300">{teamRow.played}</td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-semibold">{teamRow.won}</td>
                        <td className="py-3 px-3 text-center text-rose-400 font-semibold">{teamRow.lost}</td>
                        <td className="py-3 px-3 text-center text-base font-black text-amber-400">
                          {teamRow.points}
                        </td>
                        <td className="py-3 px-3 text-center text-xs font-mono text-slate-300">
                          {teamRow.netRunRate > 0 ? `+${teamRow.netRunRate.toFixed(3)}` : teamRow.netRunRate.toFixed(3)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            {teamRow.form.map((res, fIdx) => (
                              <span
                                key={fIdx}
                                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                  res === 'W'
                                    ? 'bg-emerald-600 text-white'
                                    : res === 'L'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {res}
                              </span>
                            ))}
                            {teamRow.form.length === 0 && (
                              <span className="text-xs text-slate-600">-</span>
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
        )}

        {/* 3. HONORS & CAPS (Orange Cap, Purple Cap, MVP) */}
        {activeTab === 'CAPS' && (
          <div className="space-y-6">
            {/* Top 3 Honor Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Orange Cap */}
              <div className="bg-gradient-to-b from-orange-950/40 via-slate-900 to-slate-900 border border-orange-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 bg-orange-500 text-slate-950 text-xs font-black uppercase rounded-lg flex items-center gap-1.5 shadow">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>ORANGE CAP</span>
                  </span>
                  <span className="text-xs font-semibold text-orange-300">Leading Run Scorer</span>
                </div>
                {seasonState.orangeCapList.length > 0 ? (
                  <div>
                    <h4 className="text-xl font-bold text-white">{seasonState.orangeCapList[0].name}</h4>
                    <span className="text-xs text-slate-400">{TEAMS[seasonState.orangeCapList[0].teamId].name}</span>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-orange-400">{seasonState.orangeCapList[0].runs}</span>
                      <span className="text-xs text-slate-400 uppercase font-bold">Runs ({seasonState.orangeCapList[0].matches} Matches)</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 flex justify-between">
                      <span>HS: <strong className="text-white">{seasonState.orangeCapList[0].highestScore}</strong></span>
                      <span>SR: <strong className="text-white">{seasonState.orangeCapList[0].strikeRate}</strong></span>
                      <span>Boundaries: <strong className="text-white">{seasonState.orangeCapList[0].fours}x4, {seasonState.orangeCapList[0].sixes}x6</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">Simulate matches to crown the Orange Cap holder</p>
                )}
              </div>

              {/* Purple Cap */}
              <div className="bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 bg-purple-500 text-white text-xs font-black uppercase rounded-lg flex items-center gap-1.5 shadow">
                    <Target className="w-3.5 h-3.5" />
                    <span>PURPLE CAP</span>
                  </span>
                  <span className="text-xs font-semibold text-purple-300">Leading Wicket Taker</span>
                </div>
                {seasonState.purpleCapList.length > 0 ? (
                  <div>
                    <h4 className="text-xl font-bold text-white">{seasonState.purpleCapList[0].name}</h4>
                    <span className="text-xs text-slate-400">{TEAMS[seasonState.purpleCapList[0].teamId].name}</span>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-purple-400">{seasonState.purpleCapList[0].wickets}</span>
                      <span className="text-xs text-slate-400 uppercase font-bold">Wickets ({seasonState.purpleCapList[0].matches} Matches)</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 flex justify-between">
                      <span>Best: <strong className="text-white">{seasonState.purpleCapList[0].bestBowling}</strong></span>
                      <span>Econ: <strong className="text-white">{seasonState.purpleCapList[0].economy}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">Simulate matches to crown the Purple Cap holder</p>
                )}
              </div>

              {/* MVP Player of Tournament */}
              <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-xs font-black uppercase rounded-lg flex items-center gap-1.5 shadow">
                    <Medal className="w-3.5 h-3.5" />
                    <span>TOURNAMENT MVP</span>
                  </span>
                  <span className="text-xs font-semibold text-amber-300">Highest All-Round Value</span>
                </div>
                {seasonState.mvpList.length > 0 ? (
                  <div>
                    <h4 className="text-xl font-bold text-white">{seasonState.mvpList[0].name}</h4>
                    <span className="text-xs text-slate-400">{TEAMS[seasonState.mvpList[0].teamId].name}</span>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-amber-400">{seasonState.mvpList[0].mvpPoints}</span>
                      <span className="text-xs text-slate-400 uppercase font-bold">Impact Points</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 flex justify-between">
                      <span>Performance: <strong className="text-white">{seasonState.mvpList[0].summary}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">Simulate matches to see Tournament MVP</p>
                )}
              </div>
            </div>

            {/* Orange Cap Top 5 Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>Top Run Scorers (Orange Cap Race)</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 pb-2">
                        <th className="py-2">Player</th>
                        <th className="py-2">Team</th>
                        <th className="py-2 text-center">Mat</th>
                        <th className="py-2 text-center">Runs</th>
                        <th className="py-2 text-center">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {seasonState.orangeCapList.slice(0, 5).map((p, idx) => (
                        <tr key={p.playerId} className="hover:bg-slate-800/40">
                          <td className="py-2 font-semibold text-white flex items-center gap-1.5">
                            <span className="text-slate-500">{idx + 1}.</span>
                            <span>{p.name}</span>
                          </td>
                          <td className="py-2 text-slate-400">{TEAMS[p.teamId].abbr}</td>
                          <td className="py-2 text-center text-slate-300">{p.matches}</td>
                          <td className="py-2 text-center font-bold text-orange-400">{p.runs}</td>
                          <td className="py-2 text-center font-mono text-slate-300">{p.strikeRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Purple Cap Top 5 Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>Top Wicket Takers (Purple Cap Race)</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 pb-2">
                        <th className="py-2">Player</th>
                        <th className="py-2">Team</th>
                        <th className="py-2 text-center">Mat</th>
                        <th className="py-2 text-center">Wkts</th>
                        <th className="py-2 text-center">Econ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {seasonState.purpleCapList.slice(0, 5).map((p, idx) => (
                        <tr key={p.playerId} className="hover:bg-slate-800/40">
                          <td className="py-2 font-semibold text-white flex items-center gap-1.5">
                            <span className="text-slate-500">{idx + 1}.</span>
                            <span>{p.name}</span>
                          </td>
                          <td className="py-2 text-slate-400">{TEAMS[p.teamId].abbr}</td>
                          <td className="py-2 text-center text-slate-300">{p.matches}</td>
                          <td className="py-2 text-center font-bold text-purple-400">{p.wickets}</td>
                          <td className="py-2 text-center font-mono text-slate-300">{p.economy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SQUADS & PLAYING LINEUP (Squad Building) */}
        {activeTab === 'SQUADS' && (
          <div className="space-y-6">
            {/* Team Picker */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {ALL_TEAM_IDS.map((tId) => {
                const isSelected = inspectTeamId === tId;
                const team = TEAMS[tId];
                return (
                  <button
                    key={tId}
                    onClick={() => setInspectTeamId(tId)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <span>{team.name} ({team.abbr})</span>
                    {tId === userTeamId && (
                      <span className="text-[10px] px-1 rounded bg-black/20 text-slate-900 font-bold">You</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tactical Rules Banner for Mega 18 */}
            {isMega && squadSelection && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>Official IPL Playing XI Composition Rules</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Squad contains up to 18 players. Match engine strategically selects the Best 11 adhering to rules:
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                    squadSelection.overseasCount <= 4
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Max 4 Overseas: {squadSelection.overseasCount}/4</span>
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                    squadSelection.wicketKeeperCount >= 1
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Min 1 WK: {squadSelection.wicketKeeperCount}</span>
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                    squadSelection.bowlerCount >= 2
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Min 2 Bowlers: {squadSelection.bowlerCount}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Selected Playing Lineup */}
            {squadSelection && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <h4 className="text-base font-bold text-white mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>{isMega ? 'Starting Playing XI' : 'Starting Playing 5'}</span>
                    </span>
                    <span className="text-xs font-normal text-slate-400">
                      Batting Order 1 to {squadSelection.playingLineup.length}
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {squadSelection.playingLineup.map((p, idx) => (
                      <div
                        key={p.playerId}
                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden"
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-sm font-bold text-white truncate">{p.displayName || p.name}</h5>
                            {!p.isIndian && (
                              <span className="px-1 text-[9px] font-extrabold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                OS
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {p.role.replace('_', ' ')} • Rating {p.overallRating}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bench Picks */}
                {squadSelection.bench.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Bench Reserves ({squadSelection.bench.length} Players)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {squadSelection.bench.map((p) => (
                        <div
                          key={p.playerId}
                          className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 flex items-center gap-3 opacity-75"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h5 className="text-sm font-semibold text-slate-300 truncate">{p.displayName || p.name}</h5>
                              {!p.isIndian && (
                                <span className="px-1 text-[9px] font-extrabold rounded bg-amber-500/20 text-amber-300">
                                  OS
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              {p.role.replace('_', ' ')} • Rating {p.overallRating}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Detailed Scorecard Modal */}
        {selectedScorecardMatch && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedScorecardMatch.stageLabel}: {TEAMS[selectedScorecardMatch.homeTeamId].name} vs {TEAMS[selectedScorecardMatch.awayTeamId].name}
                  </h3>
                  <span className="text-xs font-bold text-amber-400">
                    {selectedScorecardMatch.marginText}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedScorecardMatch(null)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Close
                </button>
              </div>

              {/* Home Team Innings */}
              {selectedScorecardMatch.homeInnings && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-lg">
                    <span className="font-bold text-white text-sm">
                      {TEAMS[selectedScorecardMatch.homeTeamId].name} Innings
                    </span>
                    <span className="font-bold text-amber-400 text-sm">
                      {selectedScorecardMatch.homeInnings.totalRuns}/{selectedScorecardMatch.homeInnings.totalWickets} ({selectedScorecardMatch.homeInnings.oversPlayed.toFixed(1)} ov)
                    </span>
                  </div>
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 pb-1">
                          <th className="py-1.5">Batter</th>
                          <th className="py-1.5">Dismissal</th>
                          <th className="py-1.5 text-center">R</th>
                          <th className="py-1.5 text-center">B</th>
                          <th className="py-1.5 text-center">4s</th>
                          <th className="py-1.5 text-center">6s</th>
                          <th className="py-1.5 text-center">SR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {selectedScorecardMatch.homeInnings.batting.map(b => (
                          <tr key={b.playerId}>
                            <td className="py-1.5 font-bold text-white">{b.name}</td>
                            <td className="py-1.5 text-slate-400 text-[11px]">{b.isOut ? b.dismissal : 'not out'}</td>
                            <td className="py-1.5 text-center font-bold text-amber-300">{b.runs}</td>
                            <td className="py-1.5 text-center text-slate-400">{b.balls}</td>
                            <td className="py-1.5 text-center text-slate-300">{b.fours}</td>
                            <td className="py-1.5 text-center text-slate-300">{b.sixes}</td>
                            <td className="py-1.5 text-center font-mono text-slate-300">{b.strikeRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Away Team Innings */}
              {selectedScorecardMatch.awayInnings && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-lg">
                    <span className="font-bold text-white text-sm">
                      {TEAMS[selectedScorecardMatch.awayTeamId].name} Innings
                    </span>
                    <span className="font-bold text-amber-400 text-sm">
                      {selectedScorecardMatch.awayInnings.totalRuns}/{selectedScorecardMatch.awayInnings.totalWickets} ({selectedScorecardMatch.awayInnings.oversPlayed.toFixed(1)} ov)
                    </span>
                  </div>
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 pb-1">
                          <th className="py-1.5">Batter</th>
                          <th className="py-1.5">Dismissal</th>
                          <th className="py-1.5 text-center">R</th>
                          <th className="py-1.5 text-center">B</th>
                          <th className="py-1.5 text-center">4s</th>
                          <th className="py-1.5 text-center">6s</th>
                          <th className="py-1.5 text-center">SR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {selectedScorecardMatch.awayInnings.batting.map(b => (
                          <tr key={b.playerId}>
                            <td className="py-1.5 font-bold text-white">{b.name}</td>
                            <td className="py-1.5 text-slate-400 text-[11px]">{b.isOut ? b.dismissal : 'not out'}</td>
                            <td className="py-1.5 text-center font-bold text-amber-300">{b.runs}</td>
                            <td className="py-1.5 text-center text-slate-400">{b.balls}</td>
                            <td className="py-1.5 text-center text-slate-300">{b.fours}</td>
                            <td className="py-1.5 text-center text-slate-300">{b.sixes}</td>
                            <td className="py-1.5 text-center font-mono text-slate-300">{b.strikeRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Player of the Match banner */}
              {selectedScorecardMatch.playerOfTheMatch && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Player of the Match</span>
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-white block">{selectedScorecardMatch.playerOfTheMatch.name}</span>
                    <span className="text-slate-400">{selectedScorecardMatch.playerOfTheMatch.summary}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
