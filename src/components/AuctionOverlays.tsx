import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AuctionPlayer, RoomTeam } from '../types/auction';
import { TEAMS } from '../data/teams';
import { formatCurrencyCr } from '../data/config';
import { Trophy, AlertCircle, Gavel, CheckCircle2, Shield, X } from 'lucide-react';
import { getPlayerPhotoUrl, generatePlayerAvatarSvg } from '../data/playerPhotos';

interface SoldOverlayProps {
  player: AuctionPlayer | null;
  winnerTeam: RoomTeam | null;
  soldPrice: number;
  onDismiss?: () => void;
}

export const SoldOverlay: React.FC<SoldOverlayProps> = ({
  player,
  winnerTeam,
  soldPrice,
  onDismiss
}) => {
  useEffect(() => {
    if (winnerTeam) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#eab308', '#3b82f6', '#10b981', '#f59e0b']
      });
    }

    // Auto-dismiss safety timeout after 3.8 seconds so it never traps the screen
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 3800);
    return () => clearTimeout(timer);
  }, [winnerTeam, onDismiss]);

  if (!player || !winnerTeam) return null;

  const teamConfig = TEAMS[winnerTeam.teamId];

  return (
    <div 
      className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300 select-none cursor-pointer"
      onClick={onDismiss}
    >
      <div 
        className="bg-gradient-to-b from-[#121622] via-[#090b10] to-[#040508] border-2 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.95)] relative overflow-hidden cursor-default"
        style={{ borderColor: `${teamConfig.primaryColor}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-white/50 hover:text-white p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer z-20"
            title="Dismiss overlay"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Stadium Spotlight Lens Flare */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-35 pointer-events-none"
          style={{ backgroundColor: teamConfig.primaryColor }}
        />

        {/* Gavel Struck Badge */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-3 shadow-lg font-condensed">
          <Gavel className="w-4 h-4" />
          <span>GAVEL STRUCK • OFFICIAL HAMMER PRICE</span>
        </div>

        {/* Player Spotlight */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src={getPlayerPhotoUrl(player)}
            alt={player.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(player);
            }}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-cover border-2 border-white/30 shadow-md shrink-0"
          />
          <div className="text-left">
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white leading-none font-teko">
              {player.name}
            </h2>
            <p className="text-[10px] uppercase text-white/60 tracking-wider font-mono">
              {player.role} • <span className="text-yellow-400 font-bold">{player.overallRating} OVR</span> • {player.isIndian ? '🇮🇳 Indian' : '✈️ Overseas'}
            </p>
          </div>
        </div>

        {/* Franchise Plaque */}
        <div className="bg-black/75 border border-white/15 rounded-2xl p-4 mb-4 flex items-center justify-center gap-4 shadow-inner">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-xl border-2 border-white/25 shrink-0 font-teko"
            style={{ backgroundColor: teamConfig.primaryColor }}
          >
            {teamConfig.abbr}
          </div>
          <div className="text-left">
            <p className="text-[9px] uppercase text-white/50 font-black tracking-widest font-mono">
              ACQUIRED BY FRANCHISE
            </p>
            <h4 className="text-xl font-black uppercase italic text-white font-condensed tracking-tight">
              {teamConfig.name}
            </h4>
            <p className="text-xs text-blue-300 font-bold font-mono">
              Manager: {winnerTeam.participantName}
            </p>
          </div>
        </div>

        {/* Winning Bid Grand Price */}
        <div>
          <span className="text-[10px] uppercase font-black text-amber-400 tracking-[0.25em] font-mono block mb-0.5">
            FINAL HAMMER PRICE
          </span>
          <p className="text-5xl sm:text-6xl font-black italic text-yellow-300 font-teko leading-none drop-shadow-[0_4px_25px_rgba(234,179,8,0.5)]">
            ₹{(soldPrice / 100).toFixed(2)}{' '}
            <span className="text-2xl text-yellow-400/70 not-italic">Crores</span>
          </p>
        </div>
      </div>
    </div>
  );
};

interface UnsoldOverlayProps {
  player: AuctionPlayer | null;
  onDismiss?: () => void;
}

export const UnsoldOverlay: React.FC<UnsoldOverlayProps> = ({ player, onDismiss }) => {
  useEffect(() => {
    // Safety auto-dismiss after 3.2 seconds
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!player) return null;

  return (
    <div 
      className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300 select-none cursor-pointer"
      onClick={onDismiss}
    >
      <div 
        className="bg-gradient-to-b from-rose-950/60 via-[#0a0c12] to-[#040508] border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-white/50 hover:text-white p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer z-20"
            title="Dismiss overlay"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="inline-flex items-center gap-2 bg-rose-600/30 border border-rose-500/50 px-4 py-1.5 rounded-full text-rose-300 text-xs font-black uppercase tracking-widest mb-4 font-condensed">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>AUCTIONEER GAVEL • NO BIDS</span>
        </div>

        <div className="flex items-center justify-center gap-3 mb-3">
          <img
            src={getPlayerPhotoUrl(player)}
            alt={player.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = generatePlayerAvatarSvg(player);
            }}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0"
          />
          <div className="text-left">
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white leading-none font-teko">
              {player.name}
            </h2>
            <p className="text-[10px] uppercase text-white/50 tracking-widest font-mono">
              {player.role} • Base: ₹{(player.basePrice / 100).toFixed(2)} Cr
            </p>
          </div>
        </div>

        <div className="bg-black/70 border border-rose-500/30 rounded-2xl p-5 shadow-inner">
          <p className="text-4xl sm:text-5xl font-black uppercase italic text-rose-500 tracking-wider font-teko leading-none">
            UNSOLD
          </p>
          <p className="text-xs text-white/50 mt-1 font-mono">
            Player moves to auction reserve pool
          </p>
        </div>
      </div>
    </div>
  );
};

