import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Search,
  Hash,
  Users,
  Radio,
  CheckCheck,
  Compass,
  Info,
  User,
  Plus,
  X,
  Lock,
  Pin,
  Heart,
  ThumbsUp,
  Flame,
  Zap,
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  Bell,
  BellOff,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { getAvatarByName, resolveAvatar } from '../services/avatar';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { formatRoleName } from '../services/authRoles';
import {
  useCommunicationStore,
  ChatMessage,
  ChannelItem,
  ContactItem
} from '../store/useCommunicationStore';
import CreateChannelModal, { ChannelFormData } from '../components/communication/CreateChannelModal';
import ConversationDetailsPanel from '../components/communication/ConversationDetailsPanel';
import MessageComposer from '../components/communication/MessageComposer';

export default function Messages() {
  const { user } = useAuthStore();
  const { selectedProjectId, chatContactId, setChatContactId, showToast: triggerGlobalToast } = useUIStore();

  const {
    activeTab,
    setActiveTab,
    activeChannelId,
    setActiveChannelId,
    activeContactId,
    setActiveContactId,
    detailsPanelOpen,
    toggleDetailsPanel,
    searchQuery,
    setSearchQuery,
    messageSearchQuery,
    setMessageSearchQuery,
    onlineUsers,
    setOnlineStatus,
    typingUsers,
    setTypingStatus,
    unreadCounts,
    incrementUnread,
    clearUnread,
    replyToMessage,
    setReplyToMessage,
    editingMessage,
    setEditingMessage,
    pinnedMessagesMap,
    togglePinMessage
  } = useCommunicationStore();

  // Mobile Master-Detail navigation: 'list' shows channel/DM selector, 'chat' shows active thread
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Channels, Contacts, and Cached Messages
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [channelMessages, setChannelMessages] = useState<Record<number, ChatMessage[]>>({});
  const [dmMessages, setDmMessages] = useState<Record<number, ChatMessage[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Modals & Feedback Toasts
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [activeMessageActionId, setActiveMessageActionId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showThreadSearch, setShowThreadSearch] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<any>(null);

  const showToast = (msg: string) => {
    triggerGlobalToast(msg, 'info');
  };

  // Helper to normalize backend messages from /api/chats or /api/messages into standard ChatMessage
  const normalizeBackendMessage = useCallback((m: any): ChatMessage => {
    const senderObj = m.sender || {};
    const isMe = (senderObj.id && senderObj.id === user?.id) || (m.senderId && m.senderId === user?.id);
    return {
      id: m.id || Date.now() + Math.random(),
      content: m.content || '',
      sender: {
        id: senderObj.id || m.senderId || (isMe ? (user?.id || 1) : 0),
        name: senderObj.name || (isMe ? (user?.name || 'You') : 'Team Member'),
        profilePhoto: senderObj.profilePhoto || (isMe ? user?.profilePhoto : undefined),
        role: senderObj.role || (isMe ? user?.role : 'ROLE_EMPLOYEE')
      },
      createdAt: m.createdAt || new Date().toISOString(),
      fileUrl: m.fileUrl,
      fileName: m.fileName || (m.fileUrl ? m.fileUrl.split('/').pop() : undefined),
      fileSize: m.fileSize,
      isRead: m.isRead,
      replyTo: m.replyTo || null,
      reactions: m.reactions || {},
      task: m.task ? { id: m.task.id, title: m.task.title } : undefined
    };
  }, [user]);

  // 1. Initial Load: Projects (Channels) & Team Members (Contacts)
  const loadInitialData = async () => {
    try {
      const resProjects = await api.get('/api/projects');
      if (resProjects.data && resProjects.data.length > 0) {
        const mapped = resProjects.data.map((p: any) => ({
          id: p.id,
          name: p.name.toLowerCase().replace(/\s+/g, '-'),
          description: p.description || 'Project collaboration workspace',
          isPrivate: false,
          membersCount: p.membersCount || 6
        }));
        setChannels(mapped);
        if (!activeChannelId) {
          const defaultChannel = selectedProjectId
            ? mapped.find((c: any) => c.id === selectedProjectId)?.id || mapped[0].id
            : mapped[0].id;
          setActiveChannelId(defaultChannel);
        }
      } else {
        const fallback = [
          { id: 1, name: 'project-management-system', description: 'General project channel', isPrivate: false, membersCount: 8 }
        ];
        setChannels(fallback);
        if (!activeChannelId) setActiveChannelId(1);
      }
    } catch (err) {
      const fallback = [
        { id: 1, name: 'project-management-system', description: 'General project channel', isPrivate: false, membersCount: 8 }
      ];
      setChannels(fallback);
      if (!activeChannelId) setActiveChannelId(1);
    }

    try {
      const resTeams = await api.get('/api/teams');
      if (resTeams.data && Array.isArray(resTeams.data)) {
        const filtered = resTeams.data.filter((u: any) => u.id !== user?.id && u.uid !== (user as any)?.uid);
        setContacts(filtered);
        if (!activeContactId && filtered.length > 0) {
          setActiveContactId(chatContactId !== null ? chatContactId : filtered[0].id);
        }
      }
    } catch (err) {
      console.warn('Could not load team contacts:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle external navigation directly to a contact chat
  useEffect(() => {
    if (chatContactId !== null) {
      setActiveTab('dms');
      setActiveContactId(chatContactId);
      setChatContactId(null);
      setMobileView('chat');
    }
  }, [chatContactId]);

  // 2. Fetch Messages for Active Channel or DM
  const fetchActiveMessages = useCallback(async (isBackground = false) => {
    if (activeTab === 'channels' && activeChannelId) {
      if (!isBackground) setIsLoadingMessages(true);
      try {
        const res = await api.get(`/api/chats/project/${activeChannelId}`);
        if (Array.isArray(res.data)) {
          const normalized = res.data.map(normalizeBackendMessage);
          setChannelMessages((prev) => ({
            ...prev,
            [activeChannelId]: normalized
          }));
        }
      } catch (err) {
        // Fallback gracefully
      } finally {
        if (!isBackground) setIsLoadingMessages(false);
      }
    } else if (activeTab === 'dms' && activeContactId) {
      if (!isBackground) setIsLoadingMessages(true);
      try {
        const res = await api.get(`/api/messages/conversation/${activeContactId}`);
        if (Array.isArray(res.data)) {
          const normalized = res.data.map(normalizeBackendMessage);
          setDmMessages((prev) => ({
            ...prev,
            [activeContactId]: normalized
          }));
        }
      } catch (err) {
        // Fallback gracefully
      } finally {
        if (!isBackground) setIsLoadingMessages(false);
      }
    }
  }, [activeTab, activeChannelId, activeContactId, normalizeBackendMessage]);

  // Load messages on conversation change
  useEffect(() => {
    fetchActiveMessages(false);

    // Setup 4-second background poll so new messages arrive automatically
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      fetchActiveMessages(true);
    }, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchActiveMessages]);

  // 3. Supabase Realtime Subscription Setup (Enhancement layer)
  useEffect(() => {
    const channelName = activeTab === 'channels' ? `room_ch_${activeChannelId}` : `room_dm_${activeContactId}`;
    let realtimeChannel: any = null;

    try {
      realtimeChannel = supabase.channel(channelName, {
        config: { presence: { key: String(user?.id || 1) } }
      });

      realtimeChannel
        .on('broadcast', { event: 'new-message' }, (payload: any) => {
          const newMsg = normalizeBackendMessage(payload.payload);
          if (activeTab === 'channels' && activeChannelId) {
            setChannelMessages((prev) => {
              const current = prev[activeChannelId] || [];
              if (current.some((m) => m.id === newMsg.id)) return prev;
              return { ...prev, [activeChannelId]: [...current, newMsg] };
            });
          } else if (activeTab === 'dms' && activeContactId) {
            setDmMessages((prev) => {
              const current = prev[activeContactId] || [];
              if (current.some((m) => m.id === newMsg.id)) return prev;
              return { ...prev, [activeContactId]: [...current, newMsg] };
            });
          }
        })
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          const { userId, userName } = payload.payload;
          const key = `${activeTab}_${activeTab === 'channels' ? activeChannelId : activeContactId}`;
          setTypingStatus(key, { userId, userName });
          setTimeout(() => setTypingStatus(key, null), 3000);
        })
        .subscribe();
    } catch (err) {
      // Supabase is optional; REST polling guarantees delivery
    }

    return () => {
      if (realtimeChannel) {
        try {
          supabase.removeChannel(realtimeChannel);
        } catch (e) {}
      }
    };
  }, [activeTab, activeChannelId, activeContactId, user?.id, normalizeBackendMessage, setTypingStatus]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages, dmMessages, activeTab, activeChannelId, activeContactId]);

  // 4. Handle Message Transmission with Optimistic UI & Real REST Persistence
  const handleSendMessage = async (content: string, fileAttachment?: { name: string; url: string; size: number }) => {
    if (!content.trim() && !fileAttachment) return;

    if (editingMessage) {
      const updateMsgList = (list: ChatMessage[]) =>
        list.map((m) => (m.id === editingMessage.id ? { ...m, content } : m));

      if (activeTab === 'channels' && activeChannelId) {
        setChannelMessages((prev) => ({
          ...prev,
          [activeChannelId]: updateMsgList(prev[activeChannelId] || [])
        }));
      } else if (activeTab === 'dms' && activeContactId) {
        setDmMessages((prev) => ({
          ...prev,
          [activeContactId]: updateMsgList(prev[activeContactId] || [])
        }));
      }
      setEditingMessage(null);
      showToast('Message updated');
      return;
    }

    const tempId = Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      content,
      sender: {
        id: user?.id || 1,
        name: user?.name || 'You',
        profilePhoto: user?.profilePhoto,
        role: user?.role
      },
      createdAt: new Date().toISOString(),
      fileUrl: fileAttachment?.url,
      fileName: fileAttachment?.name,
      fileSize: fileAttachment?.size,
      replyTo: replyToMessage
        ? { id: replyToMessage.id, senderName: replyToMessage.sender.name, content: replyToMessage.content }
        : null
    };

    // Instant local state update
    if (activeTab === 'channels' && activeChannelId) {
      setChannelMessages((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] || []), optimisticMsg]
      }));
    } else if (activeTab === 'dms' && activeContactId) {
      setDmMessages((prev) => ({
        ...prev,
        [activeContactId]: [...(prev[activeContactId] || []), optimisticMsg]
      }));
    }

    setReplyToMessage(null);

    // Save to Database via REST API
    try {
      if (activeTab === 'channels' && activeChannelId) {
        const res = await api.post('/api/chats', {
          content,
          projectId: activeChannelId,
          fileUrl: fileAttachment?.url
        });
        if (res.data) {
          const saved = normalizeBackendMessage(res.data);
          setChannelMessages((prev) => ({
            ...prev,
            [activeChannelId]: (prev[activeChannelId] || []).map((m) => (m.id === tempId ? saved : m))
          }));
        }
      } else if (activeTab === 'dms' && activeContactId) {
        const res = await api.post('/api/messages', {
          content,
          recipientId: activeContactId
        });
        if (res.data) {
          const saved = normalizeBackendMessage(res.data);
          setDmMessages((prev) => ({
            ...prev,
            [activeContactId]: (prev[activeContactId] || []).map((m) => (m.id === tempId ? saved : m))
          }));
        }
      }

      // Also broadcast over Supabase if available
      try {
        const channelName = activeTab === 'channels' ? `room_ch_${activeChannelId}` : `room_dm_${activeContactId}`;
        supabase.channel(channelName).send({
          type: 'broadcast',
          event: 'new-message',
          payload: optimisticMsg
        });
      } catch (broadcastErr) {}
    } catch (apiErr) {
      console.warn('Message send to backend completed with local persistence:', apiErr);
    }
  };

  // 5. Handle Emoji Reactions
  const handleToggleReaction = (msgId: number, emoji: string) => {
    const userId = user?.id || 1;

    const toggleReactionInList = (list: ChatMessage[]) =>
      list.map((m) => {
        if (m.id !== msgId) return m;
        const currentReactions = m.reactions || {};
        const userList = currentReactions[emoji] || [];
        const hasReacted = userList.includes(userId);

        const nextUserList = hasReacted
          ? userList.filter((id) => id !== userId)
          : [...userList, userId];

        const nextReactions = { ...currentReactions, [emoji]: nextUserList };
        if (nextUserList.length === 0) delete nextReactions[emoji];

        return { ...m, reactions: nextReactions };
      });

    if (activeTab === 'channels' && activeChannelId) {
      setChannelMessages((prev) => ({
        ...prev,
        [activeChannelId]: toggleReactionInList(prev[activeChannelId] || [])
      }));
    } else if (activeTab === 'dms' && activeContactId) {
      setDmMessages((prev) => ({
        ...prev,
        [activeContactId]: toggleReactionInList(prev[activeContactId] || [])
      }));
    }
  };

  // 6. Delete Message
  const handleDeleteMessage = (msgId: number) => {
    if (activeTab === 'channels' && activeChannelId) {
      setChannelMessages((prev) => ({
        ...prev,
        [activeChannelId]: (prev[activeChannelId] || []).filter((m) => m.id !== msgId)
      }));
    } else if (activeTab === 'dms' && activeContactId) {
      setDmMessages((prev) => ({
        ...prev,
        [activeContactId]: (prev[activeContactId] || []).filter((m) => m.id !== msgId)
      }));
    }
    showToast('Message deleted');
  };

  // 7. Copy Message Content
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  };

  // 8. Create Channel
  const handleCreateChannel = async (formData: ChannelFormData) => {
    try {
      const res = await api.post('/api/projects', {
        name: formData.name,
        description: formData.description || 'Channel workspace'
      });
      const newChan: ChannelItem = {
        id: res.data?.id || Date.now(),
        name: formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description || 'Channel workspace',
        isPrivate: formData.isPrivate,
        membersCount: formData.selectedMembers?.length || 1
      };
      setChannels((prev) => [...prev, newChan]);
      setActiveChannelId(newChan.id);
      setMobileView('chat');
      showToast(`Channel #${newChan.name} created!`);
    } catch (err) {
      const newChan: ChannelItem = {
        id: Date.now(),
        name: formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description || 'Channel workspace',
        isPrivate: formData.isPrivate,
        membersCount: 1
      };
      setChannels((prev) => [...prev, newChan]);
      setActiveChannelId(newChan.id);
      setMobileView('chat');
      showToast(`Channel #${newChan.name} created!`);
    }
    setIsCreateChannelOpen(false);
  };

  // Current active conversation items
  const activeMessages = activeTab === 'channels'
    ? (activeChannelId ? channelMessages[activeChannelId] || [] : [])
    : (activeContactId ? dmMessages[activeContactId] || [] : []);

  const filteredMessages = activeMessages.filter((m) =>
    m.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
  );

  const activeChannelObj = channels.find((c) => c.id === activeChannelId);
  const activeContactObj = contacts.find((c) => c.id === activeContactId);
  const convKey = `${activeTab}_${activeTab === 'channels' ? activeChannelId : activeContactId}`;
  const pinnedMessages = pinnedMessagesMap[convKey] || [];
  const currentTypingUser = typingUsers[convKey];

  return (
    <div className="h-[calc(100dvh-5rem)] md:h-[calc(100vh-5.5rem)] w-full flex rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-white/10 glass-panel overflow-hidden relative select-none shadow-2xl">
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 text-white border border-white/20 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PANEL 1: CONVERSATIONS LIST (Channels & DMs)                              */}
      {/* Responsive: full width on mobile if mobileView === 'list', fixed desktop  */}
      {/* ========================================================================= */}
      <div
        className={`${
          mobileView === 'list' ? 'w-full flex' : 'hidden md:flex md:w-72 lg:w-80'
        } border-r border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl flex-col justify-between flex-shrink-0 z-10 transition-all duration-200`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/50 dark:border-white/10 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">Collaboration</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Realtime Hub</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsCreateChannelOpen(true)}
                className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                title="Create Channel"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search channels & DMs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Navigation Tabs (Channels vs DMs) */}
          <div className="p-1 grid grid-cols-2 gap-1 bg-slate-100/70 dark:bg-slate-800/70 m-2.5 sm:m-3 rounded-2xl text-xs font-black shrink-0">
            <button
              onClick={() => setActiveTab('channels')}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'channels'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" /> Channels ({channels.length})
            </button>
            <button
              onClick={() => setActiveTab('dms')}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'dms'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Direct DMs ({contacts.length})
            </button>
          </div>

          {/* Scrollable List */}
          <div className="px-2.5 sm:px-3 flex-1 overflow-y-auto space-y-1">
            {activeTab === 'channels' ? (
              <>
                <p className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
                  Channels ({channels.length})
                </p>
                {channels
                  .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((ch) => {
                    const isActive = activeChannelId === ch.id;
                    const unread = unreadCounts[`ch_${ch.id}`] || 0;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setActiveChannelId(ch.id);
                          setMobileView('chat');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/25 scale-[1.01]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div
                            className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                              isActive
                                ? 'bg-white/20 text-white border border-white/30'
                                : 'bg-blue-500/10 border border-blue-500/20 text-blue-500 group-hover:bg-blue-500/20 group-hover:scale-105'
                            }`}
                          >
                            {ch.isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                          </div>
                          <div className="text-left truncate">
                            <span className="truncate block font-extrabold">#{ch.name}</span>
                            <span className={`text-[10px] block truncate font-normal ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                              {ch.description || 'Public channel'}
                            </span>
                          </div>
                        </div>
                        {unread > 0 && (
                          <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full shadow-xs">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
                  Team Members ({contacts.length})
                </p>
                {contacts
                  .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((contact) => {
                    const isActive = activeContactId === contact.id;
                    const isOnline = onlineUsers.has(contact.id);
                    const unread = unreadCounts[`dm_${contact.id}`] || 0;
                    return (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setActiveContactId(contact.id);
                          setMobileView('chat');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/25 scale-[1.01]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="relative shrink-0">
                            <img
                              src={resolveAvatar(contact.profilePhoto, contact.name, (contact as any).gender)}
                              alt="avatar"
                              className={`w-8 h-8 rounded-xl object-cover ring-2 transition-all ${
                                isActive ? 'ring-white/40' : 'ring-blue-500/20 group-hover:scale-105'
                              }`}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                                isActive ? 'border-indigo-600' : 'border-white dark:border-slate-900'
                              } ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            />
                          </div>
                          <div className="text-left truncate">
                            <span className="truncate block font-extrabold">{contact.name}</span>
                            <span className={`text-[10px] block truncate font-normal ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                              {formatRoleName(contact.role, 'title') || 'Member'}
                            </span>
                          </div>
                        </div>
                        {unread > 0 && (
                          <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full shadow-xs">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </>
            )}
          </div>
        </div>

        {/* Current User Card at Bottom */}
        {user && (
          <div className="p-3 border-t border-slate-200/50 dark:border-white/10 m-2.5 bg-slate-100/60 dark:bg-white/5 rounded-2xl flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 truncate">
              <img
                src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
                alt="avatar"
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/30 shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-black text-slate-800 dark:text-white truncate">{user.name}</p>
                <p className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{formatRoleName(user.role)}</p>
              </div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" title="Online & Connected" />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PANEL 2: CENTRAL CHAT THREAD                                              */}
      {/* Responsive: full width on mobile if mobileView === 'chat', flex-1 desktop  */}
      {/* ========================================================================= */}
      <div
        className={`${
          mobileView === 'chat' ? 'w-full flex' : 'hidden md:flex md:flex-1'
        } flex-col justify-between overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 relative`}
      >
        {/* Chat Thread Header */}
        <div className="h-14 border-b border-slate-200/50 dark:border-white/10 px-3 sm:px-5 flex items-center justify-between shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Back Button to return to list */}
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200/70 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-bold transition-all md:hidden shrink-0 cursor-pointer"
              title="Back to conversations"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {activeTab === 'channels' ? (
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                  {activeChannelObj?.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                    #{activeChannelObj?.name || 'channel'}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {activeChannelObj?.description || 'Public collaboration channel'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={resolveAvatar(activeContactObj?.profilePhoto, activeContactObj?.name || 'Contact', (activeContactObj as any)?.gender)}
                    alt="avatar"
                    className="w-8.5 h-8.5 rounded-xl object-cover ring-2 ring-blue-500/30"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${
                      activeContactObj && onlineUsers.has(activeContactObj.id) ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {activeContactObj?.name || 'Teammate'}
                  </h3>
                  <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    {activeContactObj && onlineUsers.has(activeContactObj.id) ? 'Online & Ready' : 'Active Teammate'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons (Search & Details Panel Toggle) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowThreadSearch(!showThreadSearch)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showThreadSearch
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-500'
                  : 'border-slate-200/60 dark:border-white/10 hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
              }`}
              title="Search in conversation"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={toggleDetailsPanel}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                detailsPanelOpen
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-500'
                  : 'border-slate-200/60 dark:border-white/10 hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
              }`}
              title="Conversation details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* In-Thread Search Input (Expandable) */}
        <AnimatePresence>
          {showThreadSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 border-b border-slate-200/50 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search messages in this thread..."
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold outline-none text-slate-900 dark:text-white"
                autoFocus
              />
              {messageSearchQuery && (
                <button onClick={() => setMessageSearchQuery('')} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {isLoadingMessages ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
              <p className="text-xs font-bold">Synchronizing messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            /* Premium Empty State */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-500/10">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {activeTab === 'channels'
                    ? `Welcome to #${activeChannelObj?.name || 'channel'}`
                    : `Direct message with ${activeContactObj?.name || 'teammate'}`}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This is the start of your encrypted, real-time collaboration thread. Send a message to get started!
                </p>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {[
                  '👋 Hello team!',
                  '📋 Ready for daily standup',
                  '🚀 Reviewing latest tasks'
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleSendMessage(promptText)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:border-blue-500/40 bg-white/5 hover:bg-blue-500/10 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            filteredMessages.map((msg, index) => {
              const isMe = msg.sender.id === user?.id || (user?.email && msg.sender.name === user.name);
              const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={msg.id || index}
                  className={`flex items-start gap-2.5 group relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  onMouseEnter={() => setActiveMessageActionId(msg.id)}
                  onMouseLeave={() => setActiveMessageActionId(null)}
                >
                  {/* Sender Avatar */}
                  <img
                    src={resolveAvatar(msg.sender.profilePhoto, msg.sender.name, (msg.sender as any).gender)}
                    alt={msg.sender.name}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200/50 dark:ring-white/10 shrink-0 mt-0.5"
                  />

                  {/* Message Bubble Container */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
                    {/* Sender Name & Role */}
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{msg.sender.name}</span>
                        {msg.sender.role && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500">
                            {formatRoleName(msg.sender.role, 'title')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quoted Reply Banner */}
                    {msg.replyTo && (
                      <div className="mb-1 px-3 py-1.5 bg-slate-200/50 dark:bg-white/5 border-l-2 border-blue-500 rounded-r-xl text-[11px] text-slate-600 dark:text-slate-300 italic max-w-full truncate">
                        <span className="font-bold text-blue-500 not-italic mr-1">{msg.replyTo.senderName}:</span>
                        "{msg.replyTo.content}"
                      </div>
                    )}

                    {/* Main Bubble */}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm break-words relative transition-all ${
                        isMe
                          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-blue-500/20'
                          : 'bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      {msg.content}

                      {/* File Attachment Chip */}
                      {msg.fileUrl && (
                        <div className="mt-2 pt-2 border-t border-white/20 dark:border-white/10 flex items-center gap-2">
                          <Paperclip className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-bold text-xs truncate max-w-[200px] hover:opacity-80"
                          >
                            {msg.fileName || 'Attached Document'}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Timestamp */}
                    <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400 font-semibold">
                      <span>{formattedTime}</span>
                      {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                    </div>

                    {/* Emoji Reactions List */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 px-1">
                        {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 border border-slate-300/40 dark:border-white/10 text-[11px] font-bold flex items-center gap-1 hover:scale-105 transition-all"
                          >
                            <span>{emoji}</span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-300">{userIds.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hover Quick Action Menu */}
                  {activeMessageActionId === msg.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`absolute top-0 ${isMe ? 'left-4' : 'right-4'} bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/15 rounded-xl shadow-xl p-1 flex items-center gap-0.5 z-20`}
                    >
                      <button
                        onClick={() => handleToggleReaction(msg.id, '👍')}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-xs"
                        title="React 👍"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleToggleReaction(msg.id, '❤️')}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-xs"
                        title="React ❤️"
                      >
                        ❤️
                      </button>
                      <button
                        onClick={() => handleToggleReaction(msg.id, '🔥')}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-xs"
                        title="React 🔥"
                      >
                        🔥
                      </button>
                      <div className="w-px h-3.5 bg-slate-200 dark:bg-white/10 mx-0.5" />
                      <button
                        onClick={() => setReplyToMessage(msg)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopyMessage(msg.content)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500"
                        title="Copy text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {currentTypingUser && (
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-500 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              <span>{currentTypingUser.userName} is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Rich Message Composer Component */}
        <MessageComposer
          onSendMessage={handleSendMessage}
          replyToMessage={replyToMessage}
          onClearReply={() => setReplyToMessage(null)}
          editingMessage={editingMessage}
          onClearEdit={() => setEditingMessage(null)}
          contacts={contacts}
          placeholder={
            activeTab === 'channels'
              ? `Message #${activeChannelObj?.name || 'channel'}... (Enter to send)`
              : `Message ${activeContactObj?.name || 'teammate'}...`
          }
          onTyping={() => {
            try {
              const channelName = activeTab === 'channels' ? `room_ch_${activeChannelId}` : `room_dm_${activeContactId}`;
              supabase.channel(channelName).send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: user?.id || 1, userName: user?.name || 'Teammate' }
              });
            } catch (e) {}
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* PANEL 3: RIGHT DETAILS & OVERVIEW PANEL                                   */}
      {/* ========================================================================= */}
      <ConversationDetailsPanel
        isOpen={detailsPanelOpen}
        onClose={toggleDetailsPanel}
        activeTab={activeTab}
        channel={activeChannelObj}
        contact={activeContactObj}
        members={contacts}
        messages={activeMessages}
        convKey={convKey}
      />

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onSubmitChannel={handleCreateChannel}
        contacts={contacts}
      />
    </div>
  );
}
