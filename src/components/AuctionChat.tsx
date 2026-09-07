import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, TeamId } from '../types/auction';
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';

interface AuctionChatProps {
  chatMessages: ChatMessage[];
  onSendChat: (message: string, type?: 'CHAT' | 'REACTION' | 'SYSTEM') => void;
  myTeamId?: TeamId;
  myTeamName?: string;
}

const QUICK_REACTIONS = [
  { emoji: '🔥', label: 'War' },
  { emoji: '💰', label: 'Overpriced' },
  { emoji: '😱', label: 'Steal!' },
  { emoji: '👏', label: 'Great Buy' },
  { emoji: '🎯', label: 'Target' }
];

export const AuctionChat: React.FC<AuctionChatProps> = ({
  chatMessages,
  onSendChat,
  myTeamId,
  myTeamName
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [chatMessages, isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendChat(inputText.trim(), 'CHAT');
    setInputText('');
  };

  const handleReactionClick = (emoji: string, label: string) => {
    onSendChat(`${emoji} ${label}`, 'REACTION');
  };

  const lastMessage = chatMessages[chatMessages.length - 1];

  return (
    <div className="bg-black/50 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl backdrop-blur-md transition-all shrink-0">
      {/* Top Bar with Reactions & Toggle */}
      <div className="px-3 py-2 bg-white/5 flex items-center justify-between gap-2 select-none">
        {/* Quick Reactions */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
          <span className="text-[9px] uppercase font-black text-white/40 tracking-wider flex-shrink-0">
            Reactions:
          </span>
          {QUICK_REACTIONS.map((r) => (
            <button
              key={r.label}
              onClick={() => handleReactionClick(r.emoji, r.label)}
              className="px-2 py-1 bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-400/40 rounded-lg text-xs font-semibold text-white/90 flex items-center gap-1 transition-all flex-shrink-0 active:scale-95 cursor-pointer"
            >
              <span>{r.emoji}</span>
              <span className="text-[9px] text-white/70">{r.label}</span>
            </button>
          ))}
        </div>

        {/* Chat Drawer Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3 h-3 text-blue-400" />
          <span>Chat</span>
          {chatMessages.length > 0 && (
            <span className="bg-blue-500 text-white text-[9px] px-1 rounded-full font-mono">
              {chatMessages.length}
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Collapsed Preview Pill (shows last message if collapsed) */}
      {!isExpanded && lastMessage && (
        <div
          onClick={() => setIsExpanded(true)}
          className="px-3 py-1 bg-black/40 border-t border-white/5 text-[10px] text-white/60 flex items-center gap-1.5 truncate cursor-pointer hover:text-white transition-colors"
        >
          <span className="font-bold text-blue-400 truncate max-w-[80px]">
            {lastMessage.senderName}:
          </span>
          <span className="truncate">{lastMessage.message}</span>
        </div>
      )}

      {/* Expanded Chat Drawer */}
      {isExpanded && (
        <div className="flex flex-col h-44 sm:h-52 border-t border-white/10">
          {/* Messages list */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-sans no-scrollbar">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/30 text-[10px] italic">
                No chat messages yet. Tap a reaction above or type below!
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isSystem = msg.type === 'SYSTEM';
                const isMyMessage = msg.senderName === myTeamName || msg.teamId === myTeamId;

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="text-center py-1 px-2 rounded-lg bg-blue-950/30 border border-blue-500/20 text-blue-300 text-[10px] font-mono italic"
                    >
                      {msg.message}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      {msg.teamAbbr && (
                        <span className="text-[8px] font-black bg-white/10 text-white/80 px-1 rounded">
                          {msg.teamAbbr}
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-white/50">
                        {msg.senderName}
                      </span>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-xl max-w-[85%] text-[11px] ${
                        msg.type === 'REACTION'
                          ? 'bg-amber-500/20 border border-amber-500/30 text-amber-200 font-bold'
                          : isMyMessage
                          ? 'bg-blue-600 border border-blue-500 text-white font-medium'
                          : 'bg-white/10 border border-white/15 text-white/90'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input box */}
          <form onSubmit={handleSubmit} className="p-2 bg-black/60 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message to room..."
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-400 font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
