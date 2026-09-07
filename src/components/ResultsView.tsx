import React, { useState, useEffect, useRef } from 'react';
import { RoomTeam, TeamId, PurchasedPlayer } from '../types/auction';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import { AUCTION_CONFIG, formatCurrencyCr } from '../data/config';
import { useAuth } from '../contexts/AuthContext';
import {
  Trophy,
  ShieldAlert,
  Award,
  RefreshCw,
  User,
  Cpu,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  TrendingUp,
  BarChart3,
  Flame,
  CheckCircle2,
  CloudCheck,
  Cloud,
  History,
  Shield,
  Gavel,
  Medal,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getPlayerPhotoUrl, generatePlayerAvatarSvg } from '../data/playerPhotos';

interface ResultsViewProps {
  teams: Record<TeamId, RoomTeam>;
  completionReason?: 'ALL_PLAYERS_COMPLETED' | 'ALL_TEAMS_FULL' | 'MANUAL_CONCLUDED';
  onRestartAuction: () => void;
  onOpenProfile?: () => void;
  onStartSeasonSimulation?: () => void;
}

interface TeamEvaluation {
  team: RoomTeam;
  teamId: TeamId;
  squad: PurchasedPlayer[];
  top5Picks: PurchasedPlayer[];
  benchPicks: PurchasedPlayer[];
  top5TotalRating: number;
  top5AvgRating: number;
  top5TotalCost: number;
  fullSquadAvgRating: number;
  isQualified: boolean;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  teams,
  completionReason,
  onRestartAuction,
  onOpenProfile,
  onStartSeasonSimulation
}) => {
  const { user, userProfile, signIn, saveAuctionResultToCloud } = useAuth();
  const [expandedTeamId, setExpandedTeamId] = useState<TeamId | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'STANDINGS' | 'ALL_PLAYERS' | 'TOP5_COMPARISON'>('STANDINGS');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'ALL' | TeamId>('ALL');
  const [isSavedToCloud, setIsSavedToCloud] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const placesSectionRef = useRef<HTMLDivElement>(null);
  const playersSectionRef = useRef<HTMLDivElement>(null);
  const hasAutoSaved = useRef(false);

  const handleShowPlayersOfEachTeam = (teamId?: TeamId) => {
    setShowPlaces(true);
    setViewMode('ALL_PLAYERS');
    if (teamId) {
      setSelectedTeamFilter(teamId);
    } else {
      setSelectedTeamFilter('ALL');
    }
    setTimeout(() => {
      playersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const toggleExpandAll = () => {
    setAllExpanded((prev) => !prev);
  };

  // Trigger celebration confetti when auction results view mounts
  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.45 },
        colors: ['#eab308', '#3b82f6', '#10b981', '#f97316', '#a855f7']
      });
    } catch {
      // Ignore if confetti not supported
    }
  }, []);

  // Evaluate each team's squad based on TOP 5 PICKS
  const evaluations: TeamEvaluation[] = ALL_TEAM_IDS.map((tId) => {
    const t = teams[tId];
    if (!t) return null;

    // Sort players by overall rating descending to get the best 5 picks
    const sortedSquad = [...t.squad].sort((a, b) => {
      if (b.overallRating !== a.overallRating) {
        return b.overallRating - a.overallRating;
      }
      return b.price - a.price;
    });

    const top5Picks = sortedSquad.slice(0, 5);
    const benchPicks = sortedSquad.slice(5);

    const top5TotalRating = top5Picks.reduce((sum, p) => sum + p.overallRating, 0);
    const top5AvgRating = top5Picks.length > 0 ? top5TotalRating / top5Picks.length : 0;
    const top5TotalCost = top5Picks.reduce((sum, p) => sum + p.price, 0);
    const fullSquadAvgRating =
      t.squad.length > 0
        ? t.squad.reduce((sum, p) => sum + p.overallRating, 0) / t.squad.length
        : 0;

    const isQualified = t.squad.length >= AUCTION_CONFIG.MIN_SQUAD;

    return {
      team: t,
      teamId: tId,
      squad: sortedSquad,
      top5Picks,
      benchPicks,
      top5TotalRating,
      top5AvgRating,
      top5TotalCost,
      fullSquadAvgRating,
      isQualified
    };
  }).filter((e): e is TeamEvaluation => e !== null);

  // Separate Qualified (>= 5 players) from Disqualified (< 5 players)
  // Sort Qualified teams strictly by:
  // 1. Top 5 Total Rating (Sum of top 5 picks)
  // 2. Remaining Purse (Tie-breaker)
  // 3. Highest individual player rating
  const qualifiedRanked = evaluations
    .filter((e) => e.isQualified)
    .sort((a, b) => {
      if (b.top5TotalRating !== a.top5TotalRating) {
        return b.top5TotalRating - a.top5TotalRating;
      }
      if (b.team.remainingPurse !== a.team.remainingPurse) {
        return b.team.remainingPurse - a.team.remainingPurse;
      }
      const aBest = a.top5Picks[0]?.overallRating || 0;
      const bBest = b.top5Picks[0]?.overallRating || 0;
      return bBest - aBest;
    });

  const eliminatedTeams = evaluations.filter((e) => !e.isQualified);

  const champion = qualifiedRanked[0] || null;

  // Find most expensive player across all teams
  let mostExpensivePlayer = { name: '', price: 0, teamAbbr: '', ovr: 0 };
  evaluations.forEach((e) => {
    e.squad.forEach((p) => {
      if (p.price > mostExpensivePlayer.price) {
        mostExpensivePlayer = {
          name: p.name,
          price: p.price,
          teamAbbr: TEAMS[e.teamId]?.abbr || '',
          ovr: p.overallRating
        };
      }
    });
  });

  const toggleExpand = (tId: TeamId) => {
    setExpandedTeamId(expandedTeamId === tId ? null : tId);
  };

  // Complete list of all 6 teams ranked 1st to 6th place
  const allRanked = [...qualifiedRanked, ...eliminatedTeams];

  const handleTogglePlaces = () => {
    const nextVal = !showPlaces;
    setShowPlaces(nextVal);
    if (nextVal) {
      try {
        confetti({
          particleCount: 110,
          spread: 85,
          origin: { y: 0.5 }
        });
      } catch {}
      setTimeout(() => {
        placesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const getPlaceInfo = (idx: number) => {
    switch (idx) {
      case 0:
        return {
          label: '1st Place',
          tag: 'Champion 🏆',
          borderClass: 'border-yellow-500/80 bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-transparent',
          badgeClass: 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/40 font-black',
          podiumColor: 'text-yellow-400',
          icon: <Trophy className="w-4 h-4 fill-current text-black" />
        };
      case 1:
        return {
          label: '2nd Place',
          tag: 'Runner-Up 🥈',
          borderClass: 'border-slate-400/60 bg-gradient-to-r from-slate-300/10 via-slate-400/5 to-transparent',
          badgeClass: 'bg-slate-300 text-black shadow-md shadow-slate-300/30 font-black',
          podiumColor: 'text-slate-300',
          icon: <Medal className="w-4 h-4 text-black" />
        };
      case 2:
        return {
          label: '3rd Place',
          tag: '2nd Runner-Up 🥉',
          borderClass: 'border-amber-700/60 bg-gradient-to-r from-amber-700/10 via-amber-800/5 to-transparent',
          badgeClass: 'bg-amber-700 text-white shadow-md shadow-amber-700/30 font-black',
          podiumColor: 'text-amber-500',
          icon: <Award className="w-4 h-4 text-white" />
        };
      case 3:
        return {
          label: '4th Place',
          tag: 'Playoffs 🏅',
          borderClass: 'border-white/20 bg-white/5',
          badgeClass: 'bg-white/20 text-white font-bold',
          podiumColor: 'text-white/80',
          icon: null
        };
      case 4:
        return {
          label: '5th Place',
          tag: '5th Place',
          borderClass: 'border-white/15 bg-white/5',
          badgeClass: 'bg-white/15 text-white/70 font-bold',
          podiumColor: 'text-white/60',
          icon: null
        };
      case 5:
        return {
          label: '6th Place',
          tag: '6th Place',
          borderClass: 'border-white/10 bg-white/5',
          badgeClass: 'bg-white/10 text-white/60 font-bold',
          podiumColor: 'text-white/50',
          icon: null
        };
      default:
        return {
          label: `${idx + 1}th Place`,
          tag: `${idx + 1}th Place`,
          borderClass: 'border-white/10 bg-white/5',
          badgeClass: 'bg-white/10 text-white font-bold',
          podiumColor: 'text-white/50',
          icon: null
        };
    }
  };

  // Auto-save tournament results to Firestore when user is authenticated
  useEffect(() => {
    if (!user || hasAutoSaved.current || !champion) return;

    // Identify user's team if human
    const myEvaluation =
      evaluations.find((e) => e.team.controllerType === 'HUMAN') ||
      evaluations[0];

    if (!myEvaluation) return;

    hasAutoSaved.current = true;
    setIsSaving(true);

    const userRank = qualifiedRanked.findIndex((e) => e.teamId === myEvaluation.teamId) + 1;
    const isUserChampion = champion.teamId === myEvaluation.teamId;

    const auctionPayload = {
      auctionId: `auc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      gameMode: (evaluations.filter((e) => e.team.controllerType === 'HUMAN').length > 1
        ? 'MULTIPLAYER'
        : 'SINGLE_PLAYER') as 'SINGLE_PLAYER' | 'MULTIPLAYER',
      userTeamId: myEvaluation.teamId,
      userRank: userRank > 0 ? userRank : 6,
      isChampion: isUserChampion,
      userTop5Score: myEvaluation.top5TotalRating,
      userPurseRemaining: myEvaluation.team.remainingPurse,
      championTeamId: champion.teamId,
      championManager: champion.team.participantName,
      championTop5Score: champion.top5TotalRating,
      top5Picks: myEvaluation.top5Picks.map((p) => ({
        name: p.name,
        role: p.role || 'ALL_ROUNDER',
        overallRating: p.overallRating,
        price: p.price,
        isIndian: p.isIndian ?? true
      })),
      allStandings: qualifiedRanked.map((e, idx) => ({
        teamId: e.teamId,
        teamName: TEAMS[e.teamId].name,
        managerName: e.team.participantName,
        rank: idx + 1,
        top5Score: e.top5TotalRating,
        squadCount: e.squad.length,
        remainingPurse: e.team.remainingPurse,
        isChampion: idx === 0
      }))
    };

    saveAuctionResultToCloud(auctionPayload).then((success) => {
      setIsSaving(false);
      if (success) {
        setIsSavedToCloud(true);
      }
    });
  }, [user, champion]);

  const handleManualSave = async () => {
    if (!user) {
      const loggedIn = await signIn();
      if (!loggedIn) return;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-12 py-6 sm:py-8 max-w-6xl mx-auto w-full select-none">
      {/* Top Banner: Prominently displaying AUCTION IS ENDED */}
      <div className="text-center mb-6 sm:mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 text-white px-5 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl border border-yellow-300/40">
          <Gavel className="w-4 h-4 text-yellow-200" />
          <span>AUCTION IS ENDED • SQUADS FINALIZED</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight italic text-white leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
          AUCTION <span className="text-yellow-400">IS ENDED</span>
        </h1>

        <div className="inline-flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/40 px-4 py-1.5 rounded-full text-yellow-300 text-xs sm:text-sm font-bold shadow-inner">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span>Official Rankings Calculated According to Top 5 Picks</span>
        </div>

        <p className="text-xs sm:text-sm text-white/70 max-w-2xl mx-auto leading-relaxed">
          {completionReason === 'ALL_TEAMS_FULL'
            ? 'All 6 franchises have completed their 7-player squads! The auction is ended, top 5 picks of each team are calculated, and official championship rankings are decided.'
            : completionReason === 'ALL_PLAYERS_COMPLETED'
            ? 'All 60 players in the master auction pool have completed bidding! The auction is ended, top 5 picks of each team are calculated, and official championship rankings are decided.'
            : 'The auction is ended! Top 5 picks of each team have been calculated and official tournament rankings are decided below.'}
        </p>

        {/* Cloud Sync Status Strip */}
        <div className="max-w-md mx-auto pt-1">
          {user ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3.5 py-1.5 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSavedToCloud
                  ? 'Auction Result Saved to Firestore'
                  : isSaving
                  ? 'Saving to Cloud Profile...'
                  : 'Cloud Sync Active'}
              </span>
              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="text-[11px] font-bold text-white/70 hover:text-white underline cursor-pointer"
                >
                  View Career History →
                </button>
              )}
            </div>
          ) : (
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
              <span className="text-blue-300 font-medium">
                Save this tournament to your Cloud Profile & Hall of Fame:
              </span>
              <button
                onClick={handleManualSave}
                className="bg-white hover:bg-white/90 text-black font-bold px-2.5 py-1 rounded-lg text-xs ml-2 cursor-pointer shadow"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Buttons: Places of Each Team, Players of Each Team, and START IPL SEASON */}
        <div className="pt-3 pb-1 flex flex-col sm:flex-row items-center justify-center gap-3 px-2 flex-wrap">
          {/* KILLER FEATURE: START IPL 2026 SEASON */}
          {onStartSeasonSimulation && (
            <button
              id="start-ipl-season-button"
              onClick={onStartSeasonSimulation}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 sm:gap-3 font-black text-sm sm:text-base md:text-lg px-6 sm:px-9 py-3.5 sm:py-4 rounded-2xl uppercase italic tracking-wider transition-all duration-300 shadow-[0_0_35px_rgba(212,246,54,0.45)] cursor-pointer border-2 border-[#D4F636] bg-gradient-to-r from-[#D4F636] via-[#c4ea21] to-[#D4F636] text-black active:scale-95 hover:scale-105 hover:shadow-[0_0_50px_rgba(212,246,54,0.7)]"
            >
              <Zap className="w-5 h-5 fill-black text-black shrink-0" />
              <span>START IPL 2026 SEASON</span>
            </button>
          )}

          <button
            id="show-places-button"
            onClick={() => {
              if (!showPlaces) {
                setShowPlaces(true);
              }
              setViewMode('STANDINGS');
              setTimeout(() => {
                placesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 sm:gap-3 font-black text-sm sm:text-base md:text-lg px-5 sm:px-8 py-3.5 sm:py-4 rounded-2xl uppercase italic tracking-wider transition-all duration-300 shadow-2xl cursor-pointer border-2 active:scale-95 ${
              showPlaces && viewMode === 'STANDINGS'
                ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black border-yellow-200 shadow-yellow-500/40 ring-2 ring-yellow-400'
                : 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black border-yellow-200 shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:scale-105'
            }`}
          >
            <Trophy className="w-5 h-5 fill-current text-black shrink-0" />
            <span>Show Places of Each Team</span>
          </button>

          <button
            id="show-players-button"
            onClick={() => handleShowPlayersOfEachTeam()}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 sm:gap-3 font-black text-sm sm:text-base md:text-lg px-5 sm:px-8 py-3.5 sm:py-4 rounded-2xl uppercase italic tracking-wider transition-all duration-300 shadow-2xl cursor-pointer border-2 active:scale-95 ${
              showPlaces && viewMode === 'ALL_PLAYERS'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-300 shadow-blue-500/40 ring-2 ring-blue-400'
                : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105'
            }`}
          >
            <Users className="w-5 h-5 text-white shrink-0" />
            <span>Show Players of Each Team</span>
          </button>
        </div>
      </div>

      {/* When places not yet revealed: Show Teaser Box */}
      {!showPlaces && (
        <div className="bg-gradient-to-b from-white/10 via-white/5 to-transparent border border-white/15 rounded-3xl p-5 sm:p-10 text-center max-w-3xl mx-auto shadow-2xl relative overflow-hidden mb-8 animate-fadeIn">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Trophy className="w-7 h-7 sm:w-10 sm:h-10" />
          </div>

          <h3 className="text-xl sm:text-3xl font-black uppercase italic tracking-tight text-white mb-2">
            Final Standings & Places Ready
          </h3>
          <p className="text-xs sm:text-sm text-white/70 max-w-lg mx-auto mb-6">
            All 6 franchises have completed bidding and are evaluated based on their <strong className="text-yellow-400 font-bold">Top 5 Picks</strong>. Click the button below to see the places (1st to 6th) of each team!
          </p>

          {/* Quick Logos Grid of All 6 Teams */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            {allRanked.map((evalItem, idx) => {
              const teamConf = TEAMS[evalItem.teamId];
              return (
                <div
                  key={evalItem.teamId}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/15 bg-black/40 flex items-center gap-1.5 sm:gap-2"
                >
                  <div
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black text-white shadow shrink-0"
                    style={{ backgroundColor: teamConf.primaryColor }}
                  >
                    {teamConf.abbr}
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-white/80">{teamConf.name}</span>
                </div>
              );
            })}
          </div>

          <button
            id="reveal-places-btn"
            onClick={handleTogglePlaces}
            className="w-full sm:w-auto max-w-sm inline-flex items-center justify-center gap-2.5 sm:gap-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm sm:text-lg px-5 sm:px-10 py-3.5 sm:py-4 rounded-2xl uppercase italic tracking-wider transition-all shadow-[0_0_35px_rgba(234,179,8,0.5)] border-2 border-yellow-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span>Show Places of Each Team</span>
          </button>
        </div>
      )}

      {/* When places revealed: Show places of each team */}
      {showPlaces && (
        <div ref={placesSectionRef} className="space-y-8 animate-fadeIn">
          {/* Quick Places Podium Cards for All 6 Teams */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-yellow-400 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Official Places of Each Team (1st to 6th)
              </h3>
              <span className="text-xs text-white/50 font-mono">
                Ranked by Top 5 Picks Combined Rating
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {allRanked.map((evalItem, idx) => {
                const placeInfo = getPlaceInfo(idx);
                const teamConf = TEAMS[evalItem.teamId];
                return (
                  <div
                    key={evalItem.teamId}
                    onClick={() => handleShowPlayersOfEachTeam(evalItem.teamId)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer hover:scale-105 hover:border-yellow-400/60 ${placeInfo.borderClass} group`}
                    title="Click to view full squad of players"
                  >
                    <div className={`text-[10px] uppercase px-2 py-0.5 rounded-full inline-block mb-1.5 ${placeInfo.badgeClass}`}>
                      {placeInfo.label}
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white mx-auto mb-1.5 shadow"
                      style={{ backgroundColor: teamConf.primaryColor }}
                    >
                      {teamConf.abbr}
                    </div>
                    <h5 className="text-xs font-black uppercase italic text-white truncate">
                      {teamConf.name}
                    </h5>
                    <div className="text-xs font-black text-yellow-400 font-mono mt-1">
                      {evalItem.top5TotalRating} <span className="text-[9px] text-white/40 font-normal">pts</span>
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      Avg {evalItem.top5AvgRating.toFixed(1)} OVR
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-white/10">
                      <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider group-hover:underline flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-blue-400" />
                        <span>View Players ({evalItem.team.squad.length})</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex justify-center w-full px-2">
            <div className="inline-flex bg-black/60 border border-white/15 p-1.5 rounded-2xl gap-1.5 max-w-full overflow-x-auto shadow-xl">
              <button
                onClick={() => setViewMode('STANDINGS')}
                className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
                  viewMode === 'STANDINGS'
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/30'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Award className="w-4 h-4 shrink-0" />
                <span>Places & Standings</span>
              </button>
              <button
                id="tab-players-of-each-team"
                onClick={() => setViewMode('ALL_PLAYERS')}
                className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
                  viewMode === 'ALL_PLAYERS'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Players of Each Team</span>
              </button>
              <button
                onClick={() => setViewMode('TOP5_COMPARISON')}
                className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
                  viewMode === 'TOP5_COMPARISON'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Top 5 Face-Off</span>
              </button>
            </div>
          </div>

          {/* Champion Highlight Announcement Box */}
          {champion ? (
        <div className="bg-gradient-to-r from-yellow-600/25 via-amber-900/30 to-black border-2 border-yellow-500/60 rounded-3xl p-5 sm:p-8 mb-8 shadow-2xl relative overflow-hidden animate-fadeIn">
          {/* Background Glow */}
          <div
            className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: TEAMS[champion.teamId].primaryColor }}
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 sm:gap-6">
              <div
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-2xl sm:text-4xl font-black text-white shadow-2xl border-2 border-yellow-400/60 shrink-0"
                style={{ backgroundColor: TEAMS[champion.teamId].primaryColor }}
              >
                {TEAMS[champion.teamId].abbr}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-yellow-500 text-black text-[10px] sm:text-xs px-2.5 py-1 rounded font-black uppercase tracking-widest mb-1.5">
                  <Trophy className="w-3.5 h-3.5 fill-current" />
                  <span>IPL 2026 Auction Champion</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase italic text-white tracking-tight">
                  {TEAMS[champion.teamId].name}
                </h3>
                <p className="text-xs sm:text-sm text-white/70 mt-1 flex items-center gap-2">
                  <span>Manager:</span>
                  <strong className="text-white bg-white/10 px-2 py-0.5 rounded font-mono">
                    {champion.team.participantName}
                  </strong>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold uppercase">
                    {champion.team.controllerType === 'HUMAN' ? 'Human Player' : 'AI Bot'}
                  </span>
                </p>
              </div>
            </div>

            {/* Champion Metrics Card */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-black/60 border border-white/15 rounded-2xl p-3 sm:p-4 text-center">
              <div>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-yellow-400 tracking-wider block">
                  Top 5 Power
                </span>
                <span className="text-xl sm:text-2xl font-black text-yellow-400 font-mono">
                  {champion.top5TotalRating}
                </span>
                <span className="text-[9px] text-white/50 block font-semibold">
                  Avg {champion.top5AvgRating.toFixed(1)} OVR
                </span>
              </div>
              <div className="border-l border-white/10 pl-2 sm:pl-4">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/40 tracking-wider block">
                  Squad Size
                </span>
                <span className="text-xl sm:text-2xl font-black text-white">
                  {champion.team.squad.length}/7
                </span>
                <span className="text-[9px] text-emerald-400 block font-semibold">
                  Qualified
                </span>
              </div>
              <div className="border-l border-white/10 pl-2 sm:pl-4">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/40 tracking-wider block">
                  Purse Left
                </span>
                <span className="text-lg sm:text-xl font-mono font-black text-emerald-400">
                  {formatCurrencyCr(champion.team.remainingPurse)}
                </span>
                <span className="text-[9px] text-white/50 block font-semibold">
                  of ₹50.00 Cr
                </span>
              </div>
            </div>
          </div>

          {/* Champion's Winning Top 5 Picks Showcase */}
          <div className="mt-6 pt-5 border-t border-white/15">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase font-black tracking-widest text-yellow-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-current" />
                Champion's Top 5 Winning Picks
              </span>
              <span className="text-[11px] text-white/50 font-mono">
                Combined Cost: {formatCurrencyCr(champion.top5TotalCost)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {champion.top5Picks.map((p, idx) => (
                <div
                  key={p.playerId}
                  className="bg-black/50 border border-yellow-500/30 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-yellow-500/60 transition-colors"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getPlayerPhotoUrl(p)}
                      alt={p.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(p);
                      }}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover border border-white/20"
                    />
                    <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="truncate min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[9px] text-yellow-400 font-black">
                        {p.overallRating} OVR
                      </span>
                      <span className="text-[9px] text-white/50 font-mono">
                        {formatCurrencyCr(p.price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* VIEW MODE 1: Top 5 Standings List */}
      {viewMode === 'STANDINGS' && (
        <div className="space-y-4 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" /> Official Standings & Places by Top 5 Picks ({allRanked.length} Teams)
              </h3>
              <span className="text-xs text-white/40 italic">
                Ranked 1st to 6th by Top 5 Combined Rating
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleExpandAll}
                className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow"
              >
                <Users className="w-3.5 h-3.5 text-yellow-400" />
                <span>{allExpanded ? 'Collapse All Teams' : 'Show All Players (Expand All)'}</span>
              </button>

              <button
                onClick={() => handleShowPlayersOfEachTeam()}
                className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-300 flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow"
              >
                <span>Full Squad View →</span>
              </button>
            </div>
          </div>

          {allRanked.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/40 italic">
              No franchises found!
            </div>
          ) : (
            allRanked.map((evalItem, idx) => {
              const teamConfig = TEAMS[evalItem.teamId];
              const isExpanded = allExpanded || expandedTeamId === evalItem.teamId;
              const isWinner = idx === 0;
              const placeInfo = getPlaceInfo(idx);

              return (
                <div
                  key={evalItem.teamId}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    isWinner
                      ? 'bg-gradient-to-r from-yellow-500/10 via-white/5 to-white/5 border-yellow-500/50 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div
                    onClick={() => toggleExpand(evalItem.teamId)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Place Badge with Tag */}
                      <div className="flex flex-col items-center justify-center shrink-0 min-w-[76px]">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 flex items-center gap-1 uppercase tracking-wider ${placeInfo.badgeClass}`}
                        >
                          {placeInfo.icon}
                          <span>{placeInfo.label}</span>
                        </span>
                        <span className="text-[10px] text-white/50 font-bold uppercase mt-0.5">
                          {placeInfo.tag}
                        </span>
                      </div>

                      {/* Team Logo Badge */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black text-white shadow border border-white/20 shrink-0"
                        style={{ backgroundColor: teamConfig.primaryColor }}
                      >
                        {teamConfig.abbr}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base sm:text-lg font-black uppercase italic text-white">
                            {teamConfig.name}
                          </h4>
                          {isWinner && (
                            <span className="bg-yellow-500 text-black text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-1">
                              <Trophy className="w-3 h-3 fill-current" /> Winner
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 flex items-center gap-1.5 mt-0.5">
                          {evalItem.team.controllerType === 'HUMAN' ? (
                            <User className="w-3 h-3 text-green-400" />
                          ) : (
                            <Cpu className="w-3 h-3 text-white/40" />
                          )}
                          <span>{evalItem.team.participantName}</span>
                          <span className="text-white/30">•</span>
                          <span>{evalItem.team.squad.length} Players</span>
                        </p>
                      </div>
                    </div>

                    {/* Stats Metrics */}
                    <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/10">
                      {/* Top 5 Power Rating */}
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-widest block">
                          Top 5 Score
                        </span>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-base sm:text-lg font-black text-yellow-400 font-mono">
                            {evalItem.top5TotalRating}
                          </span>
                          <span className="text-[10px] text-white/40 font-mono">
                            pts
                          </span>
                        </div>
                        <span className="text-[9px] text-white/40 block">
                          Avg {evalItem.top5AvgRating.toFixed(1)} OVR
                        </span>
                      </div>

                      {/* Full Squad Rating */}
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest block">
                          Squad OVR
                        </span>
                        <span className="text-base font-black text-white/80">
                          {Math.round(evalItem.fullSquadAvgRating)}
                        </span>
                      </div>

                      {/* Purse Left */}
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest block">
                          Purse Left
                        </span>
                        <span className="text-sm sm:text-base font-mono font-bold text-emerald-400">
                          {formatCurrencyCr(evalItem.team.remainingPurse)}
                        </span>
                      </div>

                      <div className="text-white/40 pl-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Top 5 Mini Preview Bar (Always visible) */}
                  <div className="px-4 sm:px-5 pb-4 pt-1 flex flex-wrap items-center gap-2 bg-black/20">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider mr-1 shrink-0">
                      Top 5 Picks:
                    </span>
                    {evalItem.top5Picks.map((p, pIdx) => (
                      <span
                        key={p.playerId}
                        className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-xs font-semibold text-white/90"
                      >
                        <span className="text-[9px] font-mono text-yellow-400 font-bold">
                          #{pIdx + 1}
                        </span>
                        <span className="truncate max-w-[90px]">{p.name}</span>
                        <span className="text-[10px] font-black bg-blue-500/20 text-blue-400 px-1 rounded">
                          {p.overallRating}
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* Expanded Full Roster Drawer */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-black/50 border-t border-white/10 space-y-4">
                      {/* Top 5 Core Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase font-black tracking-wider text-yellow-400 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            Top 5 Championship Picks (Score: {evalItem.top5TotalRating} pts)
                          </span>
                          <span className="text-xs text-white/50 font-mono">
                            Total Spent: {formatCurrencyCr(evalItem.top5TotalCost)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {evalItem.top5Picks.map((p, pIdx) => (
                            <div
                              key={p.playerId}
                              className="bg-yellow-500/5 border border-yellow-500/30 p-3 rounded-xl flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 truncate min-w-0">
                                <div className="relative shrink-0">
                                  <img
                                    src={getPlayerPhotoUrl(p)}
                                    alt={p.name}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(p);
                                    }}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-lg object-cover border border-white/20"
                                  />
                                  <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center">
                                    {pIdx + 1}
                                  </span>
                                </div>
                                <div className="truncate min-w-0">
                                  <p className="text-sm font-bold uppercase text-white truncate">
                                    {p.name}
                                  </p>
                                  <p className="text-[10px] text-white/50 uppercase">
                                    {p.role} • <strong className="text-yellow-400">{p.overallRating} OVR</strong>
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-mono font-black text-emerald-400 italic shrink-0">
                                {formatCurrencyCr(p.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bench / Additional Picks if squad > 5 */}
                      {evalItem.benchPicks.length > 0 && (
                        <div className="pt-3 border-t border-white/10">
                          <span className="text-xs uppercase font-bold tracking-wider text-white/50 block mb-2">
                            Additional Roster Picks ({evalItem.benchPicks.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {evalItem.benchPicks.map((p) => (
                              <div
                                key={p.playerId}
                                className="bg-white/5 border border-white/10 p-2.5 rounded-xl flex items-center justify-between gap-3 opacity-75"
                              >
                                <div className="flex items-center gap-2.5 truncate min-w-0">
                                  <img
                                    src={getPlayerPhotoUrl(p)}
                                    alt={p.name}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(p);
                                    }}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                                  />
                                  <div className="truncate min-w-0">
                                    <p className="text-xs font-bold uppercase text-white truncate">
                                      {p.name}
                                    </p>
                                    <p className="text-[9px] text-white/40 uppercase">
                                      {p.role} • {p.overallRating} OVR
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs font-mono font-bold text-white/70 shrink-0">
                                  {formatCurrencyCr(p.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: PLAYERS OF EACH TEAM (FULL SQUADS WITH TOP 5 BADGES) */}
      {viewMode === 'ALL_PLAYERS' && (
        <div ref={playersSectionRef} className="space-y-6 mb-10 animate-fadeIn">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2 font-display">
                <Users className="w-5 h-5 text-yellow-400" />
                Players of Each Franchise Squad
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Full 7-player squads of all franchises. <strong className="text-yellow-400 font-bold">Top 5 Picks</strong> are highlighted with golden badges to show how the tournament was won.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1.5 rounded-xl text-white/80 border border-white/15 whitespace-nowrap">
                7 Players / Team Max
              </span>
            </div>
          </div>

          {/* Franchise Selector Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 select-none">
            <button
              onClick={() => setSelectedTeamFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 border ${
                selectedTeamFilter === 'ALL'
                  ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/30'
                  : 'bg-black/50 text-white/70 hover:text-white border-white/10'
              }`}
            >
              <span>All 6 Franchises</span>
            </button>
            {allRanked.map((evalItem) => {
              const teamConf = TEAMS[evalItem.teamId];
              const isSelected = selectedTeamFilter === evalItem.teamId;
              return (
                <button
                  key={evalItem.teamId}
                  onClick={() => setSelectedTeamFilter(evalItem.teamId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 border ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-md'
                      : 'border-white/10 bg-black/40 text-white/70 hover:text-white'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow shrink-0"
                    style={{ backgroundColor: teamConf.primaryColor }}
                  >
                    {teamConf.abbr}
                  </div>
                  <span>{teamConf.abbr}</span>
                  <span className="text-[10px] font-mono opacity-60">({evalItem.team.squad.length})</span>
                </button>
              );
            })}
          </div>

          {/* Teams and their players */}
          <div className="space-y-6">
            {allRanked
              .filter((e) => selectedTeamFilter === 'ALL' || e.teamId === selectedTeamFilter)
              .map((evalItem, idx) => {
                const teamConf = TEAMS[evalItem.teamId];
                const placeInfo = getPlaceInfo(idx);
                const isWinner = idx === 0;

                return (
                  <div
                    key={evalItem.teamId}
                    className="bg-black/50 border border-white/15 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden"
                    style={{
                      borderTop: `4px solid ${teamConf.primaryColor}`
                    }}
                  >
                    {/* Team Header Banner */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-5">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-xl border-2 border-white/20 shrink-0 font-teko"
                          style={{ backgroundColor: teamConf.primaryColor }}
                        >
                          {teamConf.abbr}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xl sm:text-2xl font-black uppercase italic tracking-wide text-white font-teko">
                              {teamConf.name}
                            </h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${placeInfo.badgeClass}`}>
                              {placeInfo.label}
                            </span>
                            {isWinner && (
                              <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1">
                                <Trophy className="w-3 h-3 fill-current" /> Champion
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/50 flex items-center gap-2 mt-0.5 font-mono">
                            <span>Manager: <strong className="text-white/80">{evalItem.team.participantName}</strong></span>
                            <span>•</span>
                            <span>{evalItem.team.controllerType === 'HUMAN' ? '🎮 Human User' : '🤖 AI Franchise'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Team Metric Badges */}
                      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                        <div className="text-left md:text-right">
                          <span className="text-[9px] uppercase font-bold text-yellow-400 tracking-widest block">
                            Top 5 Power Score
                          </span>
                          <span className="text-lg font-black text-yellow-400 font-mono">
                            {evalItem.top5TotalRating} <span className="text-xs font-normal text-white/40">pts</span>
                          </span>
                          <span className="text-[10px] text-white/50 block font-mono">
                            Avg {evalItem.top5AvgRating.toFixed(1)} OVR
                          </span>
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest block">
                            Squad Size
                          </span>
                          <span className="text-lg font-black text-white font-mono">
                            {evalItem.team.squad.length} <span className="text-xs font-normal text-white/40">/ 7</span>
                          </span>
                          <span className="text-[10px] text-white/50 block">
                            {evalItem.team.squad.length >= 7 ? 'Full Squad' : `${7 - evalItem.team.squad.length} slots free`}
                          </span>
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest block">
                            Remaining Purse
                          </span>
                          <span className="text-lg font-black text-emerald-400 font-mono">
                            {formatCurrencyCr(evalItem.team.remainingPurse)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Squad Grid: Top 5 Picks & Bench Players */}
                    {evalItem.team.squad.length === 0 ? (
                      <div className="py-8 text-center text-white/40 text-xs italic bg-white/5 rounded-2xl border border-white/10">
                        No players acquired during auction.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Top 5 Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs uppercase font-black tracking-wider text-yellow-400 flex items-center gap-1.5 font-condensed">
                              <Star className="w-4 h-4 fill-current text-yellow-400" />
                              TOP 5 SCORING PICKS (DETERMINES FINAL TOURNAMENT RANKING)
                            </span>
                            <span className="text-xs text-white/50 font-mono">
                              Combined Rating: {evalItem.top5TotalRating} pts
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {evalItem.top5Picks.map((p, pIdx) => (
                              <div
                                key={p.playerId}
                                className="bg-gradient-to-b from-yellow-500/10 via-black/40 to-black/60 border-2 border-yellow-500/40 rounded-2xl p-3.5 flex flex-col justify-between hover:border-yellow-400 transition-all shadow-md group relative"
                              >
                                <div className="flex items-start justify-between gap-2 mb-2.5">
                                  <div className="relative">
                                    <img
                                      src={getPlayerPhotoUrl(p)}
                                      alt={p.name}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(p);
                                      }}
                                      referrerPolicy="no-referrer"
                                      className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow"
                                    />
                                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-black flex items-center justify-center shadow">
                                      #{pIdx + 1}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-black bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-1.5 py-0.5 rounded-lg font-mono">
                                      {p.overallRating} OVR
                                    </span>
                                    <span className="block text-[9px] uppercase font-bold text-white/50 mt-1">
                                      {p.role}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="text-sm font-black uppercase text-white truncate leading-tight">
                                    {p.name}
                                  </h5>
                                  <div className="flex items-center justify-between text-[10px] text-white/60 font-mono mt-1 pt-1.5 border-t border-white/10">
                                    <span>{p.isIndian ? '🇮🇳 Indian' : '✈️ Overseas'}</span>
                                    <span className="font-black text-emerald-400">
                                      {formatCurrencyCr(p.price)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bench / Additional Picks (Slots 6 and 7) */}
                        {evalItem.benchPicks.length > 0 && (
                          <div className="pt-3 border-t border-white/10">
                            <span className="text-xs uppercase font-bold tracking-wider text-white/50 flex items-center gap-1.5 mb-3 font-condensed">
                              <span>ADDITIONAL SQUAD PICKS (SQUAD ROSTER SLOTS #6 & #7)</span>
                              <span className="text-[10px] text-white/40">({evalItem.benchPicks.length} Players)</span>
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                              {evalItem.benchPicks.map((p, bIdx) => (
                                <div
                                  key={p.playerId}
                                  className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-between opacity-80 hover:opacity-100 hover:border-white/30 transition-all"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="relative">
                                      <img
                                        src={getPlayerPhotoUrl(p)}
                                        alt={p.name}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(p);
                                        }}
                                        referrerPolicy="no-referrer"
                                        className="w-10 h-10 rounded-lg object-cover border border-white/15"
                                      />
                                      <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-slate-700 text-white text-[9px] font-bold flex items-center justify-center">
                                        #{bIdx + 6}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-bold text-white/80 font-mono">
                                        {p.overallRating} OVR
                                      </span>
                                      <span className="block text-[9px] uppercase text-white/40">
                                        {p.role}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <h5 className="text-xs font-bold uppercase text-white/90 truncate">
                                      {p.name}
                                    </h5>
                                    <div className="flex items-center justify-between text-[10px] text-white/50 font-mono mt-1 pt-1 border-t border-white/10">
                                      <span>Bench</span>
                                      <span className="text-emerald-400 font-bold">
                                        {formatCurrencyCr(p.price)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
      {viewMode === 'TOP5_COMPARISON' && (
        <div className="space-y-4 mb-10 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Top 5 Picks Face-Off Matrix
            </h3>
            <span className="text-xs text-white/50">
              Side-by-side breakdown of the top 5 players on each franchise
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evaluations.map((evalItem) => {
              const teamConfig = TEAMS[evalItem.teamId];
              const isWinner = champion?.teamId === evalItem.teamId;

              return (
                <div
                  key={evalItem.teamId}
                  className={`bg-white/5 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between ${
                    isWinner
                      ? 'border-yellow-500/70 bg-yellow-500/5 ring-2 ring-yellow-500/20'
                      : evalItem.isQualified
                      ? 'border-white/15'
                      : 'border-red-500/30 bg-red-950/10 opacity-70'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black text-white shadow"
                          style={{ backgroundColor: teamConfig.primaryColor }}
                        >
                          {teamConfig.abbr}
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase italic text-white leading-tight">
                            {teamConfig.name}
                          </h4>
                          <span className="text-[10px] text-white/50">
                            {evalItem.team.participantName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-white/40 block">
                          Top 5 Score
                        </span>
                        <span
                          className={`text-base font-black font-mono ${
                            isWinner ? 'text-yellow-400' : 'text-white'
                          }`}
                        >
                          {evalItem.top5TotalRating} pts
                        </span>
                      </div>
                    </div>

                    {/* Top 5 Players List */}
                    <div className="space-y-2 mb-4">
                      {evalItem.top5Picks.map((p, idx) => (
                        <div
                          key={p.playerId}
                          className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <span className="w-4 h-4 rounded-full bg-white/10 text-white/70 text-[9px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <img
                              src={getPlayerPhotoUrl(p)}
                              alt={p.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(p);
                              }}
                              referrerPolicy="no-referrer"
                              className="w-6 h-6 rounded object-cover shrink-0"
                            />
                            <span className="font-bold text-white truncate max-w-[120px]">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                              {p.overallRating} OVR
                            </span>
                            <span className="text-[10px] font-mono text-white/50">
                              {formatCurrencyCr(p.price)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Missing picks indicator if < 5 */}
                      {Array.from({ length: Math.max(0, 5 - evalItem.top5Picks.length) }).map((_, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg border border-dashed border-red-500/30 bg-red-500/5 text-[11px] text-red-400 text-center font-medium"
                        >
                          Missing Pick #{evalItem.top5Picks.length + idx + 1} (Incomplete)
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer Summary */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-white/50">
                      Purse Left: <strong className="text-emerald-400 font-mono">{formatCurrencyCr(evalItem.team.remainingPurse)}</strong>
                    </span>
                    {isWinner ? (
                      <span className="text-yellow-400 font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 fill-current" /> Champion
                      </span>
                    ) : evalItem.isQualified ? (
                      <span className="text-white/60">
                        {evalItem.top5TotalRating - (champion?.top5TotalRating || 0)} pts vs Leader
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold">Disqualified</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Eliminated Franchises Section (Below 5 players) */}
      {eliminatedTeams.length > 0 && (
        <div className="space-y-3 mb-10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Disqualified Franchises (Fewer Than 5 Players)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eliminatedTeams.map((evalItem) => {
              const teamConfig = TEAMS[evalItem.teamId];
              return (
                <div
                  key={evalItem.teamId}
                  className="bg-red-950/15 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow opacity-60 shrink-0"
                      style={{ backgroundColor: teamConfig.primaryColor }}
                    >
                      {teamConfig.abbr}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black uppercase italic text-white">
                          {teamConfig.name}
                        </h4>
                        <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                          Eliminated
                        </span>
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">
                        Manager: {evalItem.team.participantName} • Completed only {evalItem.team.squad.length}/5 required picks
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9px] uppercase font-bold text-white/40 block">
                      Purse Left
                    </span>
                    <span className="text-xs font-mono font-bold text-white/70">
                      {formatCurrencyCr(evalItem.team.remainingPurse)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

        </div>
      )}

      {/* Bottom Section: Start New Game Button */}
      <div className="text-center mt-10 sm:mt-14 pb-12 pt-6 border-t border-white/10">
        <p className="text-xs uppercase font-bold tracking-widest text-white/50 mb-3 font-mono">
          Auction Concluded • Ready for Next Season
        </p>
        <button
          id="start-new-game-button"
          onClick={onRestartAuction}
          className="w-full sm:w-auto max-w-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm sm:text-xl px-6 sm:px-14 py-3.5 sm:py-5 rounded-2xl uppercase italic tracking-wider transition-all shadow-2xl shadow-blue-600/40 inline-flex items-center justify-center gap-2.5 sm:gap-3 cursor-pointer hover:scale-105 active:scale-95 border border-blue-400/40"
        >
          <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Start New Game</span>
        </button>
      </div>
    </div>
  );
};

