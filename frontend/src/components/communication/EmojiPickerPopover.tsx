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
      className="absolute right-0 sm:right-2 bottom-14 w-[calc(100vw-2.5rem)] sm:w-80 max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 rounded-3xl p-3 sm:p-3.5 shadow-2xl z-50 text-slate-900 dark:text-white select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Smile className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black tracking-tight">Express Reactions</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Close emoji picker"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-2.5">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
          >
            ×
          </button>
        )}
      </div>

      {/* Category Pills (only if not searching) */}
      {!search && (
        <div className="flex gap-1 mb-2 bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl">
          {EMOJI_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            const isActive = activeCategory === idx;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(idx)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/10'
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
      <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
        {displayedEmojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-blue-500/15 rounded-xl transition-all hover:scale-125 active:scale-95 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
