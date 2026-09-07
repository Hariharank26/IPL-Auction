import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SoundToggleSwitchProps {
  isMuted: boolean;
  onToggle: () => void;
  id?: string;
}

export const SoundToggleSwitch: React.FC<SoundToggleSwitchProps> = ({
  isMuted,
  onToggle,
  id = 'sound-toggle-switch'
}) => {
  return (
    <button
      id={id}
      type="button"
      onClick={onToggle}
      className={`relative w-8 h-8 sm:w-auto sm:h-auto p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-95 shrink-0 min-h-[34px] sm:min-h-[36px] border ${
        isMuted
          ? 'bg-[#141014] hover:bg-[#1f161f] border-red-500/30 text-red-400'
          : 'bg-[#0b0c10] hover:bg-[#14151f] border-white/[0.08] hover:border-[#D4F636]/40 text-[#D4F636]'
      }`}
      title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
      aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
    >
      {isMuted ? (
        <VolumeX className="w-4 h-4 text-red-400 shrink-0" />
      ) : (
        <Volume2 className="w-4 h-4 text-[#D4F636] shrink-0" />
      )}
      <span className="hidden sm:inline font-mono text-xs">
        {isMuted ? 'Muted' : 'Sound'}
      </span>
    </button>
  );
};
