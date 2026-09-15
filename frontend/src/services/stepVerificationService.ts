import api from './api';
import { dispatchNotificationAlert } from './notificationService';
import {
  TaskStep,
  StepStatus,
  StepEvidence,
  StepAuditLog,
  StepNotification,
} from '../store/useStepVerificationStore';

export type { TaskStep };

// Persistent Mock Steps Database
let MOCK_STEPS: Record<number, TaskStep[]> = {};

let MOCK_AUDIT_LOGS: StepAuditLog[] = [];

let MOCK_NOTIFICATIONS: StepNotification[] = [];

/**
 * Get or initialize steps for a task
 */
export function getTaskSteps(taskId: number): TaskStep[] {
  if (!MOCK_STEPS[taskId]) {
    MOCK_STEPS[taskId] = [
      {
        id: taskId * 10 + 1,
        taskId,
        stepNumber: 1,
        title: 'Step 1: Core Architecture & Requirements Alignment',
        objective: 'Define software requirements, data schemas, and API contracts.',
        expectedOutput: 'Documented architecture blueprint and schema specifications.',
        deadline: '2026-08-29',
        completionCriteria: ['Blueprint approved', 'Schema validated'],
        status: 'IN_PROGRESS'
      },
      {
        id: taskId * 10 + 2,
        taskId,
        stepNumber: 2,
        title: 'Step 2: Component Implementation & Integration',
        objective: 'Develop frontend components and backend service logic.',
        expectedOutput: 'Functional UI components integrated with API services.',
        deadline: '2026-09-02',
        completionCriteria: ['Components built', 'Unit tests passing'],
        status: 'LOCKED'
      },
      {
        id: taskId * 10 + 3,
        taskId,
        stepNumber: 3,
        title: 'Step 3: Verification, Testing & Final Delivery',
        objective: 'Execute E2E regression suite and verify acceptance criteria.',
        expectedOutput: 'Final deliverable sign-off certificate.',
        deadline: '2026-09-05',
        completionCriteria: ['E2E tests passing', 'Team Leader sign-off'],
        status: 'LOCKED'
      }
    ];
  }
  return MOCK_STEPS[taskId];
}

/**
 * Calculate Verified Progress % vs Self-Reported Progress %
 */
export function calculateStepProgress(steps: TaskStep[]): {
  verifiedProgress: number;
  selfReportedProgress: number;
  approvedCount: number;
  pendingCount: number;
  totalSteps: number;
} {
  const total = steps.length;
  if (total === 0) {
    return { verifiedProgress: 100, selfReportedProgress: 100, approvedCount: 0, pendingCount: 0, totalSteps: 0 };
  }

  const approvedCount = steps.filter((s) => s.status === 'APPROVED_COMPLETED').length;
  const pendingCount = steps.filter((s) => s.status === 'PENDING_APPROVAL' || s.status === 'SUBMITTED_FOR_REVIEW').length;

  const verifiedProgress = Math.round((approvedCount / total) * 100);
  const selfReportedProgress = Math.round(((approvedCount + pendingCount) / total) * 100);

  return {
    verifiedProgress,
    selfReportedProgress,
    approvedCount,
    pendingCount,
    totalSteps: total,
  };
}

/**
 * Employee submits work for a Step
 */
