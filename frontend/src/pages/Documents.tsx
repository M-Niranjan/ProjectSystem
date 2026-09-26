import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Plus,
  Save,
  Download,
  Trash2,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  Search,
  BookOpen,
  Calendar,
  Clock,
  Tag,
  Check,
  Copy,
  Printer,
  ChevronLeft,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  Layers,
  FileCode,
  Share2,
  MoreVertical,
  X,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceDocument {
  id: number;
  title: string;
  content: string;
  category: 'Architecture' | 'Product' | 'Engineering' | 'Planning' | 'Meeting' | 'General';
  tags: string[];
  updatedAt: string;
  author: string;
}

const TEMPLATES: { name: string; category: WorkspaceDocument['category']; icon: string; description: string; content: string }[] = [
  {
    name: 'Technical Architecture Specification',
    category: 'Architecture',
    icon: '📐',
    description: 'System components, DB schemas, API contracts, and scalability patterns.',
    content: `# Technical Architecture Specification

## 1. Executive Summary
Brief high-level overview of the architectural decisions, tech stack justification, and core business objectives.

## 2. System Topology & Infrastructure
- **Frontend Layer**: React 18, Tailwind CSS, TypeScript, Vite SPA bundle
- **Backend Services**: Node.js Express micro-services, RESTful JSON endpoints
- **Data Persistence**: Cloud Firestore (NoSQL document store) & Cloud Relational DB
- **Authentication**: Stateless Bearer JWT tokens with role-based access validation

## 3. Database Entity Mappings
| Entity | Primary Key | Foreign References | Cardinality |
| :--- | :--- | :--- | :--- |
| Users | \`id\` / \`uid\` | Organization ID | 1 : N (Teams) |
| Projects | \`id\` | Owner ID, Department | 1 : N (Tasks) |
| Tasks | \`id\` | Project ID, Assignee ID | 1 : N (Reviews) |

## 4. Security & Compliance Protocols
> [!IMPORTANT]
> All outbound API endpoints enforce strict CORS whitelisting, rate limiting per IP, and parameterized queries to eliminate SQL/NoSQL injection vectors.
`
  },
  {
    name: 'Product Requirements Document (PRD)',
    category: 'Product',
    icon: '📋',
    description: 'User personas, user stories, functional requirements, and success metrics.',
    content: `# Product Requirements Document (PRD)

## 1. Objective & Problem Statement
Clearly specify what user pain point this feature solves, why it matters now, and the target market.

## 2. Target User Personas
- **System Administrator**: Manages organizational boundaries, provisioning, and audit logs.
- **Project Lead**: Oversees sprint burndown, assigns tasks, and evaluates milestone readiness.
- **Software Engineer**: Updates subtasks, tracks daily progress, and collaborates in real-time channels.

## 3. Functional Requirements
- [x] Responsive layout supporting desktop and mobile virtual keyboard adjustments
- [x] Real-time messaging with instant optimistic rendering and database persistence
- [ ] Automated weekly progress digest sent via email alert
- [ ] Interactive Kanban board with drag-and-drop column transitions

## 4. Key Performance Indicators (KPIs)
- **Task completion cycle time**: Target < 48 hours per review cycle
- **System uptime**: 99.9% availability across mobile and web clients
`
  },
  {
    name: 'Sprint Planning & Retrospective',
    category: 'Planning',
    icon: '⚡',
    description: 'Sprint commitments, capacity allocation, milestones, and retrospective learnings.',
    content: `# Sprint Planning & Retrospective

## 1. Sprint Commitment & Scope
- **Sprint Cycle**: Sprint 24 (2 Weeks)
- **Sprint Goal**: Finalize mobile responsive modules and production deployment pipeline.
- **Total Story Points Committed**: 42 SP

## 2. Deliverables Checklist
- [x] Mobile virtual keypad viewport obstruction fix
- [x] Realtime Collaboration Hub layout & persistence upgrade
- [ ] Exportable workspace documentation editor
- [ ] Calendar agenda view for handheld devices

## 3. Retrospective Learnings
### What Went Well
- Immediate feedback loop between development and mobile device testing.
- Faster Gradle compilation via daemon persistence.

### Action Items for Next Sprint
1. Introduce automated end-to-end testing for responsive layouts.
2. Standardize color palette across dark mode glass panels.
`
  },
  {
    name: 'Executive Meeting Minutes',
    category: 'Meeting',
    icon: '🤝',
    description: 'Attendees, agenda topics, key decisions, and assigned follow-up actions.',
    content: `# Executive Meeting Minutes

## 1. Meeting Details
- **Date**: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
- **Time**: 10:00 AM - 11:30 AM IST
- **Chairperson**: Vinay (Team Lead)
- **Attendees**: Engineering Leads, Product Designers, QA Specialists

## 2. Agenda Items Discussed
1. Mobile responsive performance audit across low-bandwidth environments.
2. Unified documentation repository vs external markdown wikis.
3. Role permission matrix customization per department.

## 3. Key Decisions Made
> [!NOTE]
> Approved transitioning document workspace into an in-app Notion-style editor with exportable markdown and template starters.

## 4. Action Items
| Action Item | Assignee | Target Deadline |
| :--- | :--- | :--- |
| Implement Master-Detail document layout | Dev Team | End of Week |
| Review typography contrast on dark theme | UI/UX Lead | Tomorrow |
`
  }
];

