import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Building2,
  KeyRound,
  Bell,
  Sliders,
  FileText,
  Shield,
  ShieldCheck,
  Link as LinkIcon,
  Palette,
  ScrollText,
  Check,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Globe,
  Calendar,
  Clock,
  DollarSign,
  Upload,
  Trash2,
  ExternalLink,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  Mail,
  Phone,
  Briefcase,
  IdCard,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Info,
  Layers,
  ArrowRight,
  ShieldAlert,
  HardDrive,
  Workflow,
  Search,
  RefreshCw,
  LogOut,
  FolderGit2,
  CheckSquare,
  Users,
  Settings as SettingsIcon,
  X,
  ArrowLeft,
  MoreVertical,
  Camera
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore, AccentColor, ThemeMode, ACCENT_PRESETS } from '../store/useUIStore';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatRoleName, normalizeRole } from '../services/authRoles';
import { resolveAvatar } from '../services/avatar';

// Settings Category ID Type
type SettingsCategoryId =
  | 'account'
  | 'workspace'
  | 'roles'
  | 'notifications'
  | 'workflow'
  | 'documents'
  | 'security'
  | 'integrations'
  | 'appearance'
  | 'system-audit';

interface SettingsCategoryCard {
  id: SettingsCategoryId;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgLight: string;
  iconBgDark: string;
  iconColorLight: string;
  iconColorDark: string;
}

