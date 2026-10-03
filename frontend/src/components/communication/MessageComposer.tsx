import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Smile,
  X,
  UploadCloud,
  Mic,
  Square,
  Play,
  Pause,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, ContactItem } from '../../store/useCommunicationStore';
import EmojiPickerPopover from './EmojiPickerPopover';
import { uploadChatAttachment } from '../../services/firebase';

interface MessageComposerProps {
  onSendMessage: (content: string, file?: { name: string; url: string; size: number }) => void;
  replyToMessage?: ChatMessage | null;
  onClearReply?: () => void;
  editingMessage?: ChatMessage | null;
  onClearEdit?: () => void;
  contacts: ContactItem[];
  placeholder?: string;
  onTyping?: () => void;
  orgId?: string;
  convId?: string;
  enterToSend?: boolean;
}

export default function MessageComposer({
  onSendMessage,
  replyToMessage,
  onClearReply,
  editingMessage,
  onClearEdit,
  contacts,
  placeholder = 'Type a message... (Press Enter to send)',
  onTyping,
  orgId = 'default-org',
  convId = 'general',
  enterToSend = true,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string; size: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // User Mention dropdown state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Voice Recording state (Requirement 22: Record, Stop, Preview, Send, Play, Pause, Seek)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Populate text when editing an existing message
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Auto-resize textarea to fit content without clipping placeholder
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 36), 110)}px`;
    }
  }, [text]);

  // Clean up audio preview URL on unmount or reset
  useEffect(() => {
    return () => {
      if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [audioPreviewUrl]);

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
    if (e.key === 'Enter') {
      if (enterToSend) {
        if (!e.shiftKey) {
          e.preventDefault();
          handleFormSubmit();
        }
      } else {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleFormSubmit();
        }
      }
    } else if (e.key === 'Escape') {
      if (onClearReply) onClearReply();
      if (onClearEdit) onClearEdit();
      setShowEmojiPicker(false);
      setShowMentionMenu(false);
      handleDiscardVoice();
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Check size limit: 25MB
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 25MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const uploaded = await uploadChatAttachment(file, orgId, convId, (pct) => {
        setUploadProgress(pct);
      });

      setAttachedFile({
        name: uploaded.name,
        url: uploaded.url,
        size: uploaded.size,
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      // Fallback local blob URL
      const localUrl = URL.createObjectURL(file);
      setAttachedFile({
        name: file.name,
        url: localUrl,
        size: file.size,
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 500);
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
    if (isUploading) return;

    if (audioBlob) {
      handleSendVoice();
      return;
    }

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
    words.pop();
    const newText = [...words, `@${memberName} `].join(' ');
    setText(newText);
    setShowMentionMenu(false);
    textareaRef.current?.focus();
  };

  // ==========================================
  // VOICE MESSAGE FUNCTIONS (Requirement 22)
  // ==========================================
  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access denied or error:', err);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleDiscardVoice = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioBlob(null);
    if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(null);
    setIsPlayingPreview(false);
  };

  const handleSendVoice = async () => {
    if (!audioBlob) return;

    try {
      const fileName = `Voice_Note_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
      const audioFile = new File([audioBlob], fileName, { type: audioBlob.type || 'audio/webm' });

      setIsUploading(true);
      const uploaded = await uploadChatAttachment(audioFile, orgId, convId);

      onSendMessage('', {
        name: uploaded.name,
        url: uploaded.url,
        size: uploaded.size,
      });

      handleDiscardVoice();
    } catch (e) {
      console.error('Failed to upload voice note:', e);
      if (audioPreviewUrl) {
        onSendMessage('', {
          name: 'Voice_Note.webm',
          url: audioPreviewUrl,
          size: audioBlob.size,
        });
      }
      handleDiscardVoice();
    } finally {
      setIsUploading(false);
    }
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(mentionQuery)
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`px-3 py-2 border-t border-[#202c33] shrink-0 bg-[#202c33] relative transition-all select-none ${
        isDraggingOver ? 'ring-1 ring-[#00a884] bg-[#00a884]/10' : ''
      }`}
    >
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-[#00a884]/95 backdrop-blur-md rounded-lg flex flex-col items-center justify-center text-white z-50">
          <UploadCloud className="w-8 h-8 animate-bounce mb-1" />
          <p className="font-bold text-xs uppercase tracking-wider">Drop file to attach</p>
        </div>
      )}

      {/* Reply Preview Context Banner */}
      <AnimatePresence>
        {replyToMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-1.5 px-3 py-1.5 bg-[#2a3942] border border-[#00a884]/40 rounded-lg flex items-center justify-between text-xs text-[#00a884] font-medium"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#00a884]/20 rounded text-[#00a884]">
                Replying to {replyToMessage.sender.name}
              </span>
              <span className="truncate italic text-[#d1d7db] font-normal">
                "{replyToMessage.content}"
              </span>
            </div>
            <button
              type="button"
              onClick={onClearReply}
              className="p-1 hover:bg-[#202c33] rounded cursor-pointer transition-colors text-[#8696a0] hover:text-white"
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
            className="mb-1.5 px-3 py-1.5 bg-[#2a3942] border border-amber-500/40 rounded-lg flex items-center justify-between text-xs text-amber-400 font-medium"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-500/20 rounded">
                Editing Message
              </span>
              <span className="text-[11px] text-[#8696a0] font-normal">
                (Press Esc to cancel)
              </span>
            </div>
            <button
              type="button"
              onClick={onClearEdit}
              className="p-1 hover:bg-[#202c33] rounded cursor-pointer transition-colors text-[#8696a0] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attached File Preview Chip */}
      {attachedFile && (
        <div className="mb-1.5 px-2.5 py-1 bg-[#2a3942] border border-[#00a884]/30 rounded-lg flex items-center justify-between text-xs font-semibold text-[#00a884] w-fit">
          <div className="flex items-center gap-2">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="truncate max-w-[220px] text-[#d1d7db]">{attachedFile.name}</span>
            <span className="text-[10px] text-[#8696a0] font-mono">
              ({(attachedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="ml-2 p-0.5 hover:bg-[#202c33] rounded cursor-pointer text-[#8696a0] hover:text-rose-400"
            title="Remove file"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="mb-1.5 w-full bg-[#111b21] rounded-full h-1 overflow-hidden">
          <div
            className="bg-[#00a884] h-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* @Mention Suggestion Dropdown */}
      {showMentionMenu && filteredContacts.length > 0 && (
        <div className="absolute left-4 bottom-14 w-60 bg-[#202c33] border border-[#2a3942] rounded-xl p-1.5 shadow-2xl z-50 max-h-40 overflow-y-auto space-y-0.5">
          <p className="text-[10px] font-bold uppercase text-[#8696a0] px-2 py-0.5 tracking-wider">
            Mention Teammate
          </p>
          {filteredContacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => insertMention(c.name)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#2a3942] text-xs font-medium text-[#d1d7db] cursor-pointer transition-colors text-left"
            >
              <span className="w-4 h-4 rounded-full bg-[#00a884] text-[#111b21] font-black text-[9px] flex items-center justify-center">
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

      {/* MODE 1: Active Voice Recording Mode */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 px-2 py-1 bg-[#111b21] border border-[#2a3942] rounded-xl animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-rose-400">
              {formatSeconds(recordingSeconds)}
            </span>
            <span className="text-xs text-[#8696a0]">Recording voice note...</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardVoice}
              className="p-1.5 rounded-lg text-[#8696a0] hover:text-rose-400 hover:bg-[#202c33] transition-colors cursor-pointer"
              title="Discard recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleStopRecording}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95"
              title="Stop & preview"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : audioPreviewUrl ? (
        /* MODE 2: Voice Note Preview & Send Mode */
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-[#111b21] border border-[#00a884]/40 rounded-xl">
          <audio
            ref={previewAudioRef}
            src={audioPreviewUrl}
            onTimeUpdate={() => setPreviewCurrentTime(previewAudioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setPreviewDuration(previewAudioRef.current?.duration || 0)}
            onEnded={() => setIsPlayingPreview(false)}
            className="hidden"
          />

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition-transform active:scale-95"
              title={isPlayingPreview ? 'Pause' : 'Play'}
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Seek Bar / Progress Waveform */}
            <div className="flex-1 flex flex-col justify-center">
              <input
                type="range"
                min={0}
                max={previewDuration || 1}
                step={0.1}
                value={previewCurrentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPreviewCurrentTime(val);
                  if (previewAudioRef.current) previewAudioRef.current.currentTime = val;
                }}
                className="w-full h-1 bg-[#202c33] rounded-lg accent-[#00a884] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8696a0] font-mono mt-0.5">
                <span>{formatSeconds(previewCurrentTime)}</span>
                <span>{formatSeconds(previewDuration || recordingSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscardVoice}
              className="p-1.5 rounded-lg text-[#8696a0] hover:text-rose-400 hover:bg-[#202c33] transition-colors cursor-pointer"
              title="Delete voice note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSendVoice}
              disabled={isUploading}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-tr from-[#00a884] to-[#02b992] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all"
              title="Send voice message"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        /* MODE 3: Normal Text & Attachment Composer */
        <div className="flex gap-1.5 sm:gap-2 items-center">
          {/* Emoji Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-[#2a3942] text-[#8696a0] hover:text-[#d1d7db]"
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

          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:bg-[#2a3942] ${
              attachedFile ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#d1d7db]'
            }`}
            title="Attach Document or Image (or Drag & Drop)"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          {/* Text Area Input */}
          <div className="flex-1 relative flex items-center">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-1.5 min-h-[36px] max-h-28 bg-[#2a3942] border border-transparent focus:border-[#00a884]/50 rounded-lg text-[#d1d7db] outline-none transition-all font-normal text-xs sm:text-[13px] leading-snug resize-none placeholder:text-[#8696a0]"
            />
          </div>

          {/* Mic or Send Button */}
          {text.trim() || attachedFile ? (
            <button
              type="button"
              onClick={handleFormSubmit}
              disabled={isUploading}
              className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-[#00a884] to-[#02b992] hover:from-[#029072] hover:to-[#00a884] text-white shadow-[0_2px_10px_rgba(0,168,132,0.4)] flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="Send message"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-white fill-white ml-0.5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              className="w-8.5 h-8.5 rounded-full hover:bg-[#2a3942] text-[#8696a0] hover:text-[#00a884] flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="Record voice message"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
