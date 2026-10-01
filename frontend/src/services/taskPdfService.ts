import api from './api';
import { firebaseDb, firebaseAuth } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getTaskSteps } from './stepVerificationService';

export interface TaskPdfSubmission {
  id: string;
  taskId: number | string;
  stepId: number | string;
  stepNumber?: number;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  fileName: string;
  fileSize: number;
  formattedSize?: string;
  contentType: string;
  storagePath: string;
  downloadUrl: string;
  uploadedAt: string;
  status: 'submitted' | 'under_review' | 'approved' | 'changes_requested' | 'rejected';
  version: string;
  versionNumber: number;
  isLatest: boolean;
  reviewerNotes?: string;
  reviewedBy?: { id: string | number; name: string };
  reviewedAt?: string;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const STORAGE_KEY_PREFIX = 'task_pdf_submissions_';

/**
 * Get submissions for a task step from localStorage / Firestore fallback
 */
export async function getStepSubmissions(
  taskId: number | string,
  stepId: number | string
): Promise<TaskPdfSubmission[]> {
  const localKey = `${STORAGE_KEY_PREFIX}${taskId}_${stepId}`;
  
  // 1. Try Backend API first
  try {
    const res = await api.get(`/api/tasks/${taskId}/steps/${stepId}/submissions`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      localStorage.setItem(localKey, JSON.stringify(res.data));
      return res.data;
    }
  } catch (_apiErr) {
    // API failed, fallback to Firestore or local
  }

  // 2. Try Cloud Firestore
  try {
    if (firebaseDb) {
      const q = query(
        collection(firebaseDb, 'taskSubmissions'),
        where('taskId', '==', String(taskId)),
        where('stepId', '==', String(stepId))
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const results = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        })) as TaskPdfSubmission[];
        results.sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
        localStorage.setItem(localKey, JSON.stringify(results));
        return results;
      }
    }
  } catch (_fsErr) {
    console.warn('Firestore getStepSubmissions query warning:', _fsErr);
  }

  // 3. Fallback to localStorage
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  return [];
}

/**
 * Upload Task PDF evidence
 */
export async function uploadTaskPdf(
  taskId: number | string,
  stepId: number | string,
  file: File,
  currentUser: { id?: number | string; uid?: string; name?: string; email?: string },
  onProgress?: (percent: number) => void
): Promise<TaskPdfSubmission> {
  // Validate file type
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    throw new Error('Please upload a valid PDF file. Only PDF documents are accepted.');
  }

  // Validate file size (max 20MB)
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('File size exceeds the allowed limit (20 MB maximum).');
  }

  const existingSubmissions = await getStepSubmissions(taskId, stepId);
  const nextVersionNumber = existingSubmissions.length + 1;
  const versionLabel = `Version ${nextVersionNumber}`;
  const submissionId = `sub_${taskId}_${stepId}_${Date.now()}`;

  // 1. Prepare FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('taskId', String(taskId));
  formData.append('stepId', String(stepId));
  formData.append('version', versionLabel);

  let backendResponse: any = null;

  try {
    const res = await api.post(`/api/tasks/${taskId}/steps/${stepId}/upload-pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    backendResponse = res.data?.submission;
  } catch (apiErr: any) {
    console.warn('Backend PDF upload endpoint unreachable or returned error, using direct local/blob URL:', apiErr);
  }

  // Create local object URL for instant, zero-latency viewing
  const localBlobUrl = URL.createObjectURL(file);
  const downloadUrl = backendResponse?.downloadUrl || localBlobUrl;

  const newSubmission: TaskPdfSubmission = {
    id: backendResponse?.id || submissionId,
    taskId,
    stepId,
    employeeId: currentUser.uid || String(currentUser.id || 'employee'),
    employeeName: currentUser.name || currentUser.email?.split('@')[0] || 'Employee',
    employeeEmail: currentUser.email,
    fileName: file.name,
    fileSize: file.size,
    formattedSize: formatFileSize(file.size),
    contentType: 'application/pdf',
    storagePath: backendResponse?.storagePath || `uploads/${file.name}`,
    downloadUrl,
    uploadedAt: new Date().toISOString(),
    status: 'submitted',
    version: versionLabel,
    versionNumber: nextVersionNumber,
    isLatest: true,
  };

  // Update Firestore if available
  try {
    if (firebaseDb) {
      await setDoc(doc(firebaseDb, 'taskSubmissions', newSubmission.id), {
        ...newSubmission,
        uploadedAt: serverTimestamp(),
      });
    }
  } catch (fsErr) {
    console.warn('Direct Firestore setDoc warning:', fsErr);
  }

  // Save to localStorage
  const localKey = `${STORAGE_KEY_PREFIX}${taskId}_${stepId}`;
  const updatedList = [
    newSubmission,
    ...existingSubmissions.map(s => ({ ...s, isLatest: false }))
  ];
  localStorage.setItem(localKey, JSON.stringify(updatedList));

  // Sync with Mock Steps in stepVerificationService
  try {
    const steps = getTaskSteps(Number(taskId));
    const targetStep = steps.find(s => s.id === Number(stepId) || s.stepNumber === Number(stepId));
    if (targetStep) {
      targetStep.status = 'PENDING_APPROVAL';
      targetStep.evidence = {
        submittedAt: newSubmission.uploadedAt,
        submittedBy: {
          id: Number(currentUser.id || 1),
          name: currentUser.name || 'Employee',
        },
        description: `Uploaded task PDF evidence: ${file.name} (${versionLabel})`,
        attachments: [file.name],
      };
      const raw = localStorage.getItem('mock_verification_steps');
      const allMock = raw ? JSON.parse(raw) : {};
      allMock[Number(taskId)] = steps;
      localStorage.setItem('mock_verification_steps', JSON.stringify(allMock));
    }
  } catch (_stepSyncErr) {}

  return newSubmission;
}

/**
 * Team Leader Review Step Submission
 */
export async function reviewStepPdfSubmission(
  taskId: number | string,
  stepId: number | string,
  submissionId: string,
  action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT',
  reviewer: { id?: number | string; name?: string },
  notes?: string
): Promise<boolean> {
  const newStatus = action === 'APPROVE' ? 'approved' : action === 'REQUEST_CHANGES' ? 'changes_requested' : 'rejected';

  // 1. Try Backend API
  try {
    await api.post(`/api/tasks/${taskId}/steps/${stepId}/review`, {
      action,
      notes,
      submissionId,
    });
  } catch (_apiErr) {
    console.warn('Backend review endpoint warning:', _apiErr);
  }

  // 2. Update Firestore
  try {
    if (firebaseDb && submissionId) {
      await setDoc(doc(firebaseDb, 'taskSubmissions', submissionId), {
        status: newStatus,
        reviewerNotes: notes || '',
        reviewedBy: reviewer,
        reviewedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (_fsErr) {}

  // 3. Update localStorage
  const localKey = `${STORAGE_KEY_PREFIX}${taskId}_${stepId}`;
  try {
    const existing = await getStepSubmissions(taskId, stepId);
    const updated = existing.map(s => {
      if (s.id === submissionId || s.isLatest) {
        return {
          ...s,
          status: newStatus as any,
          reviewerNotes: notes,
          reviewedBy: reviewer as any,
          reviewedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch {}

  return true;
}
