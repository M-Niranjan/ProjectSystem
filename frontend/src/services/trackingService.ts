import api from './api';
import { WorkloadLevel, BlockerItem, ActivityEvent, EmployeeProfileData } from '../store/useTrackingStore';

// Initial mock blockers database to persist reported blockers
let MOCK_BLOCKERS: BlockerItem[] = [];

let MOCK_ACTIVITIES: ActivityEvent[] = [];

/**
 * Calculate workload level based on active tasks and deadline pressure
 */
export function calculateWorkloadLevel(activeTasksCount: number, overdueCount: number): {
  level: WorkloadLevel;
  badgeColor: string;
  warning?: string;
} {
  if (activeTasksCount >= 4 || overdueCount >= 2) {
    return {
      level: 'OVERLOADED',
      badgeColor: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400',
      warning: `⚠️ High Workload Risk: ${activeTasksCount} active tasks & ${overdueCount} overdue item(s)`,
    };
  } else if (activeTasksCount === 3 || (activeTasksCount >= 2 && overdueCount === 1)) {
    return {
      level: 'HIGH',
      badgeColor: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400',
      warning: activeTasksCount >= 3 ? '⚡ At Capacity: 3 active tasks assigned' : undefined,
    };
  } else if (activeTasksCount >= 1) {
    return {
      level: 'BALANCED',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
    };
  }
  return {
    level: 'LOW',
    badgeColor: 'bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400',
  };
}

/**
 * Fetch all work tracking data (teammates, tasks, blockers, activities)
 */
export async function getTrackingOverviewData() {
  try {
    const [teamsRes, tasksRes, projectsRes] = await Promise.all([
      api.get('/api/teams').catch(() => ({ data: [] })),
      api.get('/api/tasks').catch(() => ({ data: [] })),
      api.get('/api/projects').catch(() => ({ data: [] })),
    ]);

    let teammates = (teamsRes.data || []).filter(
      (u: any) => u.role !== 'ROLE_ADMIN' && !u.role?.includes('ADMIN')
    );

    let tasks = tasksRes.data || [];
    let projects = projectsRes.data || [];

    // Map employees to tracking metrics
    const employeeProfiles: EmployeeProfileData[] = teammates.map((emp: any) => {
      const assignedTasks = tasks.filter((t: any) => t.assignee && (t.assignee.id == emp.id || t.assignee.name === emp.name));
      const completedTasks = assignedTasks.filter((t: any) => t.status === 'COMPLETED');
      const inProgressTasks = assignedTasks.filter((t: any) =>
        ['TO_DO', 'IN_PROGRESS', 'TESTING', 'REVIEW', 'CODE_REVIEW', 'ACCEPTED'].includes(t.status)
      );

      // Overdue tasks calculation
      const now = new Date();
      const overdueTasks = assignedTasks.filter((t: any) => {
        if (t.status === 'COMPLETED') return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now;
      });

      const total = assignedTasks.length;
      const completionRate = total > 0 ? Math.round((completedTasks.length / total) * 100) : 100;
      const workloadInfo = calculateWorkloadLevel(inProgressTasks.length, overdueTasks.length);

      const empBlockers = MOCK_BLOCKERS.filter((b) => b.reporterId == emp.id || b.reporterName === emp.name);
      const empActivities = MOCK_ACTIVITIES.filter((a) => a.actorId == emp.id || a.actorName === emp.name);

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        designation: emp.designation || emp.role?.replace('ROLE_', '') || 'Software Engineer',
        department: emp.department || 'Engineering',
        profilePhoto: emp.profilePhoto,
        assignedTasksCount: total,
        completedTasksCount: completedTasks.length,
        inProgressTasksCount: inProgressTasks.length,
        overdueTasksCount: overdueTasks.length,
        completionRate,
        workloadLevel: workloadInfo.level,
        currentProject: emp.currentProject || projects[0]?.name || 'Hospital Management System',
        currentStatus: emp.currentStatus || 'ONLINE',
        warningMessage: workloadInfo.warning,
        tasksList: assignedTasks,
        blockersList: empBlockers,
        recentActivity: empActivities,
      };
    });

    return {
      employees: employeeProfiles,
      tasks,
      projects,
      blockers: MOCK_BLOCKERS,
      activities: MOCK_ACTIVITIES,
    };
  } catch (err) {
    console.error('Error fetching tracking overview data', err);
    return {
      employees: [],
      tasks: [],
      projects: [],
      blockers: MOCK_BLOCKERS,
    };
  }
}

export type { EmployeeProfileData };

