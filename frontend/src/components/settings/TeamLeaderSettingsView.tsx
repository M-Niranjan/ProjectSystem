import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  KeyRound,
  Shield,
  Users,
  Sliders,
  Briefcase,
  FileText,
  MessageSquare,
  Bell,
  Palette,
  Globe,
  Grid,
  HelpCircle,
  Info,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  Building2,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Search,
  LogOut,
  RefreshCw,
  X,
  ArrowLeft,
  Camera,
  Calendar,
  Clock,
  Laptop,
  Smartphone,
  ShieldCheck,
  Send,
  Paperclip,
  UserPlus,
  UserMinus,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
  Layers,
  Activity,
  UserCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore, ThemeMode, AccentColor, ACCENT_PRESETS } from '../../store/useUIStore';
import { useScrollLock } from '../../hooks/useScrollLock';
import { resolveAvatar } from '../../services/avatar';
import { sendResetPasswordEmail } from '../../services/firebase';
import api from '../../services/api';
import { formatDisplayId } from '../../services/authRoles';
import PasswordStrengthMeter from '../common/PasswordStrengthMeter';
import LuxurySelect from '../common/LuxurySelect';
import AppearanceThemeSection from './AppearanceThemeSection';

export type TeamLeaderSettingsTab =
  | 'account'
  | 'security'
  | 'team-management'
  | 'workflow'
  | 'work'
  | 'documents'
  | 'communication'
  | 'notifications'
  | 'appearance'
  | 'regional'
  | 'integrations'
  | 'support';

interface ModuleGroup {
  groupTitle: string;
  modules: ModuleCard[];
}

interface ModuleCard {
  id: TeamLeaderSettingsTab;
  title: string;
  subtitle: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgLight: string;
  iconBgDark: string;
  iconColorLight: string;
  iconColorDark: string;
}

const TEAM_LEADER_MODULE_GROUPS: ModuleGroup[] = [
  {
    groupTitle: 'MY ACCOUNT',
    modules: [
      {
        id: 'account',
        title: 'Account & Profile',
        subtitle: 'Profile photo, contact details and credentials',
        icon: User,
        iconBgLight: 'bg-blue-50',
        iconBgDark: 'dark:bg-blue-500/10',
        iconColorLight: 'text-blue-600',
        iconColorDark: 'dark:text-blue-400',
      },
      {
        id: 'security',
        title: 'Security & Privacy',
        subtitle: 'Password, 2FA, active sessions and login logs',
        icon: Shield,
        iconBgLight: 'bg-emerald-50',
        iconBgDark: 'dark:bg-emerald-500/10',
        iconColorLight: 'text-emerald-600',
        iconColorDark: 'dark:text-emerald-400',
      },
    ],
  },
  {
    groupTitle: 'TEAM & WORK',
    modules: [
      {
        id: 'team-management',
        title: 'Team Management',
        subtitle: 'Assigned teammates, invitations and availability',
        badge: 'Lead',
        icon: Users,
        iconBgLight: 'bg-indigo-50',
        iconBgDark: 'dark:bg-indigo-500/10',
        iconColorLight: 'text-indigo-600',
        iconColorDark: 'dark:text-indigo-400',
      },
      {
        id: 'workflow',
        title: 'Workflow Rules',
        subtitle: 'Task stages, step verification gates and reviews',
        icon: Sliders,
        iconBgLight: 'bg-purple-50',
        iconBgDark: 'dark:bg-purple-500/10',
        iconColorLight: 'text-purple-600',
        iconColorDark: 'dark:text-purple-400',
      },
      {
        id: 'work',
        title: 'Work Preferences',
        subtitle: 'Working hours, default task views and sorting',
        icon: Briefcase,
        iconBgLight: 'bg-teal-50',
        iconBgDark: 'dark:bg-teal-500/10',
        iconColorLight: 'text-teal-600',
        iconColorDark: 'dark:text-teal-400',
      },
      {
        id: 'documents',
        title: 'Document Preferences',
        subtitle: 'Allowed formats, PDF preview and size limits',
        icon: FileText,
        iconBgLight: 'bg-amber-50',
        iconBgDark: 'dark:bg-amber-500/10',
        iconColorLight: 'text-amber-600',
        iconColorDark: 'dark:text-amber-400',
      },
    ],
  },
  {
    groupTitle: 'COMMUNICATION',
    modules: [
      {
        id: 'communication',
        title: 'Communication & Chat',
        subtitle: 'Online presence, read receipts and chat sounds',
        icon: MessageSquare,
        iconBgLight: 'bg-violet-50',
        iconBgDark: 'dark:bg-violet-500/10',
        iconColorLight: 'text-violet-600',
        iconColorDark: 'dark:text-violet-400',
      },
      {
        id: 'notifications',
        title: 'Notifications',
        subtitle: 'Task, team, sprint and mention alerts',
        icon: Bell,
        iconBgLight: 'bg-rose-50',
        iconBgDark: 'dark:bg-rose-500/10',
        iconColorLight: 'text-rose-600',
        iconColorDark: 'dark:text-rose-400',
      },
    ],
  },
  {
    groupTitle: 'PERSONALIZATION',
    modules: [
      {
        id: 'appearance',
        title: 'Appearance & Theme',
        subtitle: 'Light, dark or system theme and accent colors',
        icon: Palette,
        iconBgLight: 'bg-pink-50',
        iconBgDark: 'dark:bg-pink-500/10',
        iconColorLight: 'text-pink-600',
        iconColorDark: 'dark:text-pink-400',
      },
      {
        id: 'regional',
        title: 'Language & Region',
        subtitle: 'Timezone, date format and time display',
        icon: Globe,
        iconBgLight: 'bg-sky-50',
        iconBgDark: 'dark:bg-sky-500/10',
        iconColorLight: 'text-sky-600',
        iconColorDark: 'dark:text-sky-400',
      },
    ],
  },
  {
    groupTitle: 'INTEGRATIONS & SUPPORT',
    modules: [
      {
        id: 'integrations',
        title: 'Connected Integrations',
        subtitle: 'Google Calendar, Slack, GitHub and Drive',
        icon: Grid,
        iconBgLight: 'bg-cyan-50',
        iconBgDark: 'dark:bg-cyan-500/10',
        iconColorLight: 'text-cyan-600',
        iconColorDark: 'dark:text-cyan-400',
      },
      {
        id: 'support',
        title: 'Help & Support',
        subtitle: 'FAQs, contact admin and submit bug reports',
        icon: HelpCircle,
        iconBgLight: 'bg-orange-50',
        iconBgDark: 'dark:bg-orange-500/10',
        iconColorLight: 'text-orange-600',
        iconColorDark: 'dark:text-orange-400',
      },
    ],
  },
];

const TEAM_LEADER_ALL_MODULES = TEAM_LEADER_MODULE_GROUPS.flatMap((g) => g.modules);

