import { getAvatarByName } from '../services/avatar';
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Paperclip, Smile, Search, Hash, Users, Radio, CheckCheck, Compass, Info, User, Link, HelpCircle, Plus, X, Briefcase, Award, Globe, Mail, Shield } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

interface Message {
  id: number;
  content: string;
  sender: { id: number; name: string; profilePhoto?: string };
  createdAt: string;
  fileUrl?: string;
  isRead?: boolean;
  task?: { id: number; title: string };
}

interface Channel {
  id: number;
  name: string;
}

export default function Messages() {
  const { user } = useAuthStore();
  const { selectedProjectId, chatContactId, setChatContactId } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<'channels' | 'dms'>('channels');
  
  // Channels
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [channelMessages, setChannelMessages] = useState<Message[]>([]);
  
  // DMs
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

  // New member invite modal & form states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<'existing' | 'new'>('existing');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ROLE_EMPLOYEE');
  const [inviteDesignation, setInviteDesignation] = useState('');
  const [inviteDept, setInviteDept] = useState('Technology');
  const [inviteExp, setInviteExp] = useState(2);
  const [inviteSkills, setInviteSkills] = useState('');
  const [selectedTeammateId, setSelectedTeammateId] = useState<string>('');

  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteTab === 'existing') {
      if (!selectedTeammateId) return;
      const tId = parseInt(selectedTeammateId);
      setActiveContactId(tId);
      setActiveTab('dms');
      setIsInviteModalOpen(false);
      setSelectedTeammateId('');
    } else {
      if (!inviteName.trim() || !inviteEmail.trim()) return;
      const payload = {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        designation: inviteDesignation.trim() || 'Teammate',
        department: inviteDept,
        experience: Number(inviteExp),
        skills: inviteSkills.trim()
      };
      
      try {
        const res = await api.post('/api/teams', payload);
        const newContact = res.data;
        setContacts(prev => {
          if (prev.some(c => c.id === newContact.id)) return prev;
          return [...prev, newContact];
        });
        setActiveContactId(newContact.id);
        setActiveTab('dms');
      } catch (err) {
        console.error('Failed to create new teammate via API, using fallback', err);
        // Fallback for offline/mock
        const fallbackContact = {
          id: Date.now(),
          ...payload,
          profilePhoto: getAvatarByName(payload.name)
        };
        setContacts(prev => [...prev, fallbackContact]);
        setActiveContactId(fallbackContact.id);
        setActiveTab('dms');
      }
      
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('ROLE_EMPLOYEE');
      setInviteDesignation('');
      setInviteDept('Technology');
      setInviteExp(2);
      setInviteSkills('');
    }
  };

  // Mock Channels & Messages fallback
  const mockChannels = [
    { id: 1, name: 'prologue-saas-dashboard' },
    { id: 2, name: 'workflow-suite-integration' }
  ];

  const mockMessages: Message[] = [
    { id: 1, content: 'Hey team, did we finalize the JWT key expiration settings?', sender: { id: 2, name: 'Bob Johnson' }, createdAt: '2026-07-14T12:00:00Z' },
    { id: 2, content: 'Yes, we set it to 24 hours (86400000ms) in application.properties.', sender: { id: 3, name: 'Charlie Brown' }, createdAt: '2026-07-14T12:02:00Z' }
  ];

  const loadData = async () => {
    // Fetch channels
    try {
      const res = await api.get('/api/projects');
      if (res.data && res.data.length > 0) {
        const mapped = res.data.map((p: any) => ({
          id: p.id,
          name: p.name.toLowerCase().replace(/\s+/g, '-')
        }));
        setChannels(mapped);
        setActiveChannelId(selectedProjectId || mapped[0].id);
      } else {
        setChannels(mockChannels);
        setActiveChannelId(selectedProjectId || mockChannels[0].id);
      }
    } catch (err) {
      setChannels(mockChannels);
      setActiveChannelId(selectedProjectId || mockChannels[0].id);
    }

    // Fetch contacts for DMs
    try {
      const res = await api.get('/api/teams');
      const filtered = res.data.filter((u: any) => u.id !== user?.id);
      setContacts(filtered);
      if (filtered.length > 0) {
        const targetId = chatContactId !== null ? chatContactId : filtered[0].id;
        setActiveContactId(targetId);
      }
    } catch (err) {
      console.log('Failed to fetch teams contacts');
    }

    // Fetch unread messages
    fetchUnread();
  };

  const fetchUnread = async () => {
    try {
      const res = await api.get('/api/messages/unread');
      const counts: Record<number, number> = {};
      res.data.forEach((m: any) => {
        counts[m.sender.id] = (counts[m.sender.id] || 0) + 1;
      });
      setUnreadCounts(counts);
    } catch (err) {
      console.log('Failed to load unread messages');
    }
  };

  const fetchChannelMessages = async () => {
    if (!activeChannelId) return;
    try {
      const res = await api.get(`/api/chat/project/${activeChannelId}`);
      setChannelMessages(res.data || []);
    } catch (err) {
      setChannelMessages(mockMessages);
    }
  };

  const fetchDmMessages = async () => {
    if (!activeContactId) return;
    try {
      const res = await api.get(`/api/messages/conversation/${activeContactId}`);
      setDmMessages(res.data || []);
      // Clear unread count for this contact
      setUnreadCounts(prev => ({ ...prev, [activeContactId]: 0 }));
    } catch (err) {
      console.log('Failed to fetch DM messages');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'channels') {
      fetchChannelMessages();
    }
  }, [activeChannelId, activeTab]);

  useEffect(() => {
    if (activeTab === 'dms') {
      fetchDmMessages();
    }
  }, [activeContactId, activeTab]);

  useEffect(() => {
    if (chatContactId !== null) {
      setActiveTab('dms');
      setActiveContactId(chatContactId);
      setChatContactId(null);
    }
  }, [chatContactId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages, dmMessages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (activeTab === 'channels') {
      if (!activeChannelId) return;
      const payload = {
        content: chatInput,
        project: { id: activeChannelId }
      };

      const newMsg: Message = {
        id: Date.now(),
        content: chatInput,
        sender: { id: user?.id || 1, name: user?.name || 'Self', profilePhoto: user?.profilePhoto },
        createdAt: new Date().toISOString()
      };

      setChannelMessages(prev => [...prev, newMsg]);
      setChatInput('');

      try {
        await api.post('/api/chat', payload);
        fetchChannelMessages();
      } catch (err) {
        console.log('Failed to send channel message');
      }
    } else {
      if (!activeContactId) return;
      const payload = {
        recipient: { id: activeContactId },
        content: chatInput
      };

      const url = '/api/messages';

      try {
        const res = await api.post(url, payload);
        setDmMessages(prev => [...prev, res.data]);
        setChatInput('');
      } catch (err) {
        console.log('Failed to send DM message');
      }
    }
  };

  const triggerTaskInspector = (task: any) => {
    window.dispatchEvent(new CustomEvent('open-task-detail', { detail: task }));
  };

  const activeMessages = activeTab === 'channels' ? channelMessages : dmMessages;

  return (
    <div className="space-y-6 select-none h-[calc(100vh-100px)] flex flex-col">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-500" /> Inbox & Collaboration
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time direct messaging with Team Leaders and channel rooms.
          </p>
        </div>

        {/* Tab Toggle buttons */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'channels'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setActiveTab('dms')}
            className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer relative ${
              activeTab === 'dms'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Direct Messages
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="flex-1 glass-panel border border-slate-200/50 dark:border-white/5 flex overflow-hidden min-h-0">
        
        {/* Left Side Navigation */}
        <div className="w-64 border-r border-slate-200/30 dark:border-white/5 flex flex-col flex-shrink-0 bg-slate-500/5">
          <div className="p-4 border-b border-slate-200/30 dark:border-white/5 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'channels' ? 'Filter channels...' : 'Search teammates...'}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {activeTab === 'channels' ? (
              <>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 mb-1 flex items-center justify-between">
                  <span>Workspace Channels</span>
                  <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                </p>
                {channels.map((chan) => (
                  <button
                    key={chan.id}
                    onClick={() => setActiveChannelId(chan.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                      activeChannelId === chan.id
                        ? 'bg-blue-600 text-white shadow shadow-blue-500/15 font-black'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Hash className="w-4 h-4" />
                    <span className="truncate">{chan.name}</span>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-3 mb-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Private Chats
                  </p>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Add or Create new teammate for chat"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {contacts.map((contact) => {
                  const isActive = activeContactId === contact.id;
                  const unread = unreadCounts[contact.id] || 0;
                  return (
                    <button
                      key={contact.id}
                      onClick={() => setActiveContactId(contact.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow shadow-blue-500/15 font-black'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <img
                          src={contact.profilePhoto || getAvatarByName(contact.name)}
                          alt="avatar"
                          className="w-5.5 h-5.5 rounded-full object-cover ring-1 ring-blue-500/15"
                        />
                        <span className="truncate">{contact.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] opacity-75 font-semibold">({contact.role === 'ROLE_EMPLOYEE' ? 'Staff' : 'Lead'})</span>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full">
                            {unread}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Side Chat panel */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
          
          {/* Active room header */}
          <div className="h-12 border-b border-slate-200/30 dark:border-white/5 px-6 flex items-center justify-between flex-shrink-0 bg-slate-500/5">
            <div className="flex items-center gap-1.5">
              {activeTab === 'channels' ? (
                <>
                  <Hash className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {channels.find(c => c.id === activeChannelId)?.name || 'loading...'}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                    Chat with {contacts.find(u => u.id === activeContactId)?.name || 'teammate'}
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> 1:1 Secure Link
            </span>
          </div>

          {/* Chat thread list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeMessages.map((msg) => {
              const isMe = user && msg.sender.id === user.id;
              return (
                <div key={msg.id} className={`flex gap-3 text-xs ${isMe ? 'flex-row-reverse' : ''}`}>
                  <img
                    src={msg.sender.profilePhoto || getAvatarByName(msg.sender.name)}
                    alt="avatar"
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/10 flex-shrink-0"
                  />
                  <div className={`max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="font-black text-slate-800 dark:text-slate-200">{msg.sender.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="space-y-1 w-full">
                      <div className={`p-3 rounded-2xl border font-bold ${
                        isMe 
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-tr-none border-emerald-500/10 shadow-sm shadow-emerald-500/5' 
                          : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 rounded-tl-none border-slate-200/50 dark:border-white/5'
                      }`}>
                        {msg.content}
                      </div>

                      {/* Referenced Task Badge */}
                      {msg.task && (
                        <div className={`flex items-center mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <button
                            onClick={() => triggerTaskInspector(msg.task)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/10 transition-colors text-[9px] font-black cursor-pointer"
                          >
                            <Link className="w-3 h-3" /> Re: {msg.task.title}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <div className="p-4 border-t border-slate-200/30 dark:border-white/5 flex-shrink-0 bg-slate-500/5">
            <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
              <button
                type="button"
                className="p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-500 transition-colors cursor-pointer"
                title="Add attachment"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>
              
              <input
                type="text"
                placeholder={activeTab === 'channels' ? 'Type your message to the channel...' : 'Type message, teammate gets real-time badge alert...'}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
              />

              <button
                type="button"
                className="p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-500 transition-colors cursor-pointer"
                title="Add emoji"
              >
                <Smile className="w-4.5 h-4.5" />
              </button>

              <button
                type="submit"
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow shadow-blue-500/10 cursor-pointer transition-colors"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Start DM / Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsInviteModalOpen(false)}></div>
          
          <div className="glass-panel w-full max-w-md shadow-2xl relative border border-slate-200/50 dark:border-white/10 overflow-hidden flex flex-col z-10 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Users className="w-5 h-5 text-blue-500" /> Start Teammate Query Chat
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setInviteTab('existing')}
                className={`flex-1 py-2 text-center rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  inviteTab === 'existing'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Select Teammate
              </button>
              <button
                type="button"
                onClick={() => setInviteTab('new')}
                className={`flex-1 py-2 text-center rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  inviteTab === 'new'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create New Member
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {inviteTab === 'existing' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Teammate to Query</label>
                  <select
                    value={selectedTeammateId}
                    onChange={(e) => setSelectedTeammateId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  >
                    <option value="" disabled className="dark:bg-slate-900">-- Select Teammate --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-900">
                        {c.name} ({c.designation || 'Staff'} · {c.role === 'ROLE_EMPLOYEE' ? 'Staff' : 'Lead'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3 text-blue-500" /> Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/5 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Mail className="w-3 h-3 text-blue-500" /> Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. john@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/5 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-blue-500" /> Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Frontend dev"
                        value={inviteDesignation}
                        onChange={(e) => setInviteDesignation(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-500" /> Department
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Engineering"
                        value={inviteDept}
                        onChange={(e) => setInviteDept(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Shield className="w-3 h-3 text-blue-500" /> System Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                      >
                        <option value="ROLE_EMPLOYEE" className="dark:bg-slate-900">Employee / Staff</option>
                        <option value="ROLE_MANAGER" className="dark:bg-slate-900">Manager / Lead</option>
                        <option value="ROLE_ADMIN" className="dark:bg-slate-900">Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Award className="w-3 h-3 text-blue-500" /> Experience (Yrs)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={inviteExp}
                        onChange={(e) => setInviteExp(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/5 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Skills (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. React, Java, SQL"
                      value={inviteSkills}
                      onChange={(e) => setInviteSkills(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-center shadow shadow-blue-500/10"
              >
                {inviteTab === 'existing' ? 'Start DM Chat' : 'Create & Start DM Chat'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
