import React, { useState, useMemo } from 'react';
import { RoomTeam, PlayerData, AuctionSessionFormat, GameMode, TeamId } from '../types/auction';
import { getFormatConfig } from '../data/config';
import { TEAMS } from '../data/teams';
import {
  AlertCircle,
  CheckCircle2,
  Users,
  Wallet,
  Shield,
  Award,
  Zap,
  BarChart2,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Trophy
} from 'lucide-react';
import { getPlayerPhotoUrl, generatePlayerAvatarSvg } from '../data/playerPhotos';
import { PlayerStatsModal } from './PlayerStatsModal';
import { validateSquad } from '../utils/squadBuilder';

interface TeamPanelProps {
  myTeam: RoomTeam | null;
  countdownSeconds: number;
  isBiddingOpen: boolean;
  format?: AuctionSessionFormat;
  gameMode?: GameMode;
  teams?: Record<TeamId, RoomTeam> | RoomTeam[];
}

export const TeamPanel: React.FC<TeamPanelProps> = ({
  myTeam,
  countdownSeconds,
  isBiddingOpen,
  format,
  gameMode = 'Blitz',
  teams
}) => {
  const activeMode = gameMode || format || 'Blitz';
  const formatConfig = useMemo(() => getFormatConfig(activeMode), [activeMode]);
  const [inspectedPlayer, setInspectedPlayer] = useState<PlayerData | null>(null);
  const [showEfficiencyLeaderboard, setShowEfficiencyLeaderboard] = useState(false);

  // Normalize all room teams list
  const teamList = useMemo<RoomTeam[]>(() => {
    if (!teams) return myTeam ? [myTeam] : [];
    if (Array.isArray(teams)) return teams;
    return Object.values(teams);
  }, [teams, myTeam]);

  // Compute live efficiency telemetry: Lowest average price per player = Most Efficient
  const efficiencyData = useMemo(() => {
    const allFranchises = teamList.map((t) => {
      const config = t.teamConfig || TEAMS[t.teamId];
      const count = t.squad?.length || 0;
      const totalSpentLakhs = t.squad ? t.squad.reduce((sum, p) => sum + (p.price || 0), 0) : 0;
      const avgPriceLakhs = count > 0 ? totalSpentLakhs / count : 0;
      const avgPriceCr = avgPriceLakhs / 100;
      return {
        teamId: t.teamId,
        name: config?.name || t.teamId,
        shortName: config?.shortName || config?.abbr || t.teamId,
        abbr: config?.abbr || t.teamId,
        primaryColor: config?.primaryColor || '#3B82F6',
        secondaryColor: config?.secondaryColor || '#D4F636',
        squadCount: count,
        totalSpentLakhs,
        totalSpentCr: totalSpentLakhs / 100,
        avgPriceLakhs,
        avgPriceCr,
        isMyTeam: myTeam?.teamId === t.teamId,
      };
    });

    // Rank teams with at least 1 player by lowest average price per player
    const rankedWithBuys = allFranchises
      .filter((t) => t.squadCount > 0)
      .sort((a, b) => {
        if (a.avgPriceLakhs !== b.avgPriceLakhs) {
          return a.avgPriceLakhs - b.avgPriceLakhs;
        }
        return b.squadCount - a.squadCount; // tie breaker: more players signed
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        isMostEfficient: index === 0,
      }));

    const mostEfficientTeam = rankedWithBuys.length > 0 ? rankedWithBuys[0] : null;
    const myTeamEfficiency = rankedWithBuys.find((t) => t.isMyTeam) || null;
    const isMyTeamMostEfficient = !!myTeamEfficiency && myTeamEfficiency.rank === 1;

    // League aggregate stats
    const totalLeagueSpent = rankedWithBuys.reduce((sum, t) => sum + t.totalSpentLakhs, 0);
    const totalLeaguePlayers = rankedWithBuys.reduce((sum, t) => sum + t.squadCount, 0);
    const leagueAvgPriceCr = totalLeaguePlayers > 0 ? totalLeagueSpent / totalLeaguePlayers / 100 : 0;

    return {
      allFranchises,
      rankedWithBuys,
      mostEfficientTeam,
      myTeamEfficiency,
      isMyTeamMostEfficient,
      leagueAvgPriceCr,
      activeSquadCount: rankedWithBuys.length,
    };
  }, [teamList, myTeam?.teamId]);

  if (!myTeam) {
    return (
      <section className="w-full h-full flex flex-col gap-3">
        <div className="bg-[#0b0d14] border-2 border-white/10 rounded-2xl p-6 text-center flex-1 flex flex-col items-center justify-center shadow-xl">
          <Shield className="w-10 h-10 text-white/20 mb-2" />
          <p className="text-xs uppercase text-white/50 font-black tracking-widest font-condensed">No Franchise Assigned</p>
        </div>
      </section>
    );
  }

  const { teamConfig, remainingPurse, squad } = myTeam;
  const squadSize = squad.length;
  const maxSquad = formatConfig.maxSquad;
  const minSquad = formatConfig.minSquad;
  const isMega = formatConfig.id === 'Mega';
  const emptySlotsCount = Math.max(0, maxSquad - squadSize);
  const startingPurse = formatConfig.startingPurseLakhs;
  const purseSpentPercent = Math.min(100, Math.max(0, ((startingPurse - remainingPurse) / startingPurse) * 100));

  // My squad calculations
  const myTotalSpentLakhs = squad.reduce((sum, p) => sum + (p.price || 0), 0);
  const myAvgPriceCr = squadSize > 0 ? myTotalSpentLakhs / squadSize / 100 : 0;

  // Validate squad composition against active mode constraints
  const validation = validateSquad(squad, formatConfig.id);
  const {
    isQualified,
    canFieldValidLineup,
    overseasCount,
    maxOverseas,
    wicketKeepersCount,
    minWicketKeepers,
    bowlersCount,
    minBowlers,
    batsmenCount,
    allRoundersCount,
    warnings
  } = validation;

  return (
    <section className="w-full h-full flex flex-col gap-3 select-none">
      {/* Franchise Status Container */}
      <div className="bg-gradient-to-b from-[#10141f] via-[#0c0e15] to-[#08090d] border-2 border-blue-500/30 rounded-2xl p-3.5 sm:p-4 flex-1 flex flex-col justify-between overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.85)]">
        {/* Franchise Header Banner with Game Mode badge & Most Efficient indicator */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/15">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black border-2 border-white/20 text-white shadow-xl shrink-0 font-teko relative"
            style={{ backgroundColor: teamConfig.primaryColor }}
          >
            {teamConfig.abbr}
            {efficiencyData.isMyTeamMostEfficient && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4F636] text-black flex items-center justify-center shadow-lg border border-black"
                title="Currently Most Efficient Franchise in Auction!"
              >
                <Sparkles className="w-2.5 h-2.5 fill-black" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <p className="text-[9px] font-mono font-bold uppercase text-ai-lime tracking-widest flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#D4F636]" /> [ :FRANCHISE_DUGOUT ]
              </p>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Dynamic Most Efficient Badge in Header */}
                {efficiencyData.mostEfficientTeam && (
                  efficiencyData.isMyTeamMostEfficient ? (
                    <span
                      className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-950/90 border-emerald-400 text-emerald-300 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.35)] animate-pulse"
                      title="Your team holds the lowest average price per player across all franchises!"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                      ★ MOST EFFICIENT (₹{efficiencyData.mostEfficientTeam.avgPriceCr.toFixed(2)} Cr/P)
                    </span>
                  ) : (
                    <span
                      className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border bg-black/60 border-white/15 text-white/80 flex items-center gap-1"
                      title={`Most Efficient Franchise: ${efficiencyData.mostEfficientTeam.name} with avg ₹${efficiencyData.mostEfficientTeam.avgPriceCr.toFixed(2)} Cr/player`}
                    >
                      <Award className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span>EFF: <strong className="text-amber-300">{efficiencyData.mostEfficientTeam.abbr}</strong> (₹{efficiencyData.mostEfficientTeam.avgPriceCr.toFixed(2)} Cr)</span>
                    </span>
                  )
                )}

                <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded border ${
                  isMega
                    ? 'bg-purple-950/70 border-purple-400/60 text-purple-200'
                    : 'bg-amber-950/70 border-amber-400/60 text-amber-200'
                }`}>
                  {formatConfig.name} ({maxSquad}P)
                </span>
              </div>
            </div>
            <h4 className="text-base sm:text-lg font-black uppercase leading-tight text-ai-silver truncate font-display tracking-tight">
              {teamConfig.name}
            </h4>
          </div>
        </div>

        {/* Purse & Squad Stats Telemetry */}
        <div className="py-2.5 space-y-2">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] uppercase text-ai-slate font-bold tracking-widest flex items-center gap-1 font-mono">
                <Wallet className="w-3 h-3 text-[#D4F636]" /> // REMAINING PURSE
              </p>
              <p className="text-2xl font-black italic text-ai-currency leading-none mt-0.5 font-display">
                ₹{(remainingPurse / 100).toFixed(2)}{' '}
                <span className="text-sm text-amber-300 not-italic font-bold font-mono">Cr</span>
                <span className="text-[10px] text-white/40 not-italic ml-1 font-mono">/ ₹{formatConfig.startingPurseCr} Cr</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase text-ai-slate font-bold tracking-widest font-mono">
                // SQUAD CAPACITY
              </p>
              <p className="text-2xl font-black italic text-ai-silver leading-none mt-0.5 font-display">
                {squadSize}{' '}
                <span className="text-sm text-ai-slate not-italic font-bold font-mono">
                  / {maxSquad}
                </span>
              </p>
            </div>
          </div>

          {/* High Contrast Purse Progress Bar */}
          <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                remainingPurse < (isMega ? 1500 : 500)
                  ? 'bg-gradient-to-r from-red-600 to-rose-500'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
              }`}
              style={{ width: `${purseSpentPercent}%` }}
              title={`₹${((startingPurse - remainingPurse)/100).toFixed(2)} Cr spent of ₹${formatConfig.startingPurseCr}.00 Cr`}
            />
          </div>

          {/* DYNAMIC EFFICIENCY INDICATOR & COMPARISON CARD */}
          <div className={`p-2 rounded-xl border transition-all ${
            efficiencyData.isMyTeamMostEfficient
              ? 'bg-gradient-to-r from-[#0a1b14] via-[#091512] to-[#060e0c] border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
              : 'bg-[#090b12]/90 border-white/10 hover:border-white/20'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded flex items-center justify-center ${
                  efficiencyData.isMyTeamMostEfficient
                    ? 'bg-emerald-400 text-black shadow-md'
                    : 'bg-white/10 text-white/70'
                }`}>
                  <TrendingDown className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/90 flex items-center gap-1">
                  AUCTION EFFICIENCY
                  {efficiencyData.isMyTeamMostEfficient && (
                    <span className="text-emerald-300 font-black text-[9px] flex items-center gap-0.5">
                      • <Sparkles className="w-2.5 h-2.5" /> LEADER
                    </span>
                  )}
                </span>
              </div>

              {/* Status Pill or Expand Leaderboard Toggle */}
              <button
                type="button"
                onClick={() => setShowEfficiencyLeaderboard(prev => !prev)}
                className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 hover:bg-white/10 border border-white/15 text-ai-cyan hover:text-white transition-all cursor-pointer"
                title="View efficiency ranking comparison across all teams"
              >
                <span>{showEfficiencyLeaderboard ? 'Hide Comparison' : 'Compare Teams'}</span>
                {showEfficiencyLeaderboard ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Core Efficiency Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              {/* My Team Average */}
              <div className={`p-1.5 rounded-lg border ${
                efficiencyData.isMyTeamMostEfficient
                  ? 'bg-emerald-950/40 border-emerald-400/40'
                  : 'bg-black/50 border-white/[0.08]'
              }`}>
                <div className="flex items-center justify-between text-white/50 text-[9px] mb-0.5">
                  <span>YOUR SQUAD AVG</span>
                  {efficiencyData.myTeamEfficiency ? (
                    <span className={`font-black ${efficiencyData.isMyTeamMostEfficient ? 'text-emerald-400' : 'text-ai-cyan'}`}>
                      Rank #{efficiencyData.myTeamEfficiency.rank}
                    </span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xs sm:text-sm font-black ${squadSize > 0 ? (efficiencyData.isMyTeamMostEfficient ? 'text-emerald-300' : 'text-white') : 'text-white/30'}`}>
                    {squadSize > 0 ? `₹${myAvgPriceCr.toFixed(2)} Cr` : '—'}
                  </span>
                  <span className="text-[8px] text-white/40">
                    {squadSize} pick{squadSize !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Most Efficient Franchise in League */}
              <div className="p-1.5 rounded-lg bg-black/50 border border-white/[0.08]">
                <div className="flex items-center justify-between text-white/50 text-[9px] mb-0.5">
                  <span className="flex items-center gap-1 text-amber-300/90 font-bold">
                    <Trophy className="w-2.5 h-2.5 text-amber-400" /> MOST EFFICIENT
                  </span>
                  {efficiencyData.mostEfficientTeam && (
                    <span
                      className="px-1 py-0.2 rounded font-black text-[8px] text-white"
                      style={{ backgroundColor: efficiencyData.mostEfficientTeam.primaryColor }}
                    >
                      {efficiencyData.mostEfficientTeam.abbr}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs sm:text-sm font-black text-amber-300">
                    {efficiencyData.mostEfficientTeam
                      ? `₹${efficiencyData.mostEfficientTeam.avgPriceCr.toFixed(2)} Cr`
                      : 'Pending'}
                  </span>
                  <span className="text-[8px] text-white/40">
                    {efficiencyData.mostEfficientTeam
                      ? `${efficiencyData.mostEfficientTeam.squadCount} pick${efficiencyData.mostEfficientTeam.squadCount !== 1 ? 's' : ''}`
                      : '0 buys'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Comparison Banner Note */}
            <div className="mt-1.5 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[9px] font-mono">
              {efficiencyData.isMyTeamMostEfficient ? (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  Your squad has the lowest cost-per-player across the auction!
                </span>
              ) : efficiencyData.mostEfficientTeam ? (
                <span className="text-white/60">
                  Leader: <strong className="text-amber-300">{efficiencyData.mostEfficientTeam.name}</strong>
                  {squadSize > 0 && (
                    <span className="text-white/40 ml-1">
                      (Δ +₹{(myAvgPriceCr - efficiencyData.mostEfficientTeam.avgPriceCr).toFixed(2)} Cr/player)
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-white/40">
                  Awaiting first auction signing to determine efficiency leader.
                </span>
              )}
            </div>

            {/* Expandable Live Efficiency Leaderboard */}
            {showEfficiencyLeaderboard && (
              <div className="mt-2 pt-2 border-t border-white/15 space-y-1">
                <div className="flex items-center justify-between text-[9px] font-bold text-white/50 uppercase px-1 pb-1">
                  <span>Franchise Efficiency Rank</span>
                  <span>Avg / Player (Cr)</span>
                </div>

                {efficiencyData.rankedWithBuys.length === 0 ? (
                  <div className="p-2 text-center text-[10px] text-white/40 bg-black/40 rounded">
                    No franchises have acquired players yet.
                  </div>
                ) : (
                  efficiencyData.rankedWithBuys.map((teamRank) => {
                    const isSelected = teamRank.isMyTeam;
                    const isLeader = teamRank.isMostEfficient;

                    return (
                      <div
                        key={teamRank.teamId}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-[10px] font-mono transition-all ${
                          isLeader
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                            : isSelected
                            ? 'bg-blue-950/50 border border-blue-400/40 text-blue-200'
                            : 'bg-black/40 border border-white/5 text-white/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-4 text-center font-bold text-[9px] ${isLeader ? 'text-emerald-400 font-black' : 'text-white/40'}`}>
                            #{teamRank.rank}
                          </span>
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white shrink-0"
                            style={{ backgroundColor: teamRank.primaryColor }}
                          >
                            {teamRank.abbr}
                          </span>
                          <div className="truncate">
                            <span className="font-bold block truncate text-white">
                              {teamRank.shortName}
                              {isSelected && <span className="ml-1 text-[8px] text-ai-lime font-black">(YOU)</span>}
                            </span>
                            <span className="text-[8px] text-white/40">
                              {teamRank.squadCount} pick{teamRank.squadCount !== 1 ? 's' : ''} • ₹{teamRank.totalSpentCr.toFixed(2)} Cr total
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-1.5">
                          <span className={`font-black ${isLeader ? 'text-emerald-400' : 'text-white font-mono'}`}>
                            ₹{teamRank.avgPriceCr.toFixed(2)} Cr
                          </span>
                          {isLeader && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                              ★ MOST EFFICIENT
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Tactical Role Slots Distribution & Overseas Constraint Indicator */}
          <div className="grid grid-cols-5 gap-1 pt-1 text-center font-mono text-[10px]">
            <div className="bg-black/70 border border-white/10 rounded-lg py-0.5" title="Batsmen">
              <span className="text-ai-slate font-bold block text-[9px]">BAT</span>
              <span className="text-ai-silver font-black">{batsmenCount}</span>
            </div>
            <div className="bg-black/70 border border-white/10 rounded-lg py-0.5" title={`Wicketkeepers (Min ${minWicketKeepers} required)`}>
              <span className="text-ai-slate font-bold block text-[9px]">WK</span>
              <span className={`font-black ${wicketKeepersCount >= minWicketKeepers ? 'text-[#FEF08A]' : 'text-rose-400'}`}>
                {wicketKeepersCount}/{minWicketKeepers}
              </span>
            </div>
            <div className="bg-black/70 border border-white/10 rounded-lg py-0.5" title="All-Rounders">
              <span className="text-ai-slate font-bold block text-[9px]">AR</span>
              <span className="text-ai-cyan font-black">{allRoundersCount}</span>
            </div>
            <div className="bg-black/70 border border-white/10 rounded-lg py-0.5" title={`Bowlers (Min ${minBowlers} frontline required)`}>
              <span className="text-ai-slate font-bold block text-[9px]">BOWL</span>
              <span className={`font-black ${bowlersCount >= minBowlers ? 'text-emerald-400' : 'text-rose-400'}`}>
                {bowlersCount}/{minBowlers}
              </span>
            </div>
            <div className="bg-black/70 border border-white/10 rounded-lg py-0.5" title={`Overseas Players (Max ${maxOverseas} in Playing ${isMega ? 'XI' : 'Squad'})`}>
              <span className="text-ai-slate font-bold block text-[9px]">OVERSEAS</span>
              <span className={`font-black ${overseasCount <= maxOverseas ? 'text-cyan-300' : 'text-amber-400'}`}>
                {overseasCount}/{maxOverseas}
              </span>
            </div>
          </div>

          {/* Active Mode Playing Lineup Requirements Strip */}
          <div className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-white/60 font-bold">
              {isMega ? '11-PLAYER PLAYING XI (20 OVERS)' : '5-PLAYER SQUAD (10 OVERS)'}
            </span>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-0.5 ${wicketKeepersCount >= minWicketKeepers ? 'text-emerald-400' : 'text-amber-400'}`}>
                {wicketKeepersCount >= minWicketKeepers ? '✓' : '!'} 1+ WK
              </span>
              <span className={`flex items-center gap-0.5 ${bowlersCount >= minBowlers ? 'text-emerald-400' : 'text-amber-400'}`}>
                {bowlersCount >= minBowlers ? '✓' : '!'} {minBowlers}+ BOWL
              </span>
              <span className={`flex items-center gap-0.5 ${overseasCount <= maxOverseas ? 'text-cyan-300' : 'text-rose-400'}`}>
                MAX {maxOverseas} OS
              </span>
            </div>
          </div>
        </div>

        {/* Squad Roster List with Squad Average Cost tag */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between text-[10px] text-ai-slate font-bold uppercase tracking-wider mb-1.5 font-mono">
            <span className="flex items-center gap-1.5">
              <span>[ :SQUAD_ROSTER ({squadSize}/{maxSquad}) ]</span>
              {squadSize > 0 && (
                <span className={`text-[8px] px-1.5 py-0.2 rounded border font-mono ${
                  efficiencyData.isMyTeamMostEfficient
                    ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-300'
                    : 'bg-black/40 border-white/10 text-white/60'
                }`}>
                  Avg ₹{myAvgPriceCr.toFixed(2)} Cr
                </span>
              )}
            </span>
            <span className={squadSize >= minSquad ? 'text-emerald-400 font-mono font-bold' : 'text-ai-lime font-mono font-bold'}>
              MIN {minSquad} REQUIRED
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto no-scrollbar flex-1 pr-0.5 min-h-[120px]">
            {squad.map((player, idx) => {
              const playerData: PlayerData = {
                id: player.playerId,
                name: player.name,
                displayName: player.displayName,
                role: player.role as any,
                playerType: player.playerType as any,
                basePrice: player.price,
                overallRating: player.overallRating,
                battingRating: player.battingRating,
                bowlingRating: player.bowlingRating,
                fieldingRating: player.fieldingRating,
                starRating: player.starRating,
                isIndian: player.isIndian,
                isOverseas: !player.isIndian,
                nationality: player.isIndian ? 'India' : 'Overseas',
                imageUrl: player.imageUrl
              };

              return (
                <div
                  key={player.playerId}
                  onClick={() => setInspectedPlayer(playerData)}
                  className="bg-black/60 hover:bg-black/90 p-1.5 rounded-xl flex justify-between items-center border-l-3 border-blue-500 text-white gap-2 transition-all shadow-sm border border-white/10 hover:border-amber-400/50 cursor-pointer group"
                  title="Click to view player stats"
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className="text-[10px] text-white/30 font-mono w-4 shrink-0 text-center font-bold">
                      {idx + 1}
                    </span>
                    <img
                      src={getPlayerPhotoUrl(player)}
                      alt={player.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(player);
                      }}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-lg object-cover border border-white/20 shrink-0 group-hover:border-amber-400"
                    />
                    <div className="truncate">
                      <span className="text-xs font-bold block truncate leading-tight font-display tracking-tight group-hover:text-amber-300 transition-colors">
                        {player.displayName || player.name}
                        {!player.isIndian && (
                          <span className="ml-1 text-[8px] bg-cyan-900/60 text-cyan-300 px-1 py-0.2 rounded border border-cyan-500/30">
                            OS
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-white/50 uppercase block leading-tight font-mono">
                        {player.role} • <strong className="text-cyan-300">{player.overallRating} OVR</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      ₹{(player.price / 100).toFixed(2)} Cr
                    </span>
                    <BarChart2 className="w-3.5 h-3.5 text-white/30 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              );
            })}

            {/* Render Empty Slots: In Mega mode with many empty slots, render compact summary plus next slot */}
            {emptySlotsCount > 0 && (
              <>
                <div className="h-8 border border-dashed border-white/15 rounded-xl flex items-center justify-between px-3 bg-black/40">
                  <span className="text-[9px] uppercase font-black tracking-widest text-white/40 font-condensed">
                    + EMPTY ROSTER SLOT #{squadSize + 1}
                  </span>
                  {squadSize < minSquad && (
                    <span className="text-[8px] font-mono text-amber-400 font-bold">
                      NEEDED FOR MIN SQUAD
                    </span>
                  )}
                </div>

                {emptySlotsCount > 1 && (
                  <div className="py-1 px-2 border border-white/5 rounded-lg bg-black/20 text-center">
                    <span className="text-[9px] font-mono text-white/40">
                      + {emptySlotsCount - 1} more open slot{emptySlotsCount - 1 > 1 ? 's' : ''} available (max {maxSquad})
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Qualification & Lineup Status Badge */}
        <div className="pt-2">
          {!isQualified ? (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-2 text-center">
              <p className="text-[10px] text-rose-300 font-black uppercase tracking-wider flex items-center justify-center gap-1 font-condensed">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ACQUIRE {minSquad - squadSize} MORE PLAYER(S) TO QUALIFY ({squadSize}/{minSquad})
              </p>
            </div>
          ) : warnings.length > 0 ? (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-2 text-center">
              <p className="text-[10px] text-amber-300 font-black uppercase tracking-wider flex items-center justify-center gap-1 font-condensed">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                QUALIFIED • {warnings[0]}
              </p>
            </div>
          ) : (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2 text-center">
              <p className="text-[10px] text-emerald-300 font-black uppercase tracking-wider flex items-center justify-center gap-1 font-condensed">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                SQUAD & {isMega ? 'PLAYING XI' : 'LINEUP'} FULLY QUALIFIED!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pop-up stats modal for squad player */}
      <PlayerStatsModal
        isOpen={!!inspectedPlayer}
        player={inspectedPlayer}
        onClose={() => setInspectedPlayer(null)}
      />
    </section>
  );
};

