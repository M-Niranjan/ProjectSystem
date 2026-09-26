import React, { useState } from 'react';
import {
  X,
  Hash,
  Users,
  Lock,
  FileText,
  Paperclip,
  Download,
  Pin,
  Bell,
  BellOff,
  Shield,
  Search,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getAvatarByName, resolveAvatar } from '../../services/avatar';
import {
  ChannelItem,
  ContactItem,
  ChatMessage,
  useCommunicationStore
} from '../../store/useCommunicationStore';
import { formatRoleName } from '../../services/authRoles';

interface DetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'channels' | 'dms';
  channel?: ChannelItem | null;
  contact?: ContactItem | null;
  members: ContactItem[];
  messages: ChatMessage[];
  convKey: string;
}

export default function ConversationDetailsPanel({
  isOpen,
  onClose,
  activeTab,
  channel,
  contact,
  members,
  messages,
  convKey,
}: DetailsPanelProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'members' | 'files' | 'pins'>('overview');
  const [memberSearch, setMemberSearch] = useState('');

  const {
    pinnedMessagesMap,
    mutedConversations,
    toggleMuteConversation,
    onlineUsers,
  } = useCommunicationStore();

  if (!isOpen) return null;

  const isMuted = mutedConversations.has(convKey);
  const pinnedMessages = pinnedMessagesMap[convKey] || [];

  // Extract shared files from message thread
  const sharedFiles = messages.filter((m) => m.fileUrl);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <motion.aside
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="w-full sm:w-80 absolute sm:relative inset-y-0 right-0 border-l border-slate-200/50 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 sm:bg-white/70 sm:dark:bg-slate-900/80 backdrop-blur-2xl flex flex-col justify-between flex-shrink-0 z-30 text-slate-900 dark:text-white shadow-2xl print:hidden"
    >
      {/* Header */}
      <div>
        <div className="h-14 px-5 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm">
            <Info className="w-4 h-4 text-blue-500" />
            <span>Details & Overview</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Banner */}
        <div className="p-5 border-b border-slate-200/50 dark:border-white/10 text-center space-y-3">
          {activeTab === 'channels' ? (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 shadow-sm">
                {channel?.isPrivate ? <Lock className="w-7 h-7" /> : <Hash className="w-7 h-7" />}
              </div>
              <h3 className="text-base font-black tracking-tight">#{channel?.name || 'general'}</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {channel?.description || 'Official project collaboration thread for workspace team members.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <img
                  src={resolveAvatar(contact?.profilePhoto, contact?.name || 'Teammate', (contact as any)?.gender)}
                  alt="avatar"
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                    contact && onlineUsers.has(contact.id) ? 'bg-green-500' : 'bg-slate-400'
                  }`}
                />
              </div>
              <h3 className="text-base font-black tracking-tight">{contact?.name || 'Teammate'}</h3>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">
                {formatRoleName(contact?.role, 'title') || 'Employee'}
              </p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {contact?.email || ''}
              </p>
            </div>
          )}

          {/* Quick Action Toggles */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => toggleMuteConversation(convKey)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Muted' : 'Mute Notifications'}</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="grid grid-cols-4 p-1.5 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200/50 dark:border-white/10 text-xs font-black">
          <button
            onClick={() => setActiveSection('overview')}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'overview'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveSection('members')}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'members'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveSection('files')}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'files'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Files
          </button>
          <button
            onClick={() => setActiveSection('pins')}
            className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'pins'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pins
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 max-h-[calc(100vh-340px)] overflow-y-auto space-y-4">
          {/* About Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-4 text-xs font-semibold">
              <div className="p-3 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                  <span>Topic / Purpose</span>
                  <span className="text-blue-500">Active Thread</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                  {activeTab === 'channels'
                    ? channel?.description || 'General discussions regarding task deliverables and architecture.'
                    : `Direct line of communication with ${contact?.name || 'Teammate'}.`}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Security & Governance</h4>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-2xl flex items-start gap-2.5">
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold leading-normal">
                    End-to-end RBAC Security. Messages, files, and reactions are logged to system audit logs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeSection === 'members' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                {filteredMembers.map((m) => {
                  const isOnline = onlineUsers.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className="p-2 bg-slate-100/40 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="relative">
                          <img
                            src={resolveAvatar(m.profilePhoto, m.name, (m as any).gender)}
                            alt="avatar"
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-blue-500/20"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${
                              isOnline ? 'bg-green-500' : 'bg-slate-400'
                            }`}
                          />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-black truncate">{m.name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">{m.designation || formatRoleName(m.role, 'title')}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded-md uppercase">
                        {m.role === 'ROLE_ADMIN' ? 'Admin' : m.role === 'ROLE_MANAGER' ? 'Lead' : 'Staff'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shared Files Tab */}
          {activeSection === 'files' && (
            <div className="space-y-2">
              {sharedFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-semibold space-y-1">
                  <Paperclip className="w-8 h-8 mx-auto opacity-40" />
                  <p>No files shared in this chat yet</p>
                </div>
              ) : (
                sharedFiles.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold truncate">{m.fileName || 'Shared_File.pdf'}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">
                          Shared by {m.sender.name}
                        </p>
                      </div>
                    </div>
                    {m.fileUrl && (
                      <a
                        href={m.fileUrl}
                        download={m.fileName || 'download'}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors cursor-pointer"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pinned Messages Tab */}
          {activeSection === 'pins' && (
            <div className="space-y-2">
              {pinnedMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-semibold space-y-1">
                  <Pin className="w-8 h-8 mx-auto opacity-40" />
                  <p>No pinned messages in this channel</p>
                </div>
              ) : (
                pinnedMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <span>Pinned by {m.sender.name}</span>
                      <Pin className="w-3 h-3" />
                    </div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 italic">
                      "{m.content}"
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
