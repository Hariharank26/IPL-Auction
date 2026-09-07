import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Users,
  Shield,
  Star,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Filter,
  DollarSign,
  ChevronRight,
  BarChart2,
  Flame,
  Award,
  LayoutGrid,
  List
} from 'lucide-react';
import { PLAYERS_POOL } from '../data/players';
import { PlayerData, RoomState, RoomTeam, PlayerRole, PlayerType } from '../types/auction';
import { TEAMS } from '../data/teams';
import { formatCurrencyCr } from '../data/config';
import { getPlayerPhotoUrl, generatePlayerAvatarSvg } from '../data/playerPhotos';
import { PlayerStatsModal } from './PlayerStatsModal';
import { PlayerStatsTerminalCard } from './PlayerStatsTerminalCard';

interface PlayerCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState?: RoomState;
}

type RoleFilter = 'ALL' | PlayerRole;
type TierFilter = 'ALL' | PlayerType;
type NationalityFilter = 'ALL' | 'INDIAN' | 'OVERSEAS';
type StatusFilter = 'ALL' | 'SOLD' | 'UNSOLD' | 'LIVE' | 'UPCOMING';

export const PlayerCatalogModal: React.FC<PlayerCatalogModalProps> = ({
  isOpen,
  onClose,
  roomState
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<NationalityFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [selectedLotNumber, setSelectedLotNumber] = useState<number | undefined>(undefined);

  const handleOpenStats = (player: PlayerData, lotNumber: number) => {
    setSelectedPlayer(player);
    setSelectedLotNumber(lotNumber);
  };

  // Map live auction status for each player (if an auction room is active)
  const playerLiveStatusMap = useMemo(() => {
    const map = new Map<
      string,
      {
        status: 'SOLD' | 'UNSOLD' | 'LIVE' | 'UPCOMING' | 'WAITING';
        teamId?: string;
        soldPrice?: number;
        currentBid?: number;
      }
    >();

    if (!roomState || roomState.status === 'HOME' || roomState.status === 'LOBBY') {
      return map;
    }

    // Check all team squads for sold players
    (Object.values(roomState.teams || {}) as RoomTeam[]).forEach((team) => {
      team.squad.forEach((purchased) => {
        map.set(purchased.playerId, {
          status: 'SOLD',
          teamId: team.teamId,
          soldPrice: purchased.price
        });
      });
    });

    // Check current live player on block
    if (
      roomState.currentPlayer &&
      (roomState.auctionState === 'BIDDING' ||
        roomState.auctionState === 'PLAYER_REVEAL' ||
        roomState.auctionState === 'ACCELERATED_REVEAL')
    ) {
      map.set(roomState.currentPlayer.id, {
        status: 'LIVE',
        currentBid: roomState.currentBid || roomState.currentPlayer.basePrice
      });
    }

    // Check unsold players in the auction pool
    if (roomState.players && roomState.players.length > 0) {
      roomState.players.forEach((ap) => {
        if (!map.has(ap.id)) {
          if (ap.status === 'UNSOLD') {
            map.set(ap.id, { status: 'UNSOLD' });
          } else if (ap.status === 'SOLD') {
            map.set(ap.id, {
              status: 'SOLD',
              teamId: ap.soldToTeamId,
              soldPrice: ap.soldPrice
            });
          } else {
            map.set(ap.id, { status: 'UPCOMING' });
          }
        }
      });
    }

    return map;
  }, [roomState]);

  // Master List: Strictly preserves the SAME CANONICAL ORDER (Index 1 to 60)
  const filteredPlayers = useMemo(() => {
    return PLAYERS_POOL.map((player, canonicalIndex) => ({
      player,
      canonicalLotNumber: canonicalIndex + 1
    })).filter(({ player }) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = player.name.toLowerCase().includes(q);
        const matchesDisplay = player.displayName.toLowerCase().includes(q);
        const matchesCountry = player.nationality.toLowerCase().includes(q);
        const matchesRole = player.role.toLowerCase().replace('_', ' ').includes(q);
        if (!matchesName && !matchesDisplay && !matchesCountry && !matchesRole) {
          return false;
        }
      }

      // 2. Role Filter
      if (roleFilter !== 'ALL' && player.role !== roleFilter) {
        return false;
      }

      // 3. Tier Filter
      if (tierFilter !== 'ALL') {
        if (tierFilter === 'LEGEND' && player.playerType !== 'LEGEND') return false;
        if (tierFilter === 'STAR' && player.playerType !== 'CURRENT' && (player.playerType as string) !== 'STAR') return false;
        if (tierFilter === 'YOUNGSTER' && player.playerType !== 'YOUNGSTER') return false;
      }

      // 4. Nationality Filter
      if (nationalityFilter === 'INDIAN' && !player.isIndian) return false;
      if (nationalityFilter === 'OVERSEAS' && !player.isOverseas) return false;

      // 5. Live Status Filter
      if (statusFilter !== 'ALL') {
        const liveInfo = playerLiveStatusMap.get(player.id);
        const currentStatus = liveInfo?.status || 'UPCOMING';
        if (statusFilter === 'SOLD' && currentStatus !== 'SOLD') return false;
        if (statusFilter === 'UNSOLD' && currentStatus !== 'UNSOLD') return false;
        if (statusFilter === 'LIVE' && currentStatus !== 'LIVE') return false;
        if (statusFilter === 'UPCOMING' && currentStatus !== 'UPCOMING' && currentStatus !== 'WAITING') {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, roleFilter, tierFilter, nationalityFilter, statusFilter, playerLiveStatusMap]);

  // Summary Pool Statistics
  const poolStats = useMemo(() => {
    const total = PLAYERS_POOL.length;
    const indian = PLAYERS_POOL.filter((p) => p.isIndian).length;
    const overseas = PLAYERS_POOL.filter((p) => p.isOverseas).length;
    const legends = PLAYERS_POOL.filter((p) => p.playerType === 'LEGEND').length;
    const stars = PLAYERS_POOL.filter((p) => p.playerType === 'CURRENT').length;
    const youngsters = PLAYERS_POOL.filter((p) => p.playerType === 'YOUNGSTER').length;

    let soldCount = 0;
    let unsoldCount = 0;
    playerLiveStatusMap.forEach((info) => {
      if (info.status === 'SOLD') soldCount++;
      if (info.status === 'UNSOLD') unsoldCount++;
    });

    return { total, indian, overseas, legends, stars, youngsters, soldCount, unsoldCount };
  }, [playerLiveStatusMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-[#0b0d14] border-2 border-white/20 rounded-3xl w-full max-w-6xl h-[92vh] max-h-[900px] overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col relative">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-600/10 blur-[100px] pointer-events-none" />

        {/* 1. Modal Header Bar */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 flex items-center justify-between gap-3 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black shadow-lg border border-amber-300 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-white font-display tracking-tight">
                  Official Auction Player Register
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  60 Players
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/15 active:scale-95 rounded-xl text-white/60 hover:text-white transition-all cursor-pointer border border-white/10"
            title="Close Register"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Pool Statistics Quick Bar */}
        <div className="px-3.5 sm:px-5 py-2.5 bg-black/50 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs font-condensed">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-white/80">
              <span className="text-white/40 uppercase font-bold text-[10px]">TOTAL POOL:</span>
              <strong className="text-yellow-400 font-mono font-black">{poolStats.total}</strong>
            </div>
            <div className="w-px h-3.5 bg-white/15" />
            <div className="flex items-center gap-1.5 text-white/80">
              <span className="text-white/40 uppercase font-bold text-[10px]">INDIAN:</span>
              <strong className="text-emerald-400 font-mono font-black">{poolStats.indian} 🇮🇳</strong>
            </div>
            <div className="w-px h-3.5 bg-white/15" />
            <div className="flex items-center gap-1.5 text-white/80">
              <span className="text-white/40 uppercase font-bold text-[10px]">OVERSEAS:</span>
              <strong className="text-cyan-400 font-mono font-black">{poolStats.overseas} ✈️</strong>
            </div>
          </div>

          {roomState && (roomState.status === 'AUCTION' || roomState.status === 'ACTIVE') && (
            <div className="flex items-center gap-2 shrink-0 bg-blue-950/60 border border-blue-500/30 px-3 py-0.5 rounded-lg">
              <span className="text-emerald-400 font-bold font-mono">
                {poolStats.soldCount} Sold
              </span>
              <span className="text-white/40">•</span>
              <span className="text-rose-400 font-bold font-mono">
                {poolStats.unsoldCount} Unsold
              </span>
              <span className="text-white/40">•</span>
              <span className="text-amber-300 font-bold font-mono">
                {poolStats.total - poolStats.soldCount - poolStats.unsoldCount} Remaining
              </span>
            </div>
          )}
        </div>

        {/* 3. Search & Interactive Filter Controls */}
        <div className="p-3.5 sm:p-5 bg-[#0e111a] border-b border-white/10 space-y-2.5 shrink-0 z-10">
          {/* Search & View Mode Switcher Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search player by name (e.g. Kohli, Bumrah, Head, Russell)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle (Grid vs List) */}
            <div className="flex items-center bg-black/60 border border-white/15 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-condensed ${
                  viewMode === 'grid'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-condensed ${
                  viewMode === 'list'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Compact Table List View"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>

            {/* Quick Reset Filter */}
            {(roleFilter !== 'ALL' ||
              tierFilter !== 'ALL' ||
              nationalityFilter !== 'ALL' ||
              statusFilter !== 'ALL' ||
              searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setTierFilter('ALL');
                  setNationalityFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0 font-condensed"
              >
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Filter Pills Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs font-condensed">
            <span className="text-[10px] uppercase font-black text-white/40 tracking-widest flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-amber-400" /> ROLE:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {(
                [
                  { id: 'ALL', label: 'All Roles (60)' },
                  { id: 'BATSMAN', label: 'Batsmen' },
                  { id: 'WICKETKEEPER', label: 'Wicketkeepers' },
                  { id: 'ALL_ROUNDER', label: 'All-Rounders' },
                  { id: 'FAST_BOWLER', label: 'Fast Bowlers' },
                  { id: 'SPIN_BOWLER', label: 'Spin Bowlers' }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setRoleFilter(opt.id as RoleFilter)}
                  className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider transition-all cursor-pointer ${
                    roleFilter === opt.id
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'bg-black/50 border border-white/10 text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-white/15 shrink-0 mx-1" />

            <span className="text-[10px] uppercase font-black text-white/40 tracking-widest shrink-0">
              ORIGIN:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'INDIAN', label: '🇮🇳 Indian' },
                { id: 'OVERSEAS', label: '✈️ Overseas' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setNationalityFilter(opt.id as NationalityFilter)}
                  className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider transition-all cursor-pointer ${
                    nationalityFilter === opt.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-black/50 border border-white/10 text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-white/15 shrink-0 mx-1" />

            <span className="text-[10px] uppercase font-black text-white/40 tracking-widest shrink-0">
              TIER:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'LEGEND', label: '👑 Legends' },
                { id: 'STAR', label: '⭐ Stars' },
                { id: 'YOUNGSTER', label: '🚀 Emerging' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTierFilter(opt.id as TierFilter)}
                  className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider transition-all cursor-pointer ${
                    tierFilter === opt.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-black/50 border border-white/10 text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Player Content Area: Cards Grid or List Table (Blurs out when player card is spotlighted) */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-5 transition-all duration-300 ${selectedPlayer ? 'filter blur-md opacity-25 pointer-events-none select-none' : ''}`}>
          {filteredPlayers.length > 0 ? (
            viewMode === 'list' ? (
              /* COMPACT TABLE LIST VIEW */
              <div className="bg-[#10131d] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/70 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50 font-mono">
                      <th className="py-3 px-3 sm:px-4 font-black">LOT #</th>
                      <th className="py-3 px-3 sm:px-4 font-black">PLAYER NAME</th>
                      <th className="py-3 px-3 sm:px-4 font-black hidden md:table-cell">ROLE</th>
                      <th className="py-3 px-3 sm:px-4 font-black hidden sm:table-cell">BASE PRICE</th>
                      <th className="py-3 px-3 sm:px-4 font-black text-center">RATING</th>
                      <th className="py-3 px-3 sm:px-4 font-black hidden lg:table-cell">AUCTION STATUS</th>
                      <th className="py-3 px-3 sm:px-4 font-black text-right">STATS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredPlayers.map(({ player, canonicalLotNumber }) => {
                      const liveStatus = playerLiveStatusMap.get(player.id);
                      const soldTeam = liveStatus?.teamId ? TEAMS[liveStatus.teamId as keyof typeof TEAMS] : null;

                      return (
                        <tr
                          key={player.id}
                          onClick={() => handleOpenStats(player, canonicalLotNumber)}
                          className="hover:bg-amber-400/[0.06] transition-colors cursor-pointer group"
                        >
                          {/* Lot # */}
                          <td className="py-2.5 px-3 sm:px-4 font-mono font-black text-amber-400 whitespace-nowrap">
                            #{canonicalLotNumber}
                          </td>

                          {/* Player Photo & Name */}
                          <td className="py-2.5 px-3 sm:px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getPlayerPhotoUrl(player)}
                                alt={player.name}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(player);
                                }}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-white/20 shrink-0"
                              />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenStats(player, canonicalLotNumber);
                                  }}
                                  className="text-left font-bold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors font-display tracking-tight block truncate cursor-pointer hover:underline underline-offset-2"
                                >
                                  {player.name}
                                </button>
                                <span className="text-[10px] text-white/50 uppercase font-condensed flex items-center gap-1 mt-0.5">
                                  <span>{player.isIndian ? '🇮🇳' : '✈️'}</span>
                                  <span>{player.nationality}</span>
                                  <span className="md:hidden">• {player.role.replace('_', ' ')}</span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-2.5 px-3 sm:px-4 hidden md:table-cell font-condensed uppercase text-cyan-300 font-bold">
                            {player.role.replace('_', ' ')}
                          </td>

                          {/* Base Price */}
                          <td className="py-2.5 px-3 sm:px-4 hidden sm:table-cell font-mono font-black text-yellow-400 whitespace-nowrap">
                            {formatCurrencyCr(player.basePrice)}
                          </td>

                          {/* Rating OVR */}
                          <td className="py-2.5 px-3 sm:px-4 text-center whitespace-nowrap">
                            <span className="inline-block bg-black/80 border border-amber-400/40 text-amber-300 font-mono font-black text-xs px-2 py-0.5 rounded shadow-sm">
                              {player.overallRating} OVR
                            </span>
                          </td>

                          {/* Auction Status */}
                          <td className="py-2.5 px-3 sm:px-4 hidden lg:table-cell">
                            {liveStatus ? (
                              liveStatus.status === 'SOLD' && soldTeam ? (
                                <span
                                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white inline-flex items-center gap-1 font-mono"
                                  style={{ backgroundColor: soldTeam.primaryColor }}
                                >
                                  <CheckCircle2 className="w-3 h-3" /> SOLD ({soldTeam.abbr})
                                </span>
                              ) : liveStatus.status === 'LIVE' ? (
                                <span className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1 font-mono animate-pulse">
                                  <Flame className="w-3 h-3" /> ON PODIUM
                                </span>
                              ) : liveStatus.status === 'UNSOLD' ? (
                                <span className="bg-rose-950 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1 font-mono">
                                  UNSOLD
                                </span>
                              ) : (
                                <span className="text-white/40 text-[10px] font-mono">UPCOMING</span>
                              )
                            ) : (
                              <span className="text-emerald-400 text-[10px] font-mono font-bold">AVAILABLE</span>
                            )}
                          </td>

                          {/* Action Button: Open Stats Pop-up */}
                          <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStats(player, canonicalLotNumber);
                              }}
                              className="px-2.5 py-1 bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-black border border-amber-400/40 hover:border-amber-400 rounded-lg text-[11px] font-black uppercase tracking-wider font-condensed transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <BarChart2 className="w-3 h-3" />
                              <span>View Stats</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* CARDS GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                {filteredPlayers.map(({ player, canonicalLotNumber }) => {
                  const liveStatus = playerLiveStatusMap.get(player.id);
                  const soldTeam = liveStatus?.teamId ? TEAMS[liveStatus.teamId as keyof typeof TEAMS] : null;

                  return (
                    <div
                      key={player.id}
                      onClick={() => handleOpenStats(player, canonicalLotNumber)}
                      className="bg-[#10131d] hover:bg-[#141824] border-2 border-white/10 hover:border-cyan-400/80 hover:shadow-[0_10px_35px_rgba(0,245,212,0.2)] rounded-2xl p-3 sm:p-3.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-lg cursor-pointer active:scale-[0.98]"
                    >
                      {/* 1. ON TOP: Prominent Player Name Header (Clickable to reveal stats pop-up) */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStats(player, canonicalLotNumber);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenStats(player, canonicalLotNumber);
                          }
                        }}
                        title="Click player name to view detailed stats in a popup"
                        className="w-full flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-amber-400/10 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer group/name mb-2.5 select-none"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-mono font-black px-1.5 py-0.2 rounded">
                              LOT #{canonicalLotNumber}
                            </span>
                            <span
                              className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded font-condensed ${
                                player.playerType === 'LEGEND'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : player.playerType === 'STAR' || player.playerType === 'CURRENT'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {player.playerType === 'CURRENT' ? 'STAR' : player.playerType}
                            </span>
                          </div>

                          {/* Prominently Displayed Player Name */}
                          <h4 className="text-base sm:text-lg font-bold text-white leading-tight font-display tracking-tight truncate group-hover/name:text-amber-300 transition-colors flex items-center gap-1.5">
                            <span>{player.name}</span>
                            <span className="text-xs shrink-0">{player.isIndian ? '🇮🇳' : '✈️'}</span>
                          </h4>

                          <p className="text-[11px] text-white/60 font-condensed uppercase tracking-wider truncate mt-0.5">
                            <span className="text-cyan-300 font-bold">{player.role.replace('_', ' ')}</span>
                            <span className="mx-1">•</span>
                            <span>{player.nationality}</span>
                          </p>
                        </div>

                        {/* Interactive Stats Pop-up Trigger Button */}
                        <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider font-condensed transition-all shadow-sm bg-white/10 text-white/80 group-hover/name:bg-amber-400 group-hover/name:text-black border border-white/10">
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>View Stats</span>
                        </div>
                      </div>

                      {/* 2. Middle Row: Player Portrait & Core Auction Details */}
                      <div className="flex items-center gap-3 py-1">
                        <img
                          src={getPlayerPhotoUrl(player)}
                          alt={player.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(player);
                          }}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-white/20 shadow-md shrink-0 group-hover:scale-105 transition-transform"
                        />

                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Base Price & Star Rating */}
                          <div className="flex items-center justify-between gap-1 text-xs font-condensed">
                            <span className="text-[10px] uppercase font-bold text-white/50">
                              BASE: <strong className="text-yellow-400 font-mono font-black">{formatCurrencyCr(player.basePrice)}</strong>
                            </span>

                            <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                              {Array.from({ length: player.starRating || 3 }).map((_, i) => (
                                <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          </div>

                          {/* Ratings Pill */}
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <span className="bg-black/80 border border-yellow-500/40 px-1.5 py-0.5 rounded text-yellow-300 font-black">
                              {player.overallRating} OVR
                            </span>
                            <span className="text-white/60">
                              BAT <strong className="text-white font-bold">{player.battingRating}</strong>
                            </span>
                            <span className="text-white/60">
                              BOWL <strong className="text-white font-bold">{player.bowlingRating}</strong>
                            </span>
                          </div>

                          {/* Live Auction Status Badge */}
                          <div>
                            {liveStatus ? (
                              liveStatus.status === 'SOLD' && soldTeam ? (
                                <span
                                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-white flex items-center gap-1 shadow font-mono inline-flex"
                                  style={{ backgroundColor: soldTeam.primaryColor }}
                                >
                                  <CheckCircle2 className="w-3 h-3" /> SOLD ({soldTeam.abbr} ₹
                                  {((liveStatus.soldPrice || 0) / 100).toFixed(2)} Cr)
                                </span>
                              ) : liveStatus.status === 'LIVE' ? (
                                <span className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow animate-pulse font-mono">
                                  <Flame className="w-3 h-3" /> ON PODIUM
                                </span>
                              ) : liveStatus.status === 'UNSOLD' ? (
                                <span className="bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-mono">
                                  <AlertCircle className="w-3 h-3 text-rose-400" /> UNSOLD
                                </span>
                              ) : (
                                <span className="bg-black/50 text-white/50 border border-white/10 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono inline-flex">
                                  UPCOMING
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-flex">
                                READY FOR AUCTION
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. Uiverse-Inspired Interactive Telemetry Stats Card */}
                      <div className="mt-2.5 pt-1.5 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                        <PlayerStatsTerminalCard player={player} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="py-16 text-center text-white/40 flex flex-col items-center justify-center">
              <Search className="w-10 h-10 text-white/20 mb-3" />
              <p className="text-base font-black uppercase tracking-wider font-condensed">
                No Players Match Search Query
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setTierFilter('ALL');
                  setNationalityFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="mt-3 px-4 py-1.5 bg-amber-400 text-black font-black uppercase text-xs rounded-xl shadow-lg hover:bg-amber-300 transition-all cursor-pointer font-condensed"
              >
                Reset to Full Pool (60 Players)
              </button>
            </div>
          )}
        </div>

        {/* 5. Modal Footer Note */}
        <div className="p-3 sm:p-4 bg-[#080a0f] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-white/50 shrink-0">
          <div className="flex items-center gap-1.5 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
            <span>
              Click on any player name or card to open their complete tactical stats pop-up report.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black uppercase text-xs rounded-xl shadow-lg hover:from-amber-300 hover:to-yellow-400 transition-all cursor-pointer active:scale-95 font-condensed"
          >
            Close Register
          </button>
        </div>

        {/* 6. High-Impact Player Stats Popup Modal */}
        <PlayerStatsModal
          isOpen={!!selectedPlayer}
          player={selectedPlayer}
          canonicalLotNumber={selectedLotNumber}
          liveStatus={selectedPlayer ? playerLiveStatusMap.get(selectedPlayer.id) : null}
          onClose={() => setSelectedPlayer(null)}
        />
      </div>
    </div>
  );
};
