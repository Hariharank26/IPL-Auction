/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuctionEngine } from './hooks/useAuctionEngine';
import { Navbar } from './components/Navbar';
import { RulesModal } from './components/RulesModal';
import { TeamSelector } from './components/TeamSelector';
import { LobbyView } from './components/LobbyView';
import { PlayerCard, MobilePlayerBar } from './components/PlayerCard';
import { BidPanel } from './components/BidPanel';
import { TeamPanel } from './components/TeamPanel';
import { TeamStatusBar } from './components/TeamStatusBar';
import { SoldOverlay, UnsoldOverlay } from './components/AuctionOverlays';
import { ResultsView } from './components/ResultsView';
import { MultiplayerJoinModal } from './components/MultiplayerJoinModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PlayerCatalogModal } from './components/PlayerCatalogModal';
import { AuctionChat } from './components/AuctionChat';
import { SeasonSimulationView } from './components/SeasonSimulationView';
import { PLAYERS_POOL } from './data/players';
import { TeamId, RoomTeam, AuctionSessionFormat } from './types/auction';
import { Zap, Gavel, BarChart2, Shield, Users, ArrowLeft } from 'lucide-react';
import { TEAMS } from './data/teams';
import { AUCTION_CONFIG } from './data/config';

type MobileAuctionTab = 'AUCTION' | 'PLAYER' | 'SQUAD' | 'TEAMS';

