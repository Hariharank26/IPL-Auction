import React, { useState } from 'react';
import { PlayerData, AuctionPlayer } from '../types/auction';
import { getPlayerStats } from '../data/playerStats';
import { Target, Zap, Activity, TrendingUp } from 'lucide-react';

interface PlayerStatsTerminalCardProps {
  player: PlayerData | AuctionPlayer;
  defaultExpanded?: boolean;
  className?: string;
}

export const PlayerStatsTerminalCard: React.FC<PlayerStatsTerminalCardProps> = ({
  player,
  defaultExpanded = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const stats = getPlayerStats(player);

  const isBatter = player.role === 'BATSMAN' || player.role === 'WICKETKEEPER';
  const isBowler = player.role === 'FAST_BOWLER' || player.role === 'SPIN_BOWLER';

  return (
    <div
      className={`uiverse-stats-card ${isExpanded ? 'expanded' : ''} ${className}`}
      onClick={() => setIsExpanded((prev) => !prev)}
      title="Hover or tap to toggle full T20 career telemetry"
    >
      {/* 1. Terminal Window Header: Traffic light dots & match count */}
      <div className="flex items-center justify-between">
        <div className="align">
          <span className="red" />
          <span className="yellow" />
          <span className="green" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono font-bold text-ai-silver bg-black/50 px-2 py-0.5 rounded border border-white/10">
            {stats.matches} Matches
          </span>
          <span className="text-[8px] font-mono font-black text-ai-cyan uppercase tracking-wider hidden sm:inline">
            // T20_AI
          </span>
        </div>
      </div>

      {/* 2. Cyber Heading */}
      <h1>
        {isExpanded ? 'CAREER TELEMETRY' : 'HOVER FOR STATS'}
      </h1>

      {/* 3. Teaser Preview (Visible before hover / expand) */}
      <p className="uiverse-stats-teaser text-center font-mono text-xs text-ai-slate truncate">
        {isBatter && (
          <span>AVG: <strong className="text-amber-300 font-bold">{stats.battingAvg ?? 'N/A'}</strong> • SR: <strong className="text-ai-lime font-bold">{stats.strikeRate ?? 'N/A'}</strong></span>
        )}
        {isBowler && (
          <span>ECON: <strong className="text-ai-cyan font-bold">{stats.bowlingEconomy ?? 'N/A'}</strong> • WKTS: <strong className="text-rose-400 font-bold">{stats.wickets ?? 'N/A'}</strong></span>
        )}
        {!isBatter && !isBowler && (
          <span>AVG: <strong className="text-amber-300 font-bold">{stats.battingAvg ?? 'N/A'}</strong> • ECON: <strong className="text-ai-cyan font-bold">{stats.bowlingEconomy ?? 'N/A'}</strong></span>
        )}
      </p>

      {/* 4. Expanded Full Career Telemetry Metrics */}
      <div className="uiverse-stats-content-expanded pt-1.5 space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {isBatter && (
            <>
              <div className="bg-black/60 border border-white/10 rounded-lg p-1.5">
                <p className="text-[8px] uppercase text-ai-slate font-mono font-bold flex items-center gap-1">
                  <Target className="w-2.5 h-2.5 text-amber-400" /> BATTING AVG
                </p>
                <p className="text-sm font-black text-amber-300 font-mono">
                  {stats.battingAvg ? `${stats.battingAvg}` : 'N/A'}
                </p>
              </div>

              <div className="bg-black/60 border border-white/10 rounded-lg p-1.5">
                <p className="text-[8px] uppercase text-ai-slate font-mono font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-[#D4F636]" /> STRIKE RATE
                </p>
                <p className="text-sm font-black text-ai-lime font-mono">
                  {stats.strikeRate ? `${stats.strikeRate}` : 'N/A'}
                </p>
              </div>

              {stats.runs && (
                <div className="col-span-2 bg-black/60 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between text-[11px]">
                  <span className="text-ai-slate font-mono font-bold uppercase text-[8px]">// CAREER RUNS</span>
                  <span className="font-black text-ai-silver font-mono">
                    {stats.runs} {stats.highestScore ? `(High: ${stats.highestScore})` : ''}
                  </span>
                </div>
              )}

              {(stats.fifties !== undefined || stats.hundreds !== undefined) && (
                <div className="col-span-2 bg-black/60 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between text-[11px]">
                  <span className="text-ai-slate font-mono font-bold uppercase text-[8px]">// 50s / 100s</span>
                  <span className="font-black text-amber-300 font-mono">
                    {stats.fifties ?? 0} fifties • {stats.hundreds ?? 0} centuries
                  </span>
                </div>
              )}
            </>
          )}

          {isBowler && (
            <>
              <div className="bg-black/60 border border-white/10 rounded-lg p-1.5">
                <p className="text-[8px] uppercase text-ai-slate font-mono font-bold flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-cyan-400" /> ECONOMY
                </p>
                <p className="text-sm font-black text-ai-cyan font-mono">
                  {stats.bowlingEconomy ? `${stats.bowlingEconomy}` : 'N/A'}
                </p>
              </div>

              <div className="bg-black/60 border border-white/10 rounded-lg p-1.5">
                <p className="text-[8px] uppercase text-ai-slate font-mono font-bold flex items-center gap-1">
                  <Target className="w-2.5 h-2.5 text-rose-400" /> WICKETS
                </p>
                <p className="text-sm font-black text-rose-400 font-mono">
                  {stats.wickets ? `${stats.wickets}` : 'N/A'}
                </p>
              </div>

              {stats.bestBowling && (
                <div className="col-span-2 bg-black/60 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between text-[11px]">
                  <span className="text-ai-slate font-mono font-bold uppercase text-[8px]">// BEST FIGURES</span>
                  <span className="font-black text-ai-silver font-mono">{stats.bestBowling}</span>
                </div>
              )}

              {stats.bowlingAvg && (
                <div className="col-span-2 bg-black/60 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between text-[11px]">
                  <span className="text-ai-slate font-mono font-bold uppercase text-[8px]">// BOWLING AVG</span>
                  <span className="font-black text-cyan-300 font-mono">{stats.bowlingAvg}</span>
                </div>
              )}
            </>
          )}

          {!isBatter && !isBowler && (
            /* All-Rounder Stats */
            <>
              <div className="bg-black/60 border border-white/10 rounded-lg p-1.5">
                <p className="text-[8px] uppercase text-ai-slate font-mono font-bold">AVG / SR</p>
                <p className="text-xs font-black text-amber-300 font-mono">
                  {stats.battingAvg ?? '-'} / <span className="text-ai-lime">{stats.strikeRate ?? '-'}</span>
                </p>
              </div>

              <div className="bg-black/60 border border-white/10 rounded-lg p-1.5">
                <p className="text-[8px] uppercase text-ai-slate font-mono font-bold">ECON / WKTS</p>
                <p className="text-xs font-black text-ai-cyan font-mono">
                  {stats.bowlingEconomy ?? '-'} / <span className="text-rose-400">{stats.wickets ?? '-'}</span>
                </p>
              </div>

              {stats.runs && (
                <div className="col-span-2 bg-black/60 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between text-[11px]">
                  <span className="text-ai-slate font-mono font-bold uppercase text-[8px]">// RUNS / BEST</span>
                  <span className="font-black text-ai-silver font-mono">
                    {stats.runs} R • {stats.bestBowling || 'N/A'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-[8px] font-mono text-ai-slate pt-0.5 border-t border-white/5">
          <span className="flex items-center gap-1 text-ai-cyan">
            <TrendingUp className="w-2.5 h-2.5" /> OFFICIAL_T20_DATA
          </span>
          <span className="text-ai-lime/70">
            [CLICK TO {isExpanded ? 'COLLAPSE' : 'PIN'}]
          </span>
        </div>
      </div>
    </div>
  );
};