export async function submitStepWork(
  stepId: number,
  evidence: StepEvidence
): Promise<{ step: TaskStep; auditLog: StepAuditLog }> {
  let foundStep: TaskStep | undefined;
  for (const taskId in MOCK_STEPS) {
    const s = MOCK_STEPS[taskId].find((st) => st.id === stepId);
    if (s) {
      foundStep = s;
      break;
    }
  }

  if (!foundStep) {
    throw new Error('Step not found');
  }

  const isResubmission = foundStep.status === 'CHANGES_REQUESTED' || foundStep.status === 'REJECTED';
  foundStep.status = 'PENDING_APPROVAL';
  foundStep.evidence = evidence;

  const actionType = isResubmission ? 'WORK_RESUBMITTED' : 'WORK_SUBMITTED';

  // Log Audit Event
  const auditLog: StepAuditLog = {
    id: Date.now(),
    taskId: foundStep.taskId,
    stepId: foundStep.id,
    actorId: evidence.submittedBy.id,
    actorName: evidence.submittedBy.name,
    actorRole: 'ROLE_EMPLOYEE',
    action: actionType,
    details: `${isResubmission ? 'Resubmitted' : 'Submitted'} Step ${foundStep.stepNumber} (${foundStep.title}) for Team Leader verification.`,
    timestamp: new Date().toISOString()
  };
  MOCK_AUDIT_LOGS.unshift(auditLog);

  // Dispatch Notification
  MOCK_NOTIFICATIONS.unshift({
    id: Date.now(),
    type: 'APPROVAL_REQUIRED',
    title: `Verification Required: Step ${foundStep.stepNumber}`,
    message: `${evidence.submittedBy.name} submitted Step ${foundStep.stepNumber} (${foundStep.title}) for verification.`,
    taskId: foundStep.taskId,
    stepId: foundStep.id,
    recipientRole: 'ROLE_MANAGER',
    createdAt: new Date().toISOString(),
    read: false
  });

  return { step: foundStep, auditLog };
}

/**
 * Team Leader Review Action (Approve, Request Changes, Reject)
 */