export default function App() {
  const {
    roomState,
    gameMode,
    squadConstraints,
    mySessionId,
    myTeamId,
    myTeam,
    teams,
    currentPlayer,
    currentBid,
    highestBidderTeamId,
    highestBidderName,
    bidHistory,
    lastActionMessage,
    countdownSeconds,
    soldOverlayData,
    unsoldOverlayData,
    dismissSoldOverlay,
    dismissUnsoldOverlay,
    isSoundEnabled,
    toggleSound,
    startSinglePlayer,
    createMultiplayerRoom,
    joinMultiplayerRoom,
    claimTeamInLobby,
    startAuction,
    placeBid,
    sendChat,
    restartAuction,
    leaveRoom,
    concludeAuction
  } = useAuctionEngine();

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isPlayersModalOpen, setIsPlayersModalOpen] = useState(false);
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSeasonSimOpen, setIsSeasonSimOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileAuctionTab>('AUCTION');

  // Auto-switch to auction tab when a new player reveal starts so the user never misses a bid
  useEffect(() => {
    if (roomState.auctionState === 'PLAYER_REVEAL' || roomState.auctionState === 'BIDDING') {
      // Optional auto-focus to auction
    }
  }, [currentPlayer?.id, roomState.auctionState]);

  // Global keyboard shortcut for sound toggle (Space key)
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

      if (e.code === 'Space') {
        e.preventDefault();
        toggleSound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSound]);

  const handleCreateRoom = (username: string, teamId: TeamId, format?: AuctionSessionFormat) => {
    createMultiplayerRoom(username, teamId, format);
    setIsMultiplayerModalOpen(false);
  };

  const handleJoinRoom = (roomCode: string, username: string) => {
    const success = joinMultiplayerRoom(roomCode, username);
    if (success) {
      setIsMultiplayerModalOpen(false);
    } else {
      alert('Room not found! Please check the 6-character room code.');
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#030305] bg-stadium-mesh text-[#f1f2f4] flex flex-col font-sans selection:bg-[#D4F636] selection:text-black relative">
      {/* Navbar header */}
      <Navbar
        isSoundEnabled={isSoundEnabled}
        onToggleSound={toggleSound}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenPlayers={() => setIsPlayersModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        roomCode={roomState.roomCode}
        myTeam={myTeam}
        onLeave={roomState.status !== 'HOME' ? () => { setIsSeasonSimOpen(false); leaveRoom(); } : undefined}
        onConcludeAuction={(roomState.status === 'AUCTION' || roomState.status === 'ACTIVE') ? concludeAuction : undefined}
      />

      {/* Main Container based on roomState.status */}
      <main className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex-1 flex flex-col relative z-10 overflow-hidden min-h-0">
        {roomState.status === 'HOME' && (
          <TeamSelector
            onStartSinglePlayer={(username, teamId, format) => {
              startSinglePlayer(username, teamId, format);
            }}
            onCreateMultiplayerRoom={(username, teamId, format) => {
              createMultiplayerRoom(username, teamId, format);
            }}
            onJoinMultiplayerRoom={(roomCode, username) => {
              const success = joinMultiplayerRoom(roomCode, username);
              if (!success) {
                alert('Room not found! Please check the 6-character room code.');
              }
            }}
            onGoToMultiplayer={() => setIsMultiplayerModalOpen(true)}
            onOpenPlayers={() => setIsPlayersModalOpen(true)}
          />
        )}

        {roomState.status === 'LOBBY' && (
          <LobbyView
            roomState={roomState}
            mySessionId={mySessionId}
            onSelectTeam={claimTeamInLobby}
            onStartAuction={startAuction}
            onLeaveRoom={leaveRoom}
            onOpenPlayers={() => setIsPlayersModalOpen(true)}
          />
        )}

        {(roomState.status === 'AUCTION' || roomState.status === 'ACTIVE') && (
          <div className="flex-1 flex flex-col justify-between max-w-[1700px] w-full mx-auto px-2 sm:px-4 md:px-6 py-1.5 sm:py-2.5 overflow-hidden min-h-0 gap-2">
            {/* Accelerated Round Banner */}
            {roomState.isAcceleratedRound && (
              <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white font-black py-1 px-3 text-center text-[10px] sm:text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 animate-pulse rounded-lg border border-amber-300/40 shrink-0">
                <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                <span>⚡ ACCELERATED ROUND — 50% DISCOUNTED BASE PRICE!</span>
              </div>
            )}

            {/* 📱 MOBILE VIEW NAVIGATION TABS (Visible only on screens < lg) */}
            <div className="flex lg:hidden items-center justify-between bg-black/70 border border-white/15 rounded-xl p-1 shrink-0 gap-1 select-none shadow-lg">
              <button
                type="button"
                onClick={() => setMobileTab('AUCTION')}
                className={`flex-1 min-h-[40px] py-1.5 px-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  mobileTab === 'AUCTION'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400/40'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>Auction</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('PLAYER')}
                className={`flex-1 min-h-[40px] py-1.5 px-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  mobileTab === 'PLAYER'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400/40'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('SQUAD')}
                className={`flex-1 min-h-[40px] py-1.5 px-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  mobileTab === 'SQUAD'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400/40'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>
                  Squad ({myTeam ? myTeam.squad.length : 0}/{squadConstraints.maxSquad})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('TEAMS')}
                className={`flex-1 min-h-[40px] py-1.5 px-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  mobileTab === 'TEAMS'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400/40'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>6 Teams</span>
              </button>
            </div>

            {/* 📱 MOBILE TAB CONTENT (screens < lg) */}
            <div className="flex lg:hidden flex-1 flex-col min-h-0 overflow-y-auto gap-2 pb-2">
              {mobileTab === 'AUCTION' && (
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                  {/* Compact Player Summary Header */}
                  <MobilePlayerBar
                    player={currentPlayer}
                    totalPoolCount={PLAYERS_POOL.length}
                    onOpenStats={() => setMobileTab('PLAYER')}
                  />

                  {/* Main Live Bidding Board */}
                  <div className="flex-1 flex flex-col justify-between min-h-0">
                    <BidPanel
                      auctionState={roomState.auctionState}
                      player={currentPlayer}
                      currentBid={currentBid}
                      highestBidderTeamId={highestBidderTeamId}
                      highestBidderName={highestBidderName}
                      myTeam={myTeam}
                      bidHistory={bidHistory}
                      countdownSeconds={countdownSeconds}
                      onPlaceBid={placeBid}
                      lastActionMessage={lastActionMessage}
                      onToggleSound={toggleSound}
                    />
                  </div>

                  {/* Quick Reactions & Chat Drawer */}
                  <AuctionChat
                    chatMessages={roomState.chatMessages || []}
                    onSendChat={sendChat}
                    myTeamId={myTeamId}
                    myTeamName={myTeam?.participantName}
                  />
                </div>
              )}

              {mobileTab === 'PLAYER' && (
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                  <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-xl border border-white/10 shrink-0">
                    <span className="text-xs font-bold text-white/80">Player Profile & T20 Stats</span>
                    <button
                      type="button"
                      onClick={() => setMobileTab('AUCTION')}
                      className="text-xs text-blue-300 font-bold flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/40 px-2.5 py-1 rounded-lg hover:bg-blue-600/30 active:scale-95 cursor-pointer shadow"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Bid
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <PlayerCard
                      player={currentPlayer}
                      totalPoolCount={PLAYERS_POOL.length}
                      currentIndex={currentPlayer?.sequence || 1}
                    />
                  </div>
                </div>
              )}

              {mobileTab === 'SQUAD' && (
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                  <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-xl border border-white/10 shrink-0">
                    <span className="text-xs font-bold text-white/80">My Franchise Squad & Roster</span>
                    <button
                      type="button"
                      onClick={() => setMobileTab('AUCTION')}
                      className="text-xs text-blue-300 font-bold flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/40 px-2.5 py-1 rounded-lg hover:bg-blue-600/30 active:scale-95 cursor-pointer shadow"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Bid
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TeamPanel
                      myTeam={myTeam}
                      teams={teams}
                      countdownSeconds={countdownSeconds}
                      isBiddingOpen={roomState.auctionState === 'BIDDING'}
                      gameMode={gameMode}
                    />
                  </div>
                </div>
              )}

              {mobileTab === 'TEAMS' && (
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                  <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-xl border border-white/10 shrink-0">
                    <span className="text-xs font-bold text-white/80">All 6 Franchises Status</span>
                    <button
                      type="button"
                      onClick={() => setMobileTab('AUCTION')}
                      className="text-xs text-blue-300 font-bold flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/40 px-2.5 py-1 rounded-lg hover:bg-blue-600/30 active:scale-95 cursor-pointer shadow"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Bid
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto p-0.5">
                    {(Object.values(teams) as RoomTeam[]).map((team) => {
                      const isLeading = highestBidderTeamId === team.teamId;
                      const isMyTeam = myTeamId === team.teamId;
                      const squadSize = team.squad.length;
                      return (
                        <div
                          key={team.teamId}
                          className={`p-3 rounded-xl border flex items-center gap-3 ${
                            isLeading
                              ? 'bg-blue-600/20 border-blue-500 shadow-md'
                              : isMyTeam
                              ? 'bg-white/10 border-white/30'
                              : 'bg-black/50 border-white/10'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow"
                            style={{ backgroundColor: team.teamConfig.primaryColor }}
                          >
                            {team.teamConfig.abbr}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-black text-xs uppercase truncate text-white">
                                {team.teamConfig.name}
                              </span>
                              {isLeading && (
                                <span className="text-[9px] bg-blue-500 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                                  Leading
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/60">Purse: <strong className="text-white font-black">₹{(team.remainingPurse / 100).toFixed(2)} Cr</strong></span>
                              <span className="text-white/60">Squad: <strong className="text-white font-bold">{squadSize}/{squadConstraints.maxSquad}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 🖥️ DESKTOP 3-COLUMN GRID (Visible on screens >= lg) */}
            <div className="hidden lg:grid grid-cols-[280px_1fr_280px] xl:grid-cols-[300px_1fr_300px] gap-3 flex-1 min-h-0">
              {/* Left Column: Current Player Card */}
              <PlayerCard
                player={currentPlayer}
                totalPoolCount={PLAYERS_POOL.length}
                currentIndex={currentPlayer?.sequence || 1}
                onOpenCatalog={() => setIsPlayersModalOpen(true)}
              />

              {/* Center Column: Live Bidding Board & Timer Controls + Auction Chat */}
              <div className="flex flex-col gap-2.5 flex-1 min-h-0 justify-between">
                <BidPanel
                  auctionState={roomState.auctionState}
                  player={currentPlayer}
                  currentBid={currentBid}
                  highestBidderTeamId={highestBidderTeamId}
                  highestBidderName={highestBidderName}
                  myTeam={myTeam}
                  bidHistory={bidHistory}
                  countdownSeconds={countdownSeconds}
                  onPlaceBid={placeBid}
                  lastActionMessage={lastActionMessage}
                  onToggleSound={toggleSound}
                />

                <AuctionChat
                  chatMessages={roomState.chatMessages || []}
                  onSendChat={sendChat}
                  myTeamId={myTeamId}
                  myTeamName={myTeam?.participantName}
                />
              </div>

              {/* Right Column: User's Team Status & Squad Roster */}
              <TeamPanel
                myTeam={myTeam}
                teams={teams}
                countdownSeconds={countdownSeconds}
                isBiddingOpen={roomState.auctionState === 'BIDDING'}
                gameMode={gameMode}
              />
            </div>

            {/* Bottom Franchise Standings Bar (Desktop only) */}
            <div className="hidden lg:block shrink-0">
              <TeamStatusBar
                teams={teams}
                highestBidderTeamId={highestBidderTeamId}
                myTeamId={myTeamId}
                gameMode={gameMode}
              />
            </div>
          </div>
        )}

        {(roomState.status === 'RESULTS' || roomState.status === 'COMPLETED') && (
          isSeasonSimOpen ? (
            <SeasonSimulationView
              roomState={roomState}
              onBackToResults={() => setIsSeasonSimOpen(false)}
            />
          ) : (
            <ResultsView
              teams={teams}
              completionReason={roomState.completionReason}
              onRestartAuction={() => {
                setIsSeasonSimOpen(false);
                restartAuction();
              }}
              onOpenProfile={() => setIsProfileOpen(true)}
              onStartSeasonSimulation={() => setIsSeasonSimOpen(true)}
            />
          )
        )}
      </main>

      {/* Overlays for Sold and Unsold Players */}
      {soldOverlayData && roomState.status !== 'RESULTS' && roomState.status !== 'COMPLETED' && roomState.auctionState !== 'COMPLETED' && (
        <SoldOverlay
          player={soldOverlayData.player}
          winnerTeam={soldOverlayData.winnerTeam}
          soldPrice={soldOverlayData.soldPrice}
          onDismiss={dismissSoldOverlay}
        />
      )}

      {unsoldOverlayData && roomState.status !== 'RESULTS' && roomState.status !== 'COMPLETED' && roomState.auctionState !== 'COMPLETED' && (
        <UnsoldOverlay
          player={unsoldOverlayData.player}
          onDismiss={dismissUnsoldOverlay}
        />
      )}

      {/* Official IPL Auction Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Official Master Player Pool Register Modal */}
      <PlayerCatalogModal
        isOpen={isPlayersModalOpen}
        onClose={() => setIsPlayersModalOpen(false)}
        roomState={roomState}
      />

      {/* Multiplayer Join / Create Room Modal */}
      <MultiplayerJoinModal
        isOpen={isMultiplayerModalOpen}
        onClose={() => setIsMultiplayerModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />

      {/* User Career Profile, Stats & Firestore Tournament History Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