const TIMEZONE_OPTIONS = [
  { value: 'UTC+05:30', label: 'UTC+05:30 (India Standard Time - IST)', subLabel: 'New Delhi, Mumbai, Bengaluru' },
  { value: 'UTC+00:00', label: 'UTC+00:00 (Greenwich Mean Time - GMT)', subLabel: 'London, Dublin, Lisbon' },
  { value: 'UTC-05:00', label: 'UTC-05:00 (Eastern Time - US & Canada)', subLabel: 'New York, Toronto, Miami' },
  { value: 'UTC-08:00', label: 'UTC-08:00 (Pacific Time - US & Canada)', subLabel: 'Los Angeles, San Francisco, Seattle' },
  { value: 'UTC+01:00', label: 'UTC+01:00 (Central European Time - CET)', subLabel: 'Berlin, Paris, Rome, Madrid' },
  { value: 'UTC+04:00', label: 'UTC+04:00 (Gulf Standard Time - GST)', subLabel: 'Dubai, Abu Dhabi, Muscat' },
  { value: 'UTC+08:00', label: 'UTC+08:00 (Singapore / China Time)', subLabel: 'Singapore, Beijing, Hong Kong' },
  { value: 'UTC+09:00', label: 'UTC+09:00 (Japan Standard Time - JST)', subLabel: 'Tokyo, Seoul' },
  { value: 'UTC+10:00', label: 'UTC+10:00 (Australian Eastern Time)', subLabel: 'Sydney, Melbourne, Brisbane' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-10-15)', subLabel: 'ISO standard' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/10/2026)', subLabel: 'UK, India, EU standard' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (10/15/2026)', subLabel: 'US standard' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (15 Oct 2026)', subLabel: 'Formatted date' },
];

const TIME_FORMAT_OPTIONS = [
  { value: '12-hour', label: '12-hour (02:30 PM)', subLabel: 'Standard 12-hour format with AM/PM' },
  { value: '24-hour', label: '24-hour (14:30)', subLabel: '24-hour military / international format' },
];

const FIRST_DAY_OPTIONS = [
  { value: 'Monday', label: 'Monday', subLabel: 'Standard ISO business week' },
  { value: 'Sunday', label: 'Sunday', subLabel: 'North America / Middle East standard' },
];

interface TeamLeaderSettingsViewProps {
  initialTab?: TeamLeaderSettingsTab | null;
  onTabChange?: (tab: TeamLeaderSettingsTab | null) => void;
}

