import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  RotateCw,
  Expand,
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';

interface PremiumPdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName?: string;
  fileSize?: string;
  version?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  isVerified?: boolean;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export default function PremiumPdfViewerModal({
  isOpen,
  onClose,
  pdfUrl,
  fileName = 'Task_Deliverable.pdf',
  fileSize = '2.4 MB',
  version = 'Version 1',
  uploadedBy,
  uploadedAt,
  isVerified = false,
}: PremiumPdfViewerModalProps) {
  // Lock background scroll when PDF Viewer is active
  useScrollLock(isOpen);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'native'>('canvas');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFullscreen) {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage(p => Math.min(totalPages, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage(p => Math.max(1, p - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalPages, isFullscreen, onClose]);

  // Load PDF.js library dynamically from reliable CDN with timeout & interval detection
  const ensurePdfJsLoaded = useCallback(async (): Promise<any> => {
    if (window.pdfjsLib) {
      return window.pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('PDF.js loading timed out, using native mode'));
        }
      }, 2500);

      // Fast check if already loaded
      const checkInterval = setInterval(() => {
        if (window.pdfjsLib && !settled) {
          settled = true;
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          try {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          } catch {}
          resolve(window.pdfjsLib);
        }
      }, 50);

      const existingScript = document.getElementById('pdfjs-cdn-script') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          if (!settled && window.pdfjsLib) {
            settled = true;
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            try {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            } catch {}
            resolve(window.pdfjsLib);
          }
        });
        existingScript.addEventListener('error', () => {
          if (!settled) {
            settled = true;
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            reject(new Error('Failed to load PDF engine'));
          }
        });
        return;
      }

      const script = document.createElement('script');
      script.id = 'pdfjs-cdn-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        if (!settled && window.pdfjsLib) {
          settled = true;
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          try {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          } catch {}
          resolve(window.pdfjsLib);
        }
      };
      script.onerror = () => {
        if (!settled) {
          settled = true;
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          reject(new Error('Network error loading PDF viewer library'));
        }
      };
      document.head.appendChild(script);
    });
  }, []);

  // Initialize and load PDF document
  useEffect(() => {
    if (!isOpen || !pdfUrl) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadDocument = async () => {
      try {
        const pdfjs = await Promise.race([
          ensurePdfJsLoaded(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('PDF.js engine timeout')), 2500))
        ]);

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await Promise.race([
          loadingTask.promise,
          new Promise((_, rej) => setTimeout(() => rej(new Error('Document stream timeout')), 3500))
        ]);
        if (!isMounted) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages || 1);
        setViewMode('canvas');
        setLoading(false);
      } catch (err: any) {
        console.warn('PDF.js canvas rendering notice, using high-performance native browser PDF viewer:', err);
        if (!isMounted) return;
        setLoading(false);
        // Fallback gracefully and immediately to native browser/webview viewMode
        setViewMode('native');
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isOpen, pdfUrl, ensurePdfJsLoaded]);

  // Render current page onto Canvas with High DPI resolution
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || viewMode !== 'canvas') return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale, rotation });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Canvas render error, showing embedded view:', err);
      }
    }
  }, [pdfDoc, currentPage, scale, rotation, viewMode]);

  useEffect(() => {
    if (!loading && pdfDoc) {
      renderCurrentPage();
    }
  }, [loading, pdfDoc, currentPage, scale, rotation, renderCurrentPage]);

  // Fit to container width
  const handleFitToWidth = () => {
    if (!pdfDoc || !containerRef.current) return;
    pdfDoc.getPage(currentPage).then((page: any) => {
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      const availableWidth = containerRef.current?.clientWidth
        ? containerRef.current.clientWidth - 48
        : 600;
      const newScale = Math.max(0.5, Math.min(2.5, availableWidth / unscaledViewport.width));
      setScale(parseFloat(newScale.toFixed(2)));
    });
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Direct Download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName || 'task-evidence.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open in New Tab
  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 select-none touch-none overscroll-contain">
      {/* Theme-Adaptive Blurred Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-950/80 backdrop-blur-lg cursor-pointer"
        aria-hidden="true"
      />

      {/* Main Responsive Viewer Dialog */}
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-white dark:bg-[#0e131f] border border-slate-300 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] dark:shadow-2xl overflow-hidden flex flex-col my-auto text-slate-900 dark:text-white ring-1 ring-black/5 dark:ring-white/5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900/90 dark:via-slate-900/90 dark:to-slate-900/90 backdrop-blur-md">
          {/* File Title & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-500 shrink-0 shadow-sm">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {fileName}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 uppercase tracking-wider shrink-0 hidden sm:inline-block">
                  {version}
                </span>
                {isVerified && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Approved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-2 mt-0.5">
                <span>{fileSize}</span>
                {uploadedBy && (
                  <>
                    <span>•</span>
                    <span>Uploaded by {uploadedBy}</span>
                  </>
                )}
                {uploadedAt && (
                  <>
                    <span>•</span>
                    <span>{new Date(uploadedAt).toLocaleDateString()}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer hidden sm:flex"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer hidden md:flex"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close viewer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Responsive Controls Toolbar */}
        <div className="px-3 sm:px-6 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-50 dark:bg-slate-900/50 text-xs">
          {/* Page Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px] whitespace-nowrap px-1">
              Page <strong className="text-blue-600 dark:text-blue-400">{currentPage}</strong> of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom & Display Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={scale <= 0.6 || loading}
              onClick={() => setScale(s => Math.max(0.5, parseFloat((s - 0.2).toFixed(2))))}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setScale(1.0)}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-[10px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer min-w-[48px] text-center"
              title="Reset Zoom to 100%"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              type="button"
              disabled={scale >= 2.5 || loading}
              onClick={() => setScale(s => Math.min(2.5, parseFloat((s + 0.2).toFixed(2))))}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleFitToWidth}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] hover:bg-slate-50 cursor-pointer hidden sm:flex items-center gap-1"
              title="Fit Document to Viewport Width"
            >
              <Expand className="w-3 h-3" /> Fit
            </button>

            <button
              type="button"
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* View Mode Switcher */}
            <button
              type="button"
              onClick={() => setViewMode(m => m === 'canvas' ? 'native' : 'canvas')}
              className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'native'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle between Canvas Render and Native Browser Viewer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{viewMode === 'canvas' ? 'Browser View' : 'Canvas View'}</span>
            </button>
          </div>
        </div>

        {/* Document Content Viewport */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#07090e] dark:to-[#0a0d14] p-3 sm:p-6 flex items-start justify-center touch-pan-y overscroll-contain select-auto relative min-h-0"
        >
          {loading ? (
            /* Loading State */
            <div className="m-auto flex flex-col items-center justify-center p-8 space-y-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-bold">Rendering Document...</p>
              <p className="text-[11px] text-slate-400 font-medium">Preparing crisp PDF pages for high-definition display</p>
            </div>
          ) : viewMode === 'canvas' ? (
            /* Canvas PDF Page Display */
            <div className="shadow-[0_8px_40px_-8px_rgba(0,0,0,0.2)] dark:shadow-2xl rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700/80 bg-white transition-all my-auto ring-1 ring-black/5 dark:ring-transparent">
              <canvas ref={canvasRef} className="block max-w-none" />
            </div>
          ) : (
            /* Native Embedded PDF View (Robust object + iframe) */
            <div className="w-full h-full min-h-[520px] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white flex flex-col">
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full flex-1 min-h-[520px]"
              >
                <iframe
                  src={`${pdfUrl}#page=${currentPage}&zoom=${Math.round(scale * 100)}`}
                  title={fileName}
                  className="w-full h-full border-none min-h-[520px]"
                />
              </object>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 space-y-3 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <h4 className="text-sm font-black text-white">{error}</h4>
              <p className="text-xs text-slate-400 max-w-md">
                Unable to load document in canvas mode. You can open it in a new window or download it directly.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Download File
                </button>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  Open in New Window
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info Strip */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900/90 dark:via-slate-900/90 dark:to-slate-900/90 shrink-0">
          <span className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">End-to-End Enterprise PDF Verified</span>
          </span>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 hidden sm:inline">Use arrow keys or toolbar to navigate</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
