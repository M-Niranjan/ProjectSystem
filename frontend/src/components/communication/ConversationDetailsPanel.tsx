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
  Info,
  Link2,
  Trash2,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveAvatar } from '../../services/avatar';
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
  channel?: ChannelItem | any | null;
  contact?: ContactItem | any | null;
  members: ContactItem[];
  messages: ChatMessage[];
  convKey: string;
  onOpenPdf?: (doc: { url: string; fileName: string; fileSize?: string; uploadedBy?: string }) => void;
  onClearChat?: () => void;
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
  onOpenPdf,
  onClearChat,
}: DetailsPanelProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'members' | 'files' | 'links'>('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const {
    mutedConversations,
    toggleMuteConversation,
    onlineUsers,
  } = useCommunicationStore();

  if (!isOpen) return null;

  const isMuted = mutedConversations.has(convKey);

  // Extract shared files from message thread
  const sharedFiles = messages.filter((m) => m.fileName || m.fileUrl);

  // Extract shared links from message thread
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const sharedLinks: { url: string; text: string; sender: string; time: string }[] = [];
  messages.forEach((m) => {
    const matches = m.content.match(urlRegex);
    if (matches) {
      matches.forEach((url) => {
        sharedLinks.push({
          url,
          text: m.content,
          sender: m.sender.name,
          time: m.createdAt,
        });
      });
    }
  });

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.role.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <motion.aside
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full sm:w-80 md:w-88 border-l border-[#2a3942] bg-[#111b21] flex flex-col justify-between flex-shrink-0 z-30 text-[#e9edef] shadow-2xl h-full select-none"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="h-15 px-4 border-b border-[#2a3942] bg-[#202c33] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm text-[#e9edef]">
            <Info className="w-4 h-4 text-[#00a884]" />
            <span>{activeTab === 'channels' ? 'Channel Info' : 'Contact Details'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#2a3942] transition-colors cursor-pointer"
            title="Close details"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Conversation Banner */}
        <div className="p-4 border-b border-[#2a3942] bg-[#202c33]/40 text-center space-y-3 shrink-0">
          {activeTab === 'channels' ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#111b21] border border-[#2a3942] text-[#00a884] flex items-center justify-center mb-2 shadow-sm">
                {channel?.isPrivate ? <Lock className="w-8 h-8 text-amber-400" /> : <Hash className="w-8 h-8" />}
              </div>
              <h3 className="text-base font-bold text-[#e9edef] tracking-tight">#{channel?.name || 'channel'}</h3>
              <p className="text-xs text-[#8696a0] mt-1 line-clamp-2 px-2">
                {channel?.description || 'Project workspace channel for organizational tasks.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <img
                  src={resolveAvatar(contact?.profilePhoto, contact?.name || 'Teammate', (contact as any)?.gender)}
                  alt="avatar"
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-[#00a884]/40 shadow-md"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111b21] ${
                    contact?.status === 'busy'
                      ? 'bg-rose-500'
                      : contact?.status === 'away'
                      ? 'bg-amber-400'
                      : contact?.isOnline
                      ? 'bg-[#00a884]'
                      : 'bg-[#8696a0]'
                  }`}
                />
              </div>
              <h3 className="text-base font-bold text-[#e9edef] tracking-tight">{contact?.name || 'Teammate'}</h3>
              <p className="text-xs font-semibold text-[#00a884] uppercase tracking-wider mt-0.5">
                {formatRoleName(contact?.role, 'title') || 'Workspace Member'}
              </p>
              <p className="text-xs text-[#8696a0]">{contact?.email || ''}</p>
            </div>
          )}

          {/* Quick Action Toggles */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => toggleMuteConversation(convKey)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                  : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-[#d1d7db]'
              }`}
            >
              {isMuted ? <BellOff className="w-3.5 h-3.5 text-rose-400" /> : <Bell className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Muted' : 'Mute'}</span>
            </button>
            {onClearChat && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2a3942] bg-[#202c33] text-[#8696a0] hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer text-xs font-bold"
                title="Clear Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="grid grid-cols-4 p-1.5 bg-[#202c33] border-b border-[#2a3942] text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveSection('overview')}
            className={`py-1 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'overview'
                ? 'bg-[#111b21] text-[#00a884] shadow-xs'
                : 'text-[#8696a0] hover:text-[#d1d7db]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection('members')}
            className={`py-1 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'members'
                ? 'bg-[#111b21] text-[#00a884] shadow-xs'
                : 'text-[#8696a0] hover:text-[#d1d7db]'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveSection('files')}
            className={`py-1 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'files'
                ? 'bg-[#111b21] text-[#00a884] shadow-xs'
                : 'text-[#8696a0] hover:text-[#d1d7db]'
            }`}
          >
            Files ({sharedFiles.length})
          </button>
          <button
            onClick={() => setActiveSection('links')}
            className={`py-1 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'links'
                ? 'bg-[#111b21] text-[#00a884] shadow-xs'
                : 'text-[#8696a0] hover:text-[#d1d7db]'
            }`}
          >
            Links ({sharedLinks.length})
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll-area">
          {/* 1. Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#202c33] border border-[#2a3942] rounded-xl space-y-2">
                <div className="flex justify-between items-center text-[#8696a0] text-[11px] font-bold">
                  <span>Topic / Purpose</span>
                  <span className="text-[#00a884]">Encrypted</span>
                </div>
                <p className="text-[#d1d7db] leading-relaxed">
                  {activeTab === 'channels'
                    ? channel?.description || 'Official project collaboration thread for workspace team members.'
                    : `Encrypted direct messaging channel with ${contact?.name || 'teammate'}.`}
                </p>
              </div>

              {activeTab === 'dms' && contact && (
                <div className="p-3 bg-[#202c33] border border-[#2a3942] rounded-xl space-y-2">
                  <div className="flex justify-between py-1 border-b border-[#2a3942]/60">
                    <span className="text-[#8696a0]">Department</span>
                    <span className="font-bold text-[#d1d7db]">{contact.department || 'Engineering'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a3942]/60">
                    <span className="text-[#8696a0]">Designation</span>
                    <span className="font-bold text-[#d1d7db]">{contact.designation || 'Team Member'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8696a0]">Online Status</span>
                    <span className={`font-bold capitalize flex items-center gap-1.5 ${
                      contact.status === 'busy'
                        ? 'text-rose-400'
                        : contact.status === 'away'
                        ? 'text-amber-400'
                        : contact.isOnline
                        ? 'text-[#00a884]'
                        : 'text-[#8696a0]'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        contact.status === 'busy'
                          ? 'bg-rose-500'
                          : contact.status === 'away'
                          ? 'bg-amber-400'
                          : contact.isOnline
                          ? 'bg-[#00a884]'
                          : 'bg-[#8696a0]'
                      }`} />
                      {contact.status === 'busy'
                        ? 'Busy'
                        : contact.status === 'away'
                        ? 'Away'
                        : contact.isOnline
                        ? 'Online now'
                        : 'Offline'}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#0a332c] border border-[#00a884]/30 rounded-xl flex items-start gap-2.5 text-[#00a884]">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium leading-relaxed">
                  End-to-end multi-tenant isolation. All messages and documents are protected by organization role boundaries.
                </p>
              </div>
            </div>
          )}

          {/* 2. Members */}
          {activeSection === 'members' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8696a0]" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#202c33] border border-[#2a3942] rounded-xl text-xs text-[#d1d7db] outline-none focus:border-[#00a884]/50 transition-all placeholder:text-[#8696a0]"
                />
              </div>

              <div className="space-y-1.5">
                {filteredMembers.map((m) => {
                  const isOnline = Boolean(m.isOnline);
                  const memberStatus = m.status || (isOnline ? 'online' : 'offline');
                  return (
                    <div
                      key={m.id}
                      className="p-2 bg-[#202c33]/70 border border-[#2a3942] rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="relative shrink-0">
                          <img
                            src={resolveAvatar(m.profilePhoto, m.name, (m as any).gender)}
                            alt={m.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-[#2a3942]"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#111b21] ${
                              memberStatus === 'busy'
                                ? 'bg-rose-500'
                                : memberStatus === 'away'
                                ? 'bg-amber-400'
                                : isOnline
                                ? 'bg-[#00a884]'
                                : 'bg-[#8696a0]'
                            }`}
                          />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-[#e9edef] truncate">{m.name}</p>
                          <p className="text-[10px] text-[#8696a0] truncate">
                            {formatRoleName(m.role, 'title')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#111b21] border border-[#2a3942] text-[#00a884] rounded-md uppercase shrink-0">
                        {m.role === 'ROLE_ADMIN' ? 'Admin' : m.role === 'ROLE_MANAGER' ? 'Lead' : 'Member'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Shared Files */}
          {activeSection === 'files' && (
            <div className="space-y-2">
              {sharedFiles.length === 0 ? (
                <div className="text-center py-8 text-[#8696a0] text-xs space-y-2">
                  <Paperclip className="w-8 h-8 mx-auto opacity-40" />
                  <p>No files shared in this chat yet</p>
                </div>
              ) : (
                sharedFiles.map((m, idx) => {
                  const isPdf = m.fileName?.toLowerCase().endsWith('.pdf');
                  return (
                    <div
                      key={m.id || idx}
                      className="p-2.5 bg-[#202c33] border border-[#2a3942] rounded-xl flex items-center justify-between gap-2 hover:border-[#00a884]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-[#e9edef] truncate">{m.fileName || 'Shared Document'}</p>
                          <p className="text-[10px] text-[#8696a0]">
                            {m.sender.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isPdf && onOpenPdf && (
                          <button
                            onClick={() => onOpenPdf({ url: m.fileUrl || '#', fileName: m.fileName || 'Document.pdf', uploadedBy: m.sender.name })}
                            className="p-1.5 rounded-lg bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] transition-transform active:scale-95 cursor-pointer"
                            title="Open in PDF Viewer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {m.fileUrl && m.fileUrl !== '#' && (
                          <a
                            href={m.fileUrl}
                            download={m.fileName || 'download'}
                            className="p-1.5 rounded-lg bg-[#111b21] hover:bg-[#2a3942] text-[#d1d7db] transition-colors"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 4. Shared Links */}
          {activeSection === 'links' && (
            <div className="space-y-2">
              {sharedLinks.length === 0 ? (
                <div className="text-center py-8 text-[#8696a0] text-xs space-y-2">
                  <Link2 className="w-8 h-8 mx-auto opacity-40" />
                  <p>No links shared in this conversation yet</p>
                </div>
              ) : (
                sharedLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-[#202c33] border border-[#2a3942] hover:border-[#00a884]/40 rounded-xl flex items-center justify-between gap-2 block transition-colors group"
                  >
                    <div className="truncate flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#00a884] group-hover:underline truncate">{link.url}</p>
                      <p className="text-[10px] text-[#8696a0] truncate mt-0.5">
                        Shared by {link.sender}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#8696a0] group-hover:text-[#00a884] shrink-0" />
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Clear Chat */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#202c33] border border-[#2a3942] rounded-2xl p-5 text-center text-[#e9edef] shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#e9edef]">Clear this conversation?</h3>
              <p className="text-xs text-[#8696a0] mt-1.5 leading-relaxed">
                Are you sure you want to clear all messages in this conversation? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-center mt-5">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8696a0] hover:text-white hover:bg-[#2a3942]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowClearConfirm(false);
                    if (onClearChat) onClearChat();
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Clear Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
