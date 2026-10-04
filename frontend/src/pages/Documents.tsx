import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Plus,
  Download,
  Trash2,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  Search,
  BookOpen,
  Clock,
  Check,
  Copy,
  ChevronLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  X,
  Star,
  Upload,
  HardDrive,
  Filter,
  Grid,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode2,
  ExternalLink,
  File,
  Menu,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCheck,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Printer,
  Minus,
  Undo2,
  Redo2,
  Save,
  RotateCcw,
  Highlighter,
  RemoveFormatting,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import PremiumPdfViewerModal from '../components/common/PremiumPdfViewerModal';

// ============================================================================
// TYPES & INTERFACES (Concept D: Unified Mixed Items)
// ============================================================================
export interface DocumentItem {
  id: string;
  type: 'written' | 'uploaded';
  title: string;
  content?: string;
  category: 'Architecture' | 'Product' | 'Engineering' | 'Planning' | 'Meeting' | 'General';
  tags: string[];
  project: string;
  author: string;
  authorAvatar?: string;
  status: 'Published' | 'Draft';
  isStarred: boolean;
  isTrash: boolean;
  updatedAt: string;
  createdAt: string;
  // Uploaded file specific attributes
  fileType?: 'pdf' | 'word' | 'excel' | 'image' | 'code' | 'other';
  fileSize?: string;
  fileSizeBytes?: number;
  fileUrl?: string;
  originalFileName?: string;
}

interface TemplateDoc {
  id: string;
  name: string;
  category: DocumentItem['category'];
  icon: string;
  project: string;
  description: string;
  content: string;
}

