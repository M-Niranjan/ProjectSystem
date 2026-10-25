import React from 'react';

export interface ChatNotificationBadgeProps {
  count?: number;
  hasUnread?: boolean;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showPulse?: boolean;
}

/**
 * Premium Chat Notification Indicator Badge
 * 
 * Features:
 * - Dynamic display: shows counts (e.g. '1', '5', '9+') or a glowing indicator dot
 * - Glassmorphism aesthetics with subtle shadow, ring isolation, and soft vibrant gradient
 * - Gentle pulse micro-animation when unread messages are present
 * - Visible in both Light and Dark themes
 * - Responsive across desktop, tablet, and mobile
 */
export const ChatNotificationBadge: React.FC<ChatNotificationBadgeProps> = ({
  count = 0,
  hasUnread = false,
  max = 9,
  size = 'sm',
  className = '',
  showPulse = true,
}) => {
  const isCountVisible = typeof count === 'number' && count > 0;
  const isDotVisible = !isCountVisible && Boolean(hasUnread);

  if (!isCountVisible && !isDotVisible) return null;

  const displayCount = count > max ? `${max}+` : String(count);

  if (isDotVisible) {
    const dotSizeClass = size === 'xs' ? 'h-2 w-2' : size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';
    return (
      <span className={`relative inline-flex items-center justify-center shrink-0 ${dotSizeClass} ${className}`}>
        {showPulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full ${dotSizeClass} bg-gradient-to-tr from-cyan-400 to-blue-500 ring-2 ring-white dark:ring-[#070913] shadow-[0_0_8px_rgba(6,182,212,0.8)]`} />
      </span>
    );
  }

  // Count pill badge with glassmorphic glow
  const sizeClasses = {
    xs: 'min-w-[15px] h-[15px] px-1 text-[8.5px]',
    sm: 'min-w-[18px] h-[18px] px-1.5 text-[9.5px]',
    md: 'min-w-[21px] h-[21px] px-1.5 text-[11px]',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-black text-white leading-none tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] dark:shadow-[0_0_12px_rgba(99,102,241,0.7)] border border-white/30 dark:border-white/20 ring-2 ring-white dark:ring-[#070913] select-none ${showPulse ? 'animate-pulse' : ''} ${sizeClasses} ${className}`}
    >
      {displayCount}
    </span>
  );
};

export default ChatNotificationBadge;
