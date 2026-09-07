import React from 'react';
import { Volume2, VolumeX, HelpCircle, Trophy, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useAuth } from '../contexts/AuthContext';
import { SoundToggleSwitch } from './SoundToggleSwitch';

interface NavbarProps {
  roomCode?: string;
  onOpenRules: () => void;
  onOpenPlayers?: () => void;
  onOpenProfile?: () => void;
  onGoHome?: () => void;
  onLeave?: () => void;
  isMuted?: boolean;
  isSoundEnabled?: boolean;
  onToggleMute?: () => void;
  onToggleSound?: () => void;
  onConcludeAuction?: () => void;
  onOpenSeasonSim?: () => void;
  myTeam?: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  onOpenRules,
  onOpenPlayers,
  onOpenProfile,
  onGoHome,
  onLeave,
  isMuted,
  isSoundEnabled,
  onToggleMute,
  onToggleSound,
  onConcludeAuction,
  onOpenSeasonSim,
  myTeam
}) => {
  const { user, userProfile, signIn, loading } = useAuth();
  const muted = isMuted !== undefined ? isMuted : (isSoundEnabled !== undefined ? !isSoundEnabled : false);
  const handleToggleSound = onToggleMute || onToggleSound || (() => {});
  const handleHomeClick = onGoHome || onLeave || (() => {});

  return (
    <nav className="h-14 sm:h-16 flex items-center justify-between px-2 sm:px-6 md:px-8 bg-[#040406]/95 border-b border-white/[0.08] select-none backdrop-blur-2xl sticky top-0 z-40 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.9)] w-full max-w-full overflow-hidden">
      {/* Brand & Live Broadcast Ticker */}
      <div className="flex items-center gap-1.5 sm:gap-4 cursor-pointer group min-w-0 shrink" onClick={handleHomeClick}>
        {/* Official IPL Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0c0d12] border border-[#D4F636]/60 flex items-center justify-center text-[#D4F636] font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(212,246,54,0.25)] shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-lg md:text-xl font-medium tracking-tight text-white flex items-center gap-1 sm:gap-1.5 font-display truncate">
              <span className="font-display text-xs sm:text-lg md:text-xl font-semibold tracking-tight text-ai-silver truncate">
                <span className="hidden xs:inline sm:inline">IPL MEGA AUCTION</span>
                <span className="xs:hidden sm:hidden">IPL AUCTION</span>
              </span>
              <span className="text-ai-lime font-display text-xs sm:text-lg md:text-xl font-semibold tracking-tight drop-shadow-[0_0_14px_rgba(212,246,54,0.5)] shrink-0">
                2026
              </span>
            </h1>
            <p className="text-[9px] text-ai-cyan uppercase tracking-widest font-mono hidden md:block leading-none">
              // AI_DRAFT_ARENA_V26
            </p>
          </div>
        </div>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-1 sm:gap-2.5 md:gap-3 shrink-0">
        {/* Master Player Register Pool Modal Toggle */}
        {onOpenPlayers && (
          <button
            onClick={onOpenPlayers}
            className="bg-[#0b0c10] hover:bg-[#14151f] hover:border-[#D4F636]/50 active:scale-95 border border-white/[0.08] w-8 h-8 sm:w-auto sm:h-auto p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow text-white shrink-0 min-h-[34px] sm:min-h-[36px]"
            title="Open Master Auction Player Register (Lot #1 to #60)"
            aria-label="Players Register"
          >
            <Users className="w-4 h-4 text-[#D4F636] shrink-0" />
            <span className="hidden sm:inline font-mono text-xs text-white/90">Players</span>
          </button>
        )}

        {/* Optional Conclude Auction & Rank Action */}
        {onConcludeAuction && (
          <button
            onClick={onConcludeAuction}
            className="bg-[#121208] hover:bg-[#1a190b] border border-[#D4F636]/40 w-8 h-8 sm:w-auto sm:h-auto p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow text-[#D4F636] active:scale-95 shrink-0 min-h-[34px] sm:min-h-[36px]"
            title="Conclude Auction and View Top 5 Standings"
            aria-label="End Auction and View Standings"
          >
            <Trophy className="w-4 h-4 text-[#D4F636] shrink-0" />
            <span className="hidden sm:inline font-mono text-xs">End & Rank</span>
          </button>
        )}

        {/* Season Simulation Button */}
        {onOpenSeasonSim && (
          <button
            onClick={onOpenSeasonSim}
            className="bg-[#0c141d] hover:bg-[#121c29] border border-[#00F5D4]/40 hover:border-[#00F5D4]/70 w-8 h-8 sm:w-auto sm:h-auto p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow text-[#00F5D4] active:scale-95 shrink-0 min-h-[34px] sm:min-h-[36px]"
            title="Open IPL 2026 Season Simulation Arena"
            aria-label="Season Simulation"
          >
            <Zap className="w-4 h-4 text-[#00F5D4] shrink-0 fill-[#00F5D4]/20" />
            <span className="hidden sm:inline font-mono text-xs text-[#00F5D4]">Season Sim</span>
          </button>
        )}

        {/* Sound Toggle (Uiverse animated speaker toggle with cyber palette) */}
        <SoundToggleSwitch isMuted={muted} onToggle={handleToggleSound} id="navbar-sound-toggle" />

        {/* Rules Modal */}
        <button
          onClick={onOpenRules}
          className="bg-[#0b0c10] hover:bg-[#14151f] active:scale-95 border border-white/[0.08] w-8 h-8 sm:w-auto sm:h-auto p-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow text-white/80 shrink-0 min-h-[34px] sm:min-h-[36px]"
          title="Auction Rules & Format"
          aria-label="Rules"
        >
          <HelpCircle className="w-4 h-4 text-white/60 shrink-0" />
          <span className="hidden sm:inline font-mono text-xs">Rules</span>
        </button>

        {/* Firebase Authentication & User Profile Controls */}
        {user ? (
          <button
            onClick={onOpenProfile}
            className="bg-[#0e0f14] hover:bg-[#161720] border border-white/[0.08] hover:border-[#D4F636]/40 p-1 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shrink-0 min-h-[34px] sm:min-h-[36px]"
            title="View Career Stats, Trophies & Auction History"
            aria-label="User Profile"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                referrerPolicy="no-referrer"
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover border border-[#D4F636]/40 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[#1a1c24] border border-white/10 flex items-center justify-center text-xs font-bold text-[#D4F636] shadow shrink-0">
                {user.displayName?.[0] || 'M'}
              </div>
            )}
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-xs font-medium text-white leading-tight truncate max-w-[100px] font-display">
                {userProfile?.managerUsername || user.displayName?.split(' ')[0] || 'Manager'}
              </span>
              <span className="text-[9px] font-mono font-bold text-[#D4F636] flex items-center gap-1">
                <Trophy className="w-2.5 h-2.5 fill-current" />
                <span>{userProfile?.stats?.auctionsWon || 0} Won</span>
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => signIn()}
            disabled={loading}
            className="bg-[#D4F636] hover:bg-[#e0fa48] text-black px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all shadow-[0_0_20px_rgba(212,246,54,0.3)] flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 border border-[#D4F636] shrink-0 min-h-[34px] sm:min-h-[36px]"
            title="Sign in with Google to save career records to Firestore"
            aria-label="Sign In"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current text-black shrink-0" />
            <span className="font-mono font-bold uppercase tracking-wider text-[10px] sm:text-xs">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};


