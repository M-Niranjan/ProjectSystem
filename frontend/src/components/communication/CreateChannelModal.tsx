import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Hash, Lock, Users, Shield, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContactItem } from '../../store/useCommunicationStore';
import { formatRoleName } from '../../services/authRoles';
import { useScrollLock } from '../../hooks/useScrollLock';

const channelSchema = z.object({
  name: z.string()
    .min(2, 'Channel name must be at least 2 characters')
    .max(40, 'Channel name cannot exceed 40 characters')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only (e.g. project-updates)'),
  description: z.string().max(120, 'Description cannot exceed 120 characters').optional(),
  isPrivate: z.boolean(),
  selectedMembers: z.array(z.number()).optional(),
});

export type ChannelFormData = {
  name: string;
  description?: string;
  isPrivate: boolean;
  selectedMembers?: number[];
};

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitChannel: (data: ChannelFormData) => void;
  contacts: ContactItem[];
}

export default function CreateChannelModal({
  isOpen,
  onClose,
  onSubmitChannel,
  contacts,
}: CreateChannelModalProps) {
  // Lock background scroll when Create Channel modal is open
  useScrollLock(isOpen);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
      selectedMembers: [],
    },
  });

  const isPrivate = watch('isPrivate');
  const selectedMembers = watch('selectedMembers') || [];

  const handleFormSubmit = (data: ChannelFormData) => {
    onSubmitChannel(data);
    reset();
    onClose();
  };

  const toggleMemberSelection = (memberId: number) => {
    const current = selectedMembers;
    if (current.includes(memberId)) {
      setValue('selectedMembers', current.filter((id) => id !== memberId));
    } else {
      setValue('selectedMembers', [...current, memberId]);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 touch-none overscroll-contain select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md touch-none overscroll-none"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl z-10 text-slate-900 dark:text-white modal-dialog-contain overscroll-contain"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Create New Channel</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Organize team discussion threads around specific topics or projects.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-5 space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Channel Name <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 font-mono font-bold text-sm">#</span>
                <input
                  type="text"
                  placeholder="e.g. sprint-launch-q3"
                  {...register('name')}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-100/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-[11px] font-bold text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="What is this channel about?"
                {...register('description')}
                className="w-full px-4 py-2.5 bg-slate-100/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
              />
              {errors.description && (
                <p className="mt-1 text-[11px] font-bold text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Public vs Private Toggle Card */}
            <div className="p-3.5 bg-slate-100/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${isPrivate ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    {isPrivate ? 'Private Channel' : 'Public Channel'}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isPrivate
                      ? 'Only invited members can view and post'
                      : 'Anyone in the workspace can view and join'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setValue('isPrivate', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Member Selection for Private Channel */}
            {isPrivate && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Invite Members ({selectedMembers.length} Selected)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-100/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl">
                  {contacts.map((member) => {
                    const isSelected = selectedMembers.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleMemberSelection(member.id)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-black text-[10px] flex items-center justify-center">
                            {member.name.charAt(0)}
                          </span>
                          <span>{member.name}</span>
                          <span className="text-[10px] opacity-60 font-semibold">({formatRoleName(member.role, 'title')})</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/50 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-extrabold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Channel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
