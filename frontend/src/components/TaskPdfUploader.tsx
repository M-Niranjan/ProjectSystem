import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Eye, 
  RotateCcw, 
  Loader2, 
  History,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { 
  TaskPdfSubmission, 
  getStepSubmissions, 
  uploadTaskPdf, 
  formatFileSize 
} from '../services/taskPdfService';
import PremiumPdfViewerModal from './common/PremiumPdfViewerModal';

interface TaskPdfUploaderProps {
  taskId: number | string;
  stepId: number | string;
  stepNumber?: number;
  stepTitle?: string;
  canUpload?: boolean;
  onUploadSuccess?: (submission: TaskPdfSubmission) => void;
  className?: string;
}

export default function TaskPdfUploader({
  taskId,
  stepId,
  stepNumber,
  stepTitle,
  canUpload = true,
  onUploadSuccess,
  className = '',
}: TaskPdfUploaderProps) {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();

  const [submissions, setSubmissions] = useState<TaskPdfSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUploaderArea, setShowUploaderArea] = useState(false);

  // PDF Viewer Modal State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<TaskPdfSubmission | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load existing submissions
  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getStepSubmissions(taskId, stepId);
      setSubmissions(data);
      if (data.length === 0) {
        setShowUploaderArea(true);
      }
    } catch (err) {
      console.warn('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [taskId, stepId]);

  const latestSubmission = submissions.find(s => s.isLatest) || submissions[0];

  // Validate File
  const validateFile = (file: File): string | null => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return 'Please upload a valid PDF file. Only PDF documents are accepted.';
    }
    const maxBytes = 20 * 1024 * 1024; // 20 MB
    if (file.size > maxBytes) {
      return 'File size exceeds the allowed limit (20 MB maximum).';
    }
    if (file.size === 0) {
      return 'Selected file is empty. Please select a valid document.';
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      showToast(validationError, 'error');
      return;
    }
    setSelectedFile(file);
    setUploadProgress(0);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload || uploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canUpload || uploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Execute Upload
  const handleExecuteUpload = async () => {
    if (!selectedFile) return;

    if (!user) {
      showToast('You must be logged in to upload task evidence.', 'error');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setUploadProgress(10);

    try {
      const submission = await uploadTaskPdf(
        taskId,
        stepId,
        selectedFile,
        {
          id: user.id,
          uid: (user as any).uid || String(user.id),
          name: user.name,
          email: user.email,
        },
        (percent) => {
          setUploadProgress(Math.max(10, percent));
        }
      );

      setUploadProgress(100);
      showToast(`Successfully uploaded ${selectedFile.name} (${submission.version})!`, 'success');
      setSelectedFile(null);
      setShowUploaderArea(false);
      await loadSubmissions();

      if (onUploadSuccess) {
        onUploadSuccess(submission);
      }
    } catch (err: any) {
      console.error('Task PDF upload error:', err);
      const msg = err.message || 'Unable to upload the document. Please try again.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenViewer = (sub: TaskPdfSubmission) => {
    setViewingSubmission(sub);
    setViewerOpen(true);
  };

  return (
    <div className={`space-y-4 select-none ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {/* Header section with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Task PDF Deliverable Evidence
          </h4>
        </div>

        {latestSubmission && (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 uppercase tracking-wider">
            {submissions.length} Version{submissions.length > 1 ? 's' : ''} Uploaded
          </span>
        )}
      </div>

      {/* Error Message Box */}
      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. LATEST UPLOADED DOCUMENT CARD (When submission exists and uploader area is not toggled) */}
      {latestSubmission && !showUploaderArea && (
        <div className="p-4 sm:p-5 bg-gradient-to-br from-white via-white to-emerald-50/30 dark:from-[#0e131f]/85 dark:via-[#0e131f]/85 dark:to-[#0e131f]/85 border border-emerald-300 dark:border-emerald-500/20 rounded-2xl shadow-[0_2px_12px_-2px_rgba(16,185,129,0.12)] dark:shadow-sm hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.18)] dark:hover:shadow-md transition-all space-y-4 ring-1 ring-emerald-500/10 dark:ring-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-500 shrink-0 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {latestSubmission.fileName}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 uppercase tracking-wider shrink-0">
                    LATEST • {latestSubmission.version}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">
                  {latestSubmission.formattedSize || formatFileSize(latestSubmission.fileSize)} • Uploaded{' '}
                  {new Date(latestSubmission.uploadedAt).toLocaleDateString()} by{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{latestSubmission.employeeName}</strong>
                </p>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleOpenViewer(latestSubmission)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> View PDF
              </button>

              {canUpload && (
                <button
                  type="button"
                  onClick={() => setShowUploaderArea(true)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                  title="Upload a new version of this deliverable"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Replace PDF
                </button>
              )}
            </div>
          </div>

          {/* Version History Expandable Strip (If multiple versions exist) */}
          {submissions.length > 1 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                <History className="w-3 h-3" /> Version History ({submissions.length} Revisions)
              </span>
              <div className="flex flex-wrap gap-2">
                {submissions.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleOpenViewer(sub)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      sub.isLatest
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <span>{sub.version}</span>
                    <span className="opacity-60">({new Date(sub.uploadedAt).toLocaleDateString()})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. DRAG-AND-DROP FILE UPLOAD ZONE (When no submission exists OR employee clicked "Replace PDF") */}
      {(showUploaderArea || !latestSubmission) && canUpload && (
        <div className="space-y-3">
          {latestSubmission && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">
                Uploading new version ({`Version ${submissions.length + 1}`})
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowUploaderArea(false);
                  setSelectedFile(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cancel Replace
              </button>
            </div>
          )}

          {!selectedFile ? (
            /* Drag and drop target */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 scale-[1.01] shadow-[0_0_20px_-4px_rgba(59,130,246,0.3)]'
                  : 'border-slate-300 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500/70 bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-white/[0.02] dark:to-white/[0.01]'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <UploadCloud className="w-6 h-6 stroke-[2]" />
              </div>

              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Drag & drop your Task PDF here
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  or click to browse from your device
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/15 cursor-pointer transition-all"
              >
                Choose PDF
              </button>

              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">
                PDF Documents Only • Max 20 MB
              </span>
            </div>
          ) : (
            /* Selected File Preview & Upload Confirmation */
            <div className="p-4 sm:p-5 bg-white dark:bg-[#0e131f]/90 border border-blue-300 dark:border-blue-500/30 rounded-2xl shadow-sm ring-1 ring-blue-500/10 dark:ring-transparent space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-500 shrink-0 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold truncate">
                      {formatFileSize(selectedFile.size)} • Ready to upload
                    </p>
                  </div>
                </div>

                {!uploading && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
                    title="Remove selected file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Upload Progress Bar (when uploading) */}
              {uploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-blue-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading document to secure storage...
                    </span>
                    <span className="text-slate-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setSelectedFile(null)}
                  className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleExecuteUpload}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      Confirm & Upload PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. RESPONSIVE PDF VIEWER MODAL */}
      {viewingSubmission && (
        <PremiumPdfViewerModal
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setViewingSubmission(null);
          }}
          pdfUrl={viewingSubmission.downloadUrl}
          fileName={viewingSubmission.fileName}
          fileSize={viewingSubmission.formattedSize || formatFileSize(viewingSubmission.fileSize)}
          version={viewingSubmission.version}
          uploadedBy={viewingSubmission.employeeName}
          uploadedAt={viewingSubmission.uploadedAt}
          isVerified={viewingSubmission.status === 'approved'}
        />
      )}
    </div>
  );
}
