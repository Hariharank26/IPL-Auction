import React, { useState, useEffect } from 'react';
import { AuctionPlayer } from '../types/auction';
import { formatCurrencyCr } from '../data/config';
import { TrendingUp, Zap, Target, Activity, ChevronRight, BarChart2, Shield, Crown, Sparkles, Award } from 'lucide-react';
import { getPlayerPhotoUrl, generatePlayerAvatarSvg } from '../data/playerPhotos';
import { getPlayerStats } from '../data/playerStats';
import { PlayerStatsTerminalCard } from './PlayerStatsTerminalCard';

interface PlayerCardProps {
  player: AuctionPlayer | null;
  totalPoolCount: number;
  currentIndex: number;
  onOpenCatalog?: () => void;
}

export const getBadgeColor = (type: string) => {
  switch (type) {
    case 'LEGEND':
      return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black border-yellow-300 shadow-md shadow-yellow-500/20';
    case 'CURRENT':
      return 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold border-cyan-300 shadow-md shadow-cyan-500/20';
    case 'YOUNGSTER':
      return 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold border-emerald-300 shadow-md shadow-emerald-500/20';
    default:
      return 'bg-white/20 text-white border-white/20';
  }
};

export const getCardTierStyles = (type: string) => {
  switch (type) {
    case 'LEGEND':
      return {
        borderClass: 'gold-card-border',
        glowBg: 'from-amber-600/30 via-yellow-950/20 to-black',
        ratingColor: 'text-yellow-400',
        badgeIcon: Crown
      };
    case 'CURRENT':
      return {
        borderClass: 'platinum-card-border',
        glowBg: 'from-blue-600/30 via-cyan-950/20 to-black',
        ratingColor: 'text-cyan-300',
        badgeIcon: Award
      };
    case 'YOUNGSTER':
      return {
        borderClass: 'emerald-card-border',
        glowBg: 'from-emerald-600/30 via-teal-950/20 to-black',
        ratingColor: 'text-emerald-400',
        badgeIcon: Sparkles
      };
    default:
      return {
        borderClass: 'border border-white/20',
        glowBg: 'from-slate-800/40 to-black',
        ratingColor: 'text-white',
        badgeIcon: Shield
      };
  }
};

export const getRoleLabel = (role: string) => {
  switch (role) {
    case 'BATSMAN':
      return 'Pure Batsman';
    case 'WICKETKEEPER':
      return 'Wicketkeeper-Bat';
    case 'ALL_ROUNDER':
      return 'Pinnacle All-Rounder';
    case 'FAST_BOWLER':
      return 'Strike Fast Bowler';
    case 'SPIN_BOWLER':
      return 'Mystery Spin Bowler';
    default:
      return role;
  }
};

