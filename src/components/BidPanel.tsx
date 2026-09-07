import React, { useEffect, useState, useRef } from 'react';
import {
  AuctionPlayer,
  AuctionState,
  BidHistoryEntry,
  RoomTeam,
  TeamId
} from '../types/auction';
import {
  formatCurrencyCr,
  getAvailableBidOptions,
  getNextRequiredBidLakhs
} from '../data/config';
import { TEAMS } from '../data/teams';
import { soundManager } from '../utils/audio';
import {
  Clock,
  CornerDownLeft,
  Zap,
  ShieldCheck,
  Gavel,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Flame,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface BidPanelProps {
  auctionState: AuctionState;
  player: AuctionPlayer | null;
  currentBid: number;
  highestBidderTeamId: TeamId | null;
  highestBidderName: string | null;
  myTeam: RoomTeam | null;
  bidHistory: BidHistoryEntry[];
  countdownSeconds: number;
  onPlaceBid: (amount: number) => void;
  lastActionMessage?: string;
  onToggleSound?: () => void;
}

export const BidPanel: React.FC<BidPanelProps> = ({
  auctionState,
  player,
  currentBid,
  highestBidderTeamId,
  highestBidderName,
  myTeam,
  bidHistory,
  countdownSeconds,
  onPlaceBid,
  lastActionMessage
}) => {
  // Smooth Player Transition State Machine (Tailwind Transitions)
  const [displayedPlayer, setDisplayedPlayer] = useState<AuctionPlayer | null>(player);
  const [transitionStage, setTransitionStage] = useState<'visible' | 'exit' | 'enter-start' | 'enter-active'>('visible');
  const prevPlayerIdRef = useRef<string | null>(player?.id ?? null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    const currentId = player?.id ?? null;
    const prevId = prevPlayerIdRef.current;

    // Initial mount transition
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setDisplayedPlayer(player);
      setTransitionStage('enter-start');
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setTransitionStage('enter-active');
          const t = setTimeout(() => {
            setTransitionStage('visible');
          }, 500);
          return () => clearTimeout(t);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    }

    // When revealed player changes to a different player
    if (currentId !== prevId) {
      prevPlayerIdRef.current = currentId;

      // 1. Trigger Exit Animation
      setTransitionStage('exit');

      const exitTimer = setTimeout(() => {
        // 2. Switch displayed player data while faded out
        setDisplayedPlayer(player);
        setTransitionStage('enter-start');

        // 3. Trigger Entry Animation in subsequent frames
        const r1 = requestAnimationFrame(() => {
          const r2 = requestAnimationFrame(() => {
            setTransitionStage('enter-active');

            const activeTimer = setTimeout(() => {
              setTransitionStage('visible');
            }, 500);
            return () => clearTimeout(activeTimer);
          });
          return () => cancelAnimationFrame(r2);
        });
        return () => cancelAnimationFrame(r1);
      }, 220); // 220ms exit duration

      return () => clearTimeout(exitTimer);
    } else {
      // Same player, seamlessly update in-place
      setDisplayedPlayer(player);
    }
  }, [player]);

  const activePlayer = displayedPlayer || player;
  const isMyTeamHighest = Boolean(myTeam && highestBidderTeamId === myTeam.teamId);
  const isBiddingOpen = auctionState === 'BIDDING';
  const isPlayerReveal = auctionState === 'PLAYER_REVEAL';
  const isSquadFull = myTeam ? myTeam.squad.length >= 7 : false;
  const isUrgentTimer = isBiddingOpen && countdownSeconds <= 3;

  // Realistic Gavel Strike Animation State
  const [isGavelStriking, setIsGavelStriking] = useState(false);

  useEffect(() => {
    if (isBiddingOpen && (countdownSeconds === 3 || countdownSeconds === 2 || countdownSeconds === 1)) {
      setIsGavelStriking(true);
      soundManager.playGavelSound();
      const timer = setTimeout(() => setIsGavelStriking(false), 420);
      return () => clearTimeout(timer);
    }
    if (auctionState === 'SOLD') {
      setIsGavelStriking(true);
      const timer = setTimeout(() => setIsGavelStriking(false), 650);
      return () => clearTimeout(timer);
    }
  }, [countdownSeconds, isBiddingOpen, auctionState]);

  // Trigger dramatic heartbeat sound in urgent timer
  useEffect(() => {
    if (isUrgentTimer) {
      soundManager.playHeartbeatSound();
    }
  }, [countdownSeconds, isUrgentTimer]);

  // Calculate available bid options for my team
  const remainingPurse = myTeam?.remainingPurse ?? 5000;
  const basePrice = activePlayer?.basePrice ?? 200;
  
  const bidOptions = activePlayer
    ? getAvailableBidOptions(currentBid, basePrice, remainingPurse)
    : [];

  const minNextBid = activePlayer ? getNextRequiredBidLakhs(currentBid, basePrice) : 0;
  const canAffordMinNext = myTeam ? myTeam.remainingPurse >= minNextBid : true;

  const handleBidClick = (amount: number) => {
    if (!isBiddingOpen || !myTeam || isSquadFull || !canAffordMinNext) return;
    soundManager.playBidSound();
    onPlaceBid(amount);
  };

  // Keyboard shortcut listener for Enter and 1/2/3 keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!isBiddingOpen || !myTeam || isMyTeamHighest || isSquadFull || !canAffordMinNext) {
        return;
      }

      if (e.code === 'Enter' || e.key === '1') {
        if (bidOptions.length > 0) {
          e.preventDefault();
          handleBidClick(bidOptions[0]);
        }
      } else if (e.key === '2') {
        if (bidOptions.length > 1) {
          e.preventDefault();
          handleBidClick(bidOptions[1]);
        }
      } else if (e.key === '3') {
        if (bidOptions.length > 2) {
          e.preventDefault();
          handleBidClick(bidOptions[2]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBiddingOpen, myTeam, isMyTeamHighest, isSquadFull, canAffordMinNext, bidOptions]);

  // Leading Team Theme Colors
  const leadingTeam = highestBidderTeamId ? TEAMS[highestBidderTeamId] : null;
  const leaderColor = leadingTeam?.primaryColor || '#2563eb';

  // Determine Gavel Stage
  const getGavelStageText = () => {
    if (!isBiddingOpen) return null;
    if (countdownSeconds === 3) return 'GOING ONCE...';
    if (countdownSeconds === 2) return 'GOING TWICE...';
    if (countdownSeconds === 1) return 'FINAL CALL FOR BIDS!';
    return 'AUCTIONEER RECEIVING BIDS';
  };

  // Tailwind Entry & Exit Transition Classes for Player Reveals
  const getTransitionClasses = () => {
    switch (transitionStage) {
      case 'exit':
        return 'opacity-0 -translate-y-3 scale-[0.98] transition-all duration-200 ease-in pointer-events-none';
      case 'enter-start':
        return 'opacity-0 translate-y-4 scale-[1.02] transition-none pointer-events-none';
      case 'enter-active':
        return 'opacity-100 translate-y-0 scale-100 transition-all duration-500 ease-out';
      case 'visible':
      default:
        return 'opacity-100 translate-y-0 scale-100 transition-all duration-300 ease-out';
    }
  };

  return (
    <section className="w-full flex-1 flex flex-col gap-2.5 min-h-0 select-none">
      {/* Primary Bidding Arena (Auctioneer Podium & Stadium LED Board) */}
      <div 
        className={`flex-1 rounded-2xl border-2 relative flex flex-col justify-between p-2.5 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.9)] overflow-y-auto sm:overflow-hidden transition-all duration-500 ${
          isPlayerReveal ? 'border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.25)]' : ''
        }`}
        style={{
          backgroundColor: '#0c0e15',
          borderColor: isPlayerReveal
            ? 'rgba(245, 158, 11, 0.8)'
            : highestBidderTeamId
            ? `${leaderColor}60`
            : 'rgba(255,255,255,0.15)',
          boxShadow: isPlayerReveal
            ? '0 0 35px rgba(245,158,11,0.25), inset 0 0 20px rgba(245,158,11,0.1)'
            : highestBidderTeamId
            ? `0 0 35px ${leaderColor}25, inset 0 0 20px ${leaderColor}10`
            : 'none'
        }}
      >
        {/* Stadium Floodlight & Player Reveal Lens Flare Glow */}
        <div 
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-44 blur-3xl pointer-events-none transition-all duration-700 ease-out ${
            isPlayerReveal
              ? 'opacity-45 scale-110 bg-amber-500'
              : highestBidderTeamId
              ? 'opacity-25 scale-100'
              : 'opacity-15 scale-100 bg-blue-600'
          }`}
          style={{ backgroundColor: !isPlayerReveal && highestBidderTeamId ? leaderColor : undefined }}
        />

        {/* Golden Sweep Shimmer Bar during Player Reveal */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 transition-opacity duration-500 pointer-events-none ${
            isPlayerReveal ? 'opacity-100' : 'opacity-0'
          } bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_16px_rgba(251,191,36,0.9)]`}
        />

        {/* Inner Animated Player Transition Container */}
        <div className={`flex-1 flex flex-col justify-between w-full h-full ${getTransitionClasses()}`}>
          {/* 1. Header Bar: Stage Status & LED Segmented Countdown Clock */}
          <div className="w-full flex items-center justify-between z-10 gap-2 shrink-0 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              {/* Broadcast Live Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/50 text-[9px] font-black uppercase text-rose-300 font-mono tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-live-pulse inline-block shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
                <span>LIVE 4K</span>
              </div>

              {/* Stage State Badge */}
              {isPlayerReveal ? (
                <span className="bg-gradient-to-r from-amber-600/40 via-yellow-600/30 to-amber-600/40 text-amber-300 border border-amber-400/60 text-[10px] sm:text-xs px-3 py-0.5 rounded-lg font-black uppercase tracking-wider animate-pulse inline-flex items-center gap-1.5 shadow-lg font-condensed">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
                  <span>LOT REVEAL • BIDDING IN {countdownSeconds || 3}S</span>
                </span>
              ) : auctionState === 'SOLD' ? (
                <span className="bg-emerald-600/40 text-emerald-300 border border-emerald-400/70 text-[10px] sm:text-xs px-3 py-0.5 rounded-lg font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md font-condensed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>HAMMER DOWN — SOLD!</span>
                </span>
              ) : auctionState === 'UNSOLD' ? (
                <span className="bg-rose-600/40 text-rose-300 border border-rose-400/70 text-[10px] sm:text-xs px-3 py-0.5 rounded-lg font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md font-condensed">
                  <AlertTriangle className="w-3.5 h-3.5" /> <span>PASSED UNSOLD</span>
                </span>
              ) : (
                <span className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 text-blue-200 border border-blue-400/40 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-lg font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md font-condensed">
                  <span>AUCTION ARENA</span>
                </span>
              )}
            </div>

            {/* Realistic 3D Auctioneer Gavel on Sounding Block */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-xl bg-[#140e0a] border border-[#5c2919] shadow-inner">
              <div className="relative w-8 h-8 flex items-center justify-center">
                {/* Acoustic shockwave ripple when gavel strikes */}
                {isGavelStriking && (
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400 animate-shockwave pointer-events-none" />
                )}
                <svg
                  viewBox="0 0 48 48"
                  className={`w-7 h-7 filter drop-shadow-md transition-transform duration-75 ${
                    isGavelStriking ? 'animate-gavel-strike' : ''
                  }`}
                >
                  {/* Brass Sound Block */}
                  <rect x="4" y="38" width="40" height="7" rx="2" fill="#d4a034" stroke="#9c6c18" strokeWidth="1" />
                  <rect x="8" y="34" width="32" height="4" rx="1" fill="#5c2919" />
                  {/* Wooden Gavel Mallet Handle */}
                  <line x1="28" y1="14" x2="44" y2="4" stroke="#3d1b11" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="28" y1="14" x2="44" y2="4" stroke="#f7d070" strokeWidth="1" strokeDasharray="2,3" />
                  {/* Mahogany Gavel Mallet Head */}
                  <rect x="15" y="8" width="18" height="13" rx="2" transform="rotate(-30 24 14)" fill="#3d1b11" stroke="#5c2919" strokeWidth="1" />
                  {/* Brass Band on Mallet Head */}
                  <rect x="21" y="9" width="6" height="13" rx="1" transform="rotate(-30 24 14)" fill="#f7d070" stroke="#d4a034" strokeWidth="0.5" />
                </svg>
              </div>

              {/* 3 Call Warning Indicators */}
              <div className="flex flex-col items-start leading-none">
                <span className="text-[7px] uppercase font-mono tracking-widest text-amber-400/80 font-bold">
                  HAMMER STATUS
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`flex items-center gap-0.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${countdownSeconds <= 3 && isBiddingOpen ? 'bg-amber-500 text-black shadow' : 'bg-white/10 text-white/40'}`}>
                    1ST
                  </div>
                  <div className={`flex items-center gap-0.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${countdownSeconds <= 2 && isBiddingOpen ? 'bg-orange-500 text-black shadow' : 'bg-white/10 text-white/40'}`}>
                    2ND
                  </div>
                  <div className={`flex items-center gap-0.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${countdownSeconds <= 1 && isBiddingOpen ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50 shadow' : 'bg-white/10 text-white/40'}`}>
                    FINAL
                  </div>
                </div>
              </div>
            </div>

            {/* Realistic High-Visibility LED Stadium Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1 rounded-xl border shadow-xl transition-all ${
                isUrgentTimer
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-bounce shadow-rose-600/50 scale-105'
                  : isBiddingOpen
                  ? 'bg-black/90 border-cyan-500/40 text-cyan-300 shadow-inner'
                  : 'bg-black/70 border-white/20 text-white/70'
              }`}
            >
              <Clock className={`w-4 h-4 ${isUrgentTimer ? 'text-rose-400 animate-spin' : 'text-[#00F5D4]'}`} />
              <div className="flex flex-col items-end leading-none">
                <span className="text-[7px] uppercase font-mono tracking-widest text-cyan-400/70 font-bold">// TIME LEFT</span>
                <span className={`text-sm sm:text-base font-timer font-black tracking-widest ${isUrgentTimer ? 'text-ai-laser' : 'text-ai-cyan'}`}>
                  0:{countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds}
                </span>
              </div>
            </div>
          </div>

        {/* 2. Middle Section: Grand LED Scoreboard & Current Bid */}
        <div className="my-auto py-2 text-center z-10 flex flex-col items-center justify-center">
          {/* Player Lot Indicator Badge */}
          {activePlayer && (
            <div
              className={`inline-flex items-center gap-2 mb-1.5 px-3.5 py-1 rounded-full border transition-all duration-500 ${
                isPlayerReveal
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105'
                  : 'bg-black/80 border-cyan-500/30 text-white/90 shadow-sm'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isPlayerReveal ? 'text-amber-400 animate-spin' : 'text-[#00F5D4]'}`} />
              <span className="text-xs sm:text-sm font-black uppercase font-display tracking-tight text-ai-silver">
                [ LOT #{activePlayer.sequence || 1} ] • {activePlayer.name}
              </span>
              <span className="text-white/30">•</span>
              <span className="text-[10px] sm:text-xs font-bold font-mono text-ai-cyan uppercase">
                {activePlayer.role.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Gavel Stage / Warning Indicator */}
          {isBiddingOpen && (
            <div className="inline-flex items-center gap-1.5 mb-1 px-3 py-0.5 rounded-full bg-black/80 border border-amber-400/40 text-[10px] sm:text-xs font-black uppercase tracking-widest text-ai-lime font-condensed shadow-sm">
              <Gavel className="w-3.5 h-3.5 text-[#D4F636] animate-pulse" />
              <span>{getGavelStageText()}</span>
            </div>
          )}

          <p className="text-[10px] sm:text-xs uppercase font-black text-ai-cyan tracking-widest mb-0.5 font-mono">
            // {currentBid > 0 ? 'CURRENT HIGHEST BID' : 'STARTING BASE PRICE'}
          </p>

          {/* Grand Digit Display */}
          {currentBid > 0 ? (
            <div className="flex items-baseline justify-center">
              <h3 className="text-3xl sm:text-5xl md:text-6xl font-black leading-none tracking-tight text-ai-currency font-display">
                ₹{(currentBid / 100).toFixed(2)}
              </h3>
              <span className="text-base sm:text-2xl text-amber-300 ml-1.5 sm:ml-2 font-black font-display uppercase tracking-wider drop-shadow-[0_0_14px_rgba(245,158,11,0.45)]">
                Crores
              </span>
            </div>
          ) : activePlayer ? (
            <div className="flex items-baseline justify-center">
              <h3 className="text-2xl sm:text-4xl md:text-5xl font-black leading-none tracking-tight text-ai-lime font-display drop-shadow-[0_0_18px_rgba(212,246,54,0.4)]">
                ₹{(activePlayer.basePrice / 100).toFixed(2)}
              </h3>
              <span className="text-sm sm:text-xl text-[#D4F636]/90 ml-1.5 sm:ml-2 font-black font-display uppercase tracking-wider">
                Crores (Base)
              </span>
            </div>
          ) : (
            <h3 className="text-xl sm:text-3xl font-black text-white/30 font-display">₹0.00 Cr</h3>
          )}

          {/* Leading Franchise Broadcast Lower-Third Badge */}
          <div className="mt-2 sm:mt-2.5">
            {highestBidderTeamId ? (
              <div 
                className="inline-flex items-center gap-2 sm:gap-2.5 bg-black/90 border-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl shadow-2xl backdrop-blur-md transition-all"
                style={{ borderColor: leaderColor }}
              >
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-white text-[8px] sm:text-[9px] font-black shadow-md border border-white/20 font-teko"
                  style={{ backgroundColor: leaderColor }}
                >
                  {highestBidderTeamId}
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[7px] sm:text-[8px] uppercase font-mono font-bold text-ai-slate tracking-widest">
                    // LEADING BIDDER
                  </span>
                  <span className="text-[11px] sm:text-sm font-black uppercase text-ai-silver tracking-wider font-condensed">
                    {highestBidderName || leadingTeam?.name}
                  </span>
                </div>
                {isMyTeamHighest && (
                  <span className="text-[8px] sm:text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 sm:px-2 py-0.5 rounded-lg flex items-center gap-0.5 sm:gap-1 shadow-sm font-mono">
                    <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" /> YOU
                  </span>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 sm:px-3 py-1 rounded-full text-ai-slate text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-mono">
                <span>[ :AWAITING OPENING BID PADDLE ]</span>
              </div>
            )}
          </div>

          {/* Live Action Telemetry Broadcast Message */}
          {lastActionMessage && (
            <p className="text-[9px] sm:text-xs font-mono font-bold text-ai-cyan uppercase tracking-wider text-center max-w-lg px-3 py-0.5 bg-black/70 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(0,245,212,0.18)] truncate mt-1.5 sm:mt-2">
              [ :AI_FEED ] {lastActionMessage}
            </p>
          )}
        </div>

        {/* 3. TACTILE 3D BIDDING PADDLES & CONTROLS DECK */}
        <div className="w-full z-10 bg-[#090b10]/95 border-2 border-white/15 rounded-2xl p-2 sm:p-3.5 shadow-2xl backdrop-blur-xl shrink-0">
          {/* Deck Header */}
          <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-1">
            <span className="text-[11px] sm:text-xs font-black uppercase text-ai-lime tracking-wider flex items-center gap-1 sm:gap-1.5 font-mono">
              <Gavel className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4F636]" /> [ :PADDLE_CONTROLS_DECK ]
            </span>
            {myTeam && (
              <span className="text-[10px] sm:text-xs text-ai-slate font-mono">
                // PURSE: <strong className="text-ai-lime font-black">{formatCurrencyCr(myTeam.remainingPurse)}</strong>
              </span>
            )}
          </div>

          {/* Bidding Controls State Machine */}
          {!myTeam ? (
            <div className="py-2.5 sm:py-3 px-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center flex items-center justify-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-300 font-black uppercase tracking-wider font-condensed">
                Spectator Mode — Watching Live Auction Draft
              </span>
            </div>
          ) : isSquadFull ? (
            <div className="py-2.5 sm:py-3 px-3 bg-rose-600/20 border-2 border-rose-500/50 rounded-xl text-center">
              <span className="text-xs text-rose-300 font-black uppercase tracking-wider flex items-center justify-center gap-2 font-condensed">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> SQUAD CAPACITY FULL (7/7 PLAYERS SECURED)
              </span>
            </div>
          ) : isMyTeamHighest ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-2.5 p-2 sm:p-2.5 bg-gradient-to-r from-emerald-950/80 to-[#0a1510] border-2 border-emerald-500/50 rounded-xl shadow-lg">
              <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow shrink-0">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] sm:text-sm font-black uppercase text-emerald-300 leading-tight font-condensed">
                    YOUR FRANCHISE HOLDS LEADING BID!
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-white/60 font-medium">
                    Waiting for opposing franchises to challenge...
                  </p>
                </div>
              </div>

              {/* Option to raise further if desired */}
              {bidOptions.length > 0 && isBiddingOpen && (
                <button
                  onClick={() => handleBidClick(bidOptions[0])}
                  className="w-full sm:w-auto px-4 py-2 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 border border-blue-400/50 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap shadow-lg uppercase font-condensed min-h-[38px]"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>Raise to ₹{(bidOptions[0] / 100).toFixed(2)} Cr</span>
                </button>
              )}
            </div>
          ) : !canAffordMinNext ? (
            <div className="py-2.5 sm:py-3 px-3 bg-rose-600/15 border border-rose-500/40 rounded-xl text-center">
              <span className="text-xs text-rose-300 font-black uppercase tracking-wider font-condensed">
                INSUFFICIENT FRANCHISE PURSE FOR NEXT BID ({formatCurrencyCr(minNextBid)})
              </span>
            </div>
          ) : (
            /* ACTIVE 3D TACTILE PADDLES GRID */
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <div className={`grid ${bidOptions.length === 1 ? 'grid-cols-1' : bidOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} sm:grid-cols-3 gap-1.5 sm:gap-3`}>
                {bidOptions.map((optLakhs, idx) => {
                  const isPrimary = idx === 0;
                  const incrementLakhs = optLakhs - currentBid;

                  return (
                    <button
                      key={optLakhs}
                      disabled={!isBiddingOpen}
                      onClick={() => handleBidClick(optLakhs)}
                      className={`h-16 sm:h-20 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer active:scale-95 transition-all shadow-xl ${
                        !isBiddingOpen
                          ? 'bg-white/10 border border-white/10 text-white/40 cursor-not-allowed opacity-50'
                          : isPrimary
                          ? 'btn-paddle-primary ring-2 ring-[#D4F636]/40'
                          : 'btn-paddle-secondary hover:border-amber-400/60'
                      }`}
                    >
                      {/* Wooden Paddle Handle Stub Visual at bottom */}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-3 bg-[#3d2314] rounded-t-sm border-t border-[#6e3f24] opacity-80" />

                      {/* Keyboard shortcut Badge - hidden on mobile, visible on desktop */}
                      <span className="hidden sm:flex absolute top-1.5 right-2 bg-black/85 border border-white/20 text-white text-[8px] font-mono font-black px-1.5 py-0.2 rounded-md items-center gap-0.5 shadow">
                        {isPrimary ? (
                          <>
                            <CornerDownLeft className="w-2.5 h-2.5 text-yellow-300" /> Enter
                          </>
                        ) : (
                          `${idx + 1}`
                        )}
                      </span>

                      {/* Franchise Table Paddle Mini Badge */}
                      {myTeam && (
                        <span 
                          className="absolute top-1.5 left-2 w-4 h-4 rounded-full text-[7px] font-black text-white flex items-center justify-center border border-white/30 shadow-sm"
                          style={{ backgroundColor: myTeam.teamConfig.primaryColor }}
                        >
                          {myTeam.teamConfig.abbr}
                        </span>
                      )}

                      <span className="text-[9px] sm:text-[11px] uppercase font-black tracking-wider sm:tracking-widest text-white/95 leading-tight font-condensed flex items-center gap-0.5 sm:gap-1">
                        {isPrimary ? (
                          <>
                            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 fill-yellow-300" />
                            <span className="sm:hidden">{currentBid === 0 ? 'OPEN BID' : 'RAISE PADDLE'}</span>
                            <span className="hidden sm:inline">{currentBid === 0 ? 'RAISE OPENING PADDLE' : 'RAISE PADDLE'}</span>
                          </>
                        ) : (
                          <>
                            <span className="sm:hidden text-amber-300 font-bold">+{incrementLakhs >= 100 ? `${(incrementLakhs / 100).toFixed(1)}Cr` : `${incrementLakhs}L`}</span>
                            <span className="hidden sm:inline text-amber-300/90 font-bold">+₹${(incrementLakhs / 100).toFixed(2)} Cr</span>
                          </>
                        )}
                      </span>

                      <span className="text-base sm:text-2xl font-black italic text-white leading-tight font-teko mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        ₹{(optLakhs / 100).toFixed(2)} Cr
                      </span>
                    </button>
                  );
                })}

                {/* Single Option Fallback Pill */}
                {bidOptions.length === 1 && (
                  <div className="h-14 sm:h-18 bg-black/40 border border-white/10 rounded-xl flex flex-col items-center justify-center text-white/40 text-[9px] sm:text-[10px] uppercase font-black tracking-wider font-condensed">
                    <span>MAX PURSE REACHED</span>
                  </div>
                )}
              </div>

              {/* Keyboard Helper Footer */}
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-white/50 font-mono px-1">
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <span className="hidden xs:inline">Fast Bid:</span>
                  <kbd className="px-1.5 py-0.5 bg-black/80 border border-white/20 rounded text-yellow-300 font-bold">
                    Enter
                  </kbd>
                  <span>or</span>
                  <kbd className="px-1.5 py-0.5 bg-black/80 border border-white/20 rounded text-cyan-300 font-bold">
                    1
                  </kbd>
                </span>
                <span className="hidden sm:inline">
                  <kbd className="px-1.5 py-0.5 bg-black/80 border border-white/20 rounded text-amber-300 font-bold">
                    Space
                  </kbd>{' '}
                  Mute / Unmute
                </span>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 4. Realistic TV Broadcast Recent Bids Ticker */}
      <div className="h-10 sm:h-14 bg-[#0a0c13] rounded-xl border border-white/15 px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-2 sm:gap-3 overflow-hidden shrink-0 shadow-xl">
        <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-400 tracking-wider flex-shrink-0 flex items-center gap-1 font-condensed">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> LIVE BID LOG:
        </span>

        <div className="flex gap-2 items-center overflow-x-auto no-scrollbar py-0.5 flex-1">
          {bidHistory.length > 0 ? (
            bidHistory.slice(0, 4).map((entry, idx) => {
              const team = TEAMS[entry.teamId];
              return (
                <div
                  key={entry.id}
                  className={`border px-2.5 py-1 rounded-lg flex items-center gap-2 flex-shrink-0 transition-all ${
                    idx === 0
                      ? 'border-yellow-400/60 bg-yellow-950/30 shadow-md opacity-100'
                      : 'border-white/10 bg-white/5 opacity-60'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-black text-white shadow shrink-0 font-teko"
                    style={{ backgroundColor: team?.primaryColor || '#444' }}
                  >
                    {entry.teamAbbr}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-white/80 font-black uppercase truncate max-w-[80px] font-condensed">
                      {entry.bidderName}
                    </span>
                    <span className="font-mono font-black text-yellow-300">
                      ₹{(entry.amount / 100).toFixed(2)} Cr
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <span className="text-xs text-white/30 italic font-mono">
              Awaiting opening bids on the podium...
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

