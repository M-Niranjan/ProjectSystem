import { create } from 'zustand';

export type TrackingTab = 'dashboard' | 'comparison' | 'blockers' | 'activity';
export type WorkloadLevel = 'LOW' | 'BALANCED' | 'HIGH' | 'OVERLOADED';

export interface BlockerItem {
  id: number;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED';
  taskId?: number;
  taskTitle?: string;
  reporterId: number;
  reporterName: string;
  reporterPhoto?: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface ActivityEvent {
  id: number;
  type: 'TASK_ASSIGNED' | 'TASK_STARTED' | 'STATUS_CHANGED' | 'TASK_COMPLETED' | 'DEADLINE_APPROACHING' | 'DEADLINE_MISSED' | 'COMMENT_ADDED' | 'BLOCKER_REPORTED' | 'BLOCKER_RESOLVED' | 'MILESTONE_COMPLETED';
  title: string;
  description: string;
  actorId: number;
  actorName: string;
  actorPhoto?: string;
  timestamp: string;
  taskId?: number;
  projectId?: number;
}

export interface EmployeeProfileData {
  id: number;
  name: string;
  role: string;
  designation: string;
  department: string;
  profilePhoto?: string;
  assignedTasksCount: number;
  completedTasksCount: number;
  inProgressTasksCount: number;
  overdueTasksCount: number;
  completionRate: number;
  workloadLevel: WorkloadLevel;
  currentProject: string;
  currentStatus: 'ONLINE' | 'OFFLINE' | 'IN_MEETING' | 'BUSY';
  warningMessage?: string;
  tasksList: any[];
  blockersList: BlockerItem[];
  recentActivity: ActivityEvent[];
}

interface TrackingState {
  activeTab: TrackingTab;
  selectedEmployeeId: number | null;
  selectedProjectId: number | null;
  statusFilter: string;
  workloadFilter: string;
  dateRange: '7D' | '30D' | '90D' | 'ALL';
  selectedEmployeeProfile: EmployeeProfileData | null;
  isProfileModalOpen: boolean;
  isReportBlockerModalOpen: boolean;

  setActiveTab: (tab: TrackingTab) => void;
  setSelectedEmployeeId: (id: number | null) => void;
  setSelectedProjectId: (id: number | null) => void;
  setStatusFilter: (filter: string) => void;
  setWorkloadFilter: (filter: string) => void;
  setDateRange: (range: '7D' | '30D' | '90D' | 'ALL') => void;
  setSelectedEmployeeProfile: (profile: EmployeeProfileData | null) => void;
  setIsProfileModalOpen: (open: boolean) => void;
  setIsReportBlockerModalOpen: (open: boolean) => void;
  openEmployeeProfile: (profile: EmployeeProfileData) => void;
  closeEmployeeProfile: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  activeTab: 'dashboard',
  selectedEmployeeId: null,
  selectedProjectId: null,
  statusFilter: 'ALL',
  workloadFilter: 'ALL',
  dateRange: '30D',
  selectedEmployeeProfile: null,
  isProfileModalOpen: false,
  isReportBlockerModalOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedEmployeeId: (id) => set({ selectedEmployeeId: id }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setWorkloadFilter: (filter) => set({ workloadFilter: filter }),
  setDateRange: (range) => set({ dateRange: range }),
  setSelectedEmployeeProfile: (profile) => set({ selectedEmployeeProfile: profile }),
  setIsProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
  setIsReportBlockerModalOpen: (open) => set({ isReportBlockerModalOpen: open }),

  openEmployeeProfile: (profile) =>
    set({
      selectedEmployeeProfile: profile,
      selectedEmployeeId: profile.id,
      isProfileModalOpen: true,
    }),

  closeEmployeeProfile: () =>
    set({
      isProfileModalOpen: false,
      selectedEmployeeProfile: null,
    }),
}));
