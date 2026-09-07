import React, { useState } from 'react';
import { RoomState, TeamId, RoomTeam } from '../types/auction';
import { TEAMS, ALL_TEAM_IDS } from '../data/teams';
import {
  Users,
  Copy,
  Check,
  Play,
  User,
  Cpu,
  ArrowLeft,
  Share2
} from 'lucide-react';

interface LobbyViewProps {
  roomState: RoomState;
  mySessionId: string;
  onSelectTeam: (teamId: TeamId) => void;
  onStartAuction: () => void;
  onLeaveRoom: () => void;
  onOpenPlayers?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomState,
  mySessionId,
  onSelectTeam,
  onStartAuction,
  onLeaveRoom,
  onOpenPlayers
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = roomState.hostSessionId === mySessionId;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const humanPlayersCount = (Object.values(roomState.teams) as RoomTeam[]).filter(
    (t) => t.controllerType === 'HUMAN'
  ).length;

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 max-w-6xl mx-auto w-full select-none">
      {/* Lobby Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
        <div>
          <button
            onClick={onLeaveRoom}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase text-white/50 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white">
            Multiplayer <span className="text-blue-500">Room Lobby</span>
          </h2>
          <p className="text-sm text-white/60">
            Share the room code with friends. Anyone can claim an available IPL franchise!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenPlayers && (
            <button
              onClick={onOpenPlayers}
              className="bg-white/5 hover:bg-white/10 active:scale-95 border border-cyan-400/40 text-cyan-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Pool Register (60)</span>
            </button>
          )}

          <div className="bg-black/60 border border-white/10 px-4 py-2.5 rounded-xl flex items-center gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-white/40 block">
                Room Code
              </span>
              <span className="text-xl font-mono font-black text-blue-400 tracking-widest">
                {roomState.roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white/80 transition-colors"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {isHost ? (
            <button
              onClick={onStartAuction}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl uppercase italic tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Live Auction</span>
            </button>
          ) : (
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-center">
              <span className="text-xs font-bold text-white/60 uppercase">
                Waiting for host to start...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 6 Franchises Assignment Grid */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-950/30 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            6 IPL Franchises ({humanPlayersCount} Human {humanPlayersCount === 1 ? 'Manager' : 'Managers'}, {6 - humanPlayersCount} AI {6 - humanPlayersCount === 1 ? 'Bot' : 'Bots'})
          </h3>
        </div>
        <span className="text-xs text-blue-300/80 font-medium flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>Remaining unselected teams will bid automatically as AI Bots</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ALL_TEAM_IDS.map((tId) => {
          const team = roomState.teams[tId];
          if (!team) return null;

          const isMyTeam = team.sessionId === mySessionId;
          const isHuman = team.controllerType === 'HUMAN';

          return (
            <div
              key={tId}
              onClick={() => onSelectTeam(tId)}
              className={`rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between min-h-[190px] relative overflow-hidden ${
                isMyTeam
                  ? 'bg-blue-600/15 border-blue-500 shadow-xl shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border border-white/20 text-white shadow"
                  style={{ backgroundColor: TEAMS[tId].primaryColor }}
                >
                  {TEAMS[tId].abbr}
                </div>

                <div
                  className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isMyTeam
                      ? 'bg-blue-600 text-white shadow'
                      : isHuman
                      ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                      : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  {isHuman ? <User className="w-3 h-3" /> : <Cpu className="w-3 h-3 text-purple-400" />}
                  <span>{isMyTeam ? 'You' : isHuman ? team.participantName : `AI Bot`}</span>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-lg font-black uppercase italic tracking-tight text-white">
                  {TEAMS[tId].name}
                </h4>
                <p className="text-xs text-white/60 mt-1">
                  {isHuman
                    ? isMyTeam
                      ? 'You are managing this franchise'
                      : `Managed by ${team.participantName}`
                    : `🤖 AI Bot Strategy: ${team.botPersonality || 'BALANCED'}`}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-yellow-400">
                  ₹50.00 Cr Purse
                </span>
                {!isMyTeam && (
                  <span className="text-xs text-blue-400 font-bold uppercase tracking-wider group-hover:underline">
                    Claim Team →
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
