import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Building2,
  KeyRound,
  Bell,
  Sliders,
  FileText,
  Shield,
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
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore, AccentColor, ThemeMode, ACCENT_PRESETS } from '../store/useUIStore';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatRoleName, normalizeRole } from '../services/authRoles';
import { resolveAvatar } from '../services/avatar';

// Settings Categories
type SettingsTabId =
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

interface SettingsTabItem {
  id: SettingsTabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeType?: 'neutral' | 'info' | 'success' | 'warning';
}

const ALL_SETTINGS_TABS: SettingsTabItem[] = [
  {
    id: 'account',
    label: 'Account',
    description: 'Profile information, preferences, active sessions, and password security',
    icon: User,
  },
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Organization identity, regional standards, and business working hours',
    icon: Building2,
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    description: 'Role access control and granular permission governance matrix',
    icon: KeyRound,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Multi-channel alert preferences across in-app, email, and push',
    icon: Bell,
  },
  {
    id: 'workflow',
    label: 'Workflow Configuration',
    description: 'Task state transitions, approval rules, verification gates, and deadlines',
    icon: Sliders,
  },
  {
    id: 'documents',
    label: 'Document Preferences',
    description: 'File upload limits, allowed formats, storage, versioning, and retention',
    icon: FileText,
  },
  {
    id: 'security',
    label: 'Security & Privacy',
    description: 'Two-factor authentication, active devices, and account lockout protection',
    icon: Shield,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connected services including Firebase, Slack, GitHub, and Google Workspace',
    icon: LinkIcon,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme customization, typography, interface density, and accent colors',
    icon: Palette,
  },
  {
    id: 'system-audit',
    label: 'System & Audit',
    description: 'System session timeouts, maintenance mode, and administrative audit trail',
    icon: ScrollText,
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateProfile, activeOrganization, activeOrganizationId, logout } = useAuthStore();
  const {
    darkMode,
    toggleTheme,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    sidebarExpanded,
    showToast,
    setSignOutModalOpen,
  } = useUIStore();

  const role = normalizeRole(user?.role);
  const isAdmin = role === 'ROLE_ADMIN';
  const isTeamLead = role === 'ROLE_MANAGER';
  const isEmployee = role === 'ROLE_EMPLOYEE';

  // Available tabs based on role
  const availableTabs = useMemo(() => {
    if (isEmployee) {
      return ALL_SETTINGS_TABS.filter((t) =>
        ['account', 'notifications', 'appearance', 'security'].includes(t.id)
      );
    }
    // Team Lead and Admin have full access to all 10 configuration categories
    return ALL_SETTINGS_TABS;
  }, [isEmployee]);

  // Active tab state
  const [activeTab, setActiveTab] = useState<SettingsTabId>('account');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Confirmation Modals State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'logout-devices' | 'reset-notifications' | 'maintenance' | 'unsaved';
    targetTab?: SettingsTabId;
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
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '+1 (555) 234-5678');
  const [profileDesignation, setProfileDesignation] = useState(user?.designation || (isTeamLead ? 'Team Lead & Senior Engineer' : isAdmin ? 'System Administrator' : 'Software Engineer'));
  const [profileDepartment, setProfileDepartment] = useState(user?.department || 'Engineering');
  const [employeeId] = useState(`EMP-${user?.id || '1042'}`);

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

  // Sessions list
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
  const [workspaceName, setWorkspaceName] = useState(activeOrganization?.organizationName || 'Prologue Innovations');
  const [workspaceCode] = useState(activeOrganization?.organizationCode || activeOrganization?.organizationId || 'WS-CORP-902');
  const [workspaceDesc, setWorkspaceDesc] = useState('Enterprise project workspace for engineering and product delivery.');
  const [companyName, setCompanyName] = useState(activeOrganization?.organizationName || 'Prologue Enterprise Systems Inc.');
  const [companyEmail, setCompanyEmail] = useState('workspace@prologue.io');
  const [contactNumber, setContactNumber] = useState('+1 (555) 019-2834');
  const [website, setWebsite] = useState('https://prologue.io');
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
  const [autoVerificationAudit, setAutoVerificationAudit] = useState(true);

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
  const [maxImageRes, setMaxImageRes] = useState('4K UHD (3840x2160)');
  const [enableVersioning, setEnableVersioning] = useState(true);
  const [maxRevisions, setMaxRevisions] = useState('10 revisions');
  const [enforceNamingPrefix, setEnforceNamingPrefix] = useState(true);
  const [sanitizeSpecialChars, setSanitizeSpecialChars] = useState(true);
  const [storageProvider] = useState('Encrypted Cloud Bucket (AES-256)');
  const [downloadPermissions, setDownloadPermissions] = useState<'All Members' | 'Team Leaders & Admins' | 'Admins Only'>('Team Leaders & Admins');
  const [watermarkDownloads, setWatermarkDownloads] = useState(false);
  const [documentRetention, setDocumentRetention] = useState('1 Year');

  // -------------------------------------------------------------
  // 7. SECURITY & PRIVACY STATE
  // -------------------------------------------------------------
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [pwdMinChars, setPwdMinChars] = useState(true);
  const [pwdRequireUpper, setPwdRequireUpper] = useState(true);
  const [pwdRequireSymbol, setPwdRequireSymbol] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30 mins');

  const [profileVisibility, setProfileVisibility] = useState<'Organization Wide' | 'Team Members Only' | 'Admins Only'>('Organization Wide');
  const [activityVisibility, setActivityVisibility] = useState(true);
  const [shareTelemetry, setShareTelemetry] = useState(false);

  const [failedLoginProtection, setFailedLoginProtection] = useState(true);
  const [lockoutDuration, setLockoutDuration] = useState('15 minutes');
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
  const [appTheme, setAppTheme] = useState<'light' | 'dark' | 'system'>(darkMode ? 'dark' : 'light');
  const [sidebarBehavior, setSidebarBehavior] = useState<'expanded' | 'collapsible'>('expanded');
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
  const [defaultStartupPage, setDefaultStartupPage] = useState('Dashboard');

  const [auditRetentionPeriod, setAuditRetentionPeriod] = useState('180 days');
  const [logSecurityEvents, setLogSecurityEvents] = useState(true);
  const [logPermissionChanges, setLogPermissionChanges] = useState(true);
  const [logSettingsChanges, setLogSettingsChanges] = useState(true);
  const [logLoginEvents, setLogLoginEvents] = useState(true);

  // Realistic administrative / security Audit Logs list (NOT daily task activity)
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
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '+1 (555) 234-5678');
      setProfileDesignation(user.designation || (isTeamLead ? 'Team Lead & Senior Engineer' : isAdmin ? 'System Administrator' : 'Software Engineer'));
      setProfileDepartment(user.department || 'Engineering');
    }
  }, [user, isTeamLead, isAdmin]);

  // -------------------------------------------------------------
  // SAVE HANDLER
  // -------------------------------------------------------------
  const handleSaveAllChanges = async () => {
    setSaving(true);
    try {
      // 1. If Account tab, update profile in backend
      if (activeTab === 'account') {
        const payload: any = {
          name: profileName,
          phone: profilePhone,
          designation: profileDesignation,
          department: profileDepartment,
        };
        await updateProfile(payload);
      }

      // 2. Persist workspace and module configurations in localStorage scoped to active organization
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
        autoVerificationAudit,
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
        maxImageRes,
        enableVersioning,
        maxRevisions,
        enforceNamingPrefix,
        sanitizeSpecialChars,
        downloadPermissions,
        watermarkDownloads,
        documentRetention,
        twoFactorAuth,
        loginAlerts,
        pwdMinChars,
        pwdRequireUpper,
        pwdRequireSymbol,
        sessionTimeout,
        profileVisibility,
        activityVisibility,
        shareTelemetry,
        failedLoginProtection,
        lockoutDuration,
        suspiciousLoginAlerts,
        integrationStatuses,
        appTheme,
        sidebarBehavior,
        interfaceDensity,
        fontSize,
        animationPreference,
        autoLogoutDuration,
        defaultSessionDuration,
        dataRetentionPreference,
        systemMaintenanceMode,
        defaultStartupPage,
        auditRetentionPeriod,
        logSecurityEvents,
        logPermissionChanges,
        logSettingsChanges,
        logLoginEvents,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(fullSettingsPayload));

      // Append entry to local audit trail
      const newAuditLog = {
        id: `aud-${Date.now()}`,
        action: `${ALL_SETTINGS_TABS.find((t) => t.id === activeTab)?.label || 'Workspace'} Settings Updated`,
        user: user?.name || 'Authorized User',
        role: formatRoleName(user?.role),
        date: new Date().toLocaleDateString('en-GB'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ip: '192.168.1.45',
        device: 'Windows 11 / Chrome',
        change: `Updated configuration parameters for ${activeTab.toUpperCase()}`,
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

  // Tab switch with unsaved check
  const handleTabChange = (targetTab: SettingsTabId) => {
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes in this section. Do you want to discard them and navigate away?',
        actionType: 'unsaved',
        targetTab,
      });
      return;
    }
    setActiveTab(targetTab);
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

  const activeTabMeta = ALL_SETTINGS_TABS.find((t) => t.id === activeTab) || ALL_SETTINGS_TABS[0];
  const ActiveTabIcon = activeTabMeta.icon;

  return (
    <div className="space-y-6 pb-28 sm:pb-20 lg:pb-12 w-full min-w-0">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400 shadow-xs shrink-0">
            <SettingsIcon className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading flex items-center gap-2">
              Settings
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
                {formatRoleName(user?.role)}
              </span>
            </h1>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your workspace preferences, permissions, workflows, security, and system configuration.
            </p>
          </div>
        </div>

        {/* Global Save / Cancel Bar when modifications are active */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {isDirty && (
            <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5 animate-pulse mr-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            onClick={handleCancelChanges}
            disabled={!isDirty || saving}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isDirty
                ? 'border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                : 'opacity-40 border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAllChanges}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-97 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SPLIT LAYOUT: LEFT NAV + RIGHT CONTENT                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Settings Navigation Menu */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-2">
          {/* Mobile Category Horizontal Picker */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-blue-500/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop Category Navigation Card */}
          <div className="hidden lg:block p-3 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-1">
            <p className="px-3 py-2 text-[10.5px] uppercase font-mono tracking-wider font-extrabold text-slate-400 dark:text-slate-400">
              Configuration Center
            </p>

            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-hover:text-blue-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-[13px] leading-tight truncate">{tab.label}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'text-white/80 translate-x-0.5' : 'text-slate-400 opacity-40 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}

            {/* Current Workspace Scope Indicator */}
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-400 font-bold">
                Active Organization
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                {activeOrganization?.organizationName || 'Default Workspace'}
              </p>
              <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                {workspaceCode}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Active Content Panel */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Active Category Header Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <ActiveTabIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {activeTabMeta.label}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeTabMeta.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAllChanges}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ACCOUNT                                                            */}
          {/* ========================================================================= */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Profile Information Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Profile Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Your personal identity and professional credentials in the PMS workspace.
                  </p>
                </div>

                {/* Avatar preview and Employee ID */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={resolveAvatar(user?.profilePhoto, profileName, user?.gender)}
                      alt="Avatar"
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {profileName || 'Your Name'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {employeeId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {profileEmail} • {profileDesignation}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => {
                        setProfileName(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address (Verified)
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.02] text-xs font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => {
                        setProfilePhone(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Job Title / Designation
                    </label>
                    <input
                      type="text"
                      value={profileDesignation}
                      onChange={(e) => {
                        setProfileDesignation(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Department
                    </label>
                    <input
                      type="text"
                      value={profileDepartment}
                      onChange={(e) => {
                        setProfileDepartment(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={employeeId}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.02] text-xs font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Account Preferences Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    Account Preferences
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Customize your personal view mode, locale, date standards, and default landing views.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Default Dashboard
                    </label>
                    <select
                      value={defaultDashboard}
                      onChange={(e) => {
                        setDefaultDashboard(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Overview">Overview</option>
                      <option value="Executive">Executive</option>
                      <option value="Task Focus">Task Focus</option>
                      <option value="Sprint Timeline">Sprint Timeline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Default Language
                    </label>
                    <select
                      value={defaultLanguage}
                      onChange={(e) => {
                        setDefaultLanguage(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Date Format
                    </label>
                    <select
                      value={dateFormat}
                      onChange={(e) => {
                        setDateFormat(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2026-10-05)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (05/10/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (10/05/2026)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Time Format
                    </label>
                    <select
                      value={timeFormat}
                      onChange={(e) => {
                        setTimeFormat(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="12-hour (AM/PM)">12-hour (AM/PM)</option>
                      <option value="24-hour">24-hour (Military)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Time Zone
                    </label>
                    <select
                      value={timeZone}
                      onChange={(e) => {
                        setTimeZone(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                      <option value="America/New_York">America/New_York (EST -5:00)</option>
                      <option value="Europe/London">Europe/London (GMT +0:00)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST -8:00)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST +9:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Currency Symbol
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="USD ($)">USD ($)</option>
                      <option value="EUR (€)">EUR (€)</option>
                      <option value="INR (₹)">INR (₹)</option>
                      <option value="GBP (£)">GBP (£)</option>
                      <option value="CAD ($)">CAD ($)</option>
                      <option value="AUD ($)">AUD ($)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Login & Sessions Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-emerald-500" />
                      Login & Active Sessions
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Review registered devices that currently hold active tokens for this account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Logout From Other Devices?',
                        message:
                          'This will immediately revoke authentication tokens from all active devices except your current session.',
                        actionType: 'logout-devices',
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    Logout From Other Devices
                  </button>
                </div>

                <div className="space-y-2.5">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3.5 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-white/10 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
                          {sess.type === 'mobile' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {sess.device}
                            </span>
                            {sess.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                This Device
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            IP: {sess.ip} • {sess.location} • Last active: {sess.lastActive}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Password Management Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-500" />
                    Change Account Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ensure your account is protected with a secure password containing numbers and symbols.
                  </p>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-3 flex justify-end">
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

          {/* ========================================================================= */}
          {/* TAB 2: WORKSPACE                                                          */}
          {/* ========================================================================= */}
          {activeTab === 'workspace' && (
            <div className="space-y-6">
              {/* Workspace Identity Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Workspace Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure your organization identity, public contact credentials, and workspace handle.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-blue-500/20 border border-blue-500/20 flex items-center justify-center p-2 shrink-0">
                    <img src="/logo.png" alt="Workspace Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{workspaceName}</p>
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400">ID: {workspaceCode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => {
                        setWorkspaceName(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Organization / Company Legal Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Workspace Description
                    </label>
                    <textarea
                      rows={2}
                      value={workspaceDesc}
                      onChange={(e) => {
                        setWorkspaceDesc(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Official Company Email
                    </label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => {
                        setCompanyEmail(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => {
                        setContactNumber(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Company Website
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => {
                        setWebsite(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      HQ Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Working Configuration Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Working Configuration & Business Hours
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Define active business days, expected sprint working hours, and standard shift windows.
                  </p>
                </div>

                {/* Working Days Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Active Working Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                      const isSelected = workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setWorkingDays((prev) =>
                              isSelected ? prev.filter((d) => d !== day) : [...prev, day]
                            );
                            setIsDirty(true);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-blue-500/40'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Weekly Target Hours
                    </label>
                    <input
                      type="text"
                      value={workingHoursPerWeek}
                      onChange={(e) => {
                        setWorkingHoursPerWeek(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Shift Start Time
                    </label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Shift End Time
                    </label>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Break Duration
                    </label>
                    <select
                      value={breakDuration}
                      onChange={(e) => {
                        setBreakDuration(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="30 mins">30 mins</option>
                      <option value="45 mins">45 mins</option>
                      <option value="60 mins">60 mins</option>
                      <option value="90 mins">90 mins</option>
                    </select>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    Note: Projects, Teams, Employees, and Calendars are managed in their dedicated modules. Workspace settings only govern global regional and shift rules.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ROLES & PERMISSIONS                                                */}
          {/* ========================================================================= */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      Role Permission Governance Matrix
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure granular action privileges across all modules for each organizational role.
                    </p>
                  </div>

                  {/* Role Selector Tabs */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 self-start sm:self-auto">
                    {[
                      { id: 'ROLE_MANAGER', label: 'Team Leader' },
                      { id: 'ROLE_EMPLOYEE', label: 'Employee' },
                      { id: 'ROLE_ADMIN', label: 'Admin (System)' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRoleView(r.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedRoleView === r.id
                            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Leader Protection Banner */}
                {selectedRoleView === 'ROLE_ADMIN' && !isAdmin && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Admin-tier permissions are locked. Team Leaders cannot grant themselves or modify Platform Administrator permissions.
                    </span>
                  </div>
                )}

                {/* Permission Matrix Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3.5">Module Scope</th>
                        <th className="p-3.5 text-center">View</th>
                        <th className="p-3.5 text-center">Create</th>
                        <th className="p-3.5 text-center">Edit</th>
                        <th className="p-3.5 text-center">Delete</th>
                        <th className="p-3.5 text-center">Assign</th>
                        <th className="p-3.5 text-center">Approve</th>
                        <th className="p-3.5 text-center">Export</th>
                        <th className="p-3.5 text-center">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {Object.keys(permissionMatrix).map((moduleName) => {
                        const modulePerms = permissionMatrix[moduleName][selectedRoleView] || {};
                        const isLocked = selectedRoleView === 'ROLE_ADMIN' && !isAdmin;

                        return (
                          <tr
                            key={moduleName}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{moduleName}</span>
                            </td>

                            {['view', 'create', 'edit', 'delete', 'assign', 'approve', 'export', 'manage'].map(
                              (permKey) => {
                                const isChecked = !!modulePerms[permKey];
                                return (
                                  <td key={permKey} className="p-3.5 text-center">
                                    <input
                                      type="checkbox"
                                      disabled={isLocked}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (isLocked) return;
                                        setPermissionMatrix((prev: any) => ({
                                          ...prev,
                                          [moduleName]: {
                                            ...prev[moduleName],
                                            [selectedRoleView]: {
                                              ...prev[moduleName][selectedRoleView],
                                              [permKey]: e.target.checked,
                                            },
                                          },
                                        }));
                                        setIsDirty(true);
                                      }}
                                      className={`w-4 h-4 rounded text-blue-600 focus:ring-blue-500 ${
                                        isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                      }`}
                                    />
                                  </td>
                                );
                              }
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: NOTIFICATIONS                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-500" />
                      Notification Channel Preferences
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Toggle delivery destinations for task state changes, approvals, reviews, and mentions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Reset Notification Settings?',
                        message: 'This will reset all delivery channels to system recommended default settings.',
                        actionType: 'reset-notifications',
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    Reset to Default
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3.5">Notification Event</th>
                        <th className="p-3.5 text-center">In-App Alerts</th>
                        <th className="p-3.5 text-center">Email Digest</th>
                        <th className="p-3.5 text-center">Push Notification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {notifications.map((evt, idx) => (
                        <tr
                          key={evt.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-3.5">
                            <p className="font-bold text-slate-900 dark:text-white">{evt.label}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {evt.description}
                            </p>
                          </td>

                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={evt.inApp}
                              onChange={(e) => {
                                const next = [...notifications];
                                next[idx].inApp = e.target.checked;
                                setNotifications(next);
                                setIsDirty(true);
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={evt.email}
                              onChange={(e) => {
                                const next = [...notifications];
                                next[idx].email = e.target.checked;
                                setNotifications(next);
                                setIsDirty(true);
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={evt.push}
                              onChange={(e) => {
                                const next = [...notifications];
                                next[idx].push = e.target.checked;
                                setNotifications(next);
                                setIsDirty(true);
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: WORKFLOW CONFIGURATION                                             */}
          {/* ========================================================================= */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {/* Lifecycle Stage Visual */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-cyan-500" />
                    Standard Task Stage Sequence
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tasks progress through these formal gates. Settings govern rules between each transition.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 py-2">
                  {['Backlog', 'Analysis', 'To Do', 'In Progress', 'Review', 'Completed'].map((stage, i, arr) => (
                    <React.Fragment key={stage}>
                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        {stage}
                      </div>
                      {i < arr.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Task Submission Rules */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                    Task Rules & Mandatory Fields
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Required fields that must be filled before a task can be submitted or assigned.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqDescription}
                      onChange={(e) => {
                        setReqDescription(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Require Detailed Description</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqPriority}
                      onChange={(e) => {
                        setReqPriority(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Require Priority Level</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqDueDate}
                      onChange={(e) => {
                        setReqDueDate(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Require Target Due Date</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqEstHours}
                      onChange={(e) => {
                        setReqEstHours(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Require Estimated Hours</span>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Return Declined Tasks to In Progress</p>
                      <p className="text-slate-500 dark:text-slate-400">When reviewer rejects code, automatically reopen and return status to In Progress</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={returnRejectedToProgress}
                      onChange={(e) => {
                        setReturnRejectedToProgress(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Allow Completed Tasks to be Reopened</p>
                      <p className="text-slate-500 dark:text-slate-400">Team Leaders and Admins can reopen archived completed tasks</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowReopenCompleted}
                      onChange={(e) => {
                        setAllowReopenCompleted(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Approval & Verification Rules */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Approval & Step Verification Rules
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enforce quality gates before a task is formally accepted as complete.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Who Can Move Task to Review
                    </label>
                    <select
                      value={whoCanMoveToReview}
                      onChange={(e) => {
                        setWhoCanMoveToReview(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Assignee Only">Assignee Only</option>
                      <option value="Team Leader Only">Team Leader Only</option>
                      <option value="Anyone">Anyone in Team</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Who Can Approve a Task
                    </label>
                    <select
                      value={whoCanApproveTask}
                      onChange={(e) => {
                        setWhoCanApproveTask(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Team Leader Only">Team Leader Only</option>
                      <option value="Project Lead & Admin">Project Lead & Admin</option>
                      <option value="Admin Only">Admin Only</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Require Step Verification Checklist</p>
                      <p className="text-slate-500 dark:text-slate-400">All mandatory verification checklist items must be signed before review</p>
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

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Enforce QA / Code Review Sign-off</p>
                      <p className="text-slate-500 dark:text-slate-400">Require reviewer rating and audit comment before marking Completed</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={qaSignoffRequired}
                      onChange={(e) => {
                        setQaSignoffRequired(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Deadline & Overdue Rules */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" />
                    Deadline Rules & Overdue Task Escalation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Set proactive reminders and determine automated behavior when milestones pass due dates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Overdue Task Behavior
                    </label>
                    <select
                      value={overdueBehavior}
                      onChange={(e) => {
                        setOverdueBehavior(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Flag Red & Alert Lead">Flag Red & Alert Team Lead</option>
                      <option value="Auto-Escalate to Management">Auto-Escalate to Management</option>
                      <option value="Block Subsequent Sprint">Block Subsequent Sprint Tasks</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Grace Period Before Overdue Flag
                    </label>
                    <select
                      value={gracePeriod}
                      onChange={(e) => {
                        setGracePeriod(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Strict (0 mins)">Strict (0 mins)</option>
                      <option value="2 Hours">2 Hours</option>
                      <option value="4 Hours">4 Hours</option>
                      <option value="1 Business Day">1 Business Day</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: DOCUMENT PREFERENCES                                               */}
          {/* ========================================================================= */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Storage & File Upload Constraints
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure document behavior, supported file extensions, and encryption standards.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Maximum File Size
                    </label>
                    <select
                      value={maxFileSize}
                      onChange={(e) => {
                        setMaxFileSize(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="10 MB">10 MB</option>
                      <option value="25 MB">25 MB</option>
                      <option value="50 MB">50 MB</option>
                      <option value="100 MB">100 MB</option>
                      <option value="250 MB">250 MB</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Download Permissions
                    </label>
                    <select
                      value={downloadPermissions}
                      onChange={(e) => {
                        setDownloadPermissions(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="All Members">All Members</option>
                      <option value="Team Leaders & Admins">Team Leaders & Admins</option>
                      <option value="Admins Only">Admins Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Retention Period
                    </label>
                    <select
                      value={documentRetention}
                      onChange={(e) => {
                        setDocumentRetention(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="30 Days">30 Days</option>
                      <option value="90 Days">90 Days</option>
                      <option value="180 Days">180 Days</option>
                      <option value="1 Year">1 Year</option>
                      <option value="Indefinite">Indefinite (Permanent)</option>
                    </select>
                  </div>
                </div>

                {/* Allowed File Extensions Pills */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Allowed File Extensions
                  </label>
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
                                ? 'bg-blue-500/10 text-blue-600 dark:text-cyan-400 border-blue-500/30 shadow-xs'
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

                <div className="space-y-2.5 pt-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">In-Browser PDF Viewer & Text Extraction</p>
                      <p className="text-slate-500 dark:text-slate-400">Allow instant previewing without downloading</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePdfPreview}
                      onChange={(e) => {
                        setEnablePdfPreview(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Document Versioning History</p>
                      <p className="text-slate-500 dark:text-slate-400">Retain up to 10 historical revisions per asset</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableVersioning}
                      onChange={(e) => {
                        setEnableVersioning(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Enforce Standard Workspace Prefix</p>
                      <p className="text-slate-500 dark:text-slate-400">Prepend workspace code and auto-sanitize special characters</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enforceNamingPrefix}
                      onChange={(e) => {
                        setEnforceNamingPrefix(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: SECURITY & PRIVACY                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    Authentication & Session Security
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Two-factor authentication, failed login lockouts, and session idle timers.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                      <p className="text-slate-500 dark:text-slate-400">Require an authenticator app TOTP code on login</p>
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

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Suspicious Login Geo-Velocity Alerts</p>
                      <p className="text-slate-500 dark:text-slate-400">Notify user when logins occur from conflicting geolocations</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={suspiciousLoginAlerts}
                      onChange={(e) => {
                        setSuspiciousLoginAlerts(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Brute-Force Account Lockout Protection</p>
                      <p className="text-slate-500 dark:text-slate-400">Temporarily lock account for 15 mins after 5 consecutive failed passwords</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Session Idle Timeout
                    </label>
                    <select
                      value={sessionTimeout}
                      onChange={(e) => {
                        setSessionTimeout(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="15 mins">15 mins</option>
                      <option value="30 mins">30 mins</option>
                      <option value="1 hour">1 hour</option>
                      <option value="4 hours">4 hours</option>
                      <option value="8 hours">8 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Profile Visibility
                    </label>
                    <select
                      value={profileVisibility}
                      onChange={(e) => {
                        setProfileVisibility(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Organization Wide">Organization Wide</option>
                      <option value="Team Members Only">Team Members Only</option>
                      <option value="Admins Only">Admins Only</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: INTEGRATIONS                                                       */}
          {/* ========================================================================= */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-blue-500" />
                    Connected Services & Platform Integrations
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect third-party enterprise tools. Secret API keys and service accounts remain securely stored in the backend.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      key: 'firebase',
                      name: 'Firebase Live Cloud',
                      desc: 'Firestore real-time sync, auth tokens, and multi-tenant persistence.',
                      status: true,
                      immutable: true,
                    },
                    {
                      key: 'emailService',
                      name: 'Email Service (SMTP)',
                      desc: 'Transactional emails for task assignments, code reviews, and invitations.',
                      status: integrationStatuses.emailService,
                    },
                    {
                      key: 'googleCalendar',
                      name: 'Google Calendar',
                      desc: 'Sync sprint milestones, task due dates, and sprint reviews.',
                      status: integrationStatuses.googleCalendar,
                    },
                    {
                      key: 'googleDrive',
                      name: 'Google Drive',
                      desc: 'Direct cloud asset attachments and secure project backups.',
                      status: integrationStatuses.googleDrive,
                    },
                    {
                      key: 'slack',
                      name: 'Slack',
                      desc: 'Automated channel notifications for task assignments and review sign-offs.',
                      status: integrationStatuses.slack,
                    },
                    {
                      key: 'msTeams',
                      name: 'Microsoft Teams',
                      desc: 'Enterprise webhook alerts for sprint blockers and team communications.',
                      status: integrationStatuses.msTeams,
                    },
                    {
                      key: 'github',
                      name: 'GitHub',
                      desc: 'Pull request verification, commit tracking, and repository branch links.',
                      status: integrationStatuses.github,
                    },
                  ].map((integ) => (
                    <div
                      key={integ.key}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{integ.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              integ.status
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {integ.status ? 'Connected' : 'Not Connected'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{integ.desc}</p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                        {!integ.immutable ? (
                          <button
                            type="button"
                            onClick={() => toggleIntegration(integ.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              integ.status
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                            }`}
                          >
                            {integ.status ? 'Disconnect' : 'Connect'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            Active Core Engine
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 9: APPEARANCE                                                         */}
          {/* ========================================================================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-500" />
                    Theme & Personalization
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Customize the interface theme, sidebar behavior, layout density, and primary accent color.
                  </p>
                </div>

                {/* Theme Selector: Light Default Recommended */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Interface Theme Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Light Theme (Default)', desc: 'Clean, luminous white executive standard', icon: Sun },
                      { id: 'dark', label: 'Dark Theme', desc: 'Obsidian glassmorphism with neon accents', icon: Moon },
                      { id: 'system', label: 'System Default', desc: 'Matches your OS dark/light schedule', icon: Monitor },
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
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-blue-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{th.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{th.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Primary Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2.5">
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
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Base Font Size
                    </label>
                    <select
                      value={fontSize}
                      onChange={(e) => {
                        setFontSize(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="13px">Compact (13px)</option>
                      <option value="14px">Medium (14px - Default)</option>
                      <option value="16px">Large (16px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Animation Preference
                    </label>
                    <select
                      value={animationPreference}
                      onChange={(e) => {
                        setAnimationPreference(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="smooth">Full Fluid Animations</option>
                      <option value="reduced">Reduced Motion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Interface Density
                    </label>
                    <select
                      value={interfaceDensity}
                      onChange={(e) => {
                        setInterfaceDensity(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact Grid</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 10: SYSTEM & AUDIT                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'system-audit' && (
            <div className="space-y-6">
              {/* System Preferences Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-5">
                <div className="border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-blue-500" />
                    System Preferences & Maintenance Mode
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Platform timeout policies, data retention timelines, and system emergency states.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Automatic Inactivity Logout
                    </label>
                    <select
                      value={autoLogoutDuration}
                      onChange={(e) => {
                        setAutoLogoutDuration(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="30 mins">30 mins</option>
                      <option value="1 hour">1 hour</option>
                      <option value="4 hours">4 hours</option>
                      <option value="8 hours">8 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Session Token Validity
                    </label>
                    <select
                      value={defaultSessionDuration}
                      onChange={(e) => {
                        setDefaultSessionDuration(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="7 days">7 days</option>
                      <option value="14 days">14 days</option>
                      <option value="30 days">30 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Data Retention Preference
                    </label>
                    <select
                      value={dataRetentionPreference}
                      onChange={(e) => {
                        setDataRetentionPreference(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="1 Year">1 Year</option>
                      <option value="3 Years">3 Years</option>
                      <option value="7 Years">7 Years</option>
                      <option value="Permanent">Permanent</option>
                    </select>
                  </div>
                </div>

                {/* Maintenance Mode Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">System Maintenance Mode</span>
                      {!isAdmin && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Platform Admin Only
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Restrict platform access to system administrators while schema migrations or upgrades run.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={systemMaintenanceMode}
                    onChange={(e) => {
                      if (!isAdmin) return;
                      setSystemMaintenanceMode(e.target.checked);
                      setIsDirty(true);
                    }}
                    className={`w-4 h-4 rounded text-blue-600 ${!isAdmin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                </div>
              </div>

              {/* Administrative Audit Configuration & Trail */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-[#0c101b]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      Configuration & Security Audit Trail
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Immutable record of settings changes, permission modifications, and security events.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search audit trail..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3">Action Event</th>
                        <th className="p-3">User & Role</th>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">IP / Device</th>
                        <th className="p-3">Change Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No matching audit logs found.
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {log.action}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              <span className="font-semibold">{log.user}</span>
                              <span className="block text-[10px] text-slate-400 font-mono">
                                {log.role}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                              {log.date} • {log.time}
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                              <p className="font-mono">{log.ip}</p>
                              <p className="text-[10px]">{log.device}</p>
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300 text-[11px]">
                              {log.change}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-blue-500" />
                  <span>
                    Important distinction: Daily operational task updates and team chats appear in the Workspace Activity feed. This audit trail is strictly reserved for administrative, configuration, and security changes.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
              className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-white/15 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {confirmModal.title}
                  </h3>
                </div>
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
                      if (confirmModal.targetTab) {
                        setActiveTab(confirmModal.targetTab);
                      }
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