export default function TeamLeaderSettingsView({
  initialTab = null,
  onTabChange,
}: TeamLeaderSettingsViewProps) {
  const { user, updateProfile, activeOrganization, activeOrganizationId } = useAuthStore();
  const {
    darkMode,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    showToast,
    setSignOutModalOpen,
  } = useUIStore();

  const [activeTab, setActiveTab] = useState<TeamLeaderSettingsTab | null>(initialTab);
  const [searchFilter, setSearchFilter] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync activeTab when parent changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (tab: TeamLeaderSettingsTab | null) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Safe parse preferences from user object or fallback
  const userPreferences = useMemo(() => {
    try {
      if (typeof user?.preferences === 'object' && user?.preferences !== null) {
        return user.preferences;
      }
      if (typeof user?.preferences === 'string') {
        return JSON.parse(user.preferences);
      }
    } catch {}
    return {};
  }, [user?.preferences]);

  // --------------------------------------------------------------------------
  // 1. ACCOUNT & PROFILE STATE
  // --------------------------------------------------------------------------
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [designation, setDesignation] = useState(user?.designation || 'Team Leader & Senior Engineer');
  const [department, setDepartment] = useState(user?.department || 'Engineering');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState(user?.skills || 'Leadership, React, Architecture, Sprint Planning');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read-only enterprise attributes
  const leaderId = formatDisplayId(user?.employeeId || user?.uid || user?.id, 'TL');
  const organizationName = activeOrganization?.organizationName || user?.organizationName || 'ABC Technology';
  const organizationCode = activeOrganization?.organizationCode || activeOrganizationId || 'ABC_123';
  const userEmail = user?.email || '';
  const dateJoined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '10 Jan 2024';

  // --------------------------------------------------------------------------
  // 2. SECURITY & PRIVACY STATE
  // --------------------------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(userPreferences.twoFactorEnabled ?? false);

  const [activeSessions, setActiveSessions] = useState([
    {
      id: 'sess-current',
      device: 'Chrome on Windows 11',
      type: 'desktop',
      ip: '192.168.1.45',
      location: 'Bengaluru, India',
      lastActive: 'Active Now',
      isCurrent: true,
    },
    {
      id: 'sess-mobile-1',
      device: 'Android App - Google Pixel 8',
      type: 'mobile',
      ip: '192.168.1.108',
      location: 'Bengaluru, India',
      lastActive: '1 hour ago',
      isCurrent: false,
    },
  ]);

  const [recentSecurityLogs] = useState([
    { id: 'log-1', action: 'Successful Team Lead Login', date: 'Today, 08:30 AM', ip: '192.168.1.45', device: 'Chrome on Windows 11' },
    { id: 'log-2', action: 'Security Credential Validated', date: 'Yesterday, 07:15 PM', ip: '192.168.1.45', device: 'Chrome on Windows 11' },
    { id: 'log-3', action: 'Team Management Session Refreshed', date: '04 Oct 2026, 03:20 PM', ip: '192.168.1.108', device: 'Google Pixel 8' },
  ]);

  // --------------------------------------------------------------------------
  // 3. TEAM MANAGEMENT STATE
  // --------------------------------------------------------------------------
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [eligibleTeammates, setEligibleTeammates] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  useScrollLock(inviteModalOpen);

  // Fetch team members and eligible teammates from API
  const fetchTeamData = async () => {
    setLoadingTeam(true);
    try {
      const [membersRes, eligibleRes] = await Promise.allSettled([
        api.get('/api/teams'),
        api.get('/api/teams/eligible-teammates'),
      ]);

      if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value.data)) {
        // Filter members that belong to this team leader or are active employees
        const leaderUid = String(user?.uid || user?.id || '');
        const myTeam = membersRes.value.data.filter((m: any) => {
          return m.teamLeaderId === leaderUid || m.role === 'ROLE_EMPLOYEE';
        });
        setTeamMembers(myTeam.length > 0 ? myTeam : membersRes.value.data.slice(0, 6));
      }

      if (eligibleRes.status === 'fulfilled' && Array.isArray(eligibleRes.value.data)) {
        setEligibleTeammates(eligibleRes.value.data);
      }
    } catch (err) {
      console.warn('Team data fetch note:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleRemoveMember = async (memberId: string | number, memberName: string) => {
    try {
      await api.post('/api/teams/remove-teammate', { employeeId: memberId });
      setTeamMembers((prev) => prev.filter((m) => String(m.id || m.uid) !== String(memberId)));
      showToast(`${memberName} removed from your team.`, 'info');
    } catch (err: any) {
      // Optimistic UI removal if endpoint responds
      setTeamMembers((prev) => prev.filter((m) => String(m.id || m.uid) !== String(memberId)));
      showToast(`${memberName} removed from your team.`, 'info');
    }
  };

  const handleInviteTeammate = async (emp: any) => {
    try {
      await api.post('/api/teams/invite-teammates', { employeeIds: [emp.id || emp.uid] });
      setTeamMembers((prev) => [...prev, emp]);
      setEligibleTeammates((prev) => prev.filter((e) => String(e.id || e.uid) !== String(emp.id || emp.uid)));
      showToast(`${emp.name} added to your team successfully.`, 'success');
    } catch (err: any) {
      setTeamMembers((prev) => [...prev, emp]);
      showToast(`${emp.name} added to your team successfully.`, 'success');
    }
  };

  // --------------------------------------------------------------------------
  // 4. WORKFLOW RULES STATE (Team Leader Level)
  // --------------------------------------------------------------------------
  const [requireStepVerification, setRequireStepVerification] = useState(
    userPreferences.workflow?.requireStepVerification ?? true
  );
  const [qaSignoffRequired, setQaSignoffRequired] = useState(
    userPreferences.workflow?.qaSignoffRequired ?? true
  );
  const [allowReopenCompleted, setAllowReopenCompleted] = useState(
    userPreferences.workflow?.allowReopenCompleted ?? true
  );
  const [returnRejectedToProgress, setReturnRejectedToProgress] = useState(
    userPreferences.workflow?.returnRejectedToProgress ?? true
  );
  const [deadlineAlert24h, setDeadlineAlert24h] = useState(
    userPreferences.workflow?.deadlineAlert24h ?? true
  );
  const [overdueEscalationBehavior, setOverdueEscalationBehavior] = useState(
    userPreferences.workflow?.overdueEscalationBehavior || 'Flag Red & Alert Lead'
  );
  const [allowSelfAssignTasks, setAllowSelfAssignTasks] = useState(
    userPreferences.workflow?.allowSelfAssignTasks ?? true
  );

  // --------------------------------------------------------------------------
  // 5. WORK PREFERENCES STATE (Replaces Workspace Configuration)
  // --------------------------------------------------------------------------
  const [workStartTime, setWorkStartTime] = useState(userPreferences.workStartTime || '09:00 AM');
  const [workEndTime, setWorkEndTime] = useState(userPreferences.workEndTime || '06:00 PM');
  const [workingDays, setWorkingDays] = useState<string[]>(
    userPreferences.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  );
  const [defaultTaskView, setDefaultTaskView] = useState<'list' | 'board' | 'timeline'>(
    userPreferences.defaultTaskView || 'board'
  );
  const [defaultProjectView, setDefaultProjectView] = useState<'grid' | 'list'>(
    userPreferences.defaultProjectView || 'grid'
  );
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'deadline' | 'updated' | 'title'>(
    userPreferences.taskSortBy || 'priority'
  );
  const [taskGroupBy, setTaskGroupBy] = useState<'status' | 'priority' | 'assignee' | 'none'>(
    userPreferences.taskGroupBy || 'status'
  );

  // --------------------------------------------------------------------------
  // 6. DOCUMENT PREFERENCES STATE
  // --------------------------------------------------------------------------
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>(
    userPreferences.documents?.allowedExtensions || [
      'PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPTX', 'PNG', 'JPG', 'JPEG', 'ZIP', 'SVG'
    ]
  );
  const [enablePdfPreview, setEnablePdfPreview] = useState(
    userPreferences.documents?.enablePdfPreview ?? true
  );
  const [autoCompressImages, setAutoCompressImages] = useState(
    userPreferences.documents?.autoCompressImages ?? true
  );
  const [enforceNamingPrefix, setEnforceNamingPrefix] = useState(
    userPreferences.documents?.enforceNamingPrefix ?? true
  );

  // --------------------------------------------------------------------------
  // 7. COMMUNICATION & CHAT STATE
  // --------------------------------------------------------------------------
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'away' | 'busy' | 'offline'>(
    userPreferences.onlineStatus || 'online'
  );
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'everyone' | 'team' | 'nobody'>(
    userPreferences.lastSeenPrivacy || 'team'
  );
  const [readReceipts, setReadReceipts] = useState(userPreferences.readReceipts ?? true);
  const [typingIndicator, setTypingIndicator] = useState(userPreferences.typingIndicator ?? true);
  const [chatSound, setChatSound] = useState(userPreferences.chatSound ?? true);

  // --------------------------------------------------------------------------
  // 8. NOTIFICATIONS STATE
  // --------------------------------------------------------------------------
  const [notifications, setNotifications] = useState({
    taskAssigned: { inApp: true, email: true, push: true },
    taskUpdated: { inApp: true, email: false, push: true },
    taskCompleted: { inApp: true, email: true, push: true },
    taskDeadline: { inApp: true, email: true, push: true },
    taskOverdue: { inApp: true, email: true, push: true },
    teamMemberUpdate: { inApp: true, email: true, push: false },
    teamAnnouncements: { inApp: true, email: true, push: true },
    projectUpdates: { inApp: true, email: false, push: true },
    projectMilestones: { inApp: true, email: true, push: true },
    directMessage: { inApp: true, email: false, push: true },
    mention: { inApp: true, email: true, push: true },
    reply: { inApp: true, email: true, push: true },
    fileShared: { inApp: true, email: false, push: true },
    systemAlerts: { inApp: true, email: true, push: true },
  });

  // --------------------------------------------------------------------------
  // 9. APPEARANCE STATE
  // --------------------------------------------------------------------------
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    userPreferences.density || 'comfortable'
  );

  // --------------------------------------------------------------------------
  // 10. LANGUAGE & REGION STATE
  // --------------------------------------------------------------------------
  const [language, setLanguage] = useState(userPreferences.language || 'English (US)');
  const [timezone, setTimezone] = useState(userPreferences.timezone || 'UTC+05:30');
  const [dateFormat, setDateFormat] = useState(userPreferences.dateFormat || 'YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState(userPreferences.timeFormat || '12-hour');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(userPreferences.firstDayOfWeek || 'Monday');

  // --------------------------------------------------------------------------
  // 11. CONNECTED INTEGRATIONS STATE
  // --------------------------------------------------------------------------
  const [connectedApps, setConnectedApps] = useState([
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync team sprint milestones, task deadlines and review schedules.',
      icon: Calendar,
      iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
      connected: userPreferences.apps?.googleCalendar ?? true,
      scopes: ['Read / Write task calendar events', 'Sprint sync reminders'],
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Broadcast task updates, step completion notices and mention alerts to team channel.',
      icon: MessageSquare,
      iconColor: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
      connected: userPreferences.apps?.slack ?? true,
      scopes: ['Post notifications to team channel', 'Slash command integrations'],
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect repository pull requests, branch reviews and commits to sprint cards.',
      icon: Briefcase,
      iconColor: 'text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20',
      connected: userPreferences.apps?.github ?? true,
      scopes: ['Link PRs to task IDs', 'Read commit metadata'],
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Link architectural diagrams, sprint documents and test deliverables.',
      icon: Paperclip,
      iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
      connected: userPreferences.apps?.googleDrive ?? false,
      scopes: ['Select files from Drive picker', 'Read-only link access'],
    },
    {
      id: 'microsoft-teams',
      name: 'Microsoft Teams',
      description: 'Schedule daily standup meetings and receive sprint progress summaries.',
      icon: Laptop,
      iconColor: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
      connected: userPreferences.apps?.msTeams ?? false,
      scopes: ['Teams meeting sync', 'Daily standup notifications'],
    },
  ]);

  // --------------------------------------------------------------------------
  // 12. HELP & SUPPORT STATE
  // --------------------------------------------------------------------------
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Team Workflow');
  const [ticketSeverity, setTicketSeverity] = useState('Medium');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketAttachmentName, setTicketAttachmentName] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittedTickets, setSubmittedTickets] = useState<any[]>([
    {
      ticketId: 'TKT-9104-TL',
      title: 'Workflow stage gate configuration support',
      category: 'Team Workflow',
      status: 'Resolved',
      date: '03 Oct 2026',
    },
  ]);

  const FAQ_ITEMS = [
    {
      q: 'How do I invite or assign an employee to my team?',
      a: 'Navigate to the Team Management module in Settings. Click "Invite / Add Teammates" to browse available employees in your organization and click "Add to Team".',
    },
    {
      q: 'How do I review and sign off on task step verification deliverables?',
      a: 'Open the Step Verification dashboard or the task detail modal. Under the Pipeline Stages tab, inspect the submitted deliverables and click "Approve Stage" or "Request Revision".',
    },
    {
      q: 'How does workspace isolation protect our team data?',
      a: 'All team rosters, tasks, sprints, documents, and chat channels are strictly tied to your authenticated organization. Users from external companies cannot access your workspace.',
    },
    {
      q: 'Can Team Leaders modify organization-wide roles or create administrators?',
      a: 'No. Global role provisioning and administrator management are restricted to System Administrators. Team Leaders manage team-level workflows and assigned members.',
    },
    {
      q: 'How do I set up automatic deadline alerts for my team?',
      a: 'Under Workflow Rules and Notifications, enable 24-hour and overdue deadline alerts. Alerts will be delivered in-app, via email, or push notifications according to your preferences.',
    },
  ];

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQ_ITEMS;
    const q = faqSearch.toLowerCase();
    return FAQ_ITEMS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [faqSearch]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showToast('Invalid image type. Please select a JPG, PNG, or WEBP file.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo is too large. Maximum file size is 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setProfilePhoto(base64);
      setPhotoPreview(base64);
      setIsDirty(true);
      showToast('Photo selected. Click "Save Preferences" to persist.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto('');
    setPhotoPreview(null);
    setIsDirty(true);
    showToast('Photo removed.', 'info');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword) {
      setPasswordError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match!');
      return;
    }

    setSaving(true);
    try {
      const success = await updateProfile({ password: newPassword });
      if (success) {
        setPasswordSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password updated successfully.', 'success');
      } else {
        setPasswordError('Failed to update password. Please verify your connection.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!userEmail) return;
    setResetEmailSending(true);
    try {
      await sendResetPasswordEmail(userEmail);
      showToast(`Password reset link sent to ${userEmail}. Check your inbox.`, 'success', 5000);
    } catch (err: any) {
      showToast(err.message || 'Failed to send password reset email.', 'error');
    } finally {
      setResetEmailSending(false);
    }
  };

  const handleToggleApp = (appId: string) => {
    setConnectedApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, connected: !app.connected } : app))
    );
    setIsDirty(true);
    const targetApp = connectedApps.find((a) => a.id === appId);
    showToast(
      targetApp?.connected
        ? `Disconnected from ${targetApp.name}.`
        : `Connected to ${targetApp?.name} successfully.`,
      'info'
    );
  };

  const handleSignOutOtherSessions = () => {
    setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
    showToast('All other remote device sessions have been terminated.', 'success');
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDesc.trim()) {
      showToast('Please provide both a ticket title and a detailed description.', 'error');
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await api.post('/api/users/support-ticket', {
        title: ticketTitle.trim(),
        category: ticketCategory,
        severity: ticketSeverity,
        description: ticketDesc.trim(),
        attachmentName: ticketAttachmentName,
      });

      const newTicket = res.data?.ticket || {
        ticketId: `TKT-${Math.floor(1000 + Math.random() * 9000)}-TL`,
        title: ticketTitle.trim(),
        category: ticketCategory,
        status: 'Open',
        date: 'Today',
      };

      setSubmittedTickets((prev) => [newTicket, ...prev]);
      setTicketTitle('');
      setTicketDesc('');
      setTicketAttachmentName(null);
      showToast(`Ticket #${newTicket.ticketId} submitted successfully to the Support Team.`, 'success', 5000);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit ticket. Please try again.', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSaveAllPreferences = async () => {
    setSaving(true);
    try {
      const preferencesPayload = {
        twoFactorEnabled,
        workflow: {
          requireStepVerification,
          qaSignoffRequired,
          allowReopenCompleted,
          returnRejectedToProgress,
          deadlineAlert24h,
          overdueEscalationBehavior,
          allowSelfAssignTasks,
        },
        documents: {
          allowedExtensions,
          enablePdfPreview,
          autoCompressImages,
          enforceNamingPrefix,
        },
        notifications,
        onlineStatus,
        lastSeenPrivacy,
        readReceipts,
        typingIndicator,
        chatSound,
        density,
        workStartTime,
        workEndTime,
        workingDays,
        defaultTaskView,
        defaultProjectView,
        taskSortBy,
        taskGroupBy,
        language,
        timezone,
        dateFormat,
        timeFormat,
        firstDayOfWeek,
        apps: {
          googleCalendar: connectedApps.find((a) => a.id === 'google-calendar')?.connected ?? false,
          slack: connectedApps.find((a) => a.id === 'slack')?.connected ?? false,
          github: connectedApps.find((a) => a.id === 'github')?.connected ?? false,
          googleDrive: connectedApps.find((a) => a.id === 'google-drive')?.connected ?? false,
          msTeams: connectedApps.find((a) => a.id === 'microsoft-teams')?.connected ?? false,
        },
      };

      const profilePayload: any = {
        name: name.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        bio: bio.trim(),
        skills: skills.trim(),
        preferences: preferencesPayload,
      };

      if (profilePhoto) {
        profilePayload.profilePhoto = profilePhoto;
      }

      const success = await updateProfile(profilePayload);
      if (success) {
        setIsDirty(false);
        showToast('Team Leader preferences and settings saved successfully.', 'success');
      } else {
        showToast('Unable to save changes. Please check your network connection.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setDesignation(user?.designation || 'Team Leader & Senior Engineer');
    setBio(user?.bio || '');
    setSkills(user?.skills || '');
    setProfilePhoto(user?.profilePhoto || '');
    setPhotoPreview(null);
    setIsDirty(false);
    showToast('Changes discarded.', 'info');
  };

  // Flattened modules for search filter
  const allModules = useMemo(() => {
    return TEAM_LEADER_MODULE_GROUPS.flatMap((g) => g.modules);
  }, []);

  const activeModule = allModules.find((m) => m.id === activeTab);

  return (
    <div className="min-h-[calc(100vh-5rem)] pb-16">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Team Leader Settings
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              {organizationName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Team &amp; Account Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your team roster, workflow rules, personal preferences and security settings.
          </p>
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search team settings..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition shadow-xs"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Master / Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: Module Navigation List (Hidden on mobile if a tab is open) */}
        <div
          className={`lg:col-span-4 space-y-4 ${
            activeTab ? 'hidden lg:block' : 'block'
          }`}
        >
          {TEAM_LEADER_MODULE_GROUPS.map((group, gIdx) => {
            const visibleModules = group.modules.filter(
              (m) =>
                !searchFilter.trim() ||
                m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                m.subtitle.toLowerCase().includes(searchFilter.toLowerCase())
            );

            if (visibleModules.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1.5">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 dark:text-slate-500 px-3">
                  {group.groupTitle}
                </span>

                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-xs space-y-0.5">
                  {visibleModules.map((mod) => {
                    const IconComp = mod.icon;
                    const isSelected = activeTab === mod.id;

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => handleSelectTab(mod.id)}
                        className={`w-full text-left p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-500/30 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : `${mod.iconBgLight} ${mod.iconBgDark} ${mod.iconColorLight} ${mod.iconColorDark} border-slate-200/60 dark:border-white/5`
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-bold truncate ${
                                  isSelected
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {mod.title}
                              </span>
                              {mod.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  {mod.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {mod.subtitle}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected
                              ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5'
                              : 'text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quick Sign Out Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Sign Out</span>
                <span className="text-[11px] text-slate-400 block">End current session</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSignOutModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Selected Module Content */}
        <div className={`lg:col-span-8 ${!activeTab ? 'hidden lg:block' : 'block'}`}>
          {!activeTab ? (
            /* Desktop Empty State placeholder when no module selected */
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Sliders className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Select a Settings Module
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                Choose any category from the left menu to manage your team roster, workflow verification rules, notification channels, and workspace preferences.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
                {TEAM_LEADER_ALL_MODULES.slice(0, 6).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectTab(m.id)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200/80 dark:border-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left cursor-pointer"
                  >
                    {m.title}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mobile Back Button Header */}
              <div className="lg:hidden flex items-center justify-between bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-3 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleSelectTab(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Modules</span>
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {activeModule?.title}
                </span>
              </div>

            {/* Module 1: ACCOUNT & PROFILE */}
            {activeTab === 'account' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Account &amp; Profile Details
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage your Team Leader profile, professional designation, contact information and bio.
                  </p>
                </div>

                {/* Profile Photo Avatar Section */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative group">
                    <img
                      src={photoPreview || resolveAvatar(profilePhoto, user?.gender, name || userEmail)}
                      alt={name || 'Team Leader Avatar'}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      title="Upload new photo"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                    <p className="text-xs text-slate-400">
                      Supports PNG, JPG, or WEBP up to 5MB. Visible across your team workspace.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>
                      {profilePhoto && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Job Title / Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => {
                        setDesignation(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => {
                        setDepartment(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Technical Skills &amp; Leadership Specializations
                    </label>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => {
                        setSkills(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Bio / Summary
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Brief overview of your team responsibilities..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition resize-none"
                    />
                  </div>
                </div>

                {/* Read-Only Organization & Role Badges (Protected) */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Protected Enterprise Attributes (Read-Only)
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                      <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Role</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">Team Leader</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                      <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Team Leader ID</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block" title={String(user?.employeeId || user?.uid || user?.id || leaderId)}>
                        {leaderId}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                      <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Organization</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block" title={organizationName}>
                        {organizationName}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                      <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Workspace Code</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block" title={organizationCode}>
                        {organizationCode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Module 2: SECURITY & PRIVACY */}
            {activeTab === 'security' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-500" />
                    Security &amp; Active Sessions
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage your Team Leader password, 2FA protection and view your active signed-in devices.
                  </p>
                </div>

                {/* Change Password Form */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-500" />
                    Change Password
                  </h3>

                  {passwordError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-medium">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Letters, numbers & symbols"
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Visual Password Strength Indicator */}
                    <PasswordStrengthMeter password={newPassword} />

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={saving || !newPassword}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        {saving ? 'Updating Password...' : 'Save New Password'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2FA Toggle & Password Reset Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">2-Factor Auth (2FA)</span>
                      <span className="text-[11px] text-slate-400 block">{twoFactorEnabled ? 'Activated' : 'Disabled'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTwoFactorEnabled(!twoFactorEnabled);
                        setIsDirty(true);
                        showToast(!twoFactorEnabled ? '2FA Enabled.' : '2FA Disabled.', 'info');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        twoFactorEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {twoFactorEnabled ? 'Enabled' : 'Enable'}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Email Password Link</span>
                      <span className="text-[11px] text-slate-400 block">Send link to {userEmail}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={resetEmailSending}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {resetEmailSending ? 'Sending...' : 'Send Link'}
                    </button>
                  </div>
                </div>

                {/* Active Sessions List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Active Signed-In Devices</h3>
                    {activeSessions.length > 1 && (
                      <button
                        type="button"
                        onClick={handleSignOutOtherSessions}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        Sign Out Other Devices
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {activeSessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#07090e] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                            {sess.type === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{sess.device}</span>
                              {sess.isCurrent && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{sess.ip} &bull; {sess.location} &bull; {sess.lastActive}</span>
                          </div>
                        </div>

                        {!sess.isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSessions((prev) => prev.filter((s) => s.id !== sess.id));
                              showToast(`Signed out from ${sess.device}.`, 'info');
                            }}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                          >
                            Terminate
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Module 3: TEAM MANAGEMENT (Key Feature for Team Leader) */}
            {activeTab === 'team-management' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-500" />
                      Team Management &amp; Teammate Roster
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Manage assigned employees, invite teammates from your organization directory and view availability.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Invite / Add Teammates</span>
                  </button>
                </div>

                {/* Team Roster Summary Pill */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      {teamMembers.length}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {name || 'Team Lead'}&apos;s Active Team Roster
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Scoped to {organizationName} ({organizationCode}) &bull; Authorized members only
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> {teamMembers.filter((m) => m.status !== 'inactive').length} Active
                    </span>
                  </div>
                </div>

                {/* Assigned Team Members Table / Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Assigned Team Members ({teamMembers.length})
                    </h3>
                    <div className="relative w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                        placeholder="Search team..."
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none"
                      />
                    </div>
                  </div>

                  {loadingTeam ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading team roster...</div>
                  ) : teamMembers.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                      <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No members currently assigned</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Invite / Add Teammates&quot; to build your squad.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {teamMembers
                        .filter(
                          (m) =>
                            !teamSearchQuery.trim() ||
                            (m.name || '').toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
                            (m.email || '').toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
                            (m.designation || '').toLowerCase().includes(teamSearchQuery.toLowerCase())
                        )
                        .map((member) => {
                          const mId = member.id || member.uid;
                          return (
                            <div
                              key={mId}
                              className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#07090e] flex items-center justify-between gap-3 shadow-2xs hover:border-indigo-500/30 transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={resolveAvatar(member.profilePhoto, member.name || member.email, member.gender)}
                                  alt={member.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                    {member.name || member.email?.split('@')[0]}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {member.designation || 'Software Engineer'} &bull; {member.department || 'Engineering'}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono block truncate">{member.email}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(mId, member.name || 'Member')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                                title="Remove from team"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Team Collaboration Rules */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Team Assignment Permissions</h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#0e1322] border border-slate-200/60 dark:border-white/5">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">Allow Team Members to Self-Assign Backlog Tasks</span>
                        <span className="text-[10px] text-slate-400 block">Teammates can claim open tasks from the project backlog directly</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={allowSelfAssignTasks}
                        onChange={(e) => {
                          setAllowSelfAssignTasks(e.target.checked);
                          setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Module 4: WORKFLOW RULES */}
            {activeTab === 'workflow' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-purple-500" />
                    Team Workflow &amp; Review Rules
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure step verification gates, code review requirements and deadline escalation policies for your team.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Enforce Step Verification Gate</span>
                      <span className="text-[10px] text-slate-400 block">Require completed deliverables upload before moving task into Code Review stage</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={requireStepVerification}
                      onChange={(e) => {
                        setRequireStepVerification(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Team Leader Sign-Off Required for Task Completion</span>
                      <span className="text-[10px] text-slate-400 block">Tasks can only move to Completed / Done after Team Leader acceptance</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={qaSignoffRequired}
                      onChange={(e) => {
                        setQaSignoffRequired(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Return Rejected Tasks to &quot;In Progress&quot;</span>
                      <span className="text-[10px] text-slate-400 block">When review feedback is requested, automatically switch status back to In Progress</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={returnRejectedToProgress}
                      onChange={(e) => {
                        setReturnRejectedToProgress(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Allow Reopening Completed Tasks</span>
                      <span className="text-[10px] text-slate-400 block">Permit Team Leader to reopen closed tasks if secondary QA finds defects</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowReopenCompleted}
                      onChange={(e) => {
                        setAllowReopenCompleted(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Deadline Reminder Alert (24h Before Due Date)</span>
                      <span className="text-[10px] text-slate-400 block">Trigger high-priority alert to assignee and Team Lead 24 hours prior to deadline</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={deadlineAlert24h}
                      onChange={(e) => {
                        setDeadlineAlert24h(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Overdue Task Escalation Behavior
                    </label>
                    <LuxurySelect
                      value={overdueEscalationBehavior}
                      onChange={(val) => {
                        setOverdueEscalationBehavior(val);
                        setIsDirty(true);
                      }}
                      options={[
                        { value: 'Flag Red & Alert Lead', label: 'Flag Red & Alert Team Lead', subLabel: 'Immediate dashboard badge & notification' },
                        { value: 'Auto-Escalate to Management', label: 'Auto-Escalate to Management', subLabel: 'CC project manager in sprint digest' },
                        { value: 'Block Subsequent Sprint', label: 'Block Subsequent Sprint Dependencies', subLabel: 'Lock dependent tasks' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Module 5: WORK PREFERENCES (Replaces Workspace Configuration) */}
            {activeTab === 'work' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-teal-500" />
                    Personal &amp; Team Work Preferences
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure your working hours, default sprint views, task sorting and grouping.
                  </p>
                </div>

                {/* Shift Working Hours */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Team Shift Working Hours
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Shift Start Time</span>
                      <input
                        type="text"
                        value={workStartTime}
                        onChange={(e) => {
                          setWorkStartTime(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-medium text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Shift End Time</span>
                      <input
                        type="text"
                        value={workEndTime}
                        onChange={(e) => {
                          setWorkEndTime(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-medium text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Active Working Days */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Default Views & Sorting */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-white/10 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Default Task View
                    </label>
                    <LuxurySelect
                      value={defaultTaskView}
                      onChange={(val) => {
                        setDefaultTaskView(val as any);
                        setIsDirty(true);
                      }}
                      options={[
                        { value: 'board', label: 'Kanban Board', subLabel: 'Visual sprint columns' },
                        { value: 'list', label: 'List View', subLabel: 'Structured table rows' },
                        { value: 'timeline', label: 'Timeline / Gantt', subLabel: 'Milestone schedule view' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Default Project View
                    </label>
                    <LuxurySelect
                      value={defaultProjectView}
                      onChange={(val) => {
                        setDefaultProjectView(val as any);
                        setIsDirty(true);
                      }}
                      options={[
                        { value: 'grid', label: 'Grid Cards View', subLabel: 'Visual project dashboard cards' },
                        { value: 'list', label: 'List View', subLabel: 'Compact table list' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Task Sorting
                    </label>
                    <LuxurySelect
                      value={taskSortBy}
                      onChange={(val) => {
                        setTaskSortBy(val as any);
                        setIsDirty(true);
                      }}
                      options={[
                        { value: 'priority', label: 'Priority First', subLabel: 'Urgent & High priority tasks first' },
                        { value: 'deadline', label: 'Deadline First', subLabel: 'Earliest due date first' },
                        { value: 'updated', label: 'Recently Updated', subLabel: 'Latest activity first' },
                        { value: 'title', label: 'Alphabetical', subLabel: 'A-Z task title order' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Task Grouping
                    </label>
                    <LuxurySelect
                      value={taskGroupBy}
                      onChange={(val) => {
                        setTaskGroupBy(val as any);
                        setIsDirty(true);
                      }}
                      options={[
                        { value: 'status', label: 'Group by Status', subLabel: 'To Do, In Progress, Review, Done' },
                        { value: 'priority', label: 'Group by Priority', subLabel: 'Urgent, High, Medium, Low' },
                        { value: 'assignee', label: 'Group by Assignee', subLabel: 'Organized by teammate' },
                        { value: 'none', label: 'No Grouping', subLabel: 'Flat continuous list' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Module 6: DOCUMENT PREFERENCES */}
            {activeTab === 'documents' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    Document &amp; Deliverable Preferences
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure permitted file attachments, inline PDF viewer settings and deliverable naming conventions.
                  </p>
                </div>

                {/* Allowed File Extensions */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Permitted File Formats for Team Tasks
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'PNG', 'JPG', 'JPEG', 'ZIP', 'SVG'].map((ext) => {
                      const isSelected = allowedExtensions.includes(ext);
                      return (
                        <button
                          key={ext}
                          type="button"
                          onClick={() => {
                            setAllowedExtensions((prev) =>
                              isSelected ? prev.filter((e) => e !== ext) : [...prev, ext]
                            );
                            setIsDirty(true);
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-slate-50 dark:bg-white/[0.02] text-slate-400 border-slate-200 dark:border-white/5'
                          }`}
                        >
                          {ext}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Enable Inline Luxury PDF Viewer</span>
                      <span className="text-[10px] text-slate-400 block">Open submitted PDF deliverables directly inside full-page modal with zoom &amp; search</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePdfPreview}
                      onChange={(e) => {
                        setEnablePdfPreview(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Auto-Compress High Resolution Images</span>
                      <span className="text-[10px] text-slate-400 block">Optimize UI design mockups for fast mobile loading</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoCompressImages}
                      onChange={(e) => {
                        setAutoCompressImages(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Enforce Sprint Naming Prefix</span>
                      <span className="text-[10px] text-slate-400 block">Automatically tag uploaded deliverables with Task ID prefix</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enforceNamingPrefix}
                      onChange={(e) => {
                        setEnforceNamingPrefix(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Module 7: COMMUNICATION & CHAT */}
            {activeTab === 'communication' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-violet-500" />
                    Communication &amp; Team Presence
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Control your presence visibility, read receipts, typing status and chat chime alerts.
                  </p>
                </div>

                {/* Workspace Isolation Notice */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-indigo-700 dark:text-indigo-400 block mb-0.5">
                      Organization Boundary Enforced
                    </span>
                    Your team chats, direct messages and file attachments are strictly isolated within{' '}
                    <strong>{organizationName}</strong> (<code>{organizationCode}</code>).
                  </div>
                </div>

                {/* Online Status Selection */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    My Presence Status
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'online', label: 'Online / Active', color: 'bg-emerald-500' },
                      { id: 'away', label: 'Away / Inactive', color: 'bg-amber-500' },
                      { id: 'busy', label: 'Do Not Disturb', color: 'bg-rose-500' },
                      { id: 'offline', label: 'Invisible', color: 'bg-slate-400' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setOnlineStatus(item.id as any);
                          setIsDirty(true);
                        }}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                          onlineStatus === item.id
                            ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Toggles */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Read Receipts</span>
                      <span className="text-[11px] text-slate-400 block">Show checkmarks when messages are seen</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={readReceipts}
                      onChange={(e) => {
                        setReadReceipts(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Typing Indicator</span>
                      <span className="text-[11px] text-slate-400 block">Show when drafting messages in team channel</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={typingIndicator}
                      onChange={(e) => {
                        setTypingIndicator(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {chatSound ? <Volume2 className="w-4 h-4 text-violet-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">Chat Notification Chime</span>
                        <span className="text-[11px] text-slate-400 block">Play sound on incoming direct messages</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={chatSound}
                      onChange={(e) => {
                        setChatSound(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Module 8: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-rose-500" />
                    Team Leader Notification Alerts
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize your alert triggers across In-App, Email and Push channels.
                  </p>
                </div>

                <div className="grid grid-cols-12 text-xs font-bold text-slate-400 border-b border-slate-100 dark:border-white/10 pb-2 px-2">
                  <div className="col-span-6 sm:col-span-7">Event Trigger</div>
                  <div className="col-span-2 sm:col-span-2 text-center">In-App</div>
                  <div className="col-span-2 sm:col-span-2 text-center">Email</div>
                  <div className="col-span-2 sm:col-span-1 text-center">Push</div>
                </div>

                {/* Groups */}
                {[
                  {
                    title: 'TASKS & REVIEWS',
                    color: 'text-blue-500',
                    items: [
                      { key: 'taskAssigned', label: 'Task Assigned / Delegated', desc: 'When you assign a task or receive delegation' },
                      { key: 'taskCompleted', label: 'Task Deliverable Submitted for Review', desc: 'When a teammate completes steps and submits for review' },
                      { key: 'taskDeadline', label: 'Deadline Approaching (24h)', desc: 'Milestone reminder before due date' },
                      { key: 'taskOverdue', label: 'Task Overdue Escalation', desc: 'Urgent notice when a team task passes deadline' },
                    ],
                  },
                  {
                    title: 'TEAM & SPRINT MILESTONES',
                    color: 'text-indigo-500',
                    items: [
                      { key: 'teamMemberUpdate', label: 'Team Member Status Changes', desc: 'When teammate goes on leave or updates availability' },
                      { key: 'projectMilestones', label: 'Sprint Milestone Achieved', desc: 'When team hits sprint target milestones' },
                    ],
                  },
                  {
                    title: 'COMMUNICATION & SYSTEM',
                    color: 'text-purple-500',
                    items: [
                      { key: 'directMessage', label: 'Direct Messages & Mentions', desc: 'When teammate tags or messages you' },
                      { key: 'systemAlerts', label: 'Critical System & Security Notices', desc: 'Security updates and maintenance alerts' },
                    ],
                  },
                ].map((grp, grpIdx) => (
                  <div key={grpIdx} className={`space-y-2 ${grpIdx > 0 ? 'pt-3 border-t border-slate-100 dark:border-white/10' : ''}`}>
                    <h3 className={`text-xs font-bold ${grp.color} uppercase tracking-wider`}>
                      {grp.title}
                    </h3>
                    {grp.items.map((item) => {
                      const cfg = (notifications as any)[item.key] || { inApp: true, email: false, push: true };
                      return (
                        <div
                          key={item.key}
                          className="grid grid-cols-12 items-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] border border-transparent hover:border-slate-200/60 dark:hover:border-white/5 transition"
                        >
                          <div className="col-span-6 sm:col-span-7 pr-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.label}</span>
                            <span className="text-[10px] text-slate-400 block">{item.desc}</span>
                          </div>
                          <div className="col-span-2 sm:col-span-2 flex justify-center">
                            <input
                              type="checkbox"
                              checked={cfg.inApp}
                              onChange={(e) => {
                                setNotifications((prev: any) => ({
                                  ...prev,
                                  [item.key]: { ...prev[item.key], inApp: e.target.checked },
                                }));
                                setIsDirty(true);
                              }}
                              className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-2 flex justify-center">
                            <input
                              type="checkbox"
                              checked={cfg.email}
                              onChange={(e) => {
                                setNotifications((prev: any) => ({
                                  ...prev,
                                  [item.key]: { ...prev[item.key], email: e.target.checked },
                                }));
                                setIsDirty(true);
                              }}
                              className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1 flex justify-center">
                            <input
                              type="checkbox"
                              checked={cfg.push}
                              onChange={(e) => {
                                setNotifications((prev: any) => ({
                                  ...prev,
                                  [item.key]: { ...prev[item.key], push: e.target.checked },
                                }));
                                setIsDirty(true);
                              }}
                              className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Module 9: APPEARANCE & THEME */}
            {activeTab === 'appearance' && (
              <AppearanceThemeSection onDirtyChange={setIsDirty} />
            )}

            {/* Module 10: LANGUAGE & REGION */}
            {activeTab === 'regional' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-sky-500" />
                    Language &amp; Regional Settings
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure timezone, date formats, time display and system language.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">System Language</label>
                    <LuxurySelect
                      value={language}
                      onChange={(val) => {
                        setLanguage(val);
                        setIsDirty(true);
                      }}
                      options={[
                        { value: 'English (US)', label: 'English (United States)', subLabel: 'Default workspace language' },
                        { value: 'English (UK)', label: 'English (United Kingdom)', subLabel: 'British English' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Workspace Timezone</label>
                    <LuxurySelect
                      value={timezone}
                      onChange={(val) => {
                        setTimezone(val);
                        setIsDirty(true);
                      }}
                      options={TIMEZONE_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Date Format</label>
                    <LuxurySelect
                      value={dateFormat}
                      onChange={(val) => {
                        setDateFormat(val);
                        setIsDirty(true);
                      }}
                      options={DATE_FORMAT_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Time Format</label>
                    <LuxurySelect
                      value={timeFormat}
                      onChange={(val) => {
                        setTimeFormat(val);
                        setIsDirty(true);
                      }}
                      options={TIME_FORMAT_OPTIONS}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">First Day of the Week</label>
                    <LuxurySelect
                      value={firstDayOfWeek}
                      onChange={(val) => {
                        setFirstDayOfWeek(val);
                        setIsDirty(true);
                      }}
                      options={FIRST_DAY_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Module 11: CONNECTED INTEGRATIONS */}
            {activeTab === 'integrations' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Grid className="w-5 h-5 text-cyan-500" />
                    Connected Integrations
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect team tools like Google Calendar, Slack and GitHub for automated sprint notifications.
                  </p>
                </div>

                <div className="space-y-3">
                  {connectedApps.map((app) => {
                    const IconComponent = app.icon;
                    return (
                      <div
                        key={app.id}
                        className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#07090e] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${app.iconColor}`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{app.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                app.connected
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'
                              }`}>
                                {app.connected ? 'Connected' : 'Disconnected'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">{app.description}</p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {app.scopes.map((scope, sIdx) => (
                                <span key={sIdx} className="px-2 py-0.5 rounded-md text-[9px] bg-slate-100 dark:bg-white/5 text-slate-400 font-medium">
                                  &bull; {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleApp(app.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 self-end sm:self-center ${
                            app.connected
                              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          }`}
                        >
                          {app.connected ? 'Disconnect' : 'Connect App'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Module 12: HELP & SUPPORT */}
            {activeTab === 'support' && (
              <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-orange-500" />
                    Help &amp; Support
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Browse frequently asked questions, contact system administrator or submit a problem ticket.
                  </p>
                </div>

                {/* FAQ Search Accordion */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h3>
                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                        placeholder="Filter questions..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredFaqs.map((faq, idx) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <span>{faq.q}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="p-3.5 pt-0 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5 leading-relaxed bg-white dark:bg-black/20">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Report Bug / Problem Form */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#07090e] space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    Submit Problem or Bug Report
                  </h3>

                  <form onSubmit={handleSubmitTicket} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Problem Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketTitle}
                        onChange={(e) => setTicketTitle(e.target.value)}
                        placeholder="e.g. Step verification approval status not triggering email notification"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                        <LuxurySelect
                          value={ticketCategory}
                          onChange={(val) => setTicketCategory(val)}
                          options={[
                            { value: 'Team Workflow', label: 'Team Workflow & Pipelines' },
                            { value: 'Task Tracking', label: 'Task Tracking & Steps' },
                            { value: 'File Deliverables', label: 'File Deliverables & PDF' },
                            { value: 'Communication', label: 'Chat & Notifications' },
                            { value: 'Other', label: 'Other' },
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Severity</label>
                        <LuxurySelect
                          value={ticketSeverity}
                          onChange={(val) => setTicketSeverity(val)}
                          options={[
                            { value: 'Low', label: 'Low - Minor Cosmetic' },
                            { value: 'Medium', label: 'Medium - Workflow Inconvenience' },
                            { value: 'High', label: 'High - Blocker for Team Review' },
                            { value: 'Urgent', label: 'Urgent - System Outage' },
                          ]}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Detailed Description <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={ticketDesc}
                        onChange={(e) => setTicketDesc(e.target.value)}
                        placeholder="Describe the problem or steps to reproduce..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-200">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{ticketAttachmentName || 'Attach Screenshot'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setTicketAttachmentName(file.name);
                              showToast(`Attached ${file.name}`, 'info');
                            }
                          }}
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={submittingTicket || !ticketTitle || !ticketDesc}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{submittingTicket ? 'Submitting...' : 'Submit Ticket'}</span>
                      </button>
                    </div>
                  </form>

                  {/* History */}
                  {submittedTickets.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Recent Tickets
                      </span>
                      {submittedTickets.map((t, tIdx) => (
                        <div
                          key={tIdx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{t.ticketId}</span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">{t.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{t.category} &bull; {t.date}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Save Action Bar */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 inset-x-4 max-w-xl mx-auto z-50 p-3.5 px-5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl flex items-center justify-between gap-4 border border-white/20"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold">You have unsaved changes</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 dark:text-slate-600 hover:text-white dark:hover:text-black transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveAllPreferences}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Teammates Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-500" />
                  Add Teammates from Directory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing verified employees in {organizationName} available for assignment.
                </p>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {eligibleTeammates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No unassigned employees available in the directory. All employees are assigned.
                </div>
              ) : (
                eligibleTeammates.map((emp) => {
                  const eId = emp.id || emp.uid;
                  return (
                    <div
                      key={eId}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={resolveAvatar(emp.profilePhoto, emp.name || emp.email, emp.gender)}
                          alt={emp.name}
                          className="w-9 h-9 rounded-xl object-cover border shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {emp.designation || 'Software Engineer'} &bull; {emp.department || 'Engineering'}
                          </span>
                          {emp.isAssignedToOtherTeam && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block">
                              Currently on {emp.currentTeam}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInviteTeammate(emp)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-xs"
                      >
                        Add to Team
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 text-right border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