export async function getEmployeeProfileById(id: number | string): Promise<EmployeeProfileData | null> {
  try {
    const overview = await getTrackingOverviewData();
    const targetIdStr = String(id).trim().toLowerCase();

    let emp = (overview.employees || []).find(
      (e) => String(e.id).toLowerCase() === targetIdStr || e.name.toLowerCase() === targetIdStr
    );

    // Fallback search if not found directly in overview.employees
    if (!emp) {
      const defaultEmps: Record<string, Partial<EmployeeProfileData>> = {
        '1001': { id: 1001, name: 'Ramesh', designation: 'Software Developer', department: 'Engineering', currentProject: 'Prologue SaaS Dashboard' },
        '1002': { id: 1002, name: 'Rahul', designation: 'Frontend Developer', department: 'Web Engineering', currentProject: 'Hospital Management System' },
        '1003': { id: 1003, name: 'Manju', designation: 'Backend Developer', department: 'Engineering', currentProject: 'Workflow Integration Suite' },
        '1004': { id: 1004, name: 'Vinay', designation: 'QA Developer', department: 'Quality Assurance', currentProject: 'Hospital Management System' },
      };

      const fallbackInfo = defaultEmps[targetIdStr];
      if (fallbackInfo) {
        const assignedTasks = (overview.tasks || []).filter(
          (t: any) => t.assignee && (String(t.assignee.id) === targetIdStr || t.assignee.name === fallbackInfo.name)
        );
        const completedTasks = assignedTasks.filter((t: any) => t.status === 'COMPLETED');
        const inProgressTasks = assignedTasks.filter((t: any) => t.status !== 'COMPLETED');
        const overdueTasks = assignedTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED');

        emp = {
          id: fallbackInfo.id || Number(id),
          name: fallbackInfo.name || 'Employee',
          role: 'ROLE_EMPLOYEE',
          designation: fallbackInfo.designation || 'Software Engineer',
          department: fallbackInfo.department || 'Engineering',
          profilePhoto: undefined,
          assignedTasksCount: assignedTasks.length,
          completedTasksCount: completedTasks.length,
          inProgressTasksCount: inProgressTasks.length,
          overdueTasksCount: overdueTasks.length,
          completionRate: assignedTasks.length ? Math.round((completedTasks.length / assignedTasks.length) * 100) : 100,
          workloadLevel: 'BALANCED',
          currentProject: fallbackInfo.currentProject || 'Hospital Management System',
          currentStatus: 'ONLINE',
          tasksList: assignedTasks,
          blockersList: (overview.blockers || []).filter((b: any) => String(b.reporterId) === targetIdStr || b.reporterName === fallbackInfo.name),
          recentActivity: (overview.activities || []).filter((a: any) => String(a.actorId) === targetIdStr || a.actorName === fallbackInfo.name),
        };
      }
    }

    if (emp) {
      return {
        ...emp,
        tasksList: emp.tasksList || [],
        blockersList: emp.blockersList || [],
        recentActivity: emp.recentActivity || [],
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching employee profile by id:', err);
    return null;
  }
}

/**
 * Report a new Blocker
 */
export async function reportBlocker(blockerData: {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  taskId?: number;
  reporterId: number;
  reporterName: string;
}): Promise<BlockerItem> {
  const newBlocker: BlockerItem = {
    id: Date.now(),
    title: blockerData.title,
    description: blockerData.description,
    priority: blockerData.priority,
    status: 'ACTIVE',
    taskId: blockerData.taskId,
    reporterId: blockerData.reporterId,
    reporterName: blockerData.reporterName,
    createdAt: new Date().toISOString(),
  };

  MOCK_BLOCKERS.unshift(newBlocker);

  // Add activity event
  const newActivity: ActivityEvent = {
    id: Date.now(),
    type: 'BLOCKER_REPORTED',
    title: `Blocker Reported: ${newBlocker.title}`,
    description: `${blockerData.reporterName} reported a ${blockerData.priority} priority blocker.`,
    actorId: blockerData.reporterId,
    actorName: blockerData.reporterName,
    timestamp: new Date().toISOString(),
    taskId: blockerData.taskId,
  };
  MOCK_ACTIVITIES.unshift(newActivity);

  return newBlocker;
}

/**
 * Resolve a Blocker
 */
export async function resolveBlocker(blockerId: number, notes?: string): Promise<BlockerItem | null> {
  const blocker = MOCK_BLOCKERS.find((b) => b.id === blockerId);
  if (!blocker) return null;

  blocker.status = 'RESOLVED';
  blocker.resolvedAt = new Date().toISOString();
  blocker.resolutionNotes = notes || 'Resolved by Team Leader.';

  // Add activity event
  const newActivity: ActivityEvent = {
    id: Date.now(),
    type: 'BLOCKER_RESOLVED',
    title: `Blocker Resolved: ${blocker.title}`,
    description: `Team Leader resolved blocker: "${blocker.title}"`,
    actorId: 1001,
    actorName: 'Team Leader',
    timestamp: new Date().toISOString(),
    taskId: blocker.taskId,
  };
  MOCK_ACTIVITIES.unshift(newActivity);

  return blocker;
}
