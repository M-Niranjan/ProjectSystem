import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Award, Shield, FileText, CheckCircle, Clock, Zap, Star, 
  Mail, Phone, Globe, UploadCloud, X, Check, Pencil, Camera, Briefcase 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface Activity {
  id: number;
  action: string;
  details: string;
  createdAt: string;
}

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
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
  const [editResumeBase64, setEditResumeBase64] = useState('');
  const [editResumeFileName, setEditResumeFileName] = useState('');

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Default Mock Activities
  const mockActivities = [
    { id: 1, action: 'CREATE', details: 'Initialized project: Prologue SaaS Dashboard', createdAt: '2026-07-14T08:00:00Z' },
    { id: 2, action: 'UPDATE', details: 'Moved task: "Revamp login page" to IN_PROGRESS', createdAt: '2026-07-14T08:15:00Z' },
    { id: 3, action: 'COMMENT', details: 'Added comment: "Matches radius variables" on task 101', createdAt: '2026-07-14T08:45:00Z' }
  ];

  const fetchActivities = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/api/logs/user/${user.id}`);
      setActivities(res.data);
    } catch (err) {
      setActivities(mockActivities);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user]);

  if (!user) return <div className="text-center p-8">Loading profile...</div>;

  const skillsList = user.skills ? user.skills.split(',').map(s => s.trim()) : ['Agile', 'Teamwork', 'Productivity', 'React', 'TypeScript'];

  const handleOpenEdit = () => {
    setEditName(user.name || '');
    setEditDesignation(user.designation || '');
    setEditDept(user.department || '');
    setEditExp(user.experience || 5);
    setEditSkills(user.skills || '');
    setEditPhone(user.phone || '');
    setEditGithub(user.githubUrl || '');
    setEditPortfolio(user.portfolioUrl || '');
    setEditBio(user.bio || '');
    setEditEducation(user.education || '');
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
      alert("Unable to access camera. Please check device permissions.");
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
    const payload = {
      name: editName,
      designation: editDesignation,
      department: editDept,
      experience: Number(editExp),
      skills: editSkills,
      phone: editPhone,
      githubUrl: editGithub,
      portfolioUrl: editPortfolio,
      bio: editBio,
      education: editEducation,
      profilePhoto: editPhoto || null,
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
    <div className="space-y-6 select-none pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            Profile Resume
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            View your profile details, designations, skills, and audit logs.
          </p>
        </div>

        <button
          onClick={handleOpenEdit}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 cursor-pointer transition-all transform hover:-translate-y-0.5"
        >
          <Pencil className="w-4 h-4" /> Edit Profile Details
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Profile Identity Card & Resume */}
        <div className="space-y-6">
          <div className="glass-panel p-6 text-center space-y-4 flex flex-col items-center relative">
            <div className="relative">
              <img
                src={user.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
                alt="Profile"
                className="w-28 h-28 rounded-2xl object-cover ring-4 ring-blue-500/20"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 animate-pulse"></span>
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">{user.name}</h2>
              <p className="text-xs font-bold text-blue-500 mt-0.5">{user.designation || 'Software Engineer'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{user.department || 'Technology'}</p>
            </div>

            <div className="w-full border-t border-slate-200/30 dark:border-white/5 pt-4 flex justify-around text-center text-xs">
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">{user.experience || 5}y</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Experience</p>
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">{skillsList.length}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Skills</p>
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">4</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Projects</p>
              </div>
            </div>
          </div>

          {/* Resume Upload & Download Card */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-500" /> Resume Profile
            </h3>

            {user.resumeBase64 ? (
              <div className="space-y-3 p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-center">
                <FileText className="w-10 h-10 text-red-500 mx-auto" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{user.resumeFileName || 'Resume.pdf'}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">PDF Portfolio Attachment</p>
                </div>
                <button
                  onClick={downloadResume}
                  className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-red-500/10 transition-all"
                >
                  Download / View Resume
                </button>
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-bold text-slate-400 border border-dashed border-slate-300/40 dark:border-white/5 rounded-xl space-y-2">
                <UploadCloud className="w-8 h-8 mx-auto text-slate-400" />
                <p>No resume uploaded yet.</p>
                <p className="text-[10px] text-slate-400 font-medium">Click "Edit Profile Details" below to attach a PDF resume.</p>
              </div>
            )}
          </div>

          {/* Contact Details Pane */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-500" /> Contact Info
            </h3>

            <div className="space-y-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.githubUrl && (
                <a 
                  href={user.githubUrl.startsWith('http') ? user.githubUrl : `https://${user.githubUrl}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  <Github className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">GitHub Profile</span>
                </a>
              )}
              {user.portfolioUrl && (
                <a 
                  href={user.portfolioUrl.startsWith('http') ? user.portfolioUrl : `https://${user.portfolioUrl}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-850 dark:hover:text-white transition-colors"
                >
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Personal Portfolio</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Skills, About, Education, Achievements */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Me Bio */}
          <div className="glass-panel p-6 space-y-3">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" /> Professional Summary
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
              {user.bio || "No summary provided. Edit your profile to write a career overview."}
            </p>
          </div>

          {/* Education background */}
          <div className="glass-panel p-6 space-y-3">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-emerald-500" /> Education & Qualifications
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-bold whitespace-pre-line">
              {user.education || "No education history specified yet."}
            </p>
          </div>

          {/* Skills & achievements */}
          <div className="glass-panel p-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Core Competencies
              </h3>
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/15 rounded-xl text-xs font-black transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="space-y-3 border-t border-slate-200/30 dark:border-white/5 pt-6">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-violet-500" /> Earned Certificates & Badges
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Prologue Pioneer</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Assigned to first 3 SaaS projects.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Milestones Master</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Successfully finished 15+ subtasks.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Audit Activities */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" /> Recent Audit Activity History
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between text-xs gap-4 font-bold">
                  <div className="flex items-center gap-3 truncate">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase flex-shrink-0 ${
                      act.action === 'CREATE' ? 'bg-green-500/10 text-green-500' :
                      act.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {act.action}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 truncate">{act.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">
                    {new Date(act.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
                        src={editPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${editName || 'seed'}`}
                        alt="Teammate avatar preview"
                        className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-500/10"
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

                <div className="grid grid-cols-2 gap-3">
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

                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-3 gap-3">
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
