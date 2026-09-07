import React, { useState, useEffect } from 'react';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import { TeamCard } from './TeamCard';
import { TeamId, AuctionSessionFormat } from '../types/auction';
import { AUCTION_FORMAT_CONFIGS, getFormatConfig, normalizeGameMode } from '../data/config';
import { useAuth } from '../contexts/AuthContext';
import {
  Play,
  User,
  Users,
  ShieldAlert,
  Cpu,
  Globe,
  PlusCircle,
  LogIn,
  Key,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Trophy,
  Shield,
  Zap
} from 'lucide-react';

interface TeamSelectorProps {
  onStartSinglePlayer: (username: string, teamId: TeamId, format?: AuctionSessionFormat) => void;
  onCreateMultiplayerRoom?: (username: string, teamId: TeamId, format?: AuctionSessionFormat) => void;
  onJoinMultiplayerRoom?: (roomCode: string, username: string) => void;
  onGoToMultiplayer?: () => void;
  onOpenPlayers?: () => void;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  onStartSinglePlayer,
  onCreateMultiplayerRoom,
  onJoinMultiplayerRoom,
  onGoToMultiplayer,
  onOpenPlayers
}) => {
  const { user, userProfile, signIn } = useAuth();
  const [selectedFormat, setSelectedFormat] = useState<AuctionSessionFormat>('Blitz');
  const [activeMode, setActiveMode] = useState<'SINGLE_PLAYER' | 'MULTIPLAYER'>('SINGLE_PLAYER');
  const [username, setUsername] = useState(userProfile?.managerUsername || '');
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId>('MI');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [multiplayerAction, setMultiplayerAction] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [showValidationError, setShowValidationError] = useState(false);

  // Sync username when logged in
  useEffect(() => {
    if (userProfile?.managerUsername) {
      setUsername(userProfile.managerUsername);
    } else if (user?.displayName && !username) {
      const raw = user.displayName.split(' ')[0];
      setUsername(raw.length >= 5 ? raw : `${raw}_2026`);
    }
  }, [userProfile?.managerUsername, user?.displayName]);

  const trimmedUsername = username.trim();
  const isUsernameValid = trimmedUsername.length >= 5;

  const handleSelectAndStartTeam = (tId: TeamId) => {
    setSelectedTeamId(tId);
    if (!isUsernameValid) {
      setShowValidationError(true);
      const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    onStartSinglePlayer(trimmedUsername, tId, selectedFormat);
  };

  const handleCreateRoom = () => {
    if (!isUsernameValid) {
      setShowValidationError(true);
      return;
    }
    if (onCreateMultiplayerRoom) {
      onCreateMultiplayerRoom(trimmedUsername, selectedTeamId, selectedFormat);
    } else if (onGoToMultiplayer) {
      onGoToMultiplayer();
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameValid) {
      setShowValidationError(true);
      return;
    }
    if (!joinRoomCode.trim()) return;
    if (onJoinMultiplayerRoom) {
      onJoinMultiplayerRoom(joinRoomCode.trim().toUpperCase(), trimmedUsername);
    } else if (onGoToMultiplayer) {
      onGoToMultiplayer();
    }
  };

  const formatConfig = getFormatConfig(selectedFormat);
  const isMega = formatConfig.id === 'Mega';

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-12 py-4 sm:py-8 max-w-7xl mx-auto w-full">
      {/* Hero Banner */}
      <div className="text-center mb-6 sm:mb-8 space-y-2 sm:space-y-3">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#0c0d12] border border-cyan-500/40 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-ai-cyan text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(0,245,212,0.15)]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#00F5D4]" />
          <span>[ :IPL 2026 AI NEURAL DRAFT ENGINE • 6 FRANCHISES • ₹{formatConfig.startingPurseCr} CR ]</span>
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white leading-tight font-display">
          AUCTION <span className="text-ai-lime drop-shadow-[0_0_24px_rgba(212,246,54,0.4)]">REVOLUTION</span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-ai-slate max-w-2xl mx-auto font-mono leading-relaxed">
          // Command 1 of 6 franchises. Compete against adaptive AI bidding agents or launch a live synchronized multiplayer arena.
        </p>

        {onOpenPlayers && (
          <div className="pt-1 flex justify-center">
            <button
              onClick={onOpenPlayers}
              className="inline-flex items-center gap-2 bg-[#0c0d12] hover:bg-[#14151f] border border-cyan-500/30 hover:border-[#D4F636]/60 text-ai-cyan hover:text-white px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,245,212,0.12)] active:scale-95 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#00F5D4]" />
              <span>[ :BROWSE {formatConfig.totalPlayers} STARS MASTER REGISTER ]</span>
            </button>
          </div>
        )}
      </div>

      {/* 2-Format Toggle Selector: Quick Blitz (7P) vs Mega Auction (18P) */}
      <div className="max-w-3xl mx-auto mb-5">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-[11px] uppercase font-mono font-bold text-white/50 tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-ai-cyan" />
            AUCTION FORMAT & SQUAD RULES
          </span>
          <span className="text-[10px] font-mono text-[#D4F636] font-bold">
            {isMega ? '18-Player Mega (20 Overs • 11 Playing XI)' : '7-Player Blitz (10 Overs • 5 Playing Squad)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setSelectedFormat('Blitz')}
            className={`p-4 sm:p-4.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer active:scale-95 ${
              !isMega
                ? 'bg-gradient-to-br from-[#12140b] to-[#0c0d12] border-2 border-[#D4F636] shadow-[0_0_25px_rgba(212,246,54,0.22)] ring-1 ring-[#D4F636]/50 text-white'
                : 'bg-[#090a0e]/80 border border-white/[0.08] hover:border-white/20 hover:bg-[#0e0f16] text-white/70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  !isMega ? 'bg-[#D4F636] text-black shadow-md' : 'bg-white/10 text-white/60'
                }`}>
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold text-white block">
                    Blitz Mode (7 Players)
                  </span>
                  <span className="text-[10px] font-mono text-ai-lime font-bold">
                    10-Over Season • 5-Player Playing Lineup
                  </span>
                </div>
              </div>
              {!isMega && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4F636] shadow-[0_0_8px_#D4F636]" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/[0.08] text-[11px] font-mono">
              <div className="bg-black/40 px-2 py-1 rounded">
                <span className="text-white/40 block text-[9px] uppercase">Purse</span>
                <span className="text-white font-bold">₹50 Cr</span>
              </div>
              <div className="bg-black/40 px-2 py-1 rounded">
                <span className="text-white/40 block text-[9px] uppercase">Pool</span>
                <span className="text-white font-bold">60 Stars</span>
              </div>
              <div className="bg-black/40 px-2 py-1 rounded">
                <span className="text-white/40 block text-[9px] uppercase">Squad</span>
                <span className="text-white font-bold">7 (Min 5)</span>
              </div>
            </div>
            <p className="text-[10px] text-white/50 mt-2 font-mono">
              // Squad size 7 max, min 5. 5-player active lineup (min 1 WK, min 1 bowler, max 3 overseas).
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFormat('Mega')}
            className={`p-4 sm:p-4.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer active:scale-95 ${
              isMega
                ? 'bg-gradient-to-br from-[#091518] to-[#0c0d12] border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,245,212,0.22)] ring-1 ring-cyan-400/50 text-white'
                : 'bg-[#090a0e]/80 border border-white/[0.08] hover:border-white/20 hover:bg-[#0e0f16] text-white/70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  isMega ? 'bg-cyan-400 text-black shadow-md' : 'bg-white/10 text-white/60'
                }`}>
                  <Trophy className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold text-white block">
                    Mega Mode (18 Players)
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                    20-Over Season • 11-Player Playing XI
                  </span>
                </div>
              </div>
              {isMega && (
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F5D4]" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/[0.08] text-[11px] font-mono">
              <div className="bg-black/40 px-2 py-1 rounded">
                <span className="text-white/40 block text-[9px] uppercase">Purse</span>
                <span className="text-white font-bold">₹120 Cr</span>
              </div>
              <div className="bg-black/40 px-2 py-1 rounded">
                <span className="text-white/40 block text-[9px] uppercase">Pool</span>
                <span className="text-white font-bold">130 Stars</span>
              </div>
              <div className="bg-black/40 px-2 py-1 rounded">
                <span className="text-white/40 block text-[9px] uppercase">Squad</span>
                <span className="text-white font-bold">18 (Min 11)</span>
              </div>
            </div>
            <p className="text-[10px] text-white/50 mt-2 font-mono">
              // Squad size 18 max, min 11. 11-player Playing XI (min 1 WK, min 2 frontline bowlers, max 4 overseas).
            </p>
          </button>
        </div>
      </div>

      {/* 2-Mode Toggle Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto mb-6 sm:mb-8">
        <button
          onClick={() => setActiveMode('SINGLE_PLAYER')}
          className={`relative p-3.5 sm:p-5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-3 sm:gap-4 cursor-pointer active:scale-95 ${
            activeMode === 'SINGLE_PLAYER'
              ? 'bg-[#0d0e14] border-2 border-[#D4F636] shadow-[0_0_30px_rgba(212,246,54,0.18)] ring-1 ring-[#D4F636]/40 text-white'
              : 'bg-[#090a0e]/80 border border-white/[0.08] hover:border-white/20 hover:bg-[#0e0f16] text-white/70'
          }`}
        >
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              activeMode === 'SINGLE_PLAYER'
                ? 'bg-[#D4F636] text-black shadow-[0_0_15px_rgba(212,246,54,0.3)]'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base sm:text-lg font-medium tracking-wide text-ai-silver font-display">
                Single Player
              </span>
              <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${
                activeMode === 'SINGLE_PLAYER'
                  ? 'bg-[#D4F636]/20 text-ai-lime border-[#D4F636]/40'
                  : 'bg-white/5 text-white/40 border-white/10'
              }`}>
                Vs 5 AI Bots
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-ai-slate leading-relaxed font-body">
              Compete instantly against 5 AI franchise managers with distinct bidding personalities and purse strategies.
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveMode('MULTIPLAYER')}
          className={`relative p-3.5 sm:p-5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-3 sm:gap-4 cursor-pointer active:scale-95 ${
            activeMode === 'MULTIPLAYER'
              ? 'bg-[#0d0e14] border-2 border-[#00F5D4] shadow-[0_0_30px_rgba(0,245,212,0.18)] ring-1 ring-[#00F5D4]/40 text-white'
              : 'bg-[#090a0e]/80 border border-white/[0.08] hover:border-white/20 hover:bg-[#0e0f16] text-white/70'
          }`}
        >
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              activeMode === 'MULTIPLAYER'
                ? 'bg-[#00F5D4] text-black shadow-[0_0_15px_rgba(0,245,212,0.3)]'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base sm:text-lg font-medium tracking-wide text-ai-silver font-display">
                Multiplayer Room
              </span>
              <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${
                activeMode === 'MULTIPLAYER'
                  ? 'bg-cyan-500/20 text-ai-cyan border-cyan-400/40'
                  : 'bg-white/5 text-white/40 border-white/10'
              }`}>
                Live with Friends
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-ai-slate leading-relaxed font-body">
              Create a custom room code or join an existing live room to challenge up to 6 total managers in real-time.
            </p>
          </div>
        </button>
      </div>

      {/* Google Auth Status & Cloud Save Sync Bar */}
      <div className="max-w-xl mx-auto mb-4">
        {user ? (
          <div className="bg-[#090a0f] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-cover border border-[#D4F636]/40 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[#1a1c24] border border-white/10 flex items-center justify-center font-bold text-xs text-[#D4F636]">
                  {user.displayName?.[0] || 'M'}
                </div>
              )}
              <div>
                <span className="text-xs font-medium text-white flex items-center gap-1.5 font-display">
                  <span>{user.displayName || 'Manager'}</span>
                  <span className="text-[10px] font-mono text-[#D4F636] bg-[#D4F636]/10 border border-[#D4F636]/30 px-1.5 py-0.2 rounded">
                    Cloud Synced
                  </span>
                </span>
                <p className="text-[10px] text-white/50 font-mono">{user.email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#D4F636] font-bold flex items-center gap-1">
                <Trophy className="w-3 h-3 fill-current" /> {userProfile?.stats?.auctionsWon || 0} Wins
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#090a0f] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4F636] shrink-0" />
              <p className="text-xs text-white/70 font-body">
                Sign in with Google to save your tournament history, squads & trophies to Firestore!
              </p>
            </div>
            <button
              onClick={() => signIn()}
              className="bg-[#D4F636] hover:bg-[#e0fa48] text-black font-mono font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 ml-3 cursor-pointer shadow-[0_0_15px_rgba(212,246,54,0.3)] transition-all"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Mandatory Username Input Bar */}
      <div
        className={`bg-[#090a0e] border rounded-2xl p-4 sm:p-6 max-w-xl mx-auto mb-6 sm:mb-10 transition-all ${
          showValidationError && !isUsernameValid
            ? 'border-amber-500/80 bg-amber-950/20 ring-2 ring-amber-500/30'
            : isUsernameValid
            ? 'border-[#D4F636]/60 shadow-[0_0_20px_rgba(212,246,54,0.12)]'
            : 'border-white/[0.08]'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] uppercase text-ai-cyan font-bold tracking-widest block font-mono">
            // MANAGER USERNAME <span className="text-amber-400">* (Min 5 chars)</span>
          </label>
          <span
            className={`text-[10px] font-mono font-bold ${
              isUsernameValid
                ? 'text-emerald-400'
                : trimmedUsername.length > 0
                ? 'text-amber-400'
                : 'text-ai-slate'
            }`}
          >
            {trimmedUsername.length}/20 chars
          </span>
        </div>

        <div className="relative">
          <User className="w-4 h-4 text-cyan-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (showValidationError && e.target.value.trim().length >= 5) {
                setShowValidationError(false);
              }
            }}
            placeholder="Enter your manager username (min 5 characters)..."
            className={`w-full bg-black/60 border rounded-xl py-2.5 sm:py-3 pl-10 pr-10 text-sm sm:text-base font-mono text-ai-silver focus:outline-none transition-all ${
              showValidationError && !isUsernameValid
                ? 'border-amber-500 focus:border-amber-400'
                : isUsernameValid
                ? 'border-[#D4F636] focus:border-[#D4F636] shadow-[0_0_15px_rgba(212,246,54,0.15)]'
                : 'border-white/[0.08] focus:border-[#00F5D4]/60'
            }`}
            maxLength={20}
            autoFocus
          />
          {isUsernameValid ? (
            <CheckCircle2 className="w-4 h-4 text-[#D4F636] absolute right-3 top-1/2 -translate-y-1/2" />
          ) : trimmedUsername.length > 0 ? (
            <AlertCircle className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
          ) : null}
        </div>

        {/* Validation Feedback Message */}
        <div className="mt-2 text-xs flex items-center gap-1.5">
          {trimmedUsername.length === 0 ? (
            <span className="text-ai-slate font-mono text-[11px]">
              // Enter manager callsign (at least 5 characters) to unlock the live auction arena.
            </span>
          ) : !isUsernameValid ? (
            <span className="text-amber-400 font-mono flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Username too short — need {5 - trimmedUsername.length} more character
              {5 - trimmedUsername.length > 1 ? 's' : ''} (min 5).
            </span>
          ) : (
            <span className="text-ai-lime font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Manager verified: <strong>{trimmedUsername}</strong>
            </span>
          )}
        </div>
      </div>

      {/* SINGLE PLAYER CONTENT */}
      {activeMode === 'SINGLE_PLAYER' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="text-center">
            <h3 className="text-xl font-medium tracking-tight text-ai-title font-display">
              Select Your Franchise (6 Total Teams)
            </h3>
            <p className="text-xs text-ai-slate mt-1 font-mono">
              // CHOOSE 1 TEAM TO COMMAND • 5 REMAINING TEAMS DRIVEN BY ADAPTIVE AI BOT MANAGERS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ALL_TEAM_IDS.map((tId) => {
              const team = TEAMS[tId];
              const isSelected = selectedTeamId === tId;
              return (
                <TeamCard
                  key={tId}
                  team={team}
                  isSelected={isSelected}
                  onSelect={() => handleSelectAndStartTeam(tId)}
                  controllerName={isSelected ? trimmedUsername || 'Your Team' : `AI ${team.shortName}`}
                  controllerType={isSelected ? 'HUMAN' : 'BOT'}
                  startingPurseCr={formatConfig.startingPurseCr}
                  maxSquad={formatConfig.maxSquad}
                  minSquad={formatConfig.minSquad}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* MULTIPLAYER CONTENT */}
      {activeMode === 'MULTIPLAYER' && (
        <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
          {/* Create or Join Switcher */}
          <div className="flex rounded-xl bg-[#090a0e] border border-white/[0.08] p-1 shadow-md">
            <button
              type="button"
              onClick={() => setMultiplayerAction('CREATE')}
              className={`flex-1 py-3 rounded-lg text-xs sm:text-sm font-mono font-medium uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                multiplayerAction === 'CREATE'
                  ? 'bg-[#D4F636] text-black shadow-[0_0_15px_rgba(212,246,54,0.3)] font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Room</span>
            </button>
            <button
              type="button"
              onClick={() => setMultiplayerAction('JOIN')}
              className={`flex-1 py-3 rounded-lg text-xs sm:text-sm font-mono font-medium uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                multiplayerAction === 'JOIN'
                  ? 'bg-[#D4F636] text-black shadow-[0_0_15px_rgba(212,246,54,0.3)] font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Join Existing Room</span>
            </button>
          </div>

          {multiplayerAction === 'CREATE' ? (
            <div className="bg-[#090a0e] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <h4 className="text-lg font-medium tracking-tight text-white mb-1 font-display">
                  Step 1: Choose Your Starting Franchise
                </h4>
                <p className="text-xs text-white/60 font-body">
                  Select your preferred team. Other managers can join your room and claim any of the 6 franchises in the lobby!
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALL_TEAM_IDS.map((tId) => {
                  const team = TEAMS[tId];
                  const isSelected = selectedTeamId === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setSelectedTeamId(tId)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-[#0f1118] border-[#D4F636] text-white shadow-[0_0_15px_rgba(212,246,54,0.15)] ring-1 ring-[#D4F636]/30'
                          : 'bg-black/30 border-white/[0.08] text-white/70 hover:border-white/20'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-display"
                        style={{
                          backgroundColor: team.primaryColor,
                          color: team.secondaryColor
                        }}
                      >
                        {team.shortName}
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-xs uppercase truncate font-display">
                          {team.shortName}
                        </div>
                        <div className="text-[10px] text-white/50 font-mono">
                          ₹{formatConfig.startingPurseCr} Cr Purse
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={!isUsernameValid}
                  className="w-full bg-[#D4F636] hover:bg-[#e0fa48] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-3.5 sm:py-4 px-3 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(212,246,54,0.3)] flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-black" />
                  <span>
                    {isUsernameValid
                      ? 'Create Room & Generate Invite Code'
                      : 'Enter 5+ Char Username to Create Room'}
                  </span>
                  <ArrowRight className="w-5 h-5 text-black" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleJoinRoom} className="bg-[#090a0e] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <h4 className="text-lg font-medium tracking-tight text-white mb-1 font-display">
                  Join a Live Multiplayer Room
                </h4>
                <p className="text-xs text-white/60 font-body">
                  Enter the 6-character Room Code shared by your host manager (e.g. IPL2025).
                </p>
              </div>

              <div>
                <label className="text-[10px] uppercase text-white/40 font-mono font-medium tracking-widest block mb-1">
                  6-Character Room Code
                </label>
                <div className="relative">
                  <Key className="w-5 h-5 text-[#D4F636] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. IPL2025"
                    maxLength={10}
                    className="w-full bg-black/50 border border-white/20 rounded-xl py-3.5 pl-12 pr-4 text-lg font-mono font-medium tracking-widest text-[#D4F636] placeholder-white/20 focus:outline-none focus:border-[#D4F636] transition-colors uppercase"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isUsernameValid || !joinRoomCode.trim()}
                  className="w-full bg-[#D4F636] hover:bg-[#e0fa48] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-3.5 sm:py-4 px-3 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(212,246,54,0.3)] flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-5 h-5 text-black" />
                  <span>
                    {!isUsernameValid
                      ? 'Enter 5+ Char Username to Join'
                      : !joinRoomCode.trim()
                      ? 'Enter Room Code to Join'
                      : 'Join Multiplayer Room Lobby'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* All 6 Franchises Preview */}
          <div className="pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 text-center mb-4">
              All 6 Franchises in League Pool (₹50 Cr Purse Each)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ALL_TEAM_IDS.map((tId) => {
                const team = TEAMS[tId];
                return (
                  <div
                    key={tId}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                      style={{
                        backgroundColor: team.primaryColor,
                        color: team.secondaryColor
                      }}
                    >
                      {team.shortName}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">{team.name}</div>
                      <div className="text-[10px] text-white/50 uppercase font-mono">
                        Purse: ₹50.0 Cr
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

