import React, { useState, useEffect } from 'react';
import { X, Users, Key, User, PlusCircle, LogIn, AlertCircle, CheckCircle2, Zap, Trophy } from 'lucide-react';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import { TeamId, AuctionSessionFormat } from '../types/auction';
import { useAuth } from '../contexts/AuthContext';

interface MultiplayerJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (username: string, teamId: TeamId, format?: AuctionSessionFormat) => void;
  onJoinRoom: (roomCode: string, username: string) => void;
}

export const MultiplayerJoinModal: React.FC<MultiplayerJoinModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom
}) => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [username, setUsername] = useState(userProfile?.managerUsername || '');
  const [roomCode, setRoomCode] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId>('MI');
  const [selectedFormat, setSelectedFormat] = useState<AuctionSessionFormat>('MINI_7');

  useEffect(() => {
    if (userProfile?.managerUsername) {
      setUsername(userProfile.managerUsername);
    } else if (user?.displayName && !username) {
      const raw = user.displayName.split(' ')[0];
      setUsername(raw.length >= 5 ? raw : `${raw}_2026`);
    }
  }, [userProfile?.managerUsername, user?.displayName, isOpen]);

  if (!isOpen) return null;

  const trimmedUsername = username.trim();
  const isUsernameValid = trimmedUsername.length >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1015] border border-white/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 text-blue-400 p-2 rounded-lg font-black uppercase">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase italic tracking-wider">
                Multiplayer Rooms (6 Franchises)
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-widest">
                Real-Time Live Bidding with Friends
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-2 bg-black/40 border-b border-white/10">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            + Create Room
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'join'
                ? 'bg-blue-600 text-white shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase text-white/40 font-bold tracking-widest block">
                Your Manager Username <span className="text-amber-400">* (Min 5 chars)</span>
              </label>
              <span
                className={`text-[10px] font-mono font-bold ${
                  isUsernameValid
                    ? 'text-emerald-400'
                    : trimmedUsername.length > 0
                    ? 'text-amber-400'
                    : 'text-white/40'
                }`}
              >
                {trimmedUsername.length}/20
              </span>
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your manager username (min 5 chars)..."
                className={`w-full bg-black/40 border rounded-xl py-2.5 pl-10 pr-10 text-sm font-bold text-white focus:outline-none transition-colors ${
                  isUsernameValid
                    ? 'border-emerald-500/70 focus:border-emerald-400'
                    : trimmedUsername.length > 0
                    ? 'border-amber-500/70 focus:border-amber-400'
                    : 'border-white/20 focus:border-blue-500'
                }`}
                maxLength={20}
                autoFocus
              />
              {isUsernameValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
              ) : trimmedUsername.length > 0 ? (
                <AlertCircle className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
              ) : null}
            </div>
            {trimmedUsername.length > 0 && !isUsernameValid && (
              <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Username requires at least 5 characters ({5 - trimmedUsername.length} more needed)
              </p>
            )}
          </div>

          {activeTab === 'create' ? (
            <div className="space-y-4">
              {/* Session Format Selection */}
              <div>
                <label className="text-[10px] uppercase text-white/40 font-bold tracking-widest block mb-2">
                  Select Auction Session Format
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('MINI_7')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedFormat === 'MINI_7'
                        ? 'bg-[#D4F636]/15 border-[#D4F636] ring-1 ring-[#D4F636]/40 shadow-sm'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className={`w-3.5 h-3.5 ${selectedFormat === 'MINI_7' ? 'text-[#D4F636]' : 'text-white/60'}`} />
                      <span className={`text-xs font-bold uppercase ${selectedFormat === 'MINI_7' ? 'text-[#D4F636]' : 'text-white'}`}>
                        Quick Blitz (7P)
                      </span>
                    </div>
                    <div className="text-[10px] text-white/60 space-y-0.5">
                      <div>₹50 Cr • 60 Players</div>
                      <div>Squad: 7 (Min 5) • 10 Overs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('MEGA_18')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedFormat === 'MEGA_18'
                        ? 'bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400/40 shadow-sm'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Trophy className={`w-3.5 h-3.5 ${selectedFormat === 'MEGA_18' ? 'text-cyan-400' : 'text-white/60'}`} />
                      <span className={`text-xs font-bold uppercase ${selectedFormat === 'MEGA_18' ? 'text-cyan-400' : 'text-white'}`}>
                        Mega Auction (18P)
                      </span>
                    </div>
                    <div className="text-[10px] text-white/60 space-y-0.5">
                      <div>₹120 Cr • 130 Players</div>
                      <div>Squad: 18 (Min 11) • 20 Overs</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-white/40 font-bold tracking-widest block mb-2">
                  Choose Starting Franchise (6 Teams)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_TEAM_IDS.map((tId) => {
                    const team = TEAMS[tId];
                    const isSelected = selectedTeamId === tId;
                    return (
                      <button
                        key={tId}
                        onClick={() => setSelectedTeamId(tId)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white mb-1"
                          style={{ backgroundColor: team.primaryColor }}
                        >
                          {team.abbr}
                        </div>
                        <span className="text-[10px] font-bold uppercase truncate max-w-full">
                          {team.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                disabled={!isUsernameValid}
                onClick={() => onCreateRoom(trimmedUsername, selectedTeamId, selectedFormat)}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl uppercase italic tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-4"
              >
                <PlusCircle className="w-5 h-5" />
                <span>
                  {isUsernameValid ? 'Create Multiplayer Room' : 'Enter 5+ Char Username to Create'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase text-white/40 font-bold tracking-widest block mb-1">
                  6-Character Room Code
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="E.g. IPL7K2"
                    className="w-full bg-black/40 border border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-base font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                    maxLength={6}
                  />
                </div>
              </div>

              <button
                disabled={!isUsernameValid || !roomCode || roomCode.length < 4}
                onClick={() => onJoinRoom(roomCode, trimmedUsername)}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl uppercase italic tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-4"
              >
                <LogIn className="w-5 h-5" />
                <span>
                  {!isUsernameValid
                    ? 'Enter 5+ Char Username to Join'
                    : !roomCode || roomCode.length < 4
                    ? 'Enter Valid Room Code'
                    : 'Join Room Lobby'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