const SETTINGS_CATEGORIES: SettingsCategoryCard[] = [
  {
    id: 'account',
    title: 'Account & Profile',
    subtitle: 'Personal details, credentials and password',
    icon: User,
    iconBgLight: 'bg-blue-50',
    iconBgDark: 'dark:bg-blue-500/15',
    iconColorLight: 'text-blue-600',
    iconColorDark: 'dark:text-blue-400',
  },
  {
    id: 'workspace',
    title: 'Workspace Configuration',
    subtitle: 'Organization identity and working hours',
    icon: Building2,
    iconBgLight: 'bg-teal-50',
    iconBgDark: 'dark:bg-teal-500/15',
    iconColorLight: 'text-teal-600',
    iconColorDark: 'dark:text-teal-400',
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    subtitle: 'Access control and permission matrix',
    icon: KeyRound,
    iconBgLight: 'bg-amber-50',
    iconBgDark: 'dark:bg-amber-500/15',
    iconColorLight: 'text-amber-600',
    iconColorDark: 'dark:text-amber-400',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'In-app, email and push alert preferences',
    icon: Bell,
    iconBgLight: 'bg-rose-50',
    iconBgDark: 'dark:bg-rose-500/15',
    iconColorLight: 'text-rose-600',
    iconColorDark: 'dark:text-rose-400',
  },
  {
    id: 'workflow',
    title: 'Workflow Rules',
    subtitle: 'Task stages, approvals and deadlines',
    icon: Sliders,
    iconBgLight: 'bg-indigo-50',
    iconBgDark: 'dark:bg-indigo-500/15',
    iconColorLight: 'text-indigo-600',
    iconColorDark: 'dark:text-indigo-400',
  },
  {
    id: 'documents',
    title: 'Document Preferences',
    subtitle: 'File limits, allowed formats and retention',
    icon: FileText,
    iconBgLight: 'bg-cyan-50',
    iconBgDark: 'dark:bg-cyan-500/15',
    iconColorLight: 'text-cyan-600',
    iconColorDark: 'dark:text-cyan-400',
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    subtitle: 'Two-factor auth and active sessions',
    icon: Shield,
    iconBgLight: 'bg-emerald-50',
    iconBgDark: 'dark:bg-emerald-500/15',
    iconColorLight: 'text-emerald-600',
    iconColorDark: 'dark:text-emerald-400',
  },
  {
    id: 'integrations',
    title: 'Connected Integrations',
    subtitle: 'Firebase, Slack, GitHub and Google',
    icon: LinkIcon,
    iconBgLight: 'bg-violet-50',
    iconBgDark: 'dark:bg-violet-500/15',
    iconColorLight: 'text-violet-600',
    iconColorDark: 'dark:text-violet-400',
  },
  {
    id: 'appearance',
    title: 'Appearance & Theme',
    subtitle: 'Light/Dark mode and accent colors',
    icon: Palette,
    iconBgLight: 'bg-purple-50',
    iconBgDark: 'dark:bg-purple-500/15',
    iconColorLight: 'text-purple-600',
    iconColorDark: 'dark:text-purple-400',
  },
  {
    id: 'system-audit',
    title: 'System & Audit Logs',
    subtitle: 'Maintenance mode and security trail',
    icon: ScrollText,
    iconBgLight: 'bg-slate-100',
    iconBgDark: 'dark:bg-white/10',
    iconColorLight: 'text-slate-700',
    iconColorDark: 'dark:text-slate-300',
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateProfile, activeOrganization, activeOrganizationId } = useAuthStore();
  const {
    darkMode,
    toggleTheme,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    showToast,
  } = useUIStore();

  const role = normalizeRole(user?.role);
  const isAdmin = role === 'ROLE_ADMIN';
  const isTeamLead = role === 'ROLE_MANAGER';
  const isEmployee = role === 'ROLE_EMPLOYEE';

  // Read initial category from query param if provided (e.g. /settings?tab=workflow)
  const initialCategory = (searchParams.get('tab') as SettingsCategoryId) || null;
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId | null>(initialCategory);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state with URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsCategoryId;
    if (tabParam && SETTINGS_CATEGORIES.some((c) => c.id === tabParam)) {
      setActiveCategory(tabParam);
    }
  }, [searchParams]);

  // Confirmation Modals State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'logout-devices' | 'reset-notifications' | 'maintenance' | 'unsaved';
    targetCategory?: SettingsCategoryId | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: 'logout-devices',
  });

  useScrollLock(confirmModal.isOpen);

  // Storage scope key
  const storageKey = `pms_settings_${activeOrganizationId || 'default'}`;

  // -------------------------------------------------------------
  // 1. ACCOUNT STATE
  // -------------------------------------------------------------
  const formatJoiningDate = (dateVal: any) => {
    if (!dateVal) return '15 Aug 2024';
    try {
      let d: Date;
      if (typeof dateVal === 'number') {
        d = new Date(dateVal);
      } else if (typeof dateVal === 'object' && dateVal?.seconds) {
        d = new Date(dateVal.seconds * 1000);
      } else if (typeof dateVal === 'object' && dateVal?._seconds) {
        d = new Date(dateVal._seconds * 1000);
      } else if (typeof dateVal === 'string') {
        d = new Date(dateVal);
      } else {
        return '15 Aug 2024';
      }
      if (isNaN(d.getTime())) return '15 Aug 2024';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '15 Aug 2024';
    }
  };

  const [profileName, setProfileName] = useState(user?.name || 'Vinay');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'vinay.teamlead@company.com');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '+1 (555) 234-5678');
  const [profileDesignation, setProfileDesignation] = useState(
    user?.designation || (isTeamLead ? 'Team Lead & Senior Engineer' : isAdmin ? 'System Administrator' : 'Software Engineer')
  );
  const [profileDepartment, setProfileDepartment] = useState(user?.department || 'Engineering');
  const employeeId = (user as any)?.employeeId || (user?.id ? `EMP-${user.id}` : (user?.uid ? `EMP-${user.uid}` : 'EMP-00124'));
  const joiningDate = formatJoiningDate(user?.createdAt);

  // Account Preferences
  const [defaultDashboard, setDefaultDashboard] = useState('Overview');
  const [defaultLanguage, setDefaultLanguage] = useState('English (US)');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('12-hour (AM/PM)');
  const [timeZone, setTimeZone] = useState('UTC');
  const [currency, setCurrency] = useState('USD ($)');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Active Sessions
  const [sessions, setSessions] = useState([
    {
      id: 'sess-1',
      device: 'Chrome on Windows 11',
      type: 'desktop',
      ip: '192.168.1.45',
      location: 'San Francisco, US',
      lastActive: 'Just now',
      isCurrent: true,
    },
    {
      id: 'sess-2',
      device: 'Safari on macOS Sonoma',
      type: 'desktop',
      ip: '172.56.21.9',
      location: 'San Francisco, US',
      lastActive: '2 hours ago',
      isCurrent: false,
    },
    {
      id: 'sess-3',
      device: 'TaskFlow App on Android 14 (Pixel 8)',
      type: 'mobile',
      ip: '166.137.8.12',
      location: 'San Jose, US',
      lastActive: 'Yesterday',
      isCurrent: false,
    },
  ]);

  // -------------------------------------------------------------
  // 2. WORKSPACE STATE
  // -------------------------------------------------------------
  const [workspaceName, setWorkspaceName] = useState(activeOrganization?.organizationName || 'Project System Workspace');
  const [workspaceCode] = useState(activeOrganization?.organizationCode || activeOrganization?.organizationId || 'WS-CORP-902');
  const [workspaceDesc, setWorkspaceDesc] = useState('Enterprise project workspace for engineering and product delivery.');
  const [companyName, setCompanyName] = useState(activeOrganization?.organizationName || 'Prologue Enterprise Systems Inc.');
  const [companyEmail, setCompanyEmail] = useState('workspace@company.com');
  const [contactNumber, setContactNumber] = useState('+1 (555) 019-2834');
  const [website, setWebsite] = useState('https://company.io');
  const [address, setAddress] = useState('100 Innovation Way, Suite 400, Tech Park');

  const [wsCountry, setWsCountry] = useState('United States');
  const [wsTimeZone, setWsTimeZone] = useState('UTC');
  const [wsCurrency, setWsCurrency] = useState('USD ($)');
  const [wsDateFormat, setWsDateFormat] = useState('YYYY-MM-DD');
  const [wsTimeFormat, setWsTimeFormat] = useState('12-hour (AM/PM)');

  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [workingHoursPerWeek, setWorkingHoursPerWeek] = useState('40');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('06:00 PM');
  const [breakDuration, setBreakDuration] = useState('60 mins');

  // -------------------------------------------------------------
  // 3. ROLES & PERMISSIONS STATE
  // -------------------------------------------------------------
  const [selectedRoleView, setSelectedRoleView] = useState<'ROLE_MANAGER' | 'ROLE_EMPLOYEE' | 'ROLE_ADMIN'>('ROLE_MANAGER');

  const initialPermissionMatrix = {
    Projects: {
      ROLE_ADMIN: { view: true, create: true, edit: true, delete: true, assign: true, approve: true, export: true, manage: true },
      ROLE_MANAGER: { view: true, create: true, edit: true, delete: false, assign: true, approve: true, export: true, manage: true },
      ROLE_EMPLOYEE: { view: true, create: false, edit: false, delete: false, assign: false, approve: false, export: true, manage: false },
    },
    Tasks: {
      ROLE_ADMIN: { view: true, create: true, edit: true, delete: true, assign: true, approve: true, export: true, manage: true },
      ROLE_MANAGER: { view: true, create: true, edit: true, delete: true, assign: true, approve: true, export: true, manage: true },
      ROLE_EMPLOYEE: { view: true, create: false, edit: true, delete: false, assign: false, approve: false, export: false, manage: false },
    },
    Documents: {
      ROLE_ADMIN: { view: true, create: true, edit: true, delete: true, assign: true, approve: true, export: true, manage: true },
      ROLE_MANAGER: { view: true, create: true, edit: true, delete: false, assign: true, approve: true, export: true, manage: false },
      ROLE_EMPLOYEE: { view: true, create: true, edit: false, delete: false, assign: false, approve: false, export: true, manage: false },
    },
    Reports: {
      ROLE_ADMIN: { view: true, create: true, edit: true, delete: true, assign: true, approve: true, export: true, manage: true },
      ROLE_MANAGER: { view: true, create: true, edit: false, delete: false, assign: false, approve: true, export: true, manage: false },
      ROLE_EMPLOYEE: { view: true, create: false, edit: false, delete: false, assign: false, approve: false, export: false, manage: false },
    },
    'Time Tracking': {
      ROLE_ADMIN: { view: true, create: true, edit: true, delete: true, assign: true, approve: true, export: true, manage: true },
      ROLE_MANAGER: { view: true, create: true, edit: true, delete: false, assign: true, approve: true, export: true, manage: true },
      ROLE_EMPLOYEE: { view: true, create: true, edit: true, delete: false, assign: false, approve: false, export: false, manage: false },
    },
    'Step Verification': {
      ROLE_ADMIN: { view: true, create: true, edit: true, delete: true, assign: true, approve: true, export: true, manage: true },
      ROLE_MANAGER: { view: true, create: true, edit: true, delete: false, assign: true, approve: true, export: true, manage: true },
      ROLE_EMPLOYEE: { view: true, create: false, edit: true, delete: false, assign: false, approve: false, export: false, manage: false },
    },
    Teams: {
      ROLE_ADMIN: { view: true, create: true, edit: true, delete: true, assign: true, approve: true, export: true, manage: true },
      ROLE_MANAGER: { view: true, create: false, edit: true, delete: false, assign: true, approve: false, export: true, manage: false },
      ROLE_EMPLOYEE: { view: true, create: false, edit: false, delete: false, assign: false, approve: false, export: false, manage: false },
    },
  };

  const [permissionMatrix, setPermissionMatrix] = useState<any>(initialPermissionMatrix);

  // -------------------------------------------------------------
  // 4. NOTIFICATIONS STATE
  // -------------------------------------------------------------
  const initialNotificationEvents = [
    { id: 'task_assigned', label: 'Task Assigned', description: 'When a new task is assigned to you or a team member', inApp: true, email: true, push: true },
    { id: 'task_accepted', label: 'Task Accepted', description: 'When an employee accepts an assigned task assignment', inApp: true, email: true, push: false },
    { id: 'task_rejected', label: 'Task Rejected', description: 'When an employee declines a task with justification', inApp: true, email: true, push: true },
    { id: 'task_completed', label: 'Task Completed', description: 'When all deliverables for a task are finalized', inApp: true, email: false, push: true },
    { id: 'task_reviewed', label: 'Task Reviewed', description: 'When a task review score or feedback is submitted', inApp: true, email: true, push: false },
    { id: 'approval_required', label: 'Approval Required', description: 'When a task transitions into Code Review or Sign-off', inApp: true, email: true, push: true },
    { id: 'deadline_approaching', label: 'Deadline Approaching', description: 'Milestone reminder 24 hours prior to due date', inApp: true, email: true, push: true },
    { id: 'task_overdue', label: 'Task Overdue', description: 'Urgent escalation when a task exceeds its planned due date', inApp: true, email: true, push: true },
    { id: 'project_updates', label: 'Project Updates', description: 'Changes to sprint schedules, milestones, or targets', inApp: true, email: false, push: false },
    { id: 'employee_activity', label: 'Employee Activity', description: 'Daily work profile submission and standup updates', inApp: true, email: false, push: false },
    { id: 'document_uploaded', label: 'Document Uploaded', description: 'New architectural or sprint assets uploaded', inApp: true, email: false, push: false },
    { id: 'mention_notifications', label: 'Mention Notifications', description: 'When someone tags you in chat comments or threads', inApp: true, email: true, push: true },
    { id: 'system_notifications', label: 'System Notifications', description: 'Critical maintenance and security updates', inApp: true, email: true, push: false },
  ];

  const [notifications, setNotifications] = useState(initialNotificationEvents);

  // -------------------------------------------------------------
  // 5. WORKFLOW CONFIGURATION STATE
  // -------------------------------------------------------------
  const [reqDescription, setReqDescription] = useState(true);
  const [reqPriority, setReqPriority] = useState(true);
  const [reqDueDate, setReqDueDate] = useState(true);
  const [reqEstHours, setReqEstHours] = useState(true);
  const [reqTags, setReqTags] = useState(false);

  const [returnRejectedToProgress, setReturnRejectedToProgress] = useState(true);
  const [allowReopenCompleted, setAllowReopenCompleted] = useState(true);

  const [approvalRequiredBeforeDone, setApprovalRequiredBeforeDone] = useState(true);
  const [whoCanMoveToReview, setWhoCanMoveToReview] = useState<'Assignee Only' | 'Team Leader Only' | 'Anyone'>('Assignee Only');
  const [whoCanApproveTask, setWhoCanApproveTask] = useState<'Team Leader Only' | 'Project Lead & Admin' | 'Admin Only'>('Team Leader Only');

  const [stepVerificationRequired, setStepVerificationRequired] = useState(true);
  const [qaSignoffRequired, setQaSignoffRequired] = useState(true);

  const [deadlineAlert48h, setDeadlineAlert48h] = useState(true);
  const [deadlineAlert24h, setDeadlineAlert24h] = useState(true);
  const [deadlineAlertMorning, setDeadlineAlertMorning] = useState(true);
  const [overdueBehavior, setOverdueBehavior] = useState<'Flag Red & Alert Lead' | 'Auto-Escalate to Management' | 'Block Subsequent Sprint'>('Flag Red & Alert Lead');
  const [gracePeriod, setGracePeriod] = useState('2 Hours');

  // -------------------------------------------------------------
  // 6. DOCUMENT PREFERENCES STATE
  // -------------------------------------------------------------
  const [maxFileSize, setMaxFileSize] = useState('50 MB');
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>([
    'PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'PNG', 'JPG', 'JPEG', 'ZIP', 'SVG'
  ]);
  const [enablePdfPreview, setEnablePdfPreview] = useState(true);
  const [requireTextIndexing, setRequireTextIndexing] = useState(true);
  const [autoCompressImages, setAutoCompressImages] = useState(true);
  const [enableVersioning, setEnableVersioning] = useState(true);
  const [enforceNamingPrefix, setEnforceNamingPrefix] = useState(true);
  const [downloadPermissions, setDownloadPermissions] = useState<'All Members' | 'Team Leaders & Admins' | 'Admins Only'>('Team Leaders & Admins');
  const [documentRetention, setDocumentRetention] = useState('1 Year');

  // -------------------------------------------------------------
  // 7. SECURITY & PRIVACY STATE
  // -------------------------------------------------------------
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30 mins');
  const [profileVisibility, setProfileVisibility] = useState<'Organization Wide' | 'Team Members Only' | 'Admins Only'>('Organization Wide');
  const [activityVisibility, setActivityVisibility] = useState(true);
  const [failedLoginProtection, setFailedLoginProtection] = useState(true);
  const [suspiciousLoginAlerts, setSuspiciousLoginAlerts] = useState(true);

  // -------------------------------------------------------------
  // 8. INTEGRATIONS STATE
  // -------------------------------------------------------------
  const [integrationStatuses, setIntegrationStatuses] = useState<{ [key: string]: boolean }>({
    firebase: true,
    emailService: true,
    googleCalendar: true,
    googleDrive: false,
    slack: true,
    msTeams: false,
    github: true,
  });

  // -------------------------------------------------------------
  // 9. APPEARANCE STATE
  // -------------------------------------------------------------
  const [interfaceDensity, setInterfaceDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [fontSize, setFontSize] = useState<'13px' | '14px' | '16px'>('14px');
  const [animationPreference, setAnimationPreference] = useState<'smooth' | 'reduced'>('smooth');

  // -------------------------------------------------------------
  // 10. SYSTEM & AUDIT STATE
  // -------------------------------------------------------------
  const [autoLogoutDuration, setAutoLogoutDuration] = useState('1 hour');
  const [defaultSessionDuration, setDefaultSessionDuration] = useState('14 days');
  const [dataRetentionPreference, setDataRetentionPreference] = useState('3 Years');
  const [systemMaintenanceMode, setSystemMaintenanceMode] = useState(false);

  // Realistic administrative / security Audit Logs
  const [auditLogsList, setAuditLogsList] = useState([
    {
      id: 'aud-1',
      action: 'Notification Preferences Updated',
      user: user?.name || 'Vinay (Team Lead)',
      role: 'Team Lead',
      date: '05/10/2026',
      time: '10:45 PM',
      ip: '192.168.1.45',
      device: 'Windows 11 / Chrome',
      change: 'Enabled Push Notifications for Task Assignment and Code Reviews',
    },
    {
      id: 'aud-2',
      action: 'Workflow Approval Rules Modified',
      user: user?.name || 'Vinay (Team Lead)',
      role: 'Team Lead',
      date: '05/10/2026',
      time: '08:30 PM',
      ip: '192.168.1.45',
      device: 'Windows 11 / Chrome',
      change: 'Enforced Step Verification gate before submitting task for Code Review',
    },
    {
      id: 'aud-3',
      action: 'Workspace Working Hours Configured',
      user: 'Administrator',
      role: 'Admin',
      date: '04/10/2026',
      time: '02:15 PM',
      ip: '10.0.0.12',
      device: 'macOS / Safari',
      change: 'Set regional operating hours to 09:00 AM - 06:00 PM (40h/week)',
    },
    {
      id: 'aud-4',
      action: 'Security Credential Hash Refreshed',
      user: user?.name || 'Vinay (Team Lead)',
      role: 'Team Lead',
      date: '03/10/2026',
      time: '11:20 AM',
      ip: '192.168.1.45',
      device: 'Windows 11 / Chrome',
      change: 'Account password successfully updated with bcrypt 10-rounds hash',
    },
    {
      id: 'aud-5',
      action: 'Document Maximum Size Limit Updated',
      user: user?.name || 'Vinay (Team Lead)',
      role: 'Team Lead',
      date: '02/10/2026',
      time: '04:10 PM',
      ip: '192.168.1.45',
      device: 'Windows 11 / Chrome',
      change: 'Adjusted upload threshold to 50 MB and added SVG/ZIP allowed formats',
    },
  ]);

  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // -------------------------------------------------------------
  // LOAD PERSISTED SETTINGS ON MOUNT
  // -------------------------------------------------------------
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.workspaceName) setWorkspaceName(data.workspaceName);
        if (data.workspaceDesc) setWorkspaceDesc(data.workspaceDesc);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.companyEmail) setCompanyEmail(data.companyEmail);
        if (data.contactNumber) setContactNumber(data.contactNumber);
        if (data.website) setWebsite(data.website);
        if (data.address) setAddress(data.address);
        if (data.wsCountry) setWsCountry(data.wsCountry);
        if (data.workingDays) setWorkingDays(data.workingDays);
        if (data.startTime) setStartTime(data.startTime);
        if (data.endTime) setEndTime(data.endTime);
        if (data.permissionMatrix) setPermissionMatrix(data.permissionMatrix);
        if (data.notifications) setNotifications(data.notifications);
        if (data.maxFileSize) setMaxFileSize(data.maxFileSize);
        if (data.allowedExtensions) setAllowedExtensions(data.allowedExtensions);
        if (data.sessionTimeout) setSessionTimeout(data.sessionTimeout);
        if (data.twoFactorAuth !== undefined) setTwoFactorAuth(data.twoFactorAuth);
        if (data.integrationStatuses) setIntegrationStatuses(data.integrationStatuses);
        if (data.systemMaintenanceMode !== undefined) setSystemMaintenanceMode(data.systemMaintenanceMode);
      }
    } catch (_e) {}
  }, [storageKey]);

  // Sync profile details if user changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || 'Vinay');
      setProfileEmail(user.email || 'vinay.teamlead@company.com');
      setProfilePhone(user.phone || '+1 (555) 234-5678');
      setProfileDesignation(
        user.designation || (isTeamLead ? 'Team Lead & Senior Engineer' : isAdmin ? 'System Administrator' : 'Software Engineer')
      );
      setProfileDepartment(user.department || 'Engineering');
    }
  }, [user, isTeamLead, isAdmin]);

  // -------------------------------------------------------------
  // SAVE HANDLER
  // -------------------------------------------------------------
  const handleSaveAllChanges = async () => {
    setSaving(true);
    try {
      if (activeCategory === 'account') {
        const payload: any = {
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
          designation: profileDesignation,
          department: profileDepartment,
        };
        await updateProfile(payload);
      }

      const fullSettingsPayload = {
        workspaceName,
        workspaceDesc,
        companyName,
        companyEmail,
        contactNumber,
        website,
        address,
        wsCountry,
        wsTimeZone,
        wsCurrency,
        wsDateFormat,
        wsTimeFormat,
        workingDays,
        workingHoursPerWeek,
        startTime,
        endTime,
        breakDuration,
        permissionMatrix,
        notifications,
        reqDescription,
        reqPriority,
        reqDueDate,
        reqEstHours,
        reqTags,
        returnRejectedToProgress,
        allowReopenCompleted,
        approvalRequiredBeforeDone,
        whoCanMoveToReview,
        whoCanApproveTask,
        stepVerificationRequired,
        qaSignoffRequired,
        deadlineAlert48h,
        deadlineAlert24h,
        deadlineAlertMorning,
        overdueBehavior,
        gracePeriod,
        maxFileSize,
        allowedExtensions,
        enablePdfPreview,
        requireTextIndexing,
        autoCompressImages,
        enableVersioning,
        enforceNamingPrefix,
        downloadPermissions,
        documentRetention,
        twoFactorAuth,
        loginAlerts,
        sessionTimeout,
        profileVisibility,
        activityVisibility,
        failedLoginProtection,
        suspiciousLoginAlerts,
        integrationStatuses,
        interfaceDensity,
        fontSize,
        animationPreference,
        autoLogoutDuration,
        defaultSessionDuration,
        dataRetentionPreference,
        systemMaintenanceMode,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(fullSettingsPayload));

      const newAuditLog = {
        id: `aud-${Date.now()}`,
        action: `${SETTINGS_CATEGORIES.find((t) => t.id === activeCategory)?.title || 'Workspace'} Settings Updated`,
        user: user?.name || 'Vinay (Team Lead)',
        role: formatRoleName(user?.role),
        date: new Date().toLocaleDateString('en-GB'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ip: '192.168.1.45',
        device: 'Windows 11 / Chrome',
        change: `Updated configuration parameters for ${activeCategory?.toUpperCase()}`,
      };
      setAuditLogsList((prev) => [newAuditLog, ...prev]);

      setIsDirty(false);
      showToast('Settings updated successfully.', 'success');
    } catch (err: any) {
      showToast('Failed to update settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Revert changes
  const handleCancelChanges = () => {
    setIsDirty(false);
    showToast('Changes discarded.', 'info');
  };

  // Navigate to category
  const handleSelectCategory = (categoryId: SettingsCategoryId) => {
    setActiveCategory(categoryId);
    setSearchParams({ tab: categoryId });
  };

  // Back to Main Settings Menu
  const handleBackToMenu = () => {
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes in this section. Do you want to discard them and return to Settings?',
        actionType: 'unsaved',
        targetCategory: null,
      });
      return;
    }
    setActiveCategory(null);
    setSearchParams({});
  };

  // Password submission
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!newPassword.trim()) {
      setPasswordError('Please provide a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setSaving(true);
    const success = await updateProfile({ password: newPassword });
    setSaving(false);

    if (success) {
      showToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError('Failed to update password. Please check your credentials.');
    }
  };

  // Reset notifications
  const handleResetNotifications = () => {
    setNotifications(initialNotificationEvents);
    setIsDirty(true);
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    showToast('Notification preferences reset to default values.', 'info');
  };

  // Logout other devices
  const handleLogoutOtherDevices = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    showToast('All other remote device sessions have been terminated.', 'success');
  };

  // Toggle integration
  const toggleIntegration = (key: string) => {
    setIntegrationStatuses((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setIsDirty(true);
  };

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearchQuery.trim()) return auditLogsList;
    const q = auditSearchQuery.toLowerCase();
    return auditLogsList.filter(
      (log) =>
        log.action.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.change.toLowerCase().includes(q) ||
        log.ip.toLowerCase().includes(q)
    );
  }, [auditLogsList, auditSearchQuery]);

  // First letter of user name for the avatar
  const avatarInitial = (user?.name || 'Vinay').charAt(0).toUpperCase();
  const currentCategoryMeta = SETTINGS_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-28 sm:pb-20 lg:pb-12 min-w-0 transition-colors duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP APP BAR                                                            */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pt-1 pb-2 px-1">
        <button
          type="button"
          onClick={() => {
            if (activeCategory) {
              handleBackToMenu();
            } else {
              navigate(-1);
            }
          }}
          className="p-2 -ml-2 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
          {activeCategory && currentCategoryMeta ? currentCategoryMeta.title : 'Settings'}
        </h1>

        <div className="flex items-center gap-1">
          {/* Quick Light/Dark Mode Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN CARD-LIST MENU VIEW (Variation 1 Structure)                       */}
      {/* ========================================================================= */}
      {!activeCategory && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-3"
        >
          {/* Top Hero Profile Card */}
          <button
            type="button"
            onClick={() => handleSelectCategory('account')}
            className="w-full text-left p-4.5 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-500/12 via-indigo-500/10 to-purple-500/15 dark:from-blue-900/35 dark:via-indigo-900/30 dark:to-purple-900/35 border border-blue-500/20 dark:border-white/10 shadow-xs hover:shadow-md hover:border-blue-500/35 dark:hover:border-white/20 transition-all flex items-center justify-between gap-4 cursor-pointer group"
          >
            <div className="flex items-center gap-4 min-w-0">
              {/* Avatar with camera badge */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#0e1322]">
                  {avatarInitial}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/20 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Camera className="w-3 h-3" />
                </div>
              </div>

              {/* User details */}
              <div className="truncate">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                  {user?.name || 'Vinay'}
                </h2>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                  {formatRoleName(user?.role)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {activeOrganization?.organizationName || 'Project System Workspace'}
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-all shrink-0" />
          </button>

          {/* List of Category Cards */}
          <div className="space-y-2.5 pt-1">
            {SETTINGS_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className="w-full text-left p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-blue-400/40 dark:hover:border-white/20 transition-all flex items-center justify-between gap-3.5 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Pastel Squircle Icon Badge */}
                    <div
                      className={`w-11 h-11 rounded-2xl ${cat.iconBgLight} ${cat.iconBgDark} ${cat.iconColorLight} ${cat.iconColorDark} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Text Details */}
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {cat.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-all shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Version Footer */}
          <div className="pt-6 pb-4 text-center">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Project System • v1.0.0
            </p>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 3. DETAIL VIEW (When a category card is clicked)                          */}
      {/* ========================================================================= */}
      {activeCategory && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          className="space-y-4"
        >
          {/* Sub-Header Actions Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <button
              type="button"
              onClick={handleBackToMenu}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Settings</span>
            </button>

            <div className="flex items-center gap-2">
              {isDirty && (
                <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-1 animate-pulse mr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveAllChanges}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1. ACCOUNT & PROFILE SUB-PAGE                                */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'account' && (
            <div className="space-y-4">
              {/* Profile Details Card */}
              <div className="p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        Personal Information
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Overview and editable settings for your identity and organization credentials
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {/* 1. Full Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <User className="w-4.5 h-4.5" />
                    </div>
                    <div className="w-28 sm:w-32 shrink-0">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => {
                          setProfileName(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Enter full name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 2. Employee ID */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <IdCard className="w-4.5 h-4.5" />
                    </div>
                    <div className="w-28 sm:w-32 shrink-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee ID</span>
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <input
                        type="text"
                        value={employeeId}
                        disabled
                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-mono font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 3. Email Address */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <div className="w-28 sm:w-32 shrink-0">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => {
                          setProfileEmail(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Enter email address"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 4. Phone Number */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Phone className="w-4.5 h-4.5" />
                    </div>
                    <div className="w-28 sm:w-32 shrink-0">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => {
                          setProfilePhone(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Enter phone number"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 5. Department */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-4.5 h-4.5" />
                    </div>
                    <div className="w-28 sm:w-32 shrink-0">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department</label>
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <input
                        type="text"
                        value={profileDepartment}
                        disabled={!isAdmin}
                        onChange={(e) => {
                          setProfileDepartment(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Department name"
                        className={`w-full ${isAdmin ? 'px-3.5' : 'pl-3.5 pr-8 cursor-not-allowed'} py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 ${isAdmin ? 'bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/10 focus:border-blue-500' : 'bg-slate-100/80 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400'} text-xs font-medium focus:outline-none transition-all`}
                      />
                      {!isAdmin && <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />}
                    </div>
                  </div>

                  {/* 6. Job Title */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4.5 h-4.5" />
                    </div>
                    <div className="w-28 sm:w-32 shrink-0">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Job Title</label>
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <input
                        type="text"
                        value={profileDesignation}
                        disabled={!isAdmin}
                        onChange={(e) => {
                          setProfileDesignation(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Job title or designation"
                        className={`w-full ${isAdmin ? 'px-3.5' : 'pl-3.5 pr-8 cursor-not-allowed'} py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 ${isAdmin ? 'bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/10 focus:border-blue-500' : 'bg-slate-100/80 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400'} text-xs font-medium focus:outline-none transition-all`}
                      />
                      {!isAdmin && <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />}
                    </div>
                  </div>

                  {/* 7. Joining Date */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4.5 h-4.5" />
                    </div>
                    <div className="w-28 sm:w-32 shrink-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Joining Date</span>
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <input
                        type="text"
                        value={joiningDate}
                        disabled
                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Preferences Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    Account Preferences
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Default Dashboard</label>
                    <select
                      value={defaultDashboard}
                      onChange={(e) => {
                        setDefaultDashboard(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Overview">Overview</option>
                      <option value="Executive">Executive</option>
                      <option value="Task Focus">Task Focus</option>
                      <option value="Sprint Timeline">Sprint Timeline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Language</label>
                    <select
                      value={defaultLanguage}
                      onChange={(e) => {
                        setDefaultLanguage(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Date Format</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => {
                        setDateFormat(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Time Format</label>
                    <select
                      value={timeFormat}
                      onChange={(e) => {
                        setTimeFormat(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="12-hour (AM/PM)">12-hour (AM/PM)</option>
                      <option value="24-hour">24-hour (Military)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Password Management Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-500" />
                    Change Password
                  </h2>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={saving || !newPassword}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 2. WORKSPACE CONFIGURATION SUB-PAGE                          */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'workspace' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-500" />
                    Workspace Identity
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Workspace Name</label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => {
                        setWorkspaceName(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Organization Legal Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Workspace Description</label>
                    <input
                      type="text"
                      value={workspaceDesc}
                      onChange={(e) => {
                        setWorkspaceDesc(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Working Days & Shifts Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Working Days & Standard Shift Hours
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Active Working Days</label>
                  <div className="flex flex-wrap gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                      const isSelected = workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setWorkingDays((prev) => (isSelected ? prev.filter((d) => d !== day) : [...prev, day]));
                            setIsDirty(true);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Start Time</label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">End Time</label>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Break Duration</label>
                    <select
                      value={breakDuration}
                      onChange={(e) => {
                        setBreakDuration(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="30 mins">30 mins</option>
                      <option value="45 mins">45 mins</option>
                      <option value="60 mins">60 mins</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 3. ROLES & PERMISSIONS SUB-PAGE                              */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'roles' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      Permission Governance Matrix
                    </h2>
                  </div>

                  {/* Role Selector Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    {[
                      { id: 'ROLE_MANAGER', label: 'Team Leader' },
                      { id: 'ROLE_EMPLOYEE', label: 'Employee' },
                      { id: 'ROLE_ADMIN', label: 'Admin (System)' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRoleView(r.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedRoleView === r.id
                            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedRoleView === 'ROLE_ADMIN' && !isAdmin && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
                    Admin tier is read-only. Team Leaders cannot modify Platform Administrator permissions.
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold uppercase text-[10px] text-slate-500">
                        <th className="p-3">Module</th>
                        <th className="p-3 text-center">View</th>
                        <th className="p-3 text-center">Create</th>
                        <th className="p-3 text-center">Edit</th>
                        <th className="p-3 text-center">Delete</th>
                        <th className="p-3 text-center">Approve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {Object.keys(permissionMatrix).map((modName) => {
                        const perms = permissionMatrix[modName][selectedRoleView] || {};
                        const isLocked = selectedRoleView === 'ROLE_ADMIN' && !isAdmin;

                        return (
                          <tr key={modName} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{modName}</td>
                            {['view', 'create', 'edit', 'delete', 'approve'].map((pKey) => (
                              <td key={pKey} className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isLocked}
                                  checked={!!perms[pKey]}
                                  onChange={(e) => {
                                    if (isLocked) return;
                                    setPermissionMatrix((prev: any) => ({
                                      ...prev,
                                      [modName]: {
                                        ...prev[modName],
                                        [selectedRoleView]: {
                                          ...prev[modName][selectedRoleView],
                                          [pKey]: e.target.checked,
                                        },
                                      },
                                    }));
                                    setIsDirty(true);
                                  }}
                                  className={`w-4 h-4 rounded text-blue-600 ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 4. NOTIFICATIONS SUB-PAGE                                    */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'notifications' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-rose-500" />
                    Delivery Channel Rules
                  </h2>
                  <button
                    type="button"
                    onClick={handleResetNotifications}
                    className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-500"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold uppercase text-[10px] text-slate-500">
                        <th className="p-3">Event</th>
                        <th className="p-3 text-center">In-App</th>
                        <th className="p-3 text-center">Email</th>
                        <th className="p-3 text-center">Push</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {notifications.map((evt, idx) => (
                        <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="p-3">
                            <p className="font-bold text-slate-900 dark:text-white">{evt.label}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{evt.description}</p>
                          </td>
                          {['inApp', 'email', 'push'].map((ch) => (
                            <td key={ch} className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={(evt as any)[ch]}
                                onChange={(e) => {
                                  const next = [...notifications];
                                  (next[idx] as any)[ch] = e.target.checked;
                                  setNotifications(next);
                                  setIsDirty(true);
                                }}
                                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 5. WORKFLOW RULES SUB-PAGE (Variation 3 Detail Screen)       */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'workflow' && (
            <div className="space-y-4">
              {/* Task Stage Sequence Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
                <div className="border-b border-slate-100 dark:border-white/10 pb-2.5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-indigo-500" />
                    Task Stage Sequence
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 py-1">
                  {['Backlog', 'Analysis', 'To Do', 'In Progress', 'Review', 'Completed'].map((stg, i, arr) => (
                    <React.Fragment key={stg}>
                      <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-white/5 border border-blue-200 dark:border-white/10 text-xs font-bold text-blue-700 dark:text-blue-300">
                        {stg}
                      </div>
                      {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Approval Rules Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
                <div className="border-b border-slate-100 dark:border-white/10 pb-2.5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Approval Rules
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Require Approval before Done</p>
                      <p className="text-slate-500 dark:text-slate-400">All tasks must be validated by a reviewer before completion</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={approvalRequiredBeforeDone}
                      onChange={(e) => {
                        setApprovalRequiredBeforeDone(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Who Can Approve</label>
                    <select
                      value={whoCanApproveTask}
                      onChange={(e) => {
                        setWhoCanApproveTask(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Team Leader Only">Team Leader Only</option>
                      <option value="Project Lead & Admin">Project Lead & Admin</option>
                      <option value="Admin Only">Admin Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Verification Gates Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
                <div className="border-b border-slate-100 dark:border-white/10 pb-2.5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-cyan-500" />
                    Verification Gates
                  </h2>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Require Step Verification Checklist</p>
                    <p className="text-slate-500 dark:text-slate-400">Enforce step checklist completion before submitting for review</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={stepVerificationRequired}
                    onChange={(e) => {
                      setStepVerificationRequired(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Deadline Alerts Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
                <div className="border-b border-slate-100 dark:border-white/10 pb-2.5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" />
                    Deadline Alerts
                  </h2>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deadlineAlert48h}
                      onChange={(e) => {
                        setDeadlineAlert48h(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">Send reminder 48 hours before due date</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deadlineAlert24h}
                      onChange={(e) => {
                        setDeadlineAlert24h(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">Send reminder 24 hours before due date</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 6. DOCUMENT PREFERENCES SUB-PAGE                             */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'documents' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-500" />
                    File Upload Limits & Storage
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Maximum File Size</label>
                    <select
                      value={maxFileSize}
                      onChange={(e) => {
                        setMaxFileSize(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="10 MB">10 MB</option>
                      <option value="25 MB">25 MB</option>
                      <option value="50 MB">50 MB</option>
                      <option value="100 MB">100 MB</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Retention Period</label>
                    <select
                      value={documentRetention}
                      onChange={(e) => {
                        setDocumentRetention(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="90 Days">90 Days</option>
                      <option value="1 Year">1 Year</option>
                      <option value="Indefinite">Indefinite</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Allowed File Extensions</label>
                  <div className="flex flex-wrap gap-2">
                    {['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'PNG', 'JPG', 'JPEG', 'ZIP', 'SVG'].map(
                      (ext) => {
                        const isAllowed = allowedExtensions.includes(ext);
                        return (
                          <button
                            key={ext}
                            type="button"
                            onClick={() => {
                              setAllowedExtensions((prev) =>
                                isAllowed ? prev.filter((item) => item !== ext) : [...prev, ext]
                              );
                              setIsDirty(true);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                              isAllowed
                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/10'
                            }`}
                          >
                            .{ext.toLowerCase()}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 7. SECURITY & PRIVACY SUB-PAGE                               */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'security' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Authentication Security
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                      <p className="text-slate-500 dark:text-slate-400">Require TOTP code on login</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={twoFactorAuth}
                      onChange={(e) => {
                        setTwoFactorAuth(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Account Lockout Protection</p>
                      <p className="text-slate-500 dark:text-slate-400">Lock for 15 mins after 5 failed password attempts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={failedLoginProtection}
                      onChange={(e) => {
                        setFailedLoginProtection(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 8. CONNECTED INTEGRATIONS SUB-PAGE                          */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'integrations' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-violet-500" />
                    Connected Platform Services
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    { key: 'firebase', name: 'Firebase Live Cloud', desc: 'Firestore real-time sync & auth tokens.', status: true, immutable: true },
                    { key: 'slack', name: 'Slack', desc: 'Channel notifications for sprint tasks.', status: integrationStatuses.slack },
                    { key: 'github', name: 'GitHub', desc: 'Pull request verification & commit tracking.', status: integrationStatuses.github },
                    { key: 'googleCalendar', name: 'Google Calendar', desc: 'Sync sprint milestones and task deadlines.', status: integrationStatuses.googleCalendar },
                  ].map((integ) => (
                    <div
                      key={integ.key}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{integ.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">{integ.desc}</p>
                      </div>
                      {!integ.immutable ? (
                        <button
                          type="button"
                          onClick={() => toggleIntegration(integ.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            integ.status
                              ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {integ.status ? 'Disconnect' : 'Connect'}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Connected</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 9. APPEARANCE & THEME SUB-PAGE                               */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'appearance' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-500" />
                    Theme Mode
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light Theme', icon: Sun },
                    { id: 'dark', label: 'Dark Theme', icon: Moon },
                    { id: 'system', label: 'System Default', icon: Monitor },
                  ].map((th) => {
                    const isSelected = themeMode === th.id;
                    const Icon = th.icon;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          setThemeMode(th.id as ThemeMode);
                          setIsDirty(true);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{th.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Accent Color Swatches */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Accent Color</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(ACCENT_PRESETS) as AccentColor[]).map((key) => {
                      const preset = ACCENT_PRESETS[key];
                      const isSelected = accentColor === key;
                      const label = key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setAccentColor(key);
                            setIsDirty(true);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10 shadow-xs'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: preset.color }}
                          />
                          <span className="text-slate-900 dark:text-white">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 10. SYSTEM & AUDIT LOGS SUB-PAGE                             */}
          {/* ------------------------------------------------------------- */}
          {activeCategory === 'system-audit' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-slate-500" />
                    Administrative Audit Trail
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {filteredAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{log.action}</span>
                        <span className="text-[10px] font-mono text-slate-400">{log.date} • {log.time}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">{log.change}</p>
                      <p className="text-[10px] text-slate-400 font-mono">By: {log.user} ({log.role}) • IP: {log.ip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Floating Save / Cancel Bar */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#0e1322]/95 border border-slate-200/80 dark:border-white/10 shadow-lg flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBackToMenu}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
            >
              Back to Settings
            </button>

            <button
              type="button"
              onClick={handleSaveAllChanges}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL                                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-5 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-white/15 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {confirmModal.title}
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.actionType === 'logout-devices') {
                      handleLogoutOtherDevices();
                    } else if (confirmModal.actionType === 'reset-notifications') {
                      handleResetNotifications();
                    } else if (confirmModal.actionType === 'unsaved') {
                      setIsDirty(false);
                      setActiveCategory(confirmModal.targetCategory || null);
                      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm cursor-pointer"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
