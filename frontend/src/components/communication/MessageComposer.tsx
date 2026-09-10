import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  X,
  FileText,
  AtSign,
  Sparkles,
  CornerDownLeft,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, ContactItem } from '../../store/useCommunicationStore';
import EmojiPickerPopover from './EmojiPickerPopover';
import { uploadAttachmentToSupabase } from '../../services/supabase';

interface MessageComposerProps {
  onSendMessage: (content: string, file?: { name: string; url: string; size: number }) => void;
  replyToMessage?: ChatMessage | null;
  onClearReply?: () => void;
  editingMessage?: ChatMessage | null;
  onClearEdit?: () => void;
  contacts: ContactItem[];
  placeholder?: string;
  onTyping?: () => void;
}

export default function MessageComposer({
  onSendMessage,
  replyToMessage,
  onClearReply,
  editingMessage,
  onClearEdit,
  contacts,
  placeholder = 'Type message... (Press Ctrl+Enter or Enter to send)',
  onTyping,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string; size: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // User Mention dropdown state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Populate text when editing an existing message
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (onTyping) onTyping();

    // Check for @mention trigger
    const lastWord = val.split(/\s+/).pop();
    if (lastWord && lastWord.startsWith('@')) {
      setShowMentionMenu(true);
      setMentionQuery(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit();
    } else if (e.key === 'Escape') {
      if (onClearReply) onClearReply();
      if (onClearEdit) onClearEdit();
      setShowEmojiPicker(false);
      setShowMentionMenu(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setUploadProgress(15);
    try {
      // Simulate/Attempt Supabase upload
      const res = await uploadAttachmentToSupabase(file, 'chat');
      setUploadProgress(100);

      if (res && res.url) {
        setAttachedFile({
          name: file.name,
          url: res.url,
          size: file.size,
        });
      } else {
        // Fallback local blob URL
        const fakeUrl = URL.createObjectURL(file);
        setAttachedFile({
          name: file.name,
          url: fakeUrl,
          size: file.size,
        });
      }
    } catch (err) {
      const fakeUrl = URL.createObjectURL(file);
      setAttachedFile({
        name: file.name,
        url: fakeUrl,
        size: file.size,
      });
    } finally {
      setTimeout(() => setUploadProgress(null), 600);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFormSubmit = () => {
    if (!text.trim() && !attachedFile) return;

    onSendMessage(text, attachedFile || undefined);
    setText('');
    setAttachedFile(null);
    setShowEmojiPicker(false);
    setShowMentionMenu(false);
    if (onClearReply) onClearReply();
    if (onClearEdit) onClearEdit();
  };

  const insertMention = (memberName: string) => {
    const words = text.split(/\s+/);
    words.pop(); // remove incomplete @query
    const newText = [...words, `@${memberName} `].join(' ');
    setText(newText);
    setShowMentionMenu(false);
    textareaRef.current?.focus();
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(mentionQuery)
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-4 border-t border-slate-200/50 dark:border-white/10 flex-shrink-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl relative transition-all ${
        isDraggingOver ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''
      }`}
    >
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-white z-50">
          <UploadCloud className="w-10 h-10 animate-bounce mb-2" />
          <p className="font-black text-sm uppercase tracking-wider">Drop file to attach</p>
        </div>
      )}

      {/* Reply Preview Context Banner */}
      <AnimatePresence>
        {replyToMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 px-3.5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-bold"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-500/20 rounded-md">
                Replying to {replyToMessage.sender.name}
              </span>
              <span className="truncate italic text-slate-700 dark:text-slate-300 font-normal">
                "{replyToMessage.content}"
              </span>
            </div>
            <button
              type="button"
              onClick={onClearReply}
              className="p-1 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Preview Context Banner */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 px-3.5 py-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-amber-500/20 rounded-md">
                Editing Message
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-normal">
                (Press Esc to cancel)
              </span>
            </div>
            <button
              type="button"
              onClick={onClearEdit}
              className="p-1 hover:bg-amber-500/20 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attached File Preview Chip */}
      {attachedFile && (
        <div className="mb-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 w-fit">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            <span className="truncate max-w-[220px]">{attachedFile.name}</span>
            <span className="text-[10px] opacity-75 font-mono">
              ({(attachedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="ml-2 p-0.5 hover:bg-blue-500/20 rounded-full cursor-pointer text-slate-400 hover:text-red-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="mb-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* @Mention Suggestion Dropdown */}
      {showMentionMenu && filteredContacts.length > 0 && (
        <div className="absolute left-4 bottom-20 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 rounded-2xl p-2 shadow-2xl z-50 max-h-40 overflow-y-auto space-y-1">
          <p className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
            Mention Teammate
          </p>
          {filteredContacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => insertMention(c.name)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-blue-500/10 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors text-left"
            >
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black text-[9px] flex items-center justify-center">
                {c.name.charAt(0)}
              </span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      {/* Main Input Box */}
      <div className="flex gap-2.5 items-end">
        {/* File Attachment HD Badge Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer hover:scale-105 ${
            attachedFile
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-slate-100/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400'
          }`}
          title="Attach Document or Image (or Drag & Drop)"
        >
          <Paperclip className="w-4.5 h-4.5" />
        </button>

        {/* Text Area Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold text-xs resize-none max-h-32 placeholder:text-slate-400"
          />
        </div>

        {/* Emoji HD Badge Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer hover:scale-105 ${
              showEmojiPicker
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-500 shadow-md shadow-blue-500/10'
                : 'bg-slate-100/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}
            title="Insert Emoji"
          >
            <Smile className="w-4.5 h-4.5" />
          </button>

          {/* Emoji Popover */}
          <AnimatePresence>
            {showEmojiPicker && (
              <EmojiPickerPopover
                onSelectEmoji={(emoji) => setText((prev) => prev + emoji)}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Send HD Gradient Button */}
        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={!text.trim() && !attachedFile}
          className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-md shadow-blue-500/20 flex items-center justify-center flex-shrink-0 cursor-pointer disabled:opacity-40 hover:scale-105 transition-all"
          title="Send message (Enter)"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}
