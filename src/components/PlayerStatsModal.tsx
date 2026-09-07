import React, { useEffect } from 'react';
import { PlayerData, AuctionPlayer } from '../types/auction';
import { formatCurrencyCr } from '../data/config';
import { TEAMS } from '../data/teams';
import { getPlayerPhotoUrl, generatePlayerAvatarSvg } from '../data/playerPhotos';
import { getPlayerStats } from '../data/playerStats';
import { PlayerStatsTerminalCard } from './PlayerStatsTerminalCard';
import {
  X,
  Star,
  Flame,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Shield,
  Activity,
  Zap,
  Award,
  Crown,
  Sparkles
} from 'lucide-react';

interface PlayerStatsModalProps {
  player: PlayerData | AuctionPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  canonicalLotNumber?: number;
  liveStatus?: {
    status: 'PENDING' | 'LIVE' | 'SOLD' | 'UNSOLD' | 'UPCOMING' | 'WAITING' | string;
    teamId?: string;
    soldPrice?: number;
  } | null;
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({
  player,
  isOpen,
  onClose,
  canonicalLotNumber,
  liveStatus
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  const soldTeam = liveStatus?.teamId ? TEAMS[liveStatus.teamId as keyof typeof TEAMS] : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Centered Spotlight Player Card */}
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#131724] via-[#0d101a] to-[#07090f] border-2 border-cyan-400/50 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(0,245,212,0.25)] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Glass Header Ribbon */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-black/80 backdrop-blur-md border-b border-white/10 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-black text-xs font-mono font-black px-2.5 py-0.5 rounded-md shadow-sm">
              {canonicalLotNumber ? `LOT #${canonicalLotNumber}` : 'AUCTION POOL'}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-condensed flex items-center gap-1 ${
                player.playerType === 'LEGEND'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : player.playerType === 'CURRENT' || (player.playerType as string) === 'STAR'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {player.playerType === 'LEGEND' && <Crown className="w-3 h-3 text-amber-400" />}
              {(player.playerType === 'CURRENT' || (player.playerType as string) === 'STAR') && (
                <Award className="w-3 h-3 text-blue-400" />
              )}
              {player.playerType === 'YOUNGSTER' && <Sparkles className="w-3 h-3 text-emerald-400" />}
              {player.playerType === 'CURRENT' ? 'STAR' : player.playerType} EDITION
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-rose-600/90 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="Close card (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Card Body */}
        <div className="overflow-y-auto p-3.5 sm:p-4 space-y-3 no-scrollbar">
          {/* Collectible Trading Card Hero Poster */}
          <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-t from-[#090b10] via-[#090b10]/40 to-transparent border border-white/10 shadow-inner flex items-end justify-center">
            {/* Background Stadium Grid & Spotlight */}
            <div className="absolute inset-0 bg-stadium-mesh opacity-30" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-400/20 blur-xl rounded-full pointer-events-none" />

            {/* High-definition Player Photo */}
            <img
              src={getPlayerPhotoUrl(player)}
              alt={player.name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(player);
              }}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-top opacity-95 scale-105"
            />

            {/* Gradient Overlay for bottom text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-[#0b0e17]/50 to-transparent" />

            {/* OVR Crest Shield at Top-Left */}
            <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-center bg-black/90 border-2 border-white/20 rounded-xl px-2 py-0.5 shadow-2xl backdrop-blur-md">
              <span className="text-[7px] uppercase font-bold tracking-widest text-white/60">OVR</span>
              <span className="text-xl sm:text-2xl font-black font-display leading-none text-amber-300 drop-shadow">
                {player.overallRating}
              </span>
            </div>

            {/* Nationality Flag Badge at Top-Right */}
            <div className="absolute top-2.5 right-2.5 z-10 bg-black/85 border border-white/20 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white shadow-md flex items-center gap-1">
              <span>{player.isIndian ? '🇮🇳 INDIA' : '✈️ OVERSEAS'}</span>
            </div>

            {/* Player Name and Role in Bottom Banner */}
            <div className="absolute bottom-2.5 left-3 right-3 z-10">
              <div className="flex items-center gap-1 text-amber-400 mb-0.5">
                {Array.from({ length: player.starRating || 3 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-ai-title font-display uppercase tracking-tight leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,1)] truncate">
                {player.name}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold px-2 py-0.5 rounded-md uppercase font-mono text-[10px]">
                  {player.role.replace('_', ' ')}
                </span>
                <span className="text-ai-slate text-[11px] font-mono">
                  {player.nationality}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing & Auction Status Row */}
          <div className="bg-black/60 border border-white/10 rounded-xl p-2.5 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[9px] uppercase font-mono font-bold text-ai-slate block">BASE RESERVE</span>
              <span className="text-base font-black text-ai-currency font-mono block">
                {formatCurrencyCr(player.basePrice)}
              </span>
            </div>

            <div>
              {liveStatus ? (
                liveStatus.status === 'SOLD' && soldTeam ? (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md text-white inline-flex items-center gap-1 shadow font-mono"
                    style={{ backgroundColor: soldTeam.primaryColor }}
                  >
                    <CheckCircle2 className="w-3 h-3" /> SOLD ({soldTeam.shortName}) ₹{((liveStatus.soldPrice || 0) / 100).toFixed(2)} Cr
                  </span>
                ) : liveStatus.status === 'LIVE' ? (
                  <span className="bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md inline-flex items-center gap-1 shadow animate-pulse font-mono">
                    <Flame className="w-3 h-3" /> ON PODIUM
                  </span>
                ) : liveStatus.status === 'UNSOLD' ? (
                  <span className="bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md inline-flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3 h-3 text-rose-400" /> UNSOLD
                  </span>
                ) : (
                  <span className="bg-white/10 text-white/70 border border-white/10 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md font-mono inline-flex">
                    UPCOMING LOT
                  </span>
                )
              ) : (
                <span className="text-[9px] text-emerald-300 font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md inline-flex">
                  REGISTERED LOT
                </span>
              )}
            </div>
          </div>

          {/* 3. UIVERSE STATS TERMINAL CARD WITH EXACT SAME ANIMATION */}
          <PlayerStatsTerminalCard player={player} />

          {/* Tactical Scout Rating Progress Bars */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 space-y-2">
            <span className="text-[9px] uppercase font-mono font-bold text-ai-cyan flex items-center gap-1 border-b border-white/10 pb-1">
              <Zap className="w-3 h-3 text-cyan-400" /> SCOUT ATTRIBUTE RATINGS
            </span>
            <div className="space-y-1.5 font-mono text-[10px]">
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-white/70">Batting Skill</span>
                  <span className="font-bold text-blue-300">{player.battingRating}/100</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full" style={{ width: `${player.battingRating}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-white/70">Bowling Variation</span>
                  <span className="font-bold text-emerald-300">{player.bowlingRating}/100</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style={{ width: `${player.bowlingRating}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-white/70">Fielding & Reflexes</span>
                  <span className="font-bold text-amber-300">{player.fieldingRating}/100</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full" style={{ width: `${player.fieldingRating}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer Quick Dismiss */}
        <div className="px-4 py-2.5 bg-[#0a0c12] border-t border-white/10 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-mono text-white/40">
            [CLICK OUTSIDE OR ESC TO CLOSE]
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black uppercase text-[10px] rounded-lg shadow-md hover:brightness-110 transition-all cursor-pointer font-mono active:scale-95"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
