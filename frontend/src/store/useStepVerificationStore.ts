import { create } from 'zustand';

export type StepStatus =
  | 'LOCKED'
  | 'IN_PROGRESS'
  | 'SUBMITTED_FOR_REVIEW'
  | 'PENDING_APPROVAL'
  | 'CHANGES_REQUESTED'
  | 'APPROVED_COMPLETED'
  | 'REJECTED';

export interface StepEvidence {
  description: string;
  files?: { name: string; url: string; size?: string }[];
  links?: string[];
  codeReferences?: string[];
  submittedAt: string;
  submittedBy: { id: number; name: string };
}

export interface TaskStep {
  id: number;
  taskId: number;
  stepNumber: number;
  title: string;
  objective: string;
  expectedOutput: string;
  deadline: string;
  completionCriteria: string[];
  status: StepStatus;
  evidence?: StepEvidence;
  reviewerNotes?: string;
  approvedAt?: string;
  approvedBy?: { id: number; name: string };
  rejectedAt?: string;
  changesRequestedAt?: string;
}

export interface StepAuditLog {
  id: number;
  taskId: number;
  stepId?: number;
  actorId: number;
  actorName: string;
  actorRole: string;
  action: 'STEP_STARTED' | 'WORK_SUBMITTED' | 'WORK_RESUBMITTED' | 'STEP_APPROVED' | 'CHANGES_REQUESTED' | 'STEP_REJECTED' | 'NEXT_STEP_UNLOCKED';
  details: string;
  timestamp: string;
}

export interface StepNotification {
  id: number;
  type: 'STEP_SUBMITTED' | 'APPROVAL_REQUIRED' | 'STEP_APPROVED' | 'CHANGES_REQUESTED' | 'STEP_REJECTED' | 'NEXT_STEP_UNLOCKED' | 'DEADLINE_ALERT';
  title: string;
  message: string;
  taskId: number;
  stepId?: number;
  recipientRole: 'ROLE_EMPLOYEE' | 'ROLE_MANAGER' | 'ROLE_ADMIN' | 'ALL';
  createdAt: string;
  read: boolean;
}

interface StepVerificationState {
  activeTab: 'all' | 'pending' | 'changes' | 'approved' | 'audit';
  selectedTaskId: number | null;
  selectedStep: TaskStep | null;
  isSubmitModalOpen: boolean;
  isVerifyModalOpen: boolean;

  setActiveTab: (tab: 'all' | 'pending' | 'changes' | 'approved' | 'audit') => void;
  setSelectedTaskId: (id: number | null) => void;
  setSelectedStep: (step: TaskStep | null) => void;
  setIsSubmitModalOpen: (open: boolean) => void;
  setIsVerifyModalOpen: (open: boolean) => void;

  openSubmitModal: (step: TaskStep) => void;
  openVerifyModal: (step: TaskStep) => void;
  closeModals: () => void;
}

export const useStepVerificationStore = create<StepVerificationState>((set) => ({
  activeTab: 'all',
  selectedTaskId: null,
  selectedStep: null,
  isSubmitModalOpen: false,
  isVerifyModalOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setSelectedStep: (step) => set({ selectedStep: step }),
  setIsSubmitModalOpen: (open) => set({ isSubmitModalOpen: open }),
  setIsVerifyModalOpen: (open) => set({ isVerifyModalOpen: open }),

  openSubmitModal: (step) =>
    set({
      selectedStep: step,
      selectedTaskId: step.taskId,
      isSubmitModalOpen: true,
      isVerifyModalOpen: false,
    }),

  openVerifyModal: (step) =>
    set({
      selectedStep: step,
      selectedTaskId: step.taskId,
      isVerifyModalOpen: true,
      isSubmitModalOpen: false,
    }),

  closeModals: () =>
    set({
      isSubmitModalOpen: false,
      isVerifyModalOpen: false,
      selectedStep: null,
    }),
}));