// ============================================================================
// HELPER: CONVERT LEGACY MARKDOWN SYMBOLS TO HUMAN-READABLE RICH HTML
// ============================================================================
export function ensureHumanReadableHtml(content?: string): string {
  if (!content) return '<p>Start typing your project notes, specifications, or architectural guidelines here...</p>';

  // If already formatted HTML, return as-is
  if (
    content.includes('<h1') ||
    content.includes('<h2') ||
    content.includes('<h3') ||
    content.includes('<table') ||
    content.includes('<p>') ||
    content.includes('<div') ||
    content.includes('<ul')
  ) {
    return content;
  }

  // Convert raw markdown "sign languages" (#, **, [ ], | :--- |) into real human-readable HTML
  const lines = content.split('\n');
  let resultHtml = '';
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table rows
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (line.includes(':---') || line.includes('---')) {
        continue;
      }
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (!inTable) {
        inTable = true;
        resultHtml += '<table class="rich-doc-table my-3"><thead><tr>';
        cells.forEach((c) => {
          resultHtml += `<th>${c}</th>`;
        });
        resultHtml += '</tr></thead><tbody>';
      } else {
        resultHtml += '<tr>';
        cells.forEach((c) => {
          resultHtml += `<td>${c}</td>`;
        });
        resultHtml += '</tr>';
      }
      continue;
    } else if (inTable) {
      resultHtml += '</tbody></table>';
      inTable = false;
    }

    // Headings
    if (line.startsWith('### ')) {
      resultHtml += `<h3>${line.replace('### ', '')}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      resultHtml += `<h2>${line.replace('## ', '')}</h2>`;
      continue;
    }
    if (line.startsWith('# ')) {
      resultHtml += `<h1>${line.replace('# ', '')}</h1>`;
      continue;
    }

    // Callout notes (> [!NOTE] or > )
    if (line.startsWith('> [!') || line.startsWith('>')) {
      const cleanNote = line.replace(/^> \[[!A-Z]+\]/g, '').replace(/^> /g, '').trim();
      if (cleanNote) {
        resultHtml += `<div class="callout-card">💡 <strong>Note:</strong> ${cleanNote}</div>`;
      }
      continue;
    }

    // Checklists (- [ ] or - [x])
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      const isChecked = line.startsWith('- [x] ');
      const text = line.replace(/^- \[[ x]\] /, '');
      resultHtml += `<div class="task-checkbox-item"><input type="checkbox" ${
        isChecked ? 'checked' : ''
      } /> <span class="${isChecked ? 'line-through text-slate-400' : ''}">${text}</span></div>`;
      continue;
    }

    // Bullet lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.replace(/^[-*] /, '');
      if (!inList) {
        inList = true;
        resultHtml += '<ul>';
      }
      resultHtml += `<li>${text}</li>`;
      continue;
    } else if (inList) {
      resultHtml += '</ul>';
      inList = false;
    }

    // Bold, italic, code
    const formattedLine = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs">$1</code>');

    if (formattedLine.trim()) {
      resultHtml += `<p>${formattedLine}</p>`;
    }
  }

  if (inTable) resultHtml += '</tbody></table>';
  if (inList) resultHtml += '</ul>';

  return resultHtml || '<p>Start typing your project notes...</p>';
}

// ============================================================================
// TEMPLATES DEFINITION (100% Human-Readable HTML - No Raw Markdown Signs)
// ============================================================================
const STARTER_TEMPLATES: TemplateDoc[] = [
  {
    id: 'tmpl-arch',
    name: 'Technical Architecture Specification',
    category: 'Architecture',
    icon: '📐',
    project: 'Core Platform',
    description: 'System topology, database schemas, microservice contracts, and cloud infrastructure.',
    content: `<h1>Technical Architecture Specification</h1>
<h2>1. Executive Summary & Objective</h2>
<p>High-level architectural vision, scalability targets, and service breakdown for this enterprise platform.</p>
<h2>2. System Architecture & Topology</h2>
<ul>
  <li><strong>Client Frontend:</strong> React 18, Tailwind CSS v4, TypeScript, Vite SPA bundle</li>
  <li><strong>API Gateway:</strong> Node.js Express RESTful microservices with strict JWT Bearer token authentication</li>
  <li><strong>Data Persistence:</strong> Cloud Firestore realtime database & relational database for audit logs</li>
  <li><strong>Messaging & Sync:</strong> WebSockets and Firebase realtime listeners for optimistic updates</li>
</ul>
<h2>3. Database Schema Contract</h2>
<table class="rich-doc-table">
  <thead>
    <tr><th>Entity</th><th>Primary Key</th><th>Foreign Relations</th><th>Cardinality</th></tr>
  </thead>
  <tbody>
    <tr><td>Organizations</td><td>id</td><td>Owner UID</td><td>1 : N (Teams)</td></tr>
    <tr><td>Projects</td><td>id</td><td>Org ID, Lead UID</td><td>1 : N (Tasks)</td></tr>
    <tr><td>Documents</td><td>id</td><td>Project ID, Author</td><td>1 : N (Versions)</td></tr>
  </tbody>
</table>
<div class="callout-card">💡 <strong>Security & Compliance Protocol:</strong> All outbound API endpoints enforce strict CORS whitelisting, IP-based rate limiting, and parameterized sanitization.</div>
<h2>4. Deployment & Release Pipeline</h2>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Unit test suites with 80%+ coverage threshold</span></div>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Automated container builds via CI/CD runner</span></div>
<div class="task-checkbox-item"><input type="checkbox" /> <span>Multi-region failover replication</span></div>`
  },
  {
    id: 'tmpl-prd',
    name: 'Product Requirements Document (PRD)',
    category: 'Product',
    icon: '📋',
    project: 'Mobile App',
    description: 'User personas, journey maps, functional requirements, and milestone KPIs.',
    content: `<h1>Product Requirements Document (PRD)</h1>
<h2>1. Problem Statement</h2>
<p>Teams require a unified workspace where written specifications and uploaded project assets reside cohesively with instant search.</p>
<h2>2. Target Personas</h2>
<ul>
  <li><strong>Project Lead:</strong> Reviews architectural blueprints, tracks deliverables, and oversees sprint reviews.</li>
  <li><strong>Developer / Designer:</strong> Edits real-time docs, links assets, and tracks checklists.</li>
  <li><strong>Executive Stakeholder:</strong> Accesses read-only executive digests and PDF balance reports.</li>
</ul>
<h2>3. Scope & Deliverables</h2>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Unified mixed-grid layout for written documents and uploaded files</span></div>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Responsive tablet and handheld viewport adaptations</span></div>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Human-readable rich text editor with zero raw symbols</span></div>
<div class="task-checkbox-item"><input type="checkbox" /> <span>Collaborative simultaneous cursor editing</span></div>
<div class="callout-card">💡 <strong>Success Metrics (KPIs):</strong> Document creation latency under 2 seconds to launch a new template with instant client-side filtering.</div>`
  },
  {
    id: 'tmpl-sprint',
    name: 'Sprint Planning & Retrospective',
    category: 'Planning',
    icon: '⚡',
    project: 'Web Client',
    description: 'Sprint capacity, story point allocation, burn-down metrics, and retrospective retro.',
    content: `<h1>Sprint Planning & Retrospective</h1>
<h2>1. Sprint Details</h2>
<table class="rich-doc-table">
  <thead>
    <tr><th>Parameter</th><th>Value</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td>Sprint Cycle</td><td>Sprint 26</td><td>Bi-Weekly Sprint</td></tr>
    <tr><td>Total Story Points</td><td>48 SP</td><td>Full Capacity Committed</td></tr>
    <tr><td>Sprint Focus</td><td>Responsive UI Polish</td><td>Document Hub Concept D Polish</td></tr>
  </tbody>
</table>
<h2>2. Deliverables Checklist</h2>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Tablet 2-column card grid alignment</span></div>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Human-readable rich text formatting without code symbols</span></div>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Gesture-based selection on handhelds</span></div>
<div class="task-checkbox-item"><input type="checkbox" /> <span>Automated PDF print stylesheet</span></div>
<div class="callout-card">💡 <strong>Retrospective Highlights:</strong> Faster feedback loop between tablet device testing and instant visual updates.</div>`
  },
  {
    id: 'tmpl-meeting',
    name: 'Executive Meeting Minutes',
    category: 'Meeting',
    icon: '🤝',
    project: 'Leadership',
    description: 'Agenda topics, stakeholder decisions, approval votes, and action owners.',
    content: `<h1>Executive Meeting Minutes</h1>
<h2>1. Meeting Overview</h2>
<p><strong>Date:</strong> Current Meeting &nbsp;|&nbsp; <strong>Chairperson:</strong> Lead Administrator &nbsp;|&nbsp; <strong>Attendees:</strong> Engineering Directors, Design Leads, Product Owners</p>
<h2>2. Agenda Items</h2>
<ul>
  <li>Concept D rollout for enterprise document management</li>
  <li>Cross-device tablet & mobile validation benchmarks</li>
  <li>Human-readable WYSIWYG documentation standard</li>
</ul>
<div class="callout-card">💡 <strong>Key Decisions:</strong> Approved transitioning all document editing to a clean, human-readable WYSIWYG format with visual tables and interactive task checkboxes.</div>
<h2>3. Action Items</h2>
<table class="rich-doc-table">
  <thead>
    <tr><th>Action Item</th><th>Assignee</th><th>Target Date</th></tr>
  </thead>
  <tbody>
    <tr><td>Finalize Human-Readable Document Hub</td><td>Engineering Team</td><td>End of Day</td></tr>
    <tr><td>Verify Tablet & Mobile Touch Inputs</td><td>QA Lead</td><td>Tomorrow</td></tr>
  </tbody>
</table>`
  },
  {
    id: 'tmpl-bug',
    name: 'Bug Investigation & Postmortem (RCA)',
    category: 'Engineering',
    icon: '🐞',
    project: 'Infrastructure',
    description: 'Root cause analysis, incident impact timeline, remediation actions, and preventative safeguards.',
    content: `<h1>Incident Postmortem & Root Cause Analysis</h1>
<h2>1. Incident Overview</h2>
<p><strong>Severity:</strong> P2 (Service Degraded) &nbsp;|&nbsp; <strong>Impact Duration:</strong> 18 Minutes &nbsp;|&nbsp; <strong>Affected Surface:</strong> Mobile document layout shift on virtual keyboard focus</p>
<h2>2. Root Cause & Immediate Resolution</h2>
<p>Viewport height recalibration caused container overflow when mobile keyboard opened. Resolved by adopting CSS dynamic viewport units.</p>
<h2>3. Preventative Safeguards</h2>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Multi-device responsive regression suite</span></div>
<div class="task-checkbox-item"><input type="checkbox" checked /> <span>Viewport lock on modal activations</span></div>
<div class="task-checkbox-item"><input type="checkbox" /> <span>Automated end-to-end visual tests</span></div>`
  }
];

// ============================================================================
// INITIAL SEED DATA (Mixed Written & Uploaded Items)
// ============================================================================
const INITIAL_ITEMS: DocumentItem[] = [
  {
    id: 'doc-1',
    type: 'written',
    title: 'Technical Architecture Specification',
    category: 'Architecture',
    tags: ['Architecture', 'Backend', 'Cloud'],
    project: 'Core Platform',
    author: 'Vinay M.',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    status: 'Published',
    isStarred: true,
    isTrash: false,
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    content: STARTER_TEMPLATES[0].content
  },
  {
    id: 'file-1',
    type: 'uploaded',
    title: 'Q4_Financial_Audit_Report.pdf',
    category: 'General',
    tags: ['Finance', 'Audit', 'PDF'],
    project: 'Finance & Legal',
    author: 'Vinay M.',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    status: 'Published',
    isStarred: true,
    isTrash: false,
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    fileType: 'pdf',
    fileSize: '4.2 MB',
    fileSizeBytes: 4404019,
    originalFileName: 'Q4_Financial_Audit_Report.pdf'
  },
  {
    id: 'doc-2',
    type: 'written',
    title: 'Product Requirements Document (PRD)',
    category: 'Product',
    tags: ['Product', 'Mobile', 'Roadmap'],
    project: 'Mobile App',
    author: 'Niranjan M.',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    status: 'Draft',
    isStarred: false,
    isTrash: false,
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    content: STARTER_TEMPLATES[1].content
  },
  {
    id: 'file-2',
    type: 'uploaded',
    title: 'System_Topology_Diagram_v3.png',
    category: 'Architecture',
    tags: ['Diagram', 'Infrastructure', 'PNG'],
    project: 'Core Platform',
    author: 'Niranjan M.',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    status: 'Published',
    isStarred: true,
    isTrash: false,
    updatedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    fileType: 'image',
    fileSize: '1.8 MB',
    fileSizeBytes: 1887436,
    originalFileName: 'System_Topology_Diagram_v3.png'
  },
  {
    id: 'doc-3',
    type: 'written',
    title: 'Sprint 26 Planning & Retrospective',
    category: 'Planning',
    tags: ['Sprint', 'Agile', 'Scrum'],
    project: 'Web Client',
    author: 'Vinay M.',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    status: 'Published',
    isStarred: false,
    isTrash: false,
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    content: STARTER_TEMPLATES[2].content
  },
  {
    id: 'file-3',
    type: 'uploaded',
    title: 'User_Research_Interviews_2026.docx',
    category: 'Product',
    tags: ['UX', 'Research', 'Interviews'],
    project: 'Mobile App',
    author: 'Design Lead',
    status: 'Published',
    isStarred: false,
    isTrash: false,
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    fileType: 'word',
    fileSize: '840 KB',
    fileSizeBytes: 860160,
    originalFileName: 'User_Research_Interviews_2026.docx'
  },
  {
    id: 'file-4',
    type: 'uploaded',
    title: 'Sprint_Velocity_Metrics_Q1.xlsx',
    category: 'Planning',
    tags: ['Metrics', 'Velocity', 'Sheets'],
    project: 'Core Platform',
    author: 'Scrum Master',
    status: 'Published',
    isStarred: false,
    isTrash: false,
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    fileType: 'excel',
    fileSize: '512 KB',
    fileSizeBytes: 524288,
    originalFileName: 'Sprint_Velocity_Metrics_Q1.xlsx'
  },
  {
    id: 'doc-4',
    type: 'written',
    title: 'Security & Compliance Guidelines',
    category: 'Engineering',
    tags: ['Security', 'Auth', 'Compliance'],
    project: 'Infrastructure',
    author: 'Security Officer',
    status: 'Published',
    isStarred: true,
    isTrash: false,
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    content: `<h1>Security & Compliance Guidelines</h1>
<h2>1. Overview</h2>
<p>Comprehensive standards for secret storage, authentication tokens, and GDPR compliance.</p>
<h2>2. Token Lifecycles</h2>
<p>JWT access tokens expire after 60 minutes with rolling refresh token rotation.</p>`
  }
];

const CATEGORIES: DocumentItem['category'][] = [
  'Architecture',
  'Product',
  'Engineering',
  'Planning',
  'Meeting',
  'General'
];

export default function Documents() {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();

  // Primary State
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [activeView, setActiveView] = useState<'hub' | 'editor'>('hub');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Concept D Hub Filtering & Navigation
  const [navCategory, setNavCategory] = useState<'all' | 'recent' | 'shared' | 'my' | 'starred' | 'trash'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'written' | 'uploaded'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'pdf' | 'word' | 'excel' | 'image' | 'notes'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'size'>('newest');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentItem['category']>('General');
  const [uploadProject, setUploadProject] = useState('Core Platform');
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // File preview modal state
  const [previewFile, setPreviewFile] = useState<DocumentItem | null>(null);

  // PDF Viewer Modal State (Requirement 13)
  const [viewingPdf, setViewingPdf] = useState<{
    isOpen: boolean;
    url: string;
    fileName: string;
    fileSize: string;
    uploadedBy: string;
    uploadedAt: string;
    project: string;
    organization: string;
    accessLevel: string;
  }>({
    isOpen: false,
    url: '',
    fileName: '',
    fileSize: '',
    uploadedBy: '',
    uploadedAt: '',
    project: '',
    organization: '',
    accessLevel: ''
  });

  // Human-Readable WYSIWYG Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<DocumentItem['category']>('General');
  const [editProject, setEditProject] = useState('Core Platform');
  const [editStatus, setEditStatus] = useState<'Draft' | 'Published'>('Draft');
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorViewMode, setEditorViewMode] = useState<'edit' | 'preview'>('edit');
  const [isZenMode, setIsZenMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Undo / Redo & Save Tracking
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryNavigatingRef = useRef<boolean>(false);
  const historyDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedTitleRef = useRef<string>('');

  // Push snapshot into history stack
  const pushToHistory = (newHtml: string) => {
    if (isHistoryNavigatingRef.current) return;
    setHistory((prev) => {
      const idx = historyIndexRef.current;
      if (prev.length > 0 && prev[idx] === newHtml) return prev;

      const updated = idx >= 0 ? prev.slice(0, idx + 1) : [];
      updated.push(newHtml);
      if (updated.length > 50) {
        updated.shift();
      }
      const newIdx = updated.length - 1;
      historyIndexRef.current = newIdx;
      setHistoryIndex(newIdx);
      return updated;
    });
  };

  // Undo action
  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return;
    isHistoryNavigatingRef.current = true;
    const targetIdx = historyIndexRef.current - 1;
    const prevHtml = history[targetIdx];
    historyIndexRef.current = targetIdx;
    setHistoryIndex(targetIdx);
    setEditContent(prevHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = prevHtml;
    }
    setHasUnsavedChanges(
      prevHtml !== lastSavedContentRef.current || editTitle !== lastSavedTitleRef.current
    );
    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
    }, 50);
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndexRef.current >= history.length - 1) return;
    isHistoryNavigatingRef.current = true;
    const targetIdx = historyIndexRef.current + 1;
    const nextHtml = history[targetIdx];
    historyIndexRef.current = targetIdx;
    setHistoryIndex(targetIdx);
    setEditContent(nextHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = nextHtml;
    }
    setHasUnsavedChanges(
      nextHtml !== lastSavedContentRef.current || editTitle !== lastSavedTitleRef.current
    );
    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
    }, 50);
  };

  // Revert changes to last saved version
  const handleRevertChanges = () => {
    if (!hasUnsavedChanges) return;
    isHistoryNavigatingRef.current = true;
    const savedHtml = lastSavedContentRef.current;
    const savedTitle = lastSavedTitleRef.current;
    setEditContent(savedHtml);
    setEditTitle(savedTitle);
    if (editorRef.current) {
      editorRef.current.innerHTML = savedHtml;
    }
    setHasUnsavedChanges(false);
    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
      pushToHistory(savedHtml);
    }, 50);
    showToast('Reverted to last saved version.', 'info');
  };

  // Quick Template Dropdown menu state
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  // Close template menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
    };
    if (isTemplateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTemplateMenuOpen]);

  // Lock scroll when modals are open
  useScrollLock(isUploadModalOpen || !!previewFile);

  // ============================================================================
  // LOAD & SAVE LOCALSTORAGE (WITH AUTO CONVERSION TO HUMAN-READABLE HTML)
  // ============================================================================
  useEffect(() => {
    try {
      const savedV2 = localStorage.getItem('prologue_workspace_docs_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Upgrade any stored documents to clean human-readable HTML
          const sanitized = parsed.map((it: DocumentItem) => {
            if (it.type === 'written' && it.content) {
              return { ...it, content: ensureHumanReadableHtml(it.content) };
            }
            return it;
          });
          setItems(sanitized);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed loading stored documents:', e);
    }
    // Fallback to fresh initial seed
    setItems(INITIAL_ITEMS);
    localStorage.setItem('prologue_workspace_docs_v2', JSON.stringify(INITIAL_ITEMS));
  }, []);

  const persistItems = (newItems: DocumentItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem('prologue_workspace_docs_v2', JSON.stringify(newItems));
    } catch (e) {
      console.error('Storage quota exceeded:', e);
    }
  };

  // Sync content into contentEditable when opening document
  useEffect(() => {
    if (activeView === 'editor' && editorRef.current) {
      const formatted = ensureHumanReadableHtml(editContent);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [activeView, selectedDocId]);

  // Handle input in WYSIWYG editor
  const handleEditorInput = (immediateHistory = false) => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    setEditContent(currentHtml);

    setHasUnsavedChanges(
      currentHtml !== lastSavedContentRef.current || editTitle !== lastSavedTitleRef.current
    );

    if (isHistoryNavigatingRef.current) return;

    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
    }

    if (immediateHistory) {
      pushToHistory(currentHtml);
    } else {
      historyDebounceTimerRef.current = setTimeout(() => {
        pushToHistory(currentHtml);
      }, 400);
    }
  };

  // Handle interactive checkboxes inside the editor canvas
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const checkbox = target as HTMLInputElement;
      if (checkbox.checked) {
        checkbox.setAttribute('checked', 'true');
        const sibling = checkbox.nextElementSibling;
        if (sibling) sibling.classList.add('line-through', 'text-slate-400');
      } else {
        checkbox.removeAttribute('checked');
        const sibling = checkbox.nextElementSibling;
        if (sibling) sibling.classList.remove('line-through', 'text-slate-400');
      }
      handleEditorInput(true);
    }
  };

  // Immediate save helper (called on Save button, Hub back, and Ctrl+S)
  const saveCurrentDoc = (showNotification = false) => {
    if (!selectedDocId) return;
    const currentDoc = items.find((it) => it.id === selectedDocId);
    if (!currentDoc || currentDoc.type !== 'written') return;

    const latestHtml = editorRef.current ? editorRef.current.innerHTML : editContent;
    const cleanTitle = editTitle.trim() || 'Untitled Workspace Document';

    const updated: DocumentItem = {
      ...currentDoc,
      title: cleanTitle,
      content: latestHtml,
      category: editCategory,
      project: editProject,
      status: editStatus,
      updatedAt: new Date().toISOString()
    };

    setEditContent(latestHtml);
    lastSavedContentRef.current = latestHtml;
    lastSavedTitleRef.current = cleanTitle;
    setHasUnsavedChanges(false);

    const nextList = items.map((it) => (it.id === selectedDocId ? updated : it));
    persistItems(nextList);
    if (showNotification) {
      showToast('Document saved successfully!', 'success');
    }
  };

  // Keyboard shortcuts: Ctrl+S (Save), Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo), Escape (Exit Zen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeView !== 'editor') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (key === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (key === 's') {
          e.preventDefault();
          saveCurrentDoc(true);
        }
      } else if (e.key === 'Escape') {
        if (isZenMode) {
          e.preventDefault();
          setIsZenMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, isZenMode, history, historyIndex, editTitle, editContent, editCategory, editProject, editStatus, items, selectedDocId, hasUnsavedChanges]);

  // Autosave when editing a written document
  useEffect(() => {
    if (activeView !== 'editor' || !selectedDocId) return;

    const currentDoc = items.find((it) => it.id === selectedDocId);
    if (!currentDoc || currentDoc.type !== 'written') return;

    const hasChanged =
      currentDoc.title !== editTitle ||
      currentDoc.content !== editContent ||
      currentDoc.category !== editCategory ||
      currentDoc.project !== editProject ||
      currentDoc.status !== editStatus;

    if (!hasChanged) return;

    const timer = setTimeout(() => {
      setIsAutosaving(true);
      const updated: DocumentItem = {
        ...currentDoc,
        title: editTitle.trim() || 'Untitled Workspace Document',
        content: editContent,
        category: editCategory,
        project: editProject,
        status: editStatus,
        updatedAt: new Date().toISOString()
      };
      const nextList = items.map((it) => (it.id === selectedDocId ? updated : it));
      persistItems(nextList);
      lastSavedContentRef.current = editContent;
      lastSavedTitleRef.current = editTitle.trim() || 'Untitled Workspace Document';
      setHasUnsavedChanges(false);
      setTimeout(() => setIsAutosaving(false), 500);
    }, 1200);

    return () => clearTimeout(timer);
  }, [editTitle, editContent, editCategory, editProject, editStatus, activeView, selectedDocId, items]);

  // ============================================================================
  // RICH TEXT WYSIWYG FORMATTING ACTIONS (Zero Markdown Symbols)
  // ============================================================================
  const execFormat = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput(true);
  };

  const insertCustomHtml = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement('div');
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node: ChildNode | null;
      let lastNode: ChildNode | null = null;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      document.execCommand('insertHTML', false, html);
    }
    handleEditorInput(true);
  };

  const handleInsertCode = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const text = sel.toString();
      insertCustomHtml(
        `<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">${text}</code>`
      );
    } else {
      insertCustomHtml(
        `<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">code_snippet</code> `
      );
    }
  };

  const handleHighlight = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const text = sel.toString();
      insertCustomHtml(
        `<mark class="bg-amber-200/90 dark:bg-amber-400/30 text-slate-900 dark:text-amber-100 px-1 py-0.5 rounded font-medium">${text}</mark>`
      );
    } else {
      try {
        document.execCommand('hiliteColor', false, '#fef08a');
        handleEditorInput(true);
      } catch (err) {
        // fallback
      }
    }
  };

  const handleClearFormatting = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('removeFormat', false, undefined);
    document.execCommand('unlink', false, undefined);
    handleEditorInput(true);
    showToast('Formatting cleared for selection', 'info');
  };

  const insertChecklist = () => {
    insertCustomHtml(
      '<div class="task-checkbox-item"><input type="checkbox" /> <span>New action item</span></div><p><br></p>'
    );
  };

  const insertTable = () => {
    insertCustomHtml(
      `<table class="rich-doc-table my-3">
        <thead>
          <tr>
            <th>Deliverable</th>
            <th>Owner</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Core Specification</td>
            <td>Engineering Team</td>
            <td>In Progress</td>
          </tr>
          <tr>
            <td>Design Review</td>
            <td>Product Design</td>
            <td>Approved</td>
          </tr>
        </tbody>
      </table><p><br></p>`
    );
  };

  const addTableRow = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    let tableNode: HTMLTableElement | null = null;
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'TABLE') {
          tableNode = node as HTMLTableElement;
          break;
        }
        node = node.parentNode;
      }
    }

    if (!tableNode) {
      const allTables = editorRef.current.querySelectorAll('table');
      if (allTables.length > 0) {
        tableNode = allTables[allTables.length - 1] as HTMLTableElement;
      }
    }

    if (tableNode) {
      const tbody = tableNode.querySelector('tbody') || tableNode;
      const sampleRow = tableNode.querySelector('tbody tr') || tableNode.querySelector('tr');
      const colCount = sampleRow ? sampleRow.children.length : 3;

      const newRow = document.createElement('tr');
      for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.innerHTML = i === 0 ? 'New Row Item' : 'Details';
        newRow.appendChild(td);
      }
      tbody.appendChild(newRow);
      handleEditorInput(true);
      showToast('Added table row', 'info');
    } else {
      insertTable();
    }
  };

  const insertCallout = () => {
    insertCustomHtml(
      `<div class="callout-card">💡 <strong>Key Note:</strong> Enter your important project notes or guidelines here...</div><p><br></p>`
    );
  };

  const insertDivider = () => {
    insertCustomHtml('<hr /><p><br></p>');
  };

  // ============================================================================
  // ACTIONS: OPEN EDITOR, CREATE DOC, USE TEMPLATE
  // ============================================================================
  const openEditorForDoc = (doc: DocumentItem) => {
    if (doc.type !== 'written') {
      if (doc.fileType === 'image' && doc.fileUrl) {
        setPreviewFile(doc);
      } else if (
        doc.fileType === 'pdf' ||
        doc.title.toLowerCase().endsWith('.pdf') ||
        (doc.originalFileName && doc.originalFileName.toLowerCase().endsWith('.pdf'))
      ) {
        // Open Professional PDF Viewer (Requirement 13)
        setViewingPdf({
          isOpen: true,
          url: doc.fileUrl || '#',
          fileName: doc.title || 'Document.pdf',
          fileSize: doc.fileSize || '2.4 MB',
          uploadedBy: doc.author || 'Workspace Member',
          uploadedAt: doc.createdAt || doc.updatedAt,
          project: doc.project || 'Core Platform',
          organization: (user as any)?.company || 'TaskFlow Organization',
          accessLevel: 'Restricted Workspace Access'
        });
      } else {
        handleDownloadFile(doc);
      }
      return;
    }
    setSelectedDocId(doc.id);
    const initialContent = ensureHumanReadableHtml(doc.content);
    setEditTitle(doc.title);
    setEditContent(initialContent);
    setEditCategory(doc.category);
    setEditProject(doc.project || 'Core Platform');
    setEditStatus(doc.status);
    setActiveView('editor');
    setEditorViewMode('edit');
    setIsZenMode(false);

    // Initialize history stack & save tracking
    setHistory([initialContent]);
    setHistoryIndex(0);
    historyIndexRef.current = 0;
    lastSavedContentRef.current = initialContent;
    lastSavedTitleRef.current = doc.title;
    setHasUnsavedChanges(false);
  };

  const handleCreateNewDoc = (template?: TemplateDoc) => {
    const rawContent = template ? template.content : '<h1>Untitled Document</h1><p>Start typing your project notes, specifications, or architectural guidelines here...</p>';
    const humanHtml = ensureHumanReadableHtml(rawContent);

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      type: 'written',
      title: template ? template.name : 'Untitled Document',
      content: humanHtml,
      category: template ? template.category : 'General',
      tags: template ? [template.category, 'Specification'] : ['Draft', 'General'],
      project: template ? template.project : 'Core Platform',
      author: user?.name || 'You',
      authorAvatar: user?.profilePhoto,
      status: 'Draft',
      isStarred: false,
      isTrash: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const nextList = [newDoc, ...items];
    persistItems(nextList);
    openEditorForDoc(newDoc);
    showToast(template ? `Loaded template: ${template.name}` : 'New document created!', 'success');
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextList = items.map((it) => (it.id === id ? { ...it, isStarred: !it.isStarred } : it));
    persistItems(nextList);
    const item = items.find((it) => it.id === id);
    showToast(item?.isStarred ? 'Removed from Starred' : 'Added to Starred', 'info');
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = items.find((it) => it.id === id);
    if (!item) return;

    if (!item.isTrash) {
      const nextList = items.map((it) => (it.id === id ? { ...it, isTrash: true } : it));
      persistItems(nextList);
      showToast(`"${item.title}" moved to Trash.`, 'info');
    } else {
      const nextList = items.filter((it) => it.id !== id);
      persistItems(nextList);
      showToast(`"${item.title}" permanently deleted.`, 'info');
    }
  };

  // ============================================================================
  // ACTIONS: FILE UPLOAD
  // ============================================================================
  const processUploadedFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUploadedItems: DocumentItem[] = [];

    Array.from(files).forEach((file) => {
      let fileType: DocumentItem['fileType'] = 'other';
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'pdf') fileType = 'pdf';
      else if (['doc', 'docx'].includes(ext || '')) fileType = 'word';
      else if (['xls', 'xlsx', 'csv'].includes(ext || '')) fileType = 'excel';
      else if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext || '')) fileType = 'image';
      else if (['ts', 'tsx', 'js', 'json', 'py', 'html', 'css'].includes(ext || '')) fileType = 'code';

      const sizeBytes = file.size;
      const formattedSize =
        sizeBytes < 1024 * 1024
          ? `${Math.round(sizeBytes / 1024)} KB`
          : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

      const fileUrl = URL.createObjectURL(file);

      newUploadedItems.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'uploaded',
        title: file.name,
        originalFileName: file.name,
        category: uploadCategory,
        tags: [fileType.toUpperCase(), uploadCategory],
        project: uploadProject,
        author: user?.name || 'You',
        authorAvatar: user?.profilePhoto,
        status: 'Published',
        isStarred: false,
        isTrash: false,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        fileType,
        fileSize: formattedSize,
        fileSizeBytes: sizeBytes,
        fileUrl
      });
    });

    const nextList = [...newUploadedItems, ...items];
    persistItems(nextList);
    setIsUploadModalOpen(false);
    showToast(`Uploaded ${newUploadedItems.length} file(s) successfully!`, 'success');
  };

  const handleDownloadFile = (item: DocumentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.type === 'written') {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${item.title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 820px; margin: 40px auto; padding: 24px; line-height: 1.7; color: #1e293b; }
  h1 { font-size: 2rem; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 1.4rem; color: #2563eb; margin-top: 24px; font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
  h3 { font-size: 1.15rem; font-weight: 700; margin-top: 18px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9rem; }
  th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
  th { background: #f8fafc; font-weight: 700; }
  .callout-card { background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px 18px; border-radius: 10px; margin: 16px 0; font-size: 0.9rem; color: #1e40af; }
  .task-checkbox-item { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
  ul, ol { padding-left: 24px; }
</style>
</head>
<body>
${item.content || ''}
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Document downloaded.', 'info');
    } else {
      if (item.fileUrl) {
        const a = document.createElement('a');
        a.href = item.fileUrl;
        a.download = item.originalFileName || item.title;
        a.click();
        showToast(`Downloading ${item.title}...`, 'info');
      } else {
        showToast('Sample file demo downloaded.', 'info');
      }
    }
  };

  const handleCopyText = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText;
    navigator.clipboard.writeText(text);
    showToast('Document text copied to clipboard!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // ============================================================================
  // STATS & FILTERED DATA CALCULATION
  // ============================================================================
  const nonTrashItems = useMemo(() => items.filter((it) => !it.isTrash), [items]);
  const trashItems = useMemo(() => items.filter((it) => it.isTrash), [items]);

  const counts = useMemo(() => {
    const total = nonTrashItems.length;
    const written = nonTrashItems.filter((it) => it.type === 'written').length;
    const uploaded = nonTrashItems.filter((it) => it.type === 'uploaded').length;
    const pdf = nonTrashItems.filter((it) => it.fileType === 'pdf').length;
    const word = nonTrashItems.filter((it) => it.fileType === 'word').length;
    const excel = nonTrashItems.filter((it) => it.fileType === 'excel').length;
    const image = nonTrashItems.filter((it) => it.fileType === 'image').length;
    const notes = written;
    const starred = nonTrashItems.filter((it) => it.isStarred).length;
    const trash = trashItems.length;

    const uploadedBytes = nonTrashItems.reduce((acc, it) => acc + (it.fileSizeBytes || 250000), 0);
    const totalGBUsed = (3.2 + uploadedBytes / (1024 * 1024 * 1024)).toFixed(1);
    const percentUsed = Math.min(100, Math.round((parseFloat(totalGBUsed) / 10) * 100));

    return {
      total,
      written,
      uploaded,
      pdf,
      word,
      excel,
      image,
      notes,
      starred,
      trash,
      totalGBUsed,
      percentUsed
    };
  }, [nonTrashItems, trashItems]);

  const filteredItems = useMemo(() => {
    let list = navCategory === 'trash' ? trashItems : nonTrashItems;

    if (navCategory === 'recent') {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      list = list.filter((it) => it.updatedAt >= weekAgo);
    } else if (navCategory === 'starred') {
      list = list.filter((it) => it.isStarred);
    } else if (navCategory === 'my') {
      list = list.filter((it) => it.author === (user?.name || 'You') || it.author === 'You');
    } else if (navCategory === 'shared') {
      list = list.filter((it) => it.author !== (user?.name || 'You') && it.author !== 'You');
    }

    if (typeFilter === 'written') {
      list = list.filter((it) => it.type === 'written');
    } else if (typeFilter === 'uploaded') {
      list = list.filter((it) => it.type === 'uploaded');
    }

    if (formatFilter === 'pdf') {
      list = list.filter((it) => it.fileType === 'pdf');
    } else if (formatFilter === 'word') {
      list = list.filter((it) => it.fileType === 'word');
    } else if (formatFilter === 'excel') {
      list = list.filter((it) => it.fileType === 'excel');
    } else if (formatFilter === 'image') {
      list = list.filter((it) => it.fileType === 'image');
    } else if (formatFilter === 'notes') {
      list = list.filter((it) => it.type === 'written');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.content && it.content.toLowerCase().includes(q)) ||
          it.tags.some((t) => t.toLowerCase().includes(q)) ||
          it.project.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'oldest') return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'size') {
        const sizeA = a.fileSizeBytes || (a.content ? a.content.length : 0);
        const sizeB = b.fileSizeBytes || (b.content ? b.content.length : 0);
        return sizeB - sizeA;
      }
      return 0;
    });
  }, [navCategory, typeFilter, formatFilter, searchQuery, sortBy, nonTrashItems, trashItems, user]);

  // Clean word count for editor (ignores HTML tags)
  const editWordsCount = useMemo(() => {
    const textOnly = editContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return textOnly ? textOnly.split(' ').filter(Boolean).length : 0;
  }, [editContent]);

  const editReadingTime = Math.max(1, Math.ceil(editWordsCount / 200));

  const getFileIconConfig = (item: DocumentItem) => {
    if (item.type === 'written') {
      return {
        icon: FileText,
        bgColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
        badge: 'WRITTEN DOC',
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      };
    }
    switch (item.fileType) {
      case 'pdf':
        return {
          icon: FileText,
          bgColor: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
          badge: 'PDF',
          badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        };
      case 'word':
        return {
          icon: FileText,
          bgColor: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
          badge: 'WORD DOC',
          badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
        };
      case 'excel':
        return {
          icon: FileSpreadsheet,
          bgColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
          badge: 'SPREADSHEET',
          badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      case 'image':
        return {
          icon: ImageIcon,
          bgColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
          badge: 'IMAGE',
          badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
        };
      case 'code':
        return {
          icon: FileCode2,
          bgColor: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
          badge: 'CODE / CONFIG',
          badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        };
      default:
        return {
          icon: File,
          bgColor: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
          badge: 'FILE',
          badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
        };
    }
  };

  const getCategoryClass = (cat: DocumentItem['category']) => {
    switch (cat) {
      case 'Architecture':
        return 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'Product':
        return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Engineering':
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Planning':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Meeting':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  // ============================================================================
  // RENDER: CONCEPT C HUMAN-READABLE WYSIWYG EDITOR VIEW (Smooth Left-to-Right Slide)
  // ============================================================================
  const renderEditorView = () => (
    <motion.div
      key="editor-view"
      initial={{ x: '-100%', opacity: 0.95 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0.95 }}
      transition={{ type: 'spring', damping: 30, stiffness: 280, mass: 0.85 }}
      className={`${
        isZenMode
          ? 'fixed inset-0 z-50 w-full h-full flex flex-col bg-slate-900/98 backdrop-blur-2xl p-2 sm:p-5'
          : 'absolute inset-0 z-30 w-full h-full flex flex-col bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md shadow-[20px_0_40px_rgba(0,0,0,0.25)]'
      }`}
    >
      {/* Editor Main Frame */}
      <div className="flex-1 glass-panel border border-slate-200/80 dark:border-white/10 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Top Bar: Navigation, Title & Primary Actions */}
        <div className="border-b border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0">
            <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5">
              {/* Left Side: Back Button & Title Input */}
              <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                <button
                  onClick={() => {
                    saveCurrentDoc(true);
                    setActiveView('hub');
                    setIsZenMode(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Hub</span>
                </button>

                <div className="h-4 w-px bg-slate-300 dark:bg-white/10 shrink-0" />

                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setHasUnsavedChanges(
                      editContent !== lastSavedContentRef.current || e.target.value !== lastSavedTitleRef.current
                    );
                  }}
                  placeholder="Document Title..."
                  className="w-full bg-transparent text-sm sm:text-base font-black text-slate-900 dark:text-white outline-none placeholder:text-slate-400 truncate"
                />
              </div>

              {/* Right Side: Metadata controls & Action buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Save Button (Manual Save with Live Status) */}
                <button
                  onClick={() => saveCurrentDoc(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    hasUnsavedChanges
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                  title="Save Document (Ctrl+S)"
                >
                  {hasUnsavedChanges ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{hasUnsavedChanges ? 'Save' : 'Saved'}</span>
                  {hasUnsavedChanges && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                  )}
                </button>

                {/* Revert Changes */}
                <button
                  onClick={handleRevertChanges}
                  disabled={!hasUnsavedChanges}
                  className={`p-1.5 sm:p-2 border border-slate-200/80 dark:border-white/10 rounded-xl transition-colors cursor-pointer ${
                    hasUnsavedChanges
                      ? 'hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-500'
                      : 'opacity-30 cursor-not-allowed text-slate-400'
                  }`}
                  title={hasUnsavedChanges ? 'Discard changes & revert to saved' : 'No unsaved changes to revert'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block shrink-0" />

                {/* Category Dropdown */}
                <select
                  value={editCategory}
                  onChange={(e) => {
                    setEditCategory(e.target.value as any);
                    setHasUnsavedChanges(true);
                  }}
                  className="hidden md:block text-xs font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="dark:bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>

                {/* Status Toggle (Draft / Published) */}
                <button
                  onClick={() => {
                    setEditStatus((prev) => (prev === 'Published' ? 'Draft' : 'Published'));
                    setHasUnsavedChanges(true);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    editStatus === 'Published'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  }`}
                  title="Click to toggle status"
                >
                  {editStatus}
                </button>

                {/* View Mode Toggle: Edit vs Preview */}
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-white/10">
                  <button
                    onClick={() => setEditorViewMode('edit')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editorViewMode === 'edit'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-white'
                    }`}
                    title="Editor Mode"
                  >
                    <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setEditorViewMode('preview')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editorViewMode === 'preview'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-white'
                    }`}
                    title="Clean Preview"
                  >
                    <Eye className="w-3.5 h-3.5 inline mr-1" />
                    <span>Preview</span>
                  </button>
                </div>

                {/* Zen Mode / Fullscreen Toggle */}
                <button
                  onClick={() => setIsZenMode((prev) => !prev)}
                  className={`p-1.5 sm:p-2 border border-slate-200/80 dark:border-white/10 rounded-xl transition-colors cursor-pointer ${
                    isZenMode
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                  }`}
                  title={isZenMode ? 'Exit Zen Mode (Esc)' : 'Zen Writing Mode (Fullscreen)'}
                >
                  {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Copy Text */}
                <button
                  onClick={handleCopyText}
                  className="p-1.5 sm:p-2 border border-slate-200/80 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Copy Document Text"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Print / PDF */}
                <button
                  onClick={handlePrint}
                  className="hidden sm:flex p-1.5 sm:p-2 border border-slate-200/80 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Print / Save to PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                {/* Export Document */}
                <button
                  onClick={() => {
                    const currentDoc = items.find((it) => it.id === selectedDocId);
                    if (currentDoc) handleDownloadFile(currentDoc);
                  }}
                  className="p-1.5 sm:p-2 border border-slate-200/80 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Download Document"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* WYSIWYG Human-Readable Formatting Toolbar (Only in Edit mode) */}
            {editorViewMode === 'edit' && (
              <div className="px-3 sm:px-6 py-2 border-t border-slate-200/40 dark:border-white/5 flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-white/2">
                {/* Undo & Redo History Controls */}
                <div className="flex items-center gap-0.5 shrink-0 bg-slate-200/50 dark:bg-white/5 p-0.5 rounded-lg border border-slate-200/60 dark:border-white/10">
                  <button
                    type="button"
                    disabled={historyIndex <= 0}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleUndo}
                    className={`p-1.5 rounded-md transition-all shrink-0 ${
                      historyIndex > 0
                        ? 'hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer active:scale-95'
                        : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                    }`}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={historyIndex >= history.length - 1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleRedo}
                    className={`p-1.5 rounded-md transition-all shrink-0 ${
                      historyIndex < history.length - 1
                        ? 'hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer active:scale-95'
                        : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                    }`}
                    title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />

                {/* Headings */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('formatBlock', 'h1')}
                  className="px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 font-black text-xs shrink-0 cursor-pointer"
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('formatBlock', 'h2')}
                  className="px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 font-black text-xs shrink-0 cursor-pointer"
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('formatBlock', 'h3')}
                  className="px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 font-black text-xs shrink-0 cursor-pointer"
                  title="Heading 3"
                >
                  H3
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('formatBlock', 'p')}
                  className="px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 font-bold text-xs shrink-0 cursor-pointer"
                  title="Normal Text (Paragraph)"
                >
                  ¶
                </button>

                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />

                {/* Inline Styles */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('bold')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('italic')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('underline')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('strikeThrough')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                {/* Code, Highlight & Clear Formatting */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleInsertCode}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer font-mono"
                  title="Inline Code"
                >
                  <Code className="w-3.5 h-3.5 text-blue-500" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleHighlight}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Text Highlight"
                >
                  <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClearFormatting}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer text-slate-500 hover:text-rose-500"
                  title="Clear Formatting"
                >
                  <RemoveFormatting className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />

                {/* Real Clickable Tasks & Lists */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={insertChecklist}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-xs font-bold shrink-0 cursor-pointer"
                  title="Insert Interactive Checkbox Task"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">Checklist</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('insertUnorderedList')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('insertOrderedList')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />

                {/* Real Visual Blocks (Table, Add Row, Callout, Divider) */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={insertTable}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-xs font-bold shrink-0 cursor-pointer"
                  title="Insert Visual Table"
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={addTableRow}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-xs font-bold shrink-0 cursor-pointer text-emerald-600 dark:text-emerald-400"
                  title="Add Table Row"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Row</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={insertCallout}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-xs font-bold shrink-0 cursor-pointer"
                  title="Insert Highlighted Note"
                >
                  <Quote className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Callout</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={insertDivider}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Horizontal Divider"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />

                {/* Alignment */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('justifyLeft')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('justifyCenter')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('justifyRight')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => execFormat('justifyFull')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  title="Justify Full"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Main Editing Canvas Area (Human-Readable WYSIWYG) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50 dark:bg-slate-950/40">
            <AnimatePresence mode="wait">
              {editorViewMode === 'edit' ? (
                <motion.div
                  key="canvas-edit"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  className="max-w-4xl mx-auto"
                >
                  <div
                    ref={(el) => {
                      editorRef.current = el;
                      if (el && editContent) {
                        const formatted = ensureHumanReadableHtml(editContent);
                        if (el.innerHTML !== formatted) {
                          el.innerHTML = formatted;
                        }
                      }
                    }}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => handleEditorInput(false)}
                    onClick={handleEditorClick}
                    data-placeholder="Start typing your human-readable documentation here..."
                    className="rich-editor-canvas min-h-[550px] p-6 sm:p-12 outline-none bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl text-slate-800 dark:text-slate-100 transition-all focus:ring-2 focus:ring-blue-500/20"
                  />
                </motion.div>
              ) : (
                /* Clean Read-Only Preview */
                <motion.div
                  key="canvas-preview"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  className="max-w-4xl mx-auto"
                >
                  <div
                    onClick={handleEditorClick}
                    dangerouslySetInnerHTML={{ __html: ensureHumanReadableHtml(editContent) }}
                    className="rich-editor-canvas min-h-[550px] p-6 sm:p-12 bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl text-slate-800 dark:text-slate-100"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Info & Autosave Status */}
          <div className="h-10 px-4 sm:px-6 border-t border-slate-200/50 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex items-center justify-between text-[10px] text-slate-400 font-bold shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  isAutosaving
                    ? 'bg-amber-500 animate-ping'
                    : hasUnsavedChanges
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`} />
                {isAutosaving
                  ? 'Autosaving...'
                  : hasUnsavedChanges
                  ? 'Unsaved changes (press Ctrl+S to save)'
                  : 'All changes saved'}
              </span>
              <span>·</span>
              <span>{editWordsCount} words</span>
              <span>·</span>
              <span>{editReadingTime} min read</span>
            </div>
            <div className="flex items-center gap-3">
              {isZenMode && (
                <span className="text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md">Zen Mode Active (Esc to exit)</span>
              )}
              <span className="hidden sm:inline">Shortcuts: Ctrl+Z (Undo) · Ctrl+Y (Redo) · Ctrl+S (Save)</span>
            </div>
          </div>
        </div>
    </motion.div>
  );

  // ============================================================================
  // RENDER: CONCEPT D UNIFIED DOCUMENT HUB (MIXED GRID VIEW)
  // ============================================================================
  return (
    <div className="h-[calc(100dvh-13.5rem)] sm:h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-12rem)] min-h-[520px] w-full relative overflow-hidden">
      {/* Hidden file input for native file picking */}
      <input
        type="file"
        ref={directFileInputRef}
        onChange={(e) => processUploadedFiles(e.target.files)}
        multiple
        className="hidden"
      />

      {/* Main Workspace Frame (Hub View) */}
      <div
        aria-hidden={activeView === 'editor'}
        className={`w-full h-full flex flex-col space-y-3 transition-all duration-300 ${
          activeView === 'editor' ? 'pointer-events-none opacity-40 select-none scale-[0.98]' : 'opacity-100 scale-100'
        }`}
      >
        {/* Main Workspace Frame */}
        <div className="flex-1 glass-panel border border-slate-200/80 dark:border-white/10 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
          {/* ========================================================================= */}
          {/* MAIN HUB AREA: TOOLBAR, SMART FILTERS & MIXED GRID                       */}
          {/* ========================================================================= */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20">
            {/* Top Bar: Title & Primary Actions */}
            <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shrink-0 space-y-3.5 relative z-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Header Title */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <span>Document Hub</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black border border-blue-500/20">
                        {counts.total} items
                      </span>
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                      Unified workspace for written specifications, meeting notes, and project assets.
                    </p>
                  </div>
                </div>

                {/* PRIMARY ACTIONS: WRITE DOCUMENT, TEMPLATES, & UPLOAD FILE */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
                  {/* 1. WRITE DOCUMENT (Blue Gradient) */}
                  <button
                    onClick={() => handleCreateNewDoc()}
                    className="h-10 px-3 sm:px-4 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95 whitespace-nowrap leading-none"
                  >
                    <Edit3 className="w-4 h-4 shrink-0" />
                    <span>Write Document</span>
                  </button>

                  {/* 2. Quick Template Dropdown Button */}
                  <div className="relative shrink-0 hidden md:block" ref={templateMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                      className="h-10 px-3.5 shrink-0 inline-flex items-center justify-between gap-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs whitespace-nowrap leading-none"
                    >
                      <span>+ Template...</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isTemplateMenuOpen ? 'rotate-180 text-blue-500' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isTemplateMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute right-0 top-full mt-2 w-72 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800/80"
                        >
                          <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Starter Templates
                          </div>
                          <div className="py-1 space-y-0.5">
                            {STARTER_TEMPLATES.map((tmpl) => (
                              <button
                                key={tmpl.id}
                                onClick={() => {
                                  handleCreateNewDoc(tmpl);
                                  setIsTemplateMenuOpen(false);
                                }}
                                className="w-full px-2.5 py-2 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2.5 group cursor-pointer"
                              >
                                <span className="text-base shrink-0">{tmpl.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                    {tmpl.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">{tmpl.category}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 3. UPLOAD FILE (Action Button) */}
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="h-10 px-3 sm:px-4 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs whitespace-nowrap leading-none"
                  >
                    <Upload className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Upload File</span>
                  </button>
                </div>
              </div>

              {/* Smart Search Bar & Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1 group">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search docs, specs, author, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-semibold outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Controls: Category, Sort Dropdown & Display Mode (Aligned in 1 row on mobile) */}
                <div className="grid grid-cols-[1fr_1fr_auto] sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
                  <select
                    value={navCategory}
                    onChange={(e) => setNavCategory(e.target.value as any)}
                    className="w-full min-w-0 text-xs font-bold px-2 sm:px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 outline-none cursor-pointer truncate"
                  >
                    <option value="all" className="dark:bg-slate-900">All Items ({counts.total})</option>
                    <option value="my" className="dark:bg-slate-900">My Docs ({counts.written})</option>
                    <option value="starred" className="dark:bg-slate-900">⭐ Starred ({counts.starred})</option>
                    <option value="trash" className="dark:bg-slate-900">🗑️ Trash ({counts.trash})</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full min-w-0 text-xs font-bold px-2 sm:px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 outline-none cursor-pointer truncate"
                  >
                    <option value="newest" className="dark:bg-slate-900">Newest First</option>
                    <option value="oldest" className="dark:bg-slate-900">Oldest First</option>
                    <option value="title" className="dark:bg-slate-900">Name (A-Z)</option>
                    <option value="size" className="dark:bg-slate-900">Size</option>
                  </select>

                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-white/10 shrink-0">
                    <button
                      onClick={() => setDisplayMode('grid')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        displayMode === 'grid'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-white'
                      }`}
                      title="Grid View"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDisplayMode('list')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        displayMode === 'list'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-white'
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

            {/* Smart Filter Tabs Row */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-1 shrink-0 bg-slate-200/60 dark:bg-white/5 p-1 rounded-xl border border-slate-200/60 dark:border-white/5 relative">
                {[
                  { id: 'all', label: 'All Items', count: counts.total },
                  { id: 'written', label: '✏️ Written', count: counts.written },
                  { id: 'uploaded', label: '📁 Uploaded', count: counts.uploaded }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTypeFilter(tab.id as any)}
                    className={`relative px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer shrink-0 z-10 ${
                      typeFilter === tab.id
                        ? 'text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {typeFilter === tab.id && (
                      <motion.div
                        layoutId="activeTypeFilterPill"
                        className="absolute inset-0 bg-blue-600 rounded-lg -z-10 shadow-xs"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span>
                      {tab.label} <span className="opacity-75">({tab.count})</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-slate-300 dark:bg-white/10 mx-1 shrink-0" />

              <div className="flex items-center gap-1.5 shrink-0 relative">
                {[
                  { id: 'all', label: 'All Formats' },
                  { id: 'pdf', label: `PDF (${counts.pdf})` },
                  { id: 'word', label: `Word (${counts.word})` },
                  { id: 'excel', label: `Excel (${counts.excel})` },
                  { id: 'image', label: `Images (${counts.image})` },
                  { id: 'notes', label: `Notes (${counts.notes})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormatFilter(f.id as any)}
                    className={`relative px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0 border z-10 ${
                      formatFilter === f.id
                        ? 'text-white dark:text-slate-900 border-transparent'
                        : 'bg-white/60 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-white/10 hover:border-blue-500/40 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {formatFilter === f.id && (
                      <motion.div
                        layoutId="activeFormatFilterPill"
                        className="absolute inset-0 bg-slate-900 dark:bg-white rounded-xl -z-10 shadow-xs"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MAIN CONTENT AREA: CARDS & STARTER TEMPLATES                              */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 pb-20 space-y-8 flex-1">
            <div className="min-h-[320px]">
              <AnimatePresence mode="wait" initial={false}>
              {filteredItems.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="py-16 text-center space-y-3 max-w-sm mx-auto"
                >
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">No documents match your filter</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Try clearing your search query or reset your category filters to view all documents.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        setNavCategory('all');
                        setTypeFilter('all');
                        setFormatFilter('all');
                        setSearchQuery('');
                      }}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => handleCreateNewDoc()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      Write Document
                    </button>
                  </div>
                </motion.div>
              ) : displayMode === 'grid' ? (
                <motion.div
                  key={`grid-${typeFilter}-${formatFilter}-${navCategory}-${sortBy}-${Boolean(searchQuery)}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5"
                >
                  {filteredItems.map((item, index) => {
                    const cfg = getFileIconConfig(item);
                    const Icon = cfg.icon;
                    const isWritten = item.type === 'written';
                    const dateStr = new Date(item.updatedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric'
                    });

                    // Clean excerpt snippet without HTML tags
                    const excerpt = item.content
                      ? item.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 110)
                      : '';

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.24,
                          delay: Math.min(index * 0.03, 0.2),
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        onClick={() => openEditorForDoc(item)}
                        className={`group relative rounded-2xl sm:rounded-3xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-0.5 ${
                          isWritten
                            ? 'bg-gradient-to-b from-white via-white to-blue-50/30 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-blue-950/20 border-slate-200/80 dark:border-white/10 hover:border-blue-500/50'
                            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        {/* Top Accent Stripe */}
                        <div
                          className={`h-1.5 w-full ${
                            isWritten
                              ? 'bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400'
                              : item.fileType === 'pdf'
                              ? 'bg-rose-500'
                              : item.fileType === 'word'
                              ? 'bg-indigo-500'
                              : item.fileType === 'excel'
                              ? 'bg-emerald-500'
                              : item.fileType === 'image'
                              ? 'bg-purple-500'
                              : 'bg-amber-500'
                          }`}
                        />

                        {/* Card Content Area */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                          {/* Upper Badges & Actions */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider shrink-0 ${cfg.badgeColor}`}>
                                {cfg.badge}
                              </span>
                              <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider shrink-0 ${getCategoryClass(item.category)}`}>
                                {item.category}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              {/* Download Action */}
                              <button
                                onClick={(e) => handleDownloadFile(item, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                title={isWritten ? 'Download Document' : 'Download File'}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* Star Toggle */}
                              <button
                                onClick={(e) => handleToggleStar(item.id, e)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  item.isStarred
                                    ? 'text-amber-400 bg-amber-500/10'
                                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                                title={item.isStarred ? 'Starred' : 'Add to Starred'}
                              >
                                <Star className={`w-3.5 h-3.5 ${item.isStarred ? 'fill-current' : ''}`} />
                              </button>

                              {/* Delete / Trash */}
                              <button
                                onClick={(e) => handleDeleteItem(item.id, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Preview Snippet */}
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${cfg.bgColor}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <h3
                                className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors line-clamp-2 leading-snug break-all sm:break-words flex-1"
                                title={item.title}
                              >
                                {item.title}
                              </h3>
                            </div>

                            {isWritten && excerpt && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed pl-10 font-normal">
                                {excerpt}...
                              </p>
                            )}
                          </div>

                          {/* Card Metadata Footer */}
                          <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-semibold gap-2">
                            <div className="flex items-center gap-2 truncate">
                              {item.authorAvatar ? (
                                <img src={item.authorAvatar} alt={item.author} className="w-4 h-4 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[9px] font-black shrink-0">
                                  {item.author[0]}
                                </div>
                              )}
                              <span className="truncate text-slate-600 dark:text-slate-300 font-bold">{item.author}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isWritten ? (
                                <span className="text-blue-600 dark:text-blue-400 font-bold">
                                  {item.content ? item.content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length : 0} words
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 font-bold">{item.fileSize}</span>
                              )}
                              <span>·</span>
                              <span>{dateStr}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                /* LIST VIEW */
                <motion.div
                  key={`list-${typeFilter}-${formatFilter}-${navCategory}-${sortBy}-${Boolean(searchQuery)}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 divide-y divide-slate-200/60 dark:divide-white/5 overflow-hidden"
                >
                  {filteredItems.map((item, index) => {
                    const cfg = getFileIconConfig(item);
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: Math.min(index * 0.02, 0.15),
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        onClick={() => openEditorForDoc(item)}
                        className="p-3.5 sm:p-4 hover:bg-slate-100/70 dark:hover:bg-white/5 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bgColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              <span className="text-slate-600 dark:text-slate-300 font-semibold">{item.author}</span>
                              <span>·</span>
                              <span>{item.type === 'written' ? `${item.content?.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length || 0} words` : item.fileSize}</span>
                              <span>·</span>
                              <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`hidden sm:inline-block px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase ${getCategoryClass(item.category)}`}>
                            {item.category}
                          </span>
                          <button
                            onClick={(e) => handleToggleStar(item.id, e)}
                            className={`p-1.5 rounded-lg ${item.isStarred ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
                          >
                            <Star className={`w-4 h-4 ${item.isStarred ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => handleDownloadFile(item, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(item.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            {/* ========================================================================= */}
            {/* DOCUMENT STARTER TEMPLATES ROW / CAROUSEL (Bottom of Concept D Hub)       */}
            {/* ========================================================================= */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>Starter Templates</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Launch standard enterprise documentation with one click.</p>
                </div>
              </div>

              {/* Responsive Templates Grid: 1-col on mobile, 2-col tablet, 4-col desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {STARTER_TEMPLATES.slice(0, 4).map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleCreateNewDoc(tmpl)}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group flex flex-col justify-between space-y-2 shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{tmpl.icon}</span>
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase ${getCategoryClass(tmpl.category)}`}>
                          {tmpl.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors line-clamp-1">
                        {tmpl.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {tmpl.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      <span>Use Template</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Smooth Left-to-Right Full Document Editor */}
    <AnimatePresence>
      {activeView === 'editor' && renderEditorView()}
    </AnimatePresence>

    {/* ========================================================================= */}
    {/* UPLOAD FILE MODAL                                                         */}
    {/* ========================================================================= */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 touch-none overscroll-contain">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-lg p-5 sm:p-6 shadow-2xl relative border border-slate-200/80 dark:border-white/10 z-50 rounded-3xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">Upload Project Documents</h3>
                    <p className="text-[10px] text-slate-400">PDFs, Word docs, Excel sheets, diagrams, and assets.</p>
                  </div>
                </div>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => directFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-blue-500 rounded-2xl p-8 text-center space-y-2 cursor-pointer transition-all hover:bg-blue-500/5 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Click to browse or drag & drop files here
                </p>
                <p className="text-[10px] text-slate-400">
                  Supports PDF, DOCX, XLSX, PNG, JPG, JSON (Max 50MB)
                </p>
              </div>

              {/* Category & Project Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Target Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Linked Project</label>
                  <select
                    value={uploadProject}
                    onChange={(e) => setUploadProject(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white outline-none"
                  >
                    <option value="Core Platform" className="dark:bg-slate-900">Core Platform</option>
                    <option value="Mobile App" className="dark:bg-slate-900">Mobile App</option>
                    <option value="Web Client" className="dark:bg-slate-900">Web Client</option>
                    <option value="Infrastructure" className="dark:bg-slate-900">Infrastructure</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => directFileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Upload className="w-4 h-4" />
                <span>Select Files to Upload</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* IMAGE PREVIEW MODAL (Only for image files with actual visual content)     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewFile && previewFile.fileType === 'image' && previewFile.fileUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 touch-none overscroll-contain">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFile(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative border border-slate-200/80 dark:border-white/10 z-50 rounded-3xl space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">{previewFile.title}</h3>
                    <p className="text-[10px] text-slate-400">{previewFile.fileSize || 'Image'} · {previewFile.category} · {previewFile.author}</p>
                  </div>
                </div>
                <button onClick={() => setPreviewFile(null)} className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Actual Image Preview */}
              <div className="rounded-2xl overflow-hidden bg-slate-100/70 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <img
                  src={previewFile.fileUrl}
                  alt={previewFile.title}
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    handleDownloadFile(previewFile);
                    setPreviewFile(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enterprise Premium PDF Viewer (Requirement 13) */}
      <PremiumPdfViewerModal
        isOpen={viewingPdf.isOpen}
        onClose={() => setViewingPdf((prev) => ({ ...prev, isOpen: false }))}
        pdfUrl={viewingPdf.url}
        fileName={viewingPdf.fileName}
        fileSize={viewingPdf.fileSize}
        uploadedBy={viewingPdf.uploadedBy}
        uploadedAt={viewingPdf.uploadedAt}
        project={viewingPdf.project}
        organization={viewingPdf.organization}
        accessLevel={viewingPdf.accessLevel}
      />
    </div>
  );
}
