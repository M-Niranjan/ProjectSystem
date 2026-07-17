import React, { useState, useEffect } from 'react';
import { FileText, Plus, Save, Download, Trash2, Eye, Compass, Sparkles } from 'lucide-react';

interface Document {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
}

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Default Mock Documents
  const mockDocs = [
    { id: 1, title: 'Database Relational Mapping Guidelines', content: 'Database structures use MySQL 8.x.\nEntities are managed via Hibernate JPA mappings.\n\nRelationships:\n1. User -> Projects (Many-to-Many via project_members)\n2. Project -> Tasks (One-to-Many)\n3. Task -> Subtasks (Self-referential One-to-Many)\n4. Task -> Dependencies (Self-referential Many-to-Many)\n\nCORS mappings point to http://localhost:5173 for local clients.', updatedAt: '2026-07-14T09:00:00Z' },
    { id: 2, title: 'JWT Authentication Token Flows', content: 'Auth token handling is set to stateless.\nHeader specifications:\nKey: Authorization\nValue: Bearer <JWT>\n\nSecret key is configured in resources properties file.\nPasswords use BCryptPasswordEncoder hashing.', updatedAt: '2026-07-14T10:15:00Z' }
  ];

  useEffect(() => {
    const savedDocs = localStorage.getItem('prologue-docs');
    if (savedDocs) {
      try {
        const parsed = JSON.parse(savedDocs);
        setDocs(parsed);
        if (parsed.length > 0) {
          selectDoc(parsed[0]);
        }
      } catch (err) {
        setDocs(mockDocs);
        selectDoc(mockDocs[0]);
      }
    } else {
      setDocs(mockDocs);
      selectDoc(mockDocs[0]);
    }
  }, []);

  const selectDoc = (doc: Document) => {
    setSelectedDocId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
  };

  const saveCurrentDoc = () => {
    if (!selectedDocId) return;
    
    const updated = docs.map(d => {
      if (d.id === selectedDocId) {
        return {
          ...d,
          title: title.trim() || 'Untitled Note',
          content,
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    });

    setDocs(updated);
    localStorage.setItem('prologue-docs', JSON.stringify(updated));
  };

  // Autosave triggers when title or content shifts
  useEffect(() => {
    if (selectedDocId) {
      const timer = setTimeout(saveCurrentDoc, 1500);
      return () => clearTimeout(timer);
    }
  }, [title, content]);

  const createNewDoc = () => {
    const newDoc: Document = {
      id: Date.now(),
      title: 'New Workspace Document',
      content: 'Start writing your team guidelines documentation here...',
      updatedAt: new Date().toISOString()
    };
    
    const updated = [newDoc, ...docs];
    setDocs(updated);
    selectDoc(newDoc);
    localStorage.setItem('prologue-docs', JSON.stringify(updated));
  };

  const deleteDoc = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    localStorage.setItem('prologue-docs', JSON.stringify(updated));

    if (selectedDocId === id) {
      if (updated.length > 0) {
        selectDoc(updated[0]);
      } else {
        setSelectedDocId(null);
        setTitle('');
        setContent('');
      }
    }
  };

  const handleExportText = () => {
    if (!title) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}.txt`;
    link.click();
  };

  return (
    <div className="space-y-6 select-none h-[calc(100vh-100px)] flex flex-col">
      {/* Title Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            Workspace Docs
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Draft, edit, and export text documentation guidelines for project teams.
          </p>
        </div>

        <button
          onClick={createNewDoc}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" /> New Document
        </button>
      </div>

      {/* Docs layout */}
      <div className="flex-1 glass-panel border border-slate-200/50 dark:border-white/5 flex overflow-hidden min-h-0">
        
        {/* Left Side: Documents list */}
        <div className="w-64 border-r border-slate-200/30 dark:border-white/5 flex flex-col flex-shrink-0 bg-slate-500/5">
          <div className="h-12 border-b border-slate-200/30 dark:border-white/5 px-4 flex items-center flex-shrink-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">My Documentation</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 pr-1">
            {docs.map(d => {
              const isActive = selectedDocId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => selectDoc(d)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow shadow-blue-500/15'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{d.title}</span>
                  </div>
                  <button
                    onClick={(e) => deleteDoc(d.id, e)}
                    className={`p-0.5 rounded ${isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Document Editor */}
        <div className="flex-1 flex flex-col overflow-hidden relative p-6 space-y-4">
          {selectedDocId ? (
            <>
              {/* Document Header Controls */}
              <div className="flex items-center justify-between border-b border-slate-200/30 dark:border-white/5 pb-3 flex-shrink-0">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-transparent border-none outline-none text-md font-black text-slate-800 dark:text-white placeholder-slate-400 flex-1"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportText}
                    className="p-2 border border-slate-200/50 dark:border-white/5 rounded-xl hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                    title="Export as txt file"
                  >
                    <Download className="w-3.5 h-3.5" /> Export .txt
                  </button>
                </div>
              </div>

              {/* Text Editor area */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing your markdown or standard notes text here..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 resize-none overflow-y-auto leading-relaxed"
              ></textarea>

              {/* Footer indicator */}
              <div className="text-[9px] font-bold text-slate-400 border-t border-slate-200/30 dark:border-white/5 pt-2 flex items-center justify-between flex-shrink-0">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> Document autosaved
                </span>
                <span>Prologue Document Workspace</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-sm font-bold gap-3">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700" />
              Create a document to start writing team notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
