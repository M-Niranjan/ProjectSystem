import React, { useState, useEffect, useRef } from 'react';
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
  Link,
  Plus,
  X,
  Briefcase,
  Award,
  Globe,
  Mail,
  Shield,
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
  PanelRightClose,
  PanelRightOpen,
  Menu,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { getAvatarByName, resolveAvatar } from '../services/avatar';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
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
  const { selectedProjectId, chatContactId, setChatContactId } = useUIStore();

  const {
    activeTab,
    setActiveTab,
    activeChannelId,
    setActiveChannelId,
    activeContactId,
    setActiveContactId,
    sidebarOpen,
    toggleSidebar,
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

  // Local state
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [channelMessages, setChannelMessages] = useState<Record<number, ChatMessage[]>>({});
  const [dmMessages, setDmMessages] = useState<Record<number, ChatMessage[]>>({});

  // Modals & Feedback Toasts
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Mock channels fallback
  const fallbackChannels: ChannelItem[] = [];

  // Mock contacts fallback
  const fallbackContacts: ContactItem[] = [];

  // Default seed messages
  const seedMessages: ChatMessage[] = [];

  // 1. Initial Data Fetching
  const loadInitialData = async () => {
    try {
      const resProjects = await api.get('/api/projects');
      if (resProjects.data && resProjects.data.length > 0) {
        const mapped = resProjects.data.map((p: any) => ({
          id: p.id,
          name: p.name.toLowerCase().replace(/\s+/g, '-'),
          description: p.description || 'Project team channel',
          isPrivate: false,
          membersCount: 8
        }));
        setChannels(mapped);
        if (!activeChannelId) setActiveChannelId(selectedProjectId || mapped[0].id);
      } else {
        setChannels(fallbackChannels);
        if (!activeChannelId) setActiveChannelId(fallbackChannels[0].id);
      }
    } catch (err) {
      setChannels(fallbackChannels);
      if (!activeChannelId) setActiveChannelId(fallbackChannels[0].id);
    }

    try {
      const resTeams = await api.get('/api/teams');
      const filtered = resTeams.data.filter((u: any) => u.id !== user?.id);
      setContacts(filtered.length > 0 ? filtered : fallbackContacts);
      if (!activeContactId && filtered.length > 0) {
        setActiveContactId(chatContactId !== null ? chatContactId : filtered[0].id);
      }
    } catch (err) {
      setContacts(fallbackContacts);
      if (!activeContactId) setActiveContactId(fallbackContacts[0].id);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (chatContactId !== null) {
      setActiveTab('dms');
      setActiveContactId(chatContactId);
      setChatContactId(null);
    }
  }, [chatContactId]);

  // 2. Supabase Realtime Subscription Setup
  useEffect(() => {
    const channelName = activeTab === 'channels' ? `room_ch_${activeChannelId}` : `room_dm_${activeContactId}`;
    const realtimeChannel = supabase.channel(channelName, {
      config: { presence: { key: String(user?.id || 1) } }
    });

    realtimeChannel
      .on('broadcast', { event: 'new-message' }, (payload) => {
        const newMsg: ChatMessage = payload.payload;
        if (activeTab === 'channels' && activeChannelId) {
          setChannelMessages((prev) => ({
            ...prev,
            [activeChannelId]: [...(prev[activeChannelId] || []), newMsg]
          }));
        } else if (activeTab === 'dms' && activeContactId) {
          setDmMessages((prev) => ({
            ...prev,
            [activeContactId]: [...(prev[activeContactId] || []), newMsg]
          }));
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, userName } = payload.payload;
        const key = `${activeTab}_${activeTab === 'channels' ? activeChannelId : activeContactId}`;
        setTypingStatus(key, { userId, userName });
        setTimeout(() => setTypingStatus(key, null), 3000);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = realtimeChannel.presenceState();
        Object.keys(state).forEach((key) => {
          const userIdNum = parseInt(key);
          if (!isNaN(userIdNum)) setOnlineStatus(userIdNum, true);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [activeTab, activeChannelId, activeContactId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages, dmMessages, activeTab, activeChannelId, activeContactId]);

  // 3. Handle Message Transmission
  const handleSendMessage = (content: string, fileAttachment?: { name: string; url: string; size: number }) => {
    if (editingMessage) {
      const updateMsgList = (list: ChatMessage[]) =>
        list.map((m) => (m.id === editingMessage.id ? { ...m, content } : m));

      if (activeTab === 'channels' && activeChannelId) {
        setChannelMessages((prev) => ({
          ...prev,
          [activeChannelId]: updateMsgList(prev[activeChannelId] || seedMessages)
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

    const newMsg: ChatMessage = {
      id: Date.now(),
      content,
      sender: {
        id: user?.id || 1,
        name: user?.name || 'Self',
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

    if (activeTab === 'channels' && activeChannelId) {
      setChannelMessages((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] || seedMessages), newMsg]
      }));
    } else if (activeTab === 'dms' && activeContactId) {
      setDmMessages((prev) => ({
        ...prev,
        [activeContactId]: [...(prev[activeContactId] || []), newMsg]
      }));
    }

    // Broadcast via Supabase Realtime
    const channelName = activeTab === 'channels' ? `room_ch_${activeChannelId}` : `room_dm_${activeContactId}`;
    supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'new-message',
      payload: newMsg
    });

    setReplyToMessage(null);
  };

  // 4. Handle Emoji Reactions
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
        [activeChannelId]: toggleReactionInList(prev[activeChannelId] || seedMessages)
      }));
    } else if (activeTab === 'dms' && activeContactId) {
      setDmMessages((prev) => ({
        ...prev,
        [activeContactId]: toggleReactionInList(prev[activeContactId] || [])
      }));
    }
  };

  // 5. Handle Message Deletion
  const handleDeleteMessage = (msgId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    const filterOut = (list: ChatMessage[]) => list.filter((m) => m.id !== msgId);

    if (activeTab === 'channels' && activeChannelId) {
      setChannelMessages((prev) => ({
        ...prev,
        [activeChannelId]: filterOut(prev[activeChannelId] || seedMessages)
      }));
    } else if (activeTab === 'dms' && activeContactId) {
      setDmMessages((prev) => ({
        ...prev,
        [activeContactId]: filterOut(prev[activeContactId] || [])
      }));
    }
    showToast('Message deleted');
  };

  // 6. Handle Channel Creation
  const handleCreateChannel = (data: ChannelFormData) => {
    const newChan: ChannelItem = {
      id: Date.now(),
      name: data.name,
      description: data.description || 'Custom team channel',
      isPrivate: data.isPrivate,
      membersCount: (data.selectedMembers?.length || 0) + 1
    };
    setChannels((prev) => [...prev, newChan]);
    setActiveChannelId(newChan.id);
    showToast(`Channel #${newChan.name} created successfully!`);
  };

  const activeMessages = activeTab === 'channels'
    ? (activeChannelId ? channelMessages[activeChannelId] || seedMessages : [])
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
    <div className="h-[calc(100vh-95px)] flex rounded-3xl border border-slate-200/80 dark:border-white/10 glass-panel overflow-hidden relative select-none shadow-2xl">
      
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

      {/* ----------------- PANEL 1: Professional Left Navigation Sidebar ----------------- */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0 hidden md:w-16 md:flex'
        } border-r border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/70 backdrop-blur-2xl flex flex-col justify-between flex-shrink-0 transition-all duration-300 z-10`}
      >
        <div>
          {/* Brand & Module Header */}
          <div className="p-4 border-b border-slate-200/50 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900 dark:text-white tracking-tight uppercase">COLLABORATION</h2>
                  <p className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">REALTIME HUB</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateChannelOpen(true)}
                className="p-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
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
          <div className="p-1.5 grid grid-cols-2 gap-1 bg-slate-100/70 dark:bg-slate-800/70 m-3 rounded-2xl text-xs font-black">
            <button
              onClick={() => setActiveTab('channels')}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'channels'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" /> Channels
            </button>
            <button
              onClick={() => setActiveTab('dms')}
              className={`py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'dms'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Direct DMs
            </button>
          </div>

          {/* List Content */}
          <div className="px-3 max-h-[calc(100vh-295px)] overflow-y-auto space-y-1">
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
                        onClick={() => setActiveChannelId(ch.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 scale-[1.01]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                            isActive
                              ? 'bg-white/20 text-white shadow-xs border border-white/30'
                              : 'bg-blue-500/10 border border-blue-500/20 text-blue-500 group-hover:bg-blue-500/20 group-hover:scale-105'
                          }`}>
                            {ch.isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                          </div>
                          <span className="truncate">{ch.name}</span>
                        </div>
                        {unread > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full shadow-xs">
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
                        onClick={() => setActiveContactId(contact.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 scale-[1.01]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="relative flex-shrink-0">
                            <img
                              src={resolveAvatar(contact.profilePhoto, contact.name, (contact as any).gender)}
                              alt="avatar"
                              className={`w-7.5 h-7.5 rounded-xl object-cover ring-2 transition-all ${
                                isActive ? 'ring-white/40' : 'ring-blue-500/20 group-hover:scale-105'
                              }`}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                                isActive ? 'border-indigo-600' : 'border-white dark:border-slate-900'
                              } ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            />
                          </div>
                          <span className="truncate">{contact.name}</span>
                        </div>
                        {unread > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full shadow-xs">
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

        {/* User Card */}
        {user && (
          <div className="p-3 border-t border-slate-200/50 dark:border-white/10 m-2 bg-slate-100/60 dark:bg-white/5 rounded-2xl flex items-center gap-2.5">
            <img
              src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
              alt="avatar"
              className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/30"
            />
            <div className="truncate">
              <p className="text-xs font-black text-slate-800 dark:text-white truncate">{user.name}</p>
              <p className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{user.role.replace('ROLE_', '')}</p>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- PANEL 2: Enterprise Central Chat Thread ----------------- */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 relative">
        {/* Header Bar */}
        <div className="h-14 border-b border-slate-200/50 dark:border-white/10 px-5 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-500 transition-colors md:hidden cursor-pointer"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            {activeTab === 'channels' ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  {activeChannelObj?.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                    #{activeChannelObj?.name || 'channel'}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    {activeChannelObj?.description || 'Public collaboration channel'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="relative">
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
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                    {activeContactObj?.name || 'Teammate'}
                  </h3>
                  <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    {activeContactObj && onlineUsers.has(activeContactObj.id) ? 'Online & Ready' : 'Offline'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Message Filter Input */}
            <div className="hidden sm:flex items-center relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter messages..."
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900 dark:text-white w-36 focus:w-48"
              />
            </div>

            {/* Toggle Details Panel Button */}
            <button
              onClick={toggleDetailsPanel}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                detailsPanelOpen
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200/60 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500'
              }`}
              title="Toggle Details & Files Panel"
            >
              {detailsPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2 truncate">
              <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="font-extrabold text-[10px] uppercase tracking-wider">Pinned Message:</span>
              <span className="truncate italic font-medium">"{pinnedMessages[0].content}"</span>
            </div>
            <span className="text-[10px] font-black bg-amber-500/20 px-2 py-0.5 rounded-full">
              {pinnedMessages.length} Pinned
            </span>
          </div>
        )}

        {/* Messages Stream List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-xs font-bold">No messages match your search filter</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = user && msg.sender.id === user.id;
              const isHovered = hoveredMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  className={`group relative flex gap-3 text-xs ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <img
                    src={resolveAvatar(msg.sender.profilePhoto, msg.sender.name, (msg.sender as any).gender)}
                    alt="avatar"
                    className="w-8.5 h-8.5 rounded-xl object-cover ring-1 ring-blue-500/20 flex-shrink-0"
                  />

                  <div className={`max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name & Timestamp */}
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="font-black text-slate-800 dark:text-slate-200">{msg.sender.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Reply-to Header preview */}
                    {msg.replyTo && (
                      <div className="mb-1 text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-200/50 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                        <Reply className="w-3 h-3 text-blue-500" />
                        <span>Replying to {msg.replyTo.senderName}:</span>
                        <span className="italic truncate max-w-[150px]">"{msg.replyTo.content}"</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className="space-y-1.5 w-full">
                      <div
                        className={`p-3.5 rounded-2xl border font-semibold text-xs leading-relaxed transition-all shadow-xs ${
                          isMe
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none border-blue-500/20 shadow-md shadow-blue-500/10'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border-slate-200/80 dark:border-white/10'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* File Attachment Card */}
                      {msg.fileUrl && (
                        <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-xs shadow-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="font-bold truncate text-slate-900 dark:text-white">
                                {msg.fileName || 'Attached_File.pdf'}
                              </p>
                              {msg.fileSize && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {(msg.fileSize / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>
                          </div>
                          <a
                            href={msg.fileUrl}
                            download={msg.fileName || 'Attached_File.pdf'}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] flex items-center gap-1 cursor-pointer transition-all flex-shrink-0 shadow-xs"
                          >
                            Download
                          </a>
                        </div>
                      )}

                      {/* Message Emoji Reactions Display */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(msg.reactions).map(([emoji, uIds]) => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="px-2.5 py-0.5 bg-slate-200/60 dark:bg-white/10 border border-slate-300/60 dark:border-white/15 rounded-full text-[11px] font-bold flex items-center gap-1 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] opacity-75">{uIds.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Action Bar */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`absolute top-0 flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-2xl shadow-xl z-20 ${
                        isMe ? 'left-4' : 'right-4'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleReaction(msg.id, '👍')}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer text-xs"
                        title="React 👍"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleToggleReaction(msg.id, '❤️')}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer text-xs"
                        title="React ❤️"
                      >
                        ❤️
                      </button>
                      <button
                        onClick={() => handleToggleReaction(msg.id, '🔥')}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer text-xs"
                        title="React 🔥"
                      >
                        🔥
                      </button>

                      <div className="w-px h-3.5 bg-slate-200 dark:bg-white/10 mx-0.5" />

                      <button
                        onClick={() => setReplyToMessage(msg)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          togglePinMessage(convKey, msg);
                          showToast('Message pinned');
                        }}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer"
                        title="Pin Message"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      {isMe && (
                        <>
                          <button
                            onClick={() => setEditingMessage(msg)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-blue-500 transition-colors cursor-pointer"
                            title="Edit Message"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-rose-500 transition-colors cursor-pointer"
                            title="Delete Message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })
          )}

          {/* Realtime Typing Indicator */}
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
            const channelName = activeTab === 'channels' ? `room_ch_${activeChannelId}` : `room_dm_${activeContactId}`;
            supabase.channel(channelName).send({
              type: 'broadcast',
              event: 'typing',
              payload: { userId: user?.id || 1, userName: user?.name || 'Teammate' }
            });
          }}
        />
      </div>

      {/* ----------------- PANEL 3: Right Details & Overview Panel ----------------- */}
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
