import { create } from 'zustand';

export interface Reaction {
  emoji: string;
  count: number;
  users: number[]; // user IDs
}

export interface ChatMessage {
  id: number;
  content: string;
  sender: {
    id: number;
    name: string;
    profilePhoto?: string;
    role?: string;
  };
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRead?: boolean;
  isPinned?: boolean;
  replyTo?: { id: number; senderName: string; content: string } | null;
  reactions?: Record<string, number[]>; // emoji -> array of userIds
  task?: { id: number; title: string };
}

export interface ChannelItem {
  id: number;
  name: string;
  description?: string;
  isPrivate?: boolean;
  membersCount?: number;
  createdBy?: string;
  createdAt?: string;
}

export interface ContactItem {
  id: number;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department?: string;
  profilePhoto?: string;
  isOnline?: boolean;
}

interface CommunicationState {
  activeTab: 'channels' | 'dms';
  activeChannelId: number | null;
  activeContactId: number | null;
  sidebarOpen: boolean; // mobile drawer
  detailsPanelOpen: boolean;
  searchQuery: string;
  messageSearchQuery: string;
  
  // Realtime & Presence
  onlineUsers: Set<number>;
  typingUsers: Record<string, { userId: number; userName: string }>;
  unreadCounts: Record<string, number>; // key: "ch_1" or "dm_101"
  mutedConversations: Set<string>;

  // Composer & Thread actions
  replyToMessage: ChatMessage | null;
  editingMessage: ChatMessage | null;
  pinnedMessagesMap: Record<string, ChatMessage[]>;

  // Actions
  setActiveTab: (tab: 'channels' | 'dms') => void;
  setActiveChannelId: (id: number | null) => void;
  setActiveContactId: (id: number | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setDetailsPanelOpen: (open: boolean) => void;
  toggleDetailsPanel: () => void;
  setSearchQuery: (query: string) => void;
  setMessageSearchQuery: (query: string) => void;

  setOnlineStatus: (userId: number, online: boolean) => void;
  setTypingStatus: (key: string, user: { userId: number; userName: string } | null) => void;
  clearUnread: (key: string) => void;
  incrementUnread: (key: string) => void;
  toggleMuteConversation: (key: string) => void;

  setReplyToMessage: (msg: ChatMessage | null) => void;
  setEditingMessage: (msg: ChatMessage | null) => void;
  togglePinMessage: (convKey: string, msg: ChatMessage) => void;
}

export const useCommunicationStore = create<CommunicationState>((set, get) => ({
  activeTab: 'channels',
  activeChannelId: null,
  activeContactId: null,
  sidebarOpen: true,
  detailsPanelOpen: false,
  searchQuery: '',
  messageSearchQuery: '',

  onlineUsers: new Set<number>([1, 999, 1001, 1004]), // default online demo IDs
  typingUsers: {},
  unreadCounts: {},
  mutedConversations: new Set<string>(),

  replyToMessage: null,
  editingMessage: null,
  pinnedMessagesMap: {},

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveChannelId: (id) => {
    set({ activeChannelId: id, activeTab: 'channels' });
    if (id) get().clearUnread(`ch_${id}`);
  },
  setActiveContactId: (id) => {
    set({ activeContactId: id, activeTab: 'dms' });
    if (id) get().clearUnread(`dm_${id}`);
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setDetailsPanelOpen: (open) => set({ detailsPanelOpen: open }),
  toggleDetailsPanel: () => set((state) => ({ detailsPanelOpen: !state.detailsPanelOpen })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setMessageSearchQuery: (query) => set({ messageSearchQuery: query }),

  setOnlineStatus: (userId, online) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      if (online) next.add(userId);
      else next.delete(userId);
      return { onlineUsers: next };
    }),

  setTypingStatus: (key, user) =>
    set((state) => {
      const next = { ...state.typingUsers };
      if (user) {
        next[key] = user;
      } else {
        delete next[key];
      }
      return { typingUsers: next };
    }),

  clearUnread: (key) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [key]: 0 },
    })),

  incrementUnread: (key) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [key]: (state.unreadCounts[key] || 0) + 1,
      },
    })),

  toggleMuteConversation: (key) =>
    set((state) => {
      const next = new Set(state.mutedConversations);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { mutedConversations: next };
    }),

  setReplyToMessage: (msg) => set({ replyToMessage: msg }),
  setEditingMessage: (msg) => set({ editingMessage: msg }),

  togglePinMessage: (convKey, msg) =>
    set((state) => {
      const currentPinned = state.pinnedMessagesMap[convKey] || [];
      const exists = currentPinned.some((m) => m.id === msg.id);
      const nextPinned = exists
        ? currentPinned.filter((m) => m.id !== msg.id)
        : [...currentPinned, { ...msg, isPinned: true }];

      return {
        pinnedMessagesMap: {
          ...state.pinnedMessagesMap,
          [convKey]: nextPinned,
        },
      };
    }),
}));
