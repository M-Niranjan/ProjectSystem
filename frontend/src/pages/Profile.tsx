import { getAvatarByName, resolveAvatar, MEN_AVATAR, WOMEN_AVATAR } from '../services/avatar';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Award, Shield, FileText, CheckCircle, Clock, Zap, Star, 
  Mail, Phone, Globe, UploadCloud, X, Check, Pencil, Camera, Briefcase,
  GraduationCap, TrendingUp, FolderGit2, Sparkles, Quote, ExternalLink, Download
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editExp, setEditExp] = useState(5);
  const [editSkills, setEditSkills] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editPortfolio, setEditPortfolio] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editGender, setEditGender] = useState<'Male' | 'Female'>('Male');
  const [editResumeBase64, setEditResumeBase64] = useState('');
  const [editResumeFileName, setEditResumeFileName] = useState('');

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Live Workspace Task Metrics
  const [taskMetrics, setTaskMetrics] = useState({
    assigned: 0,
    completed: 0,
    pending: 0,
    rate: 100,
    loading: true
  });

  useEffect(() => {
    let isMounted = true;
    if (!user) return;

    const fetchUserMetrics = async () => {
      try {
        const res = await api.get('/api/tasks');
        const tasks = res.data || [];
        const myTasks = tasks.filter((t: any) => 
          t.assignee && (
            t.assignee.id === user.id || 
            (t.assignee.name && user.name && t.assignee.name.trim().toLowerCase() === user.name.trim().toLowerCase()) ||
            (t.assignee.email && user.email && t.assignee.email.trim().toLowerCase() === user.email.trim().toLowerCase())
          )
        );
        const completed = myTasks.filter((t: any) => t.status === 'COMPLETED' || t.status === 'DONE').length;
        const total = myTasks.length;
        const pending = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

        if (isMounted) {
          setTaskMetrics({
            assigned: total,
            completed,
            pending,
            rate,
            loading: false
          });
        }
      } catch (err) {
        if (isMounted) {
          setTaskMetrics(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchUserMetrics();
    return () => { isMounted = false; };
  }, [user?.id, user?.name, user?.email]);

  if (!user) return <div className="text-center p-8">Loading profile...</div>;

  const skillsList = user.skills && user.skills.trim().length > 0
    ? user.skills.split(',').map(s => s.trim()).filter(Boolean)
    : ['React', 'TypeScript', 'Node.js', 'AWS Cloud', 'PostgreSQL', 'Tailwind CSS', 'Docker', 'REST APIs'];

  const cleanDesignation = (user.designation || 'Senior Software Developer').replace(/devoloper/gi, 'Developer');

  const handleOpenEdit = () => {
    setEditName(user.name || '');
    setEditDesignation((user.designation || '').replace(/devoloper/gi, 'Developer'));
    setEditDept(user.department || '');
    setEditExp(user.experience || 5);
    setEditSkills(user.skills || '');
    setEditPhone(user.phone || '');
    setEditGithub(user.githubUrl || '');
    setEditPortfolio(user.portfolioUrl || '');
    setEditBio(user.bio || '');
    setEditEducation(user.education || '');
    setEditGender((user.gender as any) || 'Male');
    setEditPhoto(user.profilePhoto || '');
    setEditResumeBase64(user.resumeBase64 || '');
    setEditResumeFileName(user.resumeFileName || '');
    setIsEditOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditResumeBase64(reader.result as string);
        setEditResumeFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera access requires secure connection (HTTPS). Please use 'Choose Photo' to select an image from your device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play failed", e));
        }
      }, 100);
    } catch (err) {
      alert("Unable to access camera. Please check camera permissions or use 'Choose Photo'.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 150, 150);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setEditPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const closeEditModal = () => {
    stopCamera();
    setIsEditOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultAvatar = editGender === 'Female' ? WOMEN_AVATAR : MEN_AVATAR;
    const payload = {
      name: editName,
      designation: editDesignation,
      department: editDept,
      experience: Number(editExp),
      skills: editSkills,
      gender: editGender,
      phone: editPhone,
      githubUrl: editGithub,
      portfolioUrl: editPortfolio,
      bio: editBio,
      education: editEducation,
      profilePhoto: editPhoto || defaultAvatar,
      resumeBase64: editResumeBase64 || null,
      resumeFileName: editResumeFileName || null
    };

    const success = await updateProfile(payload);
    if (success) {
      closeEditModal();
    } else {
      alert("Failed to save changes.");
    }
  };

  const downloadResume = () => {
    if (user.resumeBase64) {
      const link = document.createElement('a');
      link.href = user.resumeBase64;
      link.download = user.resumeFileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* ========================================================================= */}
      {/* 1. HORIZONTAL IDENTITY HEADER (Photo Left, Name & Details Right)           */}
      {/* ========================================================================= */}
      <div className="pb-6 border-b border-slate-200/40 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        {/* Left: Avatar + Identification & Stats */}
        <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-cyan-500/35 shadow-lg shadow-cyan-500/10">
              <img
                src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0a0b0f] ring-2 ring-emerald-500/40 animate-pulse" title="Active in Workspace" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                {user.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                {user.role?.replace('ROLE_', '') || 'MEMBER'}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
              <span className="text-slate-900 dark:text-slate-100 font-extrabold">{cleanDesignation}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{user.department || 'Engineering'}</span>
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
          <button
            onClick={handleOpenEdit}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Profile
          </button>
          {user.resumeBase64 && (
            <button
              onClick={downloadResume}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-white rounded-full font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 text-rose-500" /> Resume
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEAMLESS STAT ROW (NO BOXES — Clean Hairline Dividers)                  */}
      {/* ========================================================================= */}
      <div className="py-4 border-b border-slate-200/40 dark:border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0">
        {/* Stat 1: Experience */}
        <div className="flex items-center gap-3 md:pr-6 md:border-r border-slate-200/40 dark:border-white/10">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {user.experience || 1} Yrs
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Experience
            </div>
          </div>
        </div>

        {/* Stat 2: Active Tasks */}
        <div className="flex items-center gap-3 md:px-6 md:border-r border-slate-200/40 dark:border-white/10">
          <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {taskMetrics.loading ? '—' : taskMetrics.pending}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Active Tasks
            </div>
          </div>
        </div>

        {/* Stat 3: Tasks Done */}
        <div className="flex items-center gap-3 md:px-6 md:border-r border-slate-200/40 dark:border-white/10">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {taskMetrics.loading ? '—' : taskMetrics.completed}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Tasks Done ({taskMetrics.rate}%)
            </div>
          </div>
        </div>

        {/* Stat 4: Velocity */}
        <div className="flex items-center gap-3 md:pl-6">
          <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {taskMetrics.loading ? '—' : `${taskMetrics.rate}%`}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Velocity
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DIRECT CONTACT & REACH CHANNELS (Boxless Fluid Floating Row)           */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-emerald-500" /> Direct Channels
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">Immediate Reach</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Email */}
          <a
            href={`mailto:${user.email}`}
            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200/50 dark:border-white/5 transition-all group min-h-[52px]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-500/20 transition-all">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Email</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.email}</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0 transition-colors ml-2" />
          </a>

          {/* Phone */}
          {user.phone ? (
            <a
              href={`tel:${user.phone}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200/50 dark:border-white/5 transition-all group min-h-[52px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Phone / Call</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.phone}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                Direct
              </span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 hover:bg-slate-100/80 dark:bg-white/[0.015] dark:hover:bg-white/[0.04] border border-dashed border-slate-300 dark:border-white/10 transition-all text-left cursor-pointer group min-h-[52px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500/60 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-colors">+ Add Phone</span>
              </div>
              <Pencil className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 ml-2" />
            </button>
          )}

          {/* GitHub */}
          {user.githubUrl ? (
            <a
              href={user.githubUrl.startsWith('http') ? user.githubUrl : `https://${user.githubUrl}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200/50 dark:border-white/5 transition-all group min-h-[52px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-violet-500/20 transition-all">
                  <Github className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">GitHub</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user.githubUrl.replace(/^https?:\/\//, '')}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 shrink-0 transition-colors ml-2" />
            </a>
          ) : (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 hover:bg-slate-100/80 dark:bg-white/[0.015] dark:hover:bg-white/[0.04] border border-dashed border-slate-300 dark:border-white/10 transition-all text-left cursor-pointer group min-h-[52px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-500/60 flex items-center justify-center shrink-0">
                  <Github className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-violet-500 transition-colors">+ Add GitHub</span>
              </div>
              <Pencil className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 ml-2" />
            </button>
          )}

          {/* Portfolio */}
          {user.portfolioUrl ? (
            <a
              href={user.portfolioUrl.startsWith('http') ? user.portfolioUrl : `https://${user.portfolioUrl}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200/50 dark:border-white/5 transition-all group min-h-[52px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Portfolio</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user.portfolioUrl.replace(/^https?:\/\//, '')}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 shrink-0 transition-colors ml-2" />
            </a>
          ) : (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 hover:bg-slate-100/80 dark:bg-white/[0.015] dark:hover:bg-white/[0.04] border border-dashed border-slate-300 dark:border-white/10 transition-all text-left cursor-pointer group min-h-[52px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-500/60 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 transition-colors">+ Add Portfolio</span>
              </div>
              <Pencil className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 ml-2" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TECHNICAL SKILLS CONSTELLATION (Boxless, Floating Glow Pills)          */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Core Tech Stack & Competencies
          </span>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-[11px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit Skills
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {skillsList.map((skill, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold bg-slate-100/90 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              <span>{skill}</span>
            </div>
          ))}
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-blue-500 border border-dashed border-slate-300 dark:border-white/10 hover:border-blue-500/40 transition-all cursor-pointer"
          >
            <span>+ Add More</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. EXECUTIVE BIO & OVERVIEW (Ambient Quote Block — Completely Boxless)     */}
      {/* ========================================================================= */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-500/[0.04] via-indigo-500/[0.03] to-transparent p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-blue-500" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Professional Bio & Executive Summary
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-[11px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit Bio
          </button>
        </div>

        <div className="relative pl-3 sm:pl-4">
          <span className="absolute -top-3 -left-1 text-4xl sm:text-5xl font-serif text-blue-500/15 select-none pointer-events-none">
            “
          </span>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
            {user.bio || "No summary provided yet. Click 'Edit Bio' to share your key engineering responsibilities, leadership experience, and project focus."}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. LIVE TASK DELIVERY VELOCITY RIBBON (Minimal Stream — No Heavy Boxes)     */}
      {/* ========================================================================= */}
      <div className="pt-2 pb-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="uppercase tracking-wider text-[10px] font-black">Workspace Task Velocity</span>
          </div>
          <span className="text-emerald-500 font-extrabold text-xs">
            {taskMetrics.loading ? 'Calculating...' : `${taskMetrics.rate}% Completed (${taskMetrics.completed}/${taskMetrics.assigned} Tasks)`}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(5, Math.min(100, taskMetrics.rate))}%` }}
          />
        </div>
      </div>

      {/* Edit Profile Details Modal */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEditModal}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel w-full max-w-lg p-6 shadow-2xl relative border border-slate-200/50 dark:border-white/10 overflow-y-auto max-h-[90vh] space-y-4"
            >
              <button
                onClick={closeEditModal}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-blue-500" /> Edit Profile Portfolio Resume
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Profile Photo camera/upload */}
                <div className="flex flex-col items-center space-y-2 p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl">
                  <div className="relative">
                    {isCameraActive ? (
                      <video 
                        ref={videoRef} 
                        className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-500 bg-black"
                        playsInline
                        muted
                      />
                    ) : (
                      <img
                        src={resolveAvatar(editPhoto, editName, editGender)}
                        alt="Profile avatar preview"
                        className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-500/20 shadow-md"
                      />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    <input 
                      type="file" 
                      id="editFileInput" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoChange} 
                    />
                    <label 
                      htmlFor="editFileInput"
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-[10px] font-black text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                    >
                      Choose Photo
                    </label>

                    {isCameraActive ? (
                      <>
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                        >
                          Capture
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-[10px] font-black text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                      >
                        Use Camera
                      </button>
                    )}

                    {editPhoto && (
                      <button
                        type="button"
                        onClick={() => setEditPhoto('')}
                        className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/15 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Gender selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Gender (Profile Icon)</span>
                    <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold normal-case">Default avatar icon</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditGender('Male');
                        if (!editPhoto || editPhoto === WOMEN_AVATAR) {
                          setEditPhoto(MEN_AVATAR);
                        }
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        editGender === 'Male'
                          ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                          : 'border-slate-200/50 dark:border-white/5 bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <img src={MEN_AVATAR} alt="Male Icon" className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/30 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-black">Male</p>
                        <p className="text-[9px] opacity-75">Men Icon</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditGender('Female');
                        if (!editPhoto || editPhoto === MEN_AVATAR) {
                          setEditPhoto(WOMEN_AVATAR);
                        }
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        editGender === 'Female'
                          ? 'border-pink-500 bg-pink-500/15 text-pink-600 dark:text-pink-400 ring-2 ring-pink-500/20'
                          : 'border-slate-200/50 dark:border-white/5 bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <img src={WOMEN_AVATAR} alt="Female Icon" className="w-8 h-8 rounded-lg object-cover ring-1 ring-pink-500/30 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-black">Female</p>
                        <p className="text-[9px] opacity-75">Women Icon</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Designation</label>
                    <input
                      type="text"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Department</label>
                    <input
                      type="text"
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Experience (Yrs)</label>
                    <input
                      type="number"
                      value={editExp}
                      onChange={(e) => setEditExp(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Skills / Competencies (Comma separated)</label>
                  <input
                    type="text"
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                {/* Contact links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 555-0100"
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">GitHub Username</label>
                    <input
                      type="text"
                      value={editGithub}
                      onChange={(e) => setEditGithub(e.target.value)}
                      placeholder="github.com/user"
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Portfolio URL</label>
                    <input
                      type="text"
                      value={editPortfolio}
                      onChange={(e) => setEditPortfolio(e.target.value)}
                      placeholder="portfolio.me"
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Professional Bio Summary</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write a brief career summary..."
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs resize-none"
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Education History</label>
                  <textarea
                    rows={2}
                    value={editEducation}
                    onChange={(e) => setEditEducation(e.target.value)}
                    placeholder="e.g. B.S. in Computer Science - Stanford (2022)"
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs resize-none"
                  ></textarea>
                </div>

                {/* PDF Resume upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Upload PDF/Document Resume</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="file" 
                      id="resumeInput" 
                      accept=".pdf,.doc,.docx" 
                      className="hidden" 
                      onChange={handleResumeChange} 
                    />
                    <label 
                      htmlFor="resumeInput"
                      className="flex items-center gap-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer transition-colors"
                    >
                      <UploadCloud className="w-4 h-4 text-blue-500" /> {editResumeFileName ? 'Replace Resume' : 'Attach Resume Document'}
                    </label>
                    {editResumeFileName && (
                      <span className="text-xs font-semibold text-slate-400 truncate max-w-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-green-500" /> {editResumeFileName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200/30 dark:border-white/5 mt-4">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 border border-slate-200/50 dark:border-white/5 rounded-xl hover:bg-white/10 text-slate-500 dark:text-slate-400 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-blue-500/10 transition-colors"
                  >
                    Save Portfolio Details
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
