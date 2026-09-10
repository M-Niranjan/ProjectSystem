import React, { useState } from 'react';
import { X, Smile, Sparkles, ThumbsUp, Heart, Flame, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const EMOJI_CATEGORIES = [
  {
    name: 'Frequent',
    icon: ThumbsUp,
    emojis: ['👍', '❤️', '😊', '🎉', '🚀', '🔥', '👏', '✅', '💡', '📝', '📁', '💻'],
  },
  {
    name: 'Reactions',
    icon: Heart,
    emojis: ['😍', '🤣', '😭', '🤯', '🥳', '😎', '🤩', '🤔', '👀', '🙌', '💯', '🤝'],
  },
  {
    name: 'Work',
    icon: Zap,
    emojis: ['📊', '📈', '🎯', '💬', '✨', '⚡', '📌', '🔍', '⚙️', '🏆', '🔔', '🌐'],
  },
];

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPickerPopover({ onSelectEmoji, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.15 }}
      className="absolute right-12 bottom-16 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 rounded-3xl p-3.5 shadow-2xl z-50 text-slate-900 dark:text-white select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Smile className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-black uppercase tracking-wider">Emoji Reactions</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-2.5 bg-slate-100/70 dark:bg-slate-800/70 p-1 rounded-xl">
        {EMOJI_CATEGORIES.map((cat, idx) => {
          const Icon = cat.icon;
          const isActive = activeCategory === idx;
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(idx)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-6 gap-1.5 max-h-44 overflow-y-auto p-1">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-transform hover:scale-125 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
