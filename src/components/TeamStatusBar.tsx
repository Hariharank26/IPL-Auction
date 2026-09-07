import React from 'react';
import { RoomTeam, TeamId, GameMode } from '../types/auction';
import { ALL_TEAM_IDS } from '../data/teams';
import { getFormatConfig } from '../data/config';
import { Cpu, User, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';

interface TeamStatusBarProps {
  teams: Record<TeamId, RoomTeam>;
  highestBidderTeamId: TeamId | null;
  myTeamId?: TeamId;
  gameMode?: GameMode;
}

export const TeamStatusBar: React.FC<TeamStatusBarProps> = ({
  teams,
  highestBidderTeamId,
  myTeamId,
  gameMode = 'Blitz'
}) => {
  const config = getFormatConfig(gameMode);
  const minSquad = config.minSquad;
  const maxSquad = config.maxSquad;

  return (
    <footer className="h-24 bg-[#06080e] px-2 sm:px-4 flex items-center gap-2 overflow-x-auto no-scrollbar border-t-2 border-white/15 select-none shadow-[0_-12px_36px_rgba(0,0,0,0.95)]">
      {ALL_TEAM_IDS.map((tId, index) => {
        const team = teams[tId];
        if (!team) return null;

        const isLeading = highestBidderTeamId === tId;
        const isMyTeam = myTeamId === tId;
        const isBot = team.controllerType === 'BOT';
        const squadSize = team.squad.length;
        const isQualified = squadSize >= minSquad;

        // Purse Health Warning logic
        const neededForMin = Math.max(0, minSquad - squadSize);
        const minRequiredLakhs = neededForMin * 50; // base price 50L
        const avgRemainingPerSlot = neededForMin > 0 ? team.remainingPurse / neededForMin : 1000;

        let purseHealth: 'HEALTHY' | 'TIGHT' | 'CRITICAL' = 'HEALTHY';
        if (neededForMin > 0) {
          if (team.remainingPurse < minRequiredLakhs) {
            purseHealth = 'CRITICAL';
          } else if (avgRemainingPerSlot < 100) {
            purseHealth = 'TIGHT';
          }
        }

        return (
          <div
            key={tId}
            className={`min-w-[170px] px-3 py-2 rounded-xl border-2 flex items-center gap-2.5 flex-1 transition-all relative overflow-hidden group shadow-lg ${
              isLeading
                ? 'bg-gradient-to-b from-[#182035] to-[#0c101c] border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.35)] scale-[1.03] z-10'
                : isMyTeam
                ? 'bg-gradient-to-b from-[#121929] to-[#090c14] border-cyan-400/80'
                : 'bg-[#0a0c14] border-white/10 opacity-80 hover:opacity-100'
            }`}
          >
            {/* Top Table Rim with Franchise Color */}
            <div 
              className="absolute top-0 left-0 right-0 h-1" 
              style={{ backgroundColor: team.teamConfig.primaryColor }}
            />

            {/* Table Number & Raised Paddle Badge */}
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-xl relative border border-white/25 font-teko"
                style={{ backgroundColor: team.teamConfig.primaryColor }}
              >
                {team.teamConfig.abbr}
              </div>

              {/* Raised Franchise Bidding Paddle when Leading */}
              {isLeading && (
                <div 
                  className="absolute -top-3 -right-2 bg-amber-400 text-black text-[8px] font-black font-mono px-1 py-0.2 rounded-full shadow-md border border-white flex items-center gap-0.5 animate-paddle-raise"
                  title="Franchise Paddle Currently Raised!"
                >
                  <span>BID</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Table Header: Table # + Short Name */}
              <div className="flex justify-between items-center mb-0.5 gap-1">
                <span
                  className={`text-[10px] uppercase font-black tracking-tight truncate flex items-center gap-1 font-condensed ${
                    isLeading ? 'text-amber-300' : isMyTeam ? 'text-cyan-300' : 'text-white/90'
                  }`}
                >
                  <span className="text-white/40 text-[9px] font-mono">T{index + 1}</span>
                  <span className="truncate">{team.teamConfig.shortName}</span>
                  {isMyTeam && (
                    <span className="text-[7px] bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded font-mono font-bold">YOU</span>
                  )}
                </span>
                
                {/* Squad Slot Visualizer: dots for Blitz (<=7), bar for Mega (18) */}
                {maxSquad <= 10 ? (
                  <div className="flex items-center gap-0.5" title={`Squad: ${squadSize}/${maxSquad} filled`}>
                    {Array.from({ length: maxSquad }).map((_, slotIdx) => (
                      <span
                        key={slotIdx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          slotIdx < squadSize
                            ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]'
                            : 'bg-white/15'
                        }`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1" title={`Squad: ${squadSize}/${maxSquad} filled (Min ${minSquad})`}>
                    <div className="w-12 h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${squadSize >= minSquad ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                        style={{ width: `${Math.min(100, (squadSize / maxSquad) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-mono font-bold text-white/70">{squadSize}/{maxSquad}</span>
                  </div>
                )}
              </div>

              {/* Table Purse & Status Badges */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-black italic text-white truncate font-teko leading-none">
                  ₹{(team.remainingPurse / 100).toFixed(2)} <span className="text-[10px] text-amber-400 font-sans not-italic font-bold">Cr</span>
                </div>

                {isQualified && (
                  <span className="text-[8px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1 py-0.2 rounded font-black uppercase font-mono" title={`Qualified (${minSquad}+ Players)`}>
                    ✓ QUAL
                  </span>
                )}

                {purseHealth === 'CRITICAL' && (
                  <span className="text-[8px] bg-rose-600/30 border border-rose-500/50 text-rose-300 px-1 py-0.2 rounded font-black uppercase animate-pulse flex items-center gap-0.5 font-mono" title={`CRITICAL: Needs ${neededForMin} more player(s) with only ₹${(team.remainingPurse/100).toFixed(2)} Cr remaining!`}>
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> RISK
                  </span>
                )}

                {purseHealth === 'TIGHT' && (
                  <span className="text-[8px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1 py-0.2 rounded font-bold uppercase flex items-center gap-0.5 font-mono" title={`Tight Purse: Avg ₹${(avgRemainingPerSlot/100).toFixed(2)} Cr per remaining slot needed`}>
                    <AlertCircle className="w-2.5 h-2.5 text-amber-400" /> TIGHT
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </footer>
  );
};

