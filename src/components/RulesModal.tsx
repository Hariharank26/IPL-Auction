import React from 'react';
import { X, ShieldAlert, DollarSign, Users, Trophy, Cpu } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1015] border border-white/20 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-red-600/20 text-red-500 p-2 rounded-lg font-black uppercase">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase italic tracking-wider">
                Official IPL Auction Rules
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-widest">
                No Purse Protection • Strict Elimination
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

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-white/80">
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Users className="w-4 h-4" /> 1. Franchises & Purse
            </h3>
            <p>
              There are exactly <strong className="text-white">6 IPL Franchises</strong> (MI, CSK, RCB, SRH, GT, KKR). Each franchise starts with a total purse of <strong className="text-yellow-400 font-mono">₹50.00 Cr</strong>.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> 2. Player Pool & Roles
            </h3>
            <p>
              The player pool consists of <strong className="text-white">60 international stars</strong> (<strong className="text-green-400">40 Indian</strong> + <strong className="text-purple-400">20 Overseas</strong>) categorized into Legends, Current Stars, and Youngsters across 5 roles (Batsman, Wicketkeeper, All-rounder, Fast Bowler, Spin Bowler).
            </p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> 3. Elimination Below 5 Players (Critical Rule)
            </h3>
            <p>
              A valid squad requires <strong className="text-white">between 5 and 7 players</strong>. Any team that finishes the auction with <strong className="text-red-400 underline">0 to 4 players is immediately ELIMINATED</strong> from championship contention.
            </p>
            <p className="text-xs text-white/60">
              * Note: There is <strong className="text-white">no automatic purse-protection</strong> rule. You can spend ₹45 Cr on Virat Kohli if you wish, but you must manage your budget to secure at least 5 players!
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> 4. AI Bot Personalities
            </h3>
            <p>
              In Single Player or unfilled Multiplayer rooms, unselected teams are controlled by <strong className="text-white">AI Bots</strong> with distinct personalities (<strong className="text-yellow-400">Aggressive, Star Collector, Youth Scout, Value Hunter, Balanced</strong>). They evaluate market prices and bid dynamically.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> 5. Bidding & Timer
            </h3>
            <p>
              Each player is auctioned with a live 12-second countdown. Valid late bids within the final 3 seconds automatically extend the timer by 4 seconds to allow counter-bidding.
            </p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> 6. Winner Decided on Top 5 Picks
            </h3>
            <p>
              At the conclusion of the auction, the <strong className="text-white">Tournament Winner</strong> is calculated and announced based on the <strong className="text-yellow-400">combined overall rating of each qualified franchise's Top 5 Picks</strong>. Build the strongest core starting 5 to claim the championship!
            </p>
          </div>
        </div>

        <div className="p-6 bg-black/40 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-white transition-colors"
          >
            Got It, Let's Bid
          </button>
        </div>
      </div>
    </div>
  );
};
