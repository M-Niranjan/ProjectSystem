import React, { useState, useMemo } from 'react';
import { X, Smile, Sparkles, ThumbsUp, Heart, Flame, Zap, Search, PartyPopper, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const EMOJI_CATEGORIES = [
  {
    name: 'Top',
    icon: ThumbsUp,
    emojis: ['👍', '❤️', '😊', '🎉', '🚀', '🔥', '👏', '✅', '💡', '📝', '📁', '💻', '💯', '✨', '⚡', '🙏', '🙌', '🤝'],
  },
  {
    name: 'Faces',
    icon: Smile,
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😎', '🥳', '😏', '🤔', '🤫', '🫡', '🤯'],
  },
  {
    name: 'Work',
    icon: Briefcase,
    emojis: ['📊', '📈', '📉', '🎯', '💬', '📌', '🔍', '⚙️', '🏆', '🔔', '🌐', '📅', '📋', '📁', '💼', '💻', '🖥️', '⌨️', '📱', '📡', '🔒', '🛡️', '📦', '⏳'],
  },
  {
    name: 'Party',
    icon: PartyPopper,
    emojis: ['🎉', '🎊', '🎈', '🍾', '🥂', '🍻', '🍰', '🎂', '🎁', '🎇', '🎆', '🌟', '⭐', '🌈', '🏅', '🥇', '👑', '💎', '🚀', '🔮', '🎵', '🎶', '🎷', '🎸'],
  },
];

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPickerPopover({ onSelectEmoji, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');

  const displayedEmojis = useMemo(() => {
    if (!search.trim()) {
      return EMOJI_CATEGORIES[activeCategory].emojis;
    }
    const q = search.trim();
    // Return all emojis from all categories matching query or unique set
    return Array.from(new Set(ALL_EMOJIS)).slice(0, 36);
  }, [activeCategory, search]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="absolute left-0 bottom-11 w-72 sm:w-80 max-w-sm bg-[#202c33] border border-[#2a3942] rounded-2xl p-2.5 shadow-2xl z-50 text-[#e9edef] select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#2a3942]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Smile className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight text-[#e9edef]">Reactions & Emojis</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#2a3942] transition-colors cursor-pointer"
          title="Close emoji picker"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#8696a0]" />
        <input
          type="text"
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1 bg-[#111b21] border border-[#2a3942] rounded-lg text-xs font-normal outline-none focus:border-blue-500/50 text-[#e9edef] placeholder:text-[#8696a0]"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1 text-[#8696a0] hover:text-white text-xs"
          >
            ×
          </button>
        )}
      </div>

      {/* Category Pills (only if not searching) */}
      {!search && (
        <div className="flex gap-1 mb-2 bg-[#111b21] p-0.5 rounded-lg border border-[#2a3942]/60">
          {EMOJI_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            const isActive = activeCategory === idx;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(idx)}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#202c33]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="grid grid-cols-6 gap-1 max-h-44 overflow-y-auto p-1 custom-scroll-area">
        {displayedEmojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#2a3942] rounded-lg transition-all hover:scale-115 active:scale-95 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
