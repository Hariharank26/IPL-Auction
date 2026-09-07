import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TEAMS } from '../data/teams';
import { formatCurrencyCr } from '../data/config';
import { fetchGlobalLeaderboard } from '../services/firebase';
import {
  X,
  User,
  Trophy,
  History,
  Award,
  LogOut,
  Sparkles,
  TrendingUp,
  Shield,
  Edit2,
  Check,
  Calendar,
  Star,
  Globe,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, logout, updateManagerName, auctionHistory } = useAuth();
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'STATS' | 'LEADERBOARD'>('HISTORY');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile?.managerUsername || '');
  const [expandedAuctionId, setExpandedAuctionId] = useState<string | null>(null);
  const [globalAuctions, setGlobalAuctions] = useState<any[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  useEffect(() => {
    if (userProfile?.managerUsername) {
      setNameInput(userProfile.managerUsername);
    }
  }, [userProfile?.managerUsername]);

  useEffect(() => {
    if (isOpen && activeTab === 'LEADERBOARD') {
      setLoadingGlobal(true);
      fetchGlobalLeaderboard()
        .then((data) => setGlobalAuctions(data))
        .finally(() => setLoadingGlobal(false));
    }
  }, [isOpen, activeTab]);

  if (!isOpen || !user) return null;

  const handleSaveName = async () => {
    if (nameInput.trim().length >= 5) {
      await updateManagerName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  const stats = userProfile?.stats || {
    auctionsPlayed: 0,
    auctionsWon: 0,
    bestTop5Score: 0,
    totalSpentCr: 0,
    totalPlayersBought: 0
  };

  const winRate =
    stats.auctionsPlayed > 0
      ? Math.round((stats.auctionsWon / stats.auctionsPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1017] border border-white/20 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header with Google User Info */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-black border-b border-white/10 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pr-10">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-blue-400/50 shadow-xl"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-xl">
                  {user.displayName?.[0] || 'M'}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Verified Manager
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Cloud Synced
                  </span>
                </div>

                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="bg-black/60 border border-blue-500 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none"
                      placeholder="Manager Name (min 5 chars)"
                      maxLength={20}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={nameInput.trim().length < 5}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <h3 className="text-xl sm:text-2xl font-black uppercase italic text-white tracking-tight">
                      {userProfile?.managerUsername || user.displayName || 'Manager'}
                    </h3>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-white/40 hover:text-blue-400 transition-colors cursor-pointer"
                      title="Edit Manager Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <p className="text-xs text-white/50 mt-0.5 truncate max-w-[250px] sm:max-w-none">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 text-white/70 hover:text-red-400 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Quick Career Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 bg-black/40 border-b border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block">
              Auctions Played
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {stats.auctionsPlayed}
            </span>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider block flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3" /> Trophies Won
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-yellow-400 font-mono">
                {stats.auctionsWon}
              </span>
              <span className="text-[10px] font-bold text-yellow-500/80">
                ({winRate}%)
              </span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block">
              Best Top 5 Score
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
              {stats.bestTop5Score > 0 ? `${stats.bestTop5Score} pts` : '—'}
            </span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
              Total Spent
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
              ₹{stats.totalSpentCr.toFixed(1)} Cr
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 px-4 pt-3 gap-2 bg-black/20">
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Auction History ({auctionHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'LEADERBOARD'
                ? 'border-yellow-500 text-yellow-400'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Global Hall of Fame</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {activeTab === 'HISTORY' && (
            <div>
              {auctionHistory.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white/5 rounded-2xl border border-white/10">
                  <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white">No Auction History Yet</h4>
                  <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
                    Complete your first IPL Auction tournament in Single Player or Multiplayer to record your squad, rank, and Top 5 score!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auctionHistory.map((item, idx) => {
                    const team = TEAMS[item.userTeamId];
                    const isExpanded = expandedAuctionId === (item.id || `idx-${idx}`);
                    const dateStr = item.completedAt?.toDate
                      ? item.completedAt.toDate().toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Recently';

                    return (
                      <div
                        key={item.id || idx}
                        className={`border rounded-2xl overflow-hidden transition-all ${
                          item.isChampion
                            ? 'bg-yellow-500/5 border-yellow-500/40'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div
                          onClick={() =>
                            setExpandedAuctionId(
                              isExpanded ? null : item.id || `idx-${idx}`
                            )
                          }
                          className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow"
                              style={{ backgroundColor: team?.primaryColor || '#1e3a8a' }}
                            >
                              {team?.abbr || item.userTeamId}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-white text-sm">
                                  {team?.name || item.userTeamId}
                                </h5>
                                {item.isChampion ? (
                                  <span className="bg-yellow-500 text-black text-[9px] px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                                    <Trophy className="w-2.5 h-2.5 fill-current" /> Champion
                                  </span>
                                ) : (
                                  <span className="bg-white/10 text-white/70 text-[9px] px-2 py-0.5 rounded font-bold uppercase">
                                    Rank #{item.userRank}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-white/40 flex items-center gap-2 mt-0.5">
                                <span>{dateStr}</span>
                                <span>•</span>
                                <span>{item.gameMode === 'SINGLE_PLAYER' ? 'Single Player' : 'Multiplayer Room'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-bold text-yellow-400 block">
                                Top 5 Score
                              </span>
                              <span className="text-sm font-black font-mono text-yellow-400">
                                {item.userTop5Score} pts
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-bold text-white/40 block">
                                Purse Left
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                {formatCurrencyCr(item.userPurseRemaining)}
                              </span>
                            </div>
                            <div className="text-white/40">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Top 5 Squad Roster */}
                        {isExpanded && item.top5Picks && (
                          <div className="p-4 bg-black/50 border-t border-white/10 space-y-2">
                            <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider block">
                              Your Top 5 Squad Picks:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {item.top5Picks.map((p, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="bg-white/5 border border-white/10 p-2 rounded-xl flex items-center justify-between text-xs"
                                >
                                  <div className="truncate pr-2">
                                    <p className="font-bold text-white truncate">{p.name}</p>
                                    <p className="text-[10px] text-white/40 uppercase">
                                      {p.role} • {p.overallRating} OVR
                                    </p>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0">
                                    {formatCurrencyCr(p.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'LEADERBOARD' && (
            <div>
              {loadingGlobal ? (
                <div className="text-center py-10 text-white/50 text-xs animate-pulse">
                  Loading Tournament Hall of Fame from Firestore...
                </div>
              ) : globalAuctions.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                  <Globe className="w-10 h-10 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/50">No completed public tournaments recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {globalAuctions.map((auc, idx) => {
                    const champTeam = TEAMS[auc.championTeamId as any];
                    return (
                      <div
                        key={auc.id || idx}
                        className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-yellow-500/20 text-yellow-400 font-mono font-bold text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shadow"
                            style={{ backgroundColor: champTeam?.primaryColor || '#2563eb' }}
                          >
                            {champTeam?.abbr || auc.championTeamId}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-white">
                                {champTeam?.name || auc.championTeamId}
                              </h5>
                              <span className="text-[10px] text-yellow-400 font-black flex items-center gap-1">
                                <Trophy className="w-2.5 h-2.5 fill-current" /> {auc.championManager}
                              </span>
                            </div>
                            <p className="text-[10px] text-white/40">
                              {auc.gameMode === 'SINGLE_PLAYER' ? 'Single Player' : 'Multiplayer Live'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-white/40 block">
                            Champion Power
                          </span>
                          <span className="text-sm font-black font-mono text-yellow-400">
                            {auc.championScore} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