const INITIAL_DOCS: WorkspaceDocument[] = [
  {
    id: 1,
    title: 'Technical Architecture Specification',
    category: 'Architecture',
    tags: ['Architecture', 'Backend', 'Security'],
    content: TEMPLATES[0].content,
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    author: 'Chief Architect'
  },
  {
    id: 2,
    title: 'Product Requirements Document (PRD)',
    category: 'Product',
    tags: ['Product', 'Specs', 'Mobile'],
    content: TEMPLATES[1].content,
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    author: 'Product Lead'
  },
  {
    id: 3,
    title: 'Sprint Planning & Retrospective',
    category: 'Planning',
    tags: ['Sprint', 'Agile', 'Tracking'],
    content: TEMPLATES[2].content,
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    author: 'Scrum Master'
  }
];

const CATEGORIES: WorkspaceDocument['category'][] = [
  'Architecture',
  'Product',
  'Engineering',
  'Planning',
  'Meeting',
  'General'
];

export default function Documents() {
  const [docs, setDocs] = useState<WorkspaceDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<WorkspaceDocument['category']>('General');
  const [tags, setTags] = useState<string[]>([]);
  
  // Navigation & Filtering
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  
  // Modals & UI States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage or initial enterprise templates
  useEffect(() => {
    const saved = localStorage.getItem('prologue_workspace_docs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDocs(parsed);
          selectDoc(parsed[0]);
          return;
        }
      } catch (e) {}
    }
    setDocs(INITIAL_DOCS);
    selectDoc(INITIAL_DOCS[0]);
  }, []);

  const selectDoc = (d: WorkspaceDocument) => {
    setSelectedDocId(d.id);
    setTitle(d.title);
    setContent(d.content);
    setCategory(d.category || 'General');
    setTags(d.tags || []);
  };

  // Autosave to storage
  const persistChanges = (updatedDoc: WorkspaceDocument) => {
    setIsAutosaving(true);
    setDocs((prev) => {
      const next = prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
      localStorage.setItem('prologue_workspace_docs', JSON.stringify(next));
      return next;
    });
    setTimeout(() => setIsAutosaving(false), 600);
  };

  useEffect(() => {
    if (!selectedDocId) return;
    const timer = setTimeout(() => {
      const currentDoc = docs.find((d) => d.id === selectedDocId);
      if (currentDoc && (currentDoc.title !== title || currentDoc.content !== content || currentDoc.category !== category)) {
        persistChanges({
          ...currentDoc,
          title: title.trim() || 'Untitled Workspace Document',
          content,
          category,
          updatedAt: new Date().toISOString()
        });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, category, selectedDocId]);

  // Create new blank document
  const handleCreateNewDoc = (templateContent?: { title: string; content: string; category: WorkspaceDocument['category'] }) => {
    const newDoc: WorkspaceDocument = {
      id: Date.now(),
      title: templateContent ? templateContent.title : 'Untitled Workspace Document',
      content: templateContent ? templateContent.content : '# Untitled Document\n\nStart drafting your project notes, specifications, or architectural guidelines here...',
      category: templateContent ? templateContent.category : 'General',
      tags: templateContent ? [templateContent.category] : ['Draft'],
      updatedAt: new Date().toISOString(),
      author: 'You'
    };

    const nextList = [newDoc, ...docs];
    setDocs(nextList);
    localStorage.setItem('prologue_workspace_docs', JSON.stringify(nextList));
    selectDoc(newDoc);
    setMobileView('editor');
    setIsTemplateModalOpen(false);
  };

  const handleDeleteDoc = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document?')) return;

    const next = docs.filter((d) => d.id !== id);
    setDocs(next);
    localStorage.setItem('prologue_workspace_docs', JSON.stringify(next));

    if (selectedDocId === id) {
      if (next.length > 0) {
        selectDoc(next[0]);
      } else {
        setSelectedDocId(null);
        setTitle('');
        setContent('');
        setMobileView('list');
      }
    }
  };

  // Quick formatting insert helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = content.substring(start, end);
    const replacement = prefix + (sel || 'text') + suffix;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (sel.length || 4));
    }, 50);
  };

  // Export handlers
  const handleDownloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(content);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      const matchesCategory = activeCategoryFilter === 'ALL' || d.category === activeCategoryFilter;
      const matchesQuery =
        !searchQuery.trim() ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [docs, activeCategoryFilter, searchQuery]);

  // Document word count & read time
  const wordsCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const readingTimeMinutes = Math.max(1, Math.ceil(wordsCount / 200));

  // Category Accent Helpers
  const getCategoryBadgeClass = (cat: WorkspaceDocument['category']) => {
    switch (cat) {
      case 'Architecture':
        return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'Product':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'Engineering':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'Planning':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Meeting':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="h-[calc(100dvh-5rem)] md:h-[calc(100vh-5.5rem)] w-full flex flex-col space-y-3 select-none">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {copiedNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 text-white border border-white/20 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Markdown copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Frame */}
      <div className="flex-1 glass-panel border border-slate-200/80 dark:border-white/10 rounded-2xl md:rounded-3xl shadow-2xl flex overflow-hidden relative">
        
        {/* ========================================================================= */}
        {/* PANEL 1: DOCUMENT EXPLORER LIST                                          */}
        {/* Responsive: full width on mobile if mobileView === 'list', fixed desktop */}
        {/* ========================================================================= */}
        <div
          className={`${
            mobileView === 'list' ? 'w-full flex' : 'hidden md:flex md:w-80 lg:w-88'
          } border-r border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl flex-col justify-between flex-shrink-0 z-10 transition-all duration-200`}
        >
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header & Actions */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200/50 dark:border-white/10 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">Docs Hub</h2>
                    <p className="text-[9px] font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                      {docs.length} Documents
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer"
                    title="Choose from Starter Templates"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCreateNewDoc()}
                    className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative group">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-semibold outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="px-3 py-2 border-b border-slate-200/50 dark:border-white/10 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <button
                onClick={() => setActiveCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                  activeCategoryFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                    activeCategoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Document Cards List */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5">
              {filteredDocs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs font-bold">No documents found</p>
                  <p className="text-[10px]">Create a new document or pick a starter template.</p>
                </div>
              ) : (
                filteredDocs.map((d) => {
                  const isActive = selectedDocId === d.id;
                  const formattedDate = new Date(d.updatedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        selectDoc(d);
                        setMobileView('editor');
                      }}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer group relative border ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border-blue-500/40 shadow-md ring-1 ring-blue-500/20'
                          : 'border-transparent hover:border-slate-200/70 dark:hover:border-white/10 hover:bg-slate-100/70 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${getCategoryBadgeClass(
                              d.category
                            )}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className={`text-xs font-black truncate block ${
                              isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {d.title}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteDoc(d.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400 font-semibold">
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase ${getCategoryBadgeClass(d.category)}`}>
                          {d.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <Clock className="w-3 h-3" /> {formattedDate}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL 2: DOCUMENT WORKSPACE & EDITOR                                      */}
        {/* Responsive: full width on mobile if mobileView === 'editor', flex-1       */}
        {/* ========================================================================= */}
        <div
          className={`${
            mobileView === 'editor' ? 'w-full flex' : 'hidden md:flex md:flex-1'
          } flex-col justify-between overflow-hidden bg-slate-50/50 dark:bg-slate-950/40 relative`}
        >
          {selectedDocId ? (
            <>
              {/* Top Navigation & Formatting Toolbar */}
              <div className="border-b border-slate-200/50 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shrink-0">
                {/* Upper Bar: Title & Primary Actions */}
                <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setMobileView('list')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200/70 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-bold transition-all md:hidden shrink-0 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Docs</span>
                    </button>

                    {/* Title Input */}
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Document Title..."
                      className="w-full bg-transparent text-sm sm:text-base font-black text-slate-900 dark:text-white outline-none placeholder:text-slate-400 truncate"
                    />
                  </div>

                  {/* Actions (Category, View Switcher, Export) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Category Selector */}
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="hidden sm:block text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="dark:bg-slate-900">
                          {c}
                        </option>
                      ))}
                    </select>

                    {/* Mode Toggle (Edit vs Preview) */}
                    <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-white/10">
                      <button
                        onClick={() => setViewMode('edit')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'edit'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500 hover:text-white'
                        }`}
                        title="Edit Markdown"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('preview')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'preview'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500 hover:text-white'
                        }`}
                        title="Preview Formatted Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Export Actions */}
                    <button
                      onClick={handleCopyMarkdown}
                      className="p-2 border border-slate-200/80 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Copy Markdown"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDownloadMarkdown}
                      className="p-2 border border-slate-200/80 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Download .md file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Lower Bar: Markdown Formatting Tools (Visible in Edit Mode) */}
                {viewMode === 'edit' && (
                  <div className="px-3 sm:px-5 py-1.5 border-t border-slate-200/40 dark:border-white/5 flex items-center gap-1 overflow-x-auto scrollbar-none text-slate-600 dark:text-slate-400">
                    <button
                      onClick={() => insertFormatting('# ')}
                      className="px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 font-black text-xs"
                      title="Heading 1"
                    >
                      H1
                    </button>
                    <button
                      onClick={() => insertFormatting('## ')}
                      className="px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 font-black text-xs"
                      title="Heading 2"
                    >
                      H2
                    </button>
                    <button
                      onClick={() => insertFormatting('### ')}
                      className="px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 font-black text-xs"
                      title="Heading 3"
                    >
                      H3
                    </button>
                    <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />
                    <button
                      onClick={() => insertFormatting('**', '**')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10"
                      title="Bold (**text**)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting('*', '*')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10"
                      title="Italic (*text*)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting('```ts\n', '\n```')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10"
                      title="Code Block"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />
                    <button
                      onClick={() => insertFormatting('- [ ] ')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10"
                      title="Task Checklist"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting('- ')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10"
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting('> [!NOTE]\n> ')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10"
                      title="Callout Note"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => insertFormatting('\n| Feature | Status | Priority |\n| :--- | :--- | :--- |\n| UI Polish | Complete | High |\n')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10"
                      title="Insert Table"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Workspace Body Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                {viewMode === 'edit' ? (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start typing markdown documentation..."
                    className="w-full h-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-mono leading-relaxed resize-none placeholder:text-slate-400"
                  />
                ) : (
                  /* Formatted Document Preview */
                  <div className="prose dark:prose-invert max-w-3xl mx-auto space-y-4 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    <div className="pb-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${getCategoryBadgeClass(category)}`}>
                        {category} Specification
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold">{wordsCount} words · {readingTimeMinutes} min read</span>
                    </div>

                    {/* Simple live markdown renderer for headers, tables, callouts */}
                    {content.split('\n\n').map((block, idx) => {
                      if (block.startsWith('# ')) {
                        return (
                          <h1 key={idx} className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white pt-2">
                            {block.replace('# ', '')}
                          </h1>
                        );
                      }
                      if (block.startsWith('## ')) {
                        return (
                          <h2 key={idx} className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 pt-3 border-b border-slate-200/40 dark:border-white/5 pb-1">
                            {block.replace('## ', '')}
                          </h2>
                        );
                      }
                      if (block.startsWith('### ')) {
                        return (
                          <h3 key={idx} className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 pt-2">
                            {block.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (block.startsWith('> [!NOTE]') || block.startsWith('> [!IMPORTANT]')) {
                        return (
                          <div key={idx} className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 font-medium">
                            {block.replace(/^> \[[!A-Z]+\]\n>/g, '')}
                          </div>
                        );
                      }
                      if (block.startsWith('```')) {
                        return (
                          <pre key={idx} className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-white/10 shadow-inner">
                            <code>{block.replace(/```[a-z]*\n?/g, '')}</code>
                          </pre>
                        );
                      }
                      if (block.includes('| :---')) {
                        const rows = block.trim().split('\n');
                        const headers = rows[0].split('|').filter(Boolean);
                        const dataRows = rows.slice(2);
                        return (
                          <div key={idx} className="overflow-x-auto my-3">
                            <table className="w-full text-left text-xs border border-slate-200/60 dark:border-white/10 rounded-xl overflow-hidden">
                              <thead className="bg-slate-100 dark:bg-white/5 font-black uppercase text-[10px] text-slate-400 border-b border-slate-200/60 dark:border-white/10">
                                <tr>
                                  {headers.map((h, hIdx) => (
                                    <th key={hIdx} className="p-2.5 whitespace-nowrap">
                                      {h.trim()}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {dataRows.map((r, rIdx) => (
                                  <tr key={rIdx}>
                                    {r.split('|').filter(Boolean).map((cell, cIdx) => (
                                      <td key={cIdx} className="p-2.5 font-medium">
                                        {cell.trim()}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      if (block.startsWith('- [ ] ') || block.startsWith('- [x] ')) {
                        const items = block.split('\n');
                        return (
                          <div key={idx} className="space-y-1.5 my-2">
                            {items.map((item, iIdx) => {
                              const checked = item.startsWith('- [x] ');
                              return (
                                <div key={iIdx} className="flex items-center gap-2">
                                  <input type="checkbox" checked={checked} readOnly className="rounded text-blue-600" />
                                  <span className={checked ? 'line-through text-slate-400' : 'font-medium'}>
                                    {item.replace(/^- \[[ x]\] /, '')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return (
                        <p key={idx} className="leading-relaxed whitespace-pre-line">
                          {block}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Footer */}
              <div className="h-10 px-4 sm:px-6 border-t border-slate-200/50 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex items-center justify-between text-[10px] text-slate-400 font-bold shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isAutosaving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                    {isAutosaving ? 'Autosaving...' : 'All changes saved'}
                  </span>
                  <span>·</span>
                  <span>{wordsCount} words</span>
                  <span>·</span>
                  <span>{readingTimeMinutes} min read</span>
                </div>
                <span>Workspace Docs Enterprise Engine</span>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">No Document Selected</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose a document from the left list or create a new one using our enterprise templates.
                </p>
              </div>
              <button
                onClick={() => handleCreateNewDoc()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Create Document
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STARTER TEMPLATES MODAL                                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative border border-slate-200/80 dark:border-white/10 z-50 rounded-3xl max-h-[85dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">Starter Documentation Templates</h3>
                    <p className="text-[10px] text-slate-400">Launch standard enterprise documentation with one click.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                {TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.name}
                    onClick={() =>
                      handleCreateNewDoc({
                        title: tmpl.name,
                        content: tmpl.content,
                        category: tmpl.category
                      })
                    }
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-100/60 dark:bg-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{tmpl.icon}</span>
                      <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase ${getCategoryBadgeClass(tmpl.category)}`}>
                        {tmpl.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                      {tmpl.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
