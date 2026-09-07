import React from 'react';
import { TeamConfig } from '../types/auction';
import { Check, User, Cpu } from 'lucide-react';

interface TeamCardProps {
  team: TeamConfig;
  isSelected: boolean;
  onSelect: () => void;
  controllerName?: string;
  controllerType?: 'HUMAN' | 'BOT';
  disabled?: boolean;
  startingPurseCr?: number;
  maxSquad?: number;
  minSquad?: number;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  isSelected,
  onSelect,
  controllerName,
  controllerType,
  disabled,
  startingPurseCr = 50,
  maxSquad = 7,
  minSquad = 5
}) => {
  return (
    <div
      onClick={() => !disabled && onSelect()}
      className={`relative group rounded-2xl p-5 border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
        isSelected
          ? 'bg-[#0c0d12] border-2 border-[#D4F636] shadow-[0_0_25px_rgba(212,246,54,0.18)] ring-1 ring-[#D4F636]/30 scale-[1.01]'
          : 'bg-[#07080b]/90 border border-white/[0.08] hover:border-white/20 hover:bg-[#0c0d12]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Subtle Background Glow */}
      <div
        className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40"
        style={{ backgroundColor: team.primaryColor }}
      />

      <div className="flex items-start justify-between">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border border-white/20 shadow-lg font-display"
          style={{ backgroundColor: team.primaryColor }}
        >
          {team.abbr}
        </div>

        {isSelected ? (
          <div className="bg-[#D4F636] text-black text-[10px] px-2.5 py-1 rounded-md font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(212,246,54,0.4)]">
            <Check className="w-3 h-3 text-black stroke-[3]" /> [ :SELECTED ]
          </div>
        ) : controllerType ? (
          <div
            className={`text-[10px] px-2.5 py-1 rounded-md font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
              controllerType === 'HUMAN'
                ? 'bg-[#D4F636]/20 text-ai-lime border border-[#D4F636]/40'
                : 'bg-purple-950/40 text-ai-violet border border-purple-500/40 shadow-sm'
            }`}
          >
            {controllerType === 'HUMAN' ? <User className="w-3 h-3" /> : <Cpu className="w-3 h-3 text-purple-400" />}
            {controllerType === 'BOT' ? `[ :AI_BOT ] ${team.abbr}` : controllerName || 'HUMAN'}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <span className="text-[10px] uppercase font-mono font-bold text-ai-slate tracking-widest">
          // FRANCHISE
        </span>
        <h3 className="text-xl font-bold text-ai-silver mt-0.5 font-display tracking-tight">
          {team.name}
        </h3>
        <p className="text-xs text-ai-slate mt-1 line-clamp-2 font-body">
          {team.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-ai-slate tracking-widest">
            // STARTING PURSE
          </span>
          <p className="text-sm font-mono font-black text-ai-lime">
            ₹{startingPurseCr.toFixed(2)} Cr
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-mono font-bold text-ai-slate tracking-widest">
            // SQUAD TARGET
          </span>
          <p className="text-sm font-mono font-black text-ai-silver">
            {maxSquad} (Min {minSquad})
          </p>
        </div>
      </div>

      <div className="mt-3.5">
        <div
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isSelected
              ? 'bg-[#D4F636] text-black shadow-[0_0_20px_rgba(212,246,54,0.35)]'
              : 'bg-white/5 group-hover:bg-[#D4F636] text-ai-silver group-hover:text-black border border-white/10 group-hover:border-[#D4F636]'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
              <span>COMMAND {team.abbr} • ENTER ARENA →</span>
            </>
          ) : (
            <span>COMMAND {team.abbr} →</span>
          )}
        </div>
      </div>
    </div>
  );
};