/** Compact Mobile Header Bar for fast-paced live bidding */
export const MobilePlayerBar: React.FC<{
  player: AuctionPlayer | null;
  totalPoolCount: number;
  onOpenStats?: () => void;
  onOpenCatalog?: () => void;
}> = ({ player, totalPoolCount, onOpenStats, onOpenCatalog }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [player?.id]);

  if (!player) {
    return (
      <div className="w-full bg-[#0d0f14] border border-white/10 rounded-xl p-2.5 flex items-center justify-between shadow-md">
        <span className="text-xs text-white/50 italic font-mono">Waiting for next player on podium...</span>
      </div>
    );
  }

  const tier = getCardTierStyles(player.playerType);

  return (
    <div
      onClick={onOpenStats}
      className="w-full bg-gradient-to-r from-[#171b26] via-[#10131d] to-[#0a0c12] border-2 border-blue-500/40 rounded-2xl p-2 flex items-center justify-between gap-2 shadow-xl active:scale-[0.99] transition-transform cursor-pointer shrink-0"
    >
      {/* Player Thumbnail & Name */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-13 h-13 rounded-xl bg-black/80 border border-white/20 overflow-hidden flex-shrink-0 relative shadow-md">
          <img
            src={imageError ? generatePlayerAvatarSvg(player) : getPlayerPhotoUrl(player)}
            alt={player.name}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top"
          />
          <span className="absolute bottom-0 right-0 bg-blue-600 text-[9px] font-black px-1.5 text-white leading-tight rounded-tl font-teko">
            {player.overallRating}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/80 border border-white/20 text-white/80">
              #{player.sequence}/{totalPoolCount}
            </span>
            <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border ${getBadgeColor(player.playerType)}`}>
              {player.playerType}
            </span>
            <span className="text-[10px] text-white/80">
              {player.isIndian ? '🇮🇳' : '✈️'}
            </span>
          </div>

          <h4 className="text-sm font-bold text-white truncate leading-tight font-display tracking-tight">
            {player.name}
          </h4>

          <p className="text-[10px] text-white/70 font-medium truncate">
            {getRoleLabel(player.role)} • Base: <strong className="text-amber-300 font-bold font-mono">₹{(player.basePrice / 100).toFixed(2)} Cr</strong>
          </p>
        </div>
      </div>

      {/* Tap for Stats button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenStats?.();
        }}
        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 border border-blue-400/50 text-blue-200 text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer shadow active:scale-95 transition-all"
      >
        <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
        <span>Stats</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  totalPoolCount,
  currentIndex,
  onOpenCatalog
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [player?.id]);

  if (!player) {
    return (
      <section className="w-full bg-[#0f1118] rounded-2xl border-2 border-white/10 overflow-hidden flex flex-col items-center justify-center p-6 text-center h-full min-h-[360px] shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-3 animate-pulse shadow-inner">
          🏏
        </div>
        <p className="text-sm font-black uppercase text-white/60 tracking-widest font-condensed">
          Waiting for next player on auction podium...
        </p>
      </section>
    );
  }

  const stats = getPlayerStats(player);
  const tier = getCardTierStyles(player.playerType);
  const TierIcon = tier.badgeIcon;

  const isBatter = player.role === 'BATSMAN' || player.role === 'WICKETKEEPER';
  const isBowler = player.role === 'FAST_BOWLER' || player.role === 'SPIN_BOWLER';

  return (
    <section className={`w-full bg-gradient-to-b ${tier.glowBg} rounded-2xl ${tier.borderClass} holo-sheen-active overflow-hidden flex flex-col select-none shadow-[0_10px_35px_rgba(0,0,0,0.85)] h-full relative`}>
      {/* Atmospheric Floodlight Cone */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-400/10 blur-2xl rounded-full pointer-events-none" />

      {/* 1. Player Header Image Section (Collectible 3D Trading Card Style) */}
      <div className="relative h-44 sm:h-52 bg-[#090b10] flex items-end justify-center overflow-hidden shrink-0">
        {/* Background Stadium Grid & Spotlight */}
        <div className="absolute inset-0 bg-stadium-mesh opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] via-[#0a0c12]/40 to-transparent z-10" />

        {/* Player Photo */}
        <img
          src={imageError ? generatePlayerAvatarSvg(player) : getPlayerPhotoUrl(player)}
          alt={player.name}
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-top opacity-95 scale-105 transition-transform duration-300 drop-shadow-2xl"
        />

        {/* Top Badges Bar */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between">
          {onOpenCatalog ? (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="bg-black/85 hover:bg-black active:scale-95 backdrop-blur-md border border-white/20 hover:border-amber-400 text-white text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-bold shadow-lg flex items-center gap-1 cursor-pointer transition-all"
              title="Click to view full Master Player Register (60 players)"
            >
              <span className="text-white/50">LOT</span> #{player.sequence}/{totalPoolCount}
              <span className="text-amber-400 text-[9px] font-condensed uppercase font-black ml-0.5">REGISTER</span>
            </button>
          ) : (
            <span className="bg-black/85 backdrop-blur-md border border-white/20 text-white text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-bold shadow-lg flex items-center gap-1">
              <span className="text-white/50">LOT</span> #{player.sequence}/{totalPoolCount}
            </span>
          )}
          <span className="bg-black/85 backdrop-blur-md border border-white/20 text-[10px] px-2.5 py-0.5 rounded-lg font-black uppercase tracking-wider flex items-center gap-1 text-white shadow-lg">
            {player.isIndian ? '🇮🇳 INDIA' : '✈️ OVERSEAS'}
          </span>
        </div>

        {/* Large OVR Rating Crest Shield (EA Sports FIFA / Cricket 24 Style) */}
        <div className="absolute top-10 left-2.5 z-20 flex flex-col items-center bg-black/90 border-2 border-white/20 rounded-xl px-2.5 py-1 shadow-2xl backdrop-blur-md">
          <span className="text-[8px] uppercase font-bold tracking-widest text-white/60">OVR</span>
          <span className={`text-2xl sm:text-3xl font-extrabold font-display leading-none ${tier.ratingColor} drop-shadow`}>
            {player.overallRating}
          </span>
        </div>

        {/* Player Name and Card Tier Ribbon */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20">
          <div className="inline-flex items-center gap-1 mb-1">
            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border shadow ${getBadgeColor(player.playerType)} flex items-center gap-1`}>
              <TierIcon className="w-3 h-3" />
              <span>{player.playerType} EDITION</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase leading-tight text-ai-title drop-shadow-[0_2px_14px_rgba(0,0,0,1)] truncate font-display tracking-tight">
            {player.name}
          </h2>
        </div>
      </div>

      {/* 2. Attributes & Role Radar HUD */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5 overflow-y-auto no-scrollbar bg-[#0b0d14]/90">
        {/* Role & Specialization Banner */}
        <div className="bg-black/70 border border-cyan-500/20 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-inner">
          <span className="text-[10px] uppercase font-black text-ai-slate tracking-widest font-mono">
            // SPECIALIZATION
          </span>
          <span className="text-xs font-black uppercase text-ai-lime font-mono tracking-wider">
            {getRoleLabel(player.role)}
          </span>
        </div>

        {/* Tactical Attribute Bars (Game HUD Style) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Batting Power */}
          <div className="bg-black/70 border border-white/10 rounded-xl p-2 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase text-ai-slate font-mono font-bold">// BAT</span>
              <span className="text-xs font-black text-[#FEF08A] font-mono">{player.battingRating}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                style={{ width: `${player.battingRating}%` }}
              />
            </div>
          </div>

          {/* Bowling Pace/Spin */}
          <div className="bg-black/70 border border-white/10 rounded-xl p-2 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase text-ai-slate font-mono font-bold">// BOWL</span>
              <span className="text-xs font-black text-ai-cyan font-mono">{player.bowlingRating}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full"
                style={{ width: `${player.bowlingRating}%` }}
              />
            </div>
          </div>

          {/* Fielding Agility */}
          <div className="bg-black/70 border border-white/10 rounded-xl p-2 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase text-ai-slate font-mono font-bold">// FIELD</span>
              <span className="text-xs font-black text-emerald-300 font-mono">{player.fieldingRating}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: `${player.fieldingRating}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Uiverse-Inspired Interactive Telemetry Stats Card */}
        <PlayerStatsTerminalCard player={player} />

        {/* 4. Embossed Gold Base Price Plaque */}
        <div className="bg-gradient-to-r from-amber-950/60 via-black/80 to-amber-950/60 border border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between shrink-0 shadow-lg">
          <span className="text-[10px] uppercase font-black text-ai-lime tracking-widest flex items-center gap-1 font-mono">
            <Shield className="w-3.5 h-3.5 text-[#D4F636]" /> [ BASE_RESERVE ]
          </span>
          <span className="text-base sm:text-lg font-black italic text-ai-currency font-mono drop-shadow">
            {formatCurrencyCr(player.basePrice)}
          </span>
        </div>
      </div>
    </section>
  );
};