export async function verifyStepWork(
  stepId: number,
  action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT',
  reviewer: { id: number; name: string },
  reviewerNotes?: string
): Promise<{ step: TaskStep; auditLog: StepAuditLog; unlockedStep?: TaskStep }> {
  let targetTaskId: number | undefined;
  let targetStepList: TaskStep[] | undefined;
  let stepIndex = -1;

  for (const taskId in MOCK_STEPS) {
    const index = MOCK_STEPS[taskId].findIndex((st) => st.id === stepId);
    if (index !== -1) {
      targetTaskId = parseInt(taskId);
      targetStepList = MOCK_STEPS[taskId];
      stepIndex = index;
      break;
    }
  }

  if (!targetStepList || stepIndex === -1) {
    throw new Error('Step not found');
  }

  const currentStep = targetStepList[stepIndex];
  currentStep.reviewerNotes = reviewerNotes || '';

  let auditAction: StepAuditLog['action'] = 'STEP_APPROVED';
  let unlockedStep: TaskStep | undefined;

  if (action === 'APPROVE') {
    currentStep.status = 'APPROVED_COMPLETED';
    currentStep.approvedAt = new Date().toISOString();
    currentStep.approvedBy = reviewer;
    auditAction = 'STEP_APPROVED';

    dispatchNotificationAlert({
      title: `Step ${currentStep.stepNumber} Approved by Team Leader`,
      message: `${reviewer.name} (Team Leader) approved Step ${currentStep.stepNumber}: "${currentStep.title}".${unlockedStep ? ` Step ${unlockedStep.stepNumber} is now unlocked!` : ''}`,
      type: 'STEP_APPROVED',
      recipientId: 'ALL'
    });

    // Unlock Next Sequential Step if available!
    if (stepIndex + 1 < targetStepList.length) {
      const nextStep = targetStepList[stepIndex + 1];
      if (nextStep.status === 'LOCKED') {
        nextStep.status = 'IN_PROGRESS';
        unlockedStep = nextStep;

        // Log Next Step Unlock Audit Event
        MOCK_AUDIT_LOGS.unshift({
          id: Date.now() + 1,
          taskId: currentStep.taskId,
          stepId: nextStep.id,
          actorId: reviewer.id,
          actorName: reviewer.name,
          actorRole: 'ROLE_MANAGER',
          action: 'NEXT_STEP_UNLOCKED',
          details: `Unlocked Step ${nextStep.stepNumber} (${nextStep.title}) automatically after Step ${currentStep.stepNumber} approval.`,
          timestamp: new Date().toISOString()
        });

        // Dispatch Next Step Unlocked Notification
        MOCK_NOTIFICATIONS.unshift({
          id: Date.now() + 2,
          type: 'NEXT_STEP_UNLOCKED',
          title: `Step ${nextStep.stepNumber} Unlocked!`,
          message: `Step ${nextStep.stepNumber} (${nextStep.title}) is now unlocked and available for work.`,
          taskId: currentStep.taskId,
          stepId: nextStep.id,
          recipientRole: 'ROLE_EMPLOYEE',
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }
  } else if (action === 'REQUEST_CHANGES') {
    currentStep.status = 'CHANGES_REQUESTED';
    currentStep.changesRequestedAt = new Date().toISOString();
    auditAction = 'CHANGES_REQUESTED';

    dispatchNotificationAlert({
      title: `Changes Requested on Step ${currentStep.stepNumber}`,
      message: `${reviewer.name} (Team Leader) requested revisions on Step ${currentStep.stepNumber}: "${currentStep.title}". Notes: "${reviewerNotes || 'Please review criteria'}"`,
      type: 'STEP_CHANGES_REQUESTED',
      recipientId: 'ALL'
    });

    MOCK_NOTIFICATIONS.unshift({
      id: Date.now(),
      type: 'CHANGES_REQUESTED',
      title: `Changes Requested on Step ${currentStep.stepNumber}`,
      message: `Team Leader requested revisions on Step ${currentStep.stepNumber}: "${reviewerNotes || 'Please review criteria'}"`,
      taskId: currentStep.taskId,
      stepId: currentStep.id,
      recipientRole: 'ROLE_EMPLOYEE',
      createdAt: new Date().toISOString(),
      read: false
    });
  } else {
    currentStep.status = 'REJECTED';
    currentStep.rejectedAt = new Date().toISOString();
    auditAction = 'STEP_REJECTED';

    dispatchNotificationAlert({
      title: `Step ${currentStep.stepNumber} Rejected by Team Leader`,
      message: `${reviewer.name} (Team Leader) rejected Step ${currentStep.stepNumber}: "${currentStep.title}". Revision required.`,
      type: 'STEP_CHANGES_REQUESTED',
      recipientId: 'ALL'
    });

    MOCK_NOTIFICATIONS.unshift({
      id: Date.now(),
      type: 'STEP_REJECTED',
      title: `Step ${currentStep.stepNumber} Rejected`,
      message: `Step ${currentStep.stepNumber} was rejected by Team Leader. Revision required.`,
      taskId: currentStep.taskId,
      stepId: currentStep.id,
      recipientRole: 'ROLE_EMPLOYEE',
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  // Audit Log
  const auditLog: StepAuditLog = {
    id: Date.now(),
    taskId: currentStep.taskId,
    stepId: currentStep.id,
    actorId: reviewer.id,
    actorName: reviewer.name,
    actorRole: 'ROLE_MANAGER',
    action: auditAction,
    details: `${reviewer.name} ${action.toLowerCase().replace('_', ' ')} Step ${currentStep.stepNumber} (${currentStep.title}). ${reviewerNotes ? `Notes: "${reviewerNotes}"` : ''}`,
    timestamp: new Date().toISOString()
  };
  MOCK_AUDIT_LOGS.unshift(auditLog);

  return { step: currentStep, auditLog, unlockedStep };
}

/**
 * Fetch all Audit Logs
 */
export function getStepAuditLogs(taskId?: number): StepAuditLog[] {
  if (taskId) {
    return MOCK_AUDIT_LOGS.filter((l) => l.taskId === taskId);
  }
  return MOCK_AUDIT_LOGS;
}

/**
 * Fetch Notifications
 */
export function getStepNotifications(userRole?: string): StepNotification[] {
  if (!userRole) return MOCK_NOTIFICATIONS;
  return MOCK_NOTIFICATIONS.filter(
    (n) => n.recipientRole === 'ALL' || n.recipientRole === userRole
  );
}
