import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  KeyRound,
  Shield,
  Bell,
  MessageSquare,
  Palette,
  Briefcase,
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
  FileText,
  Paperclip,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
  Sliders,
  Layers
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

export type EmployeeSettingsTab =
  | 'profile'
  | 'account'
  | 'security'
  | 'notifications'
  | 'communication'
  | 'appearance'
  | 'work'
  | 'regional'
  | 'integrations'
  | 'support'
  | 'about';

interface ModuleCard {
  id: EmployeeSettingsTab;
  title: string;
  subtitle: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgLight: string;
  iconBgDark: string;
  iconColorLight: string;
  iconColorDark: string;
}

const EMPLOYEE_MODULES: ModuleCard[] = [
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Manage your name, avatar, contact and bio',
    icon: User,
    iconBgLight: 'bg-blue-50',
    iconBgDark: 'dark:bg-blue-500/10',
    iconColorLight: 'text-blue-600',
    iconColorDark: 'dark:text-blue-400',
  },
  {
    id: 'account',
    title: 'Account & Login',
    subtitle: 'Login email, password reset and credentials',
    icon: KeyRound,
    iconBgLight: 'bg-indigo-50',
    iconBgDark: 'dark:bg-indigo-500/10',
    iconColorLight: 'text-indigo-600',
    iconColorDark: 'dark:text-indigo-400',
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    subtitle: '2FA authentication, active sessions and audit activity',
    icon: Shield,
    iconBgLight: 'bg-emerald-50',
    iconBgDark: 'dark:bg-emerald-500/10',
    iconColorLight: 'text-emerald-600',
    iconColorDark: 'dark:text-emerald-400',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'In-app, email and push alerts for tasks and projects',
    icon: Bell,
    iconBgLight: 'bg-rose-50',
    iconBgDark: 'dark:bg-rose-500/10',
    iconColorLight: 'text-rose-600',
    iconColorDark: 'dark:text-rose-400',
  },
  {
    id: 'communication',
    title: 'Communication & Chat',
    subtitle: 'Online presence, read receipts and workspace chat settings',
    icon: MessageSquare,
    iconBgLight: 'bg-purple-50',
    iconBgDark: 'dark:bg-purple-500/10',
    iconColorLight: 'text-purple-600',
    iconColorDark: 'dark:text-purple-400',
  },
  {
    id: 'appearance',
    title: 'Appearance & Theme',
    subtitle: 'Light, dark or system theme and accent colors',
    icon: Palette,
    iconBgLight: 'bg-amber-50',
    iconBgDark: 'dark:bg-amber-500/10',
    iconColorLight: 'text-amber-600',
    iconColorDark: 'dark:text-amber-400',
  },
  {
    id: 'work',
    title: 'Work Preferences',
    subtitle: 'Working hours, default task views and sorting order',
    icon: Briefcase,
    iconBgLight: 'bg-teal-50',
    iconBgDark: 'dark:bg-teal-500/10',
    iconColorLight: 'text-teal-600',
    iconColorDark: 'dark:text-teal-400',
  },
  {
    id: 'regional',
    title: 'Language & Region',
    subtitle: 'Language, timezone, date formats and time display',
    icon: Globe,
    iconBgLight: 'bg-sky-50',
    iconBgDark: 'dark:bg-sky-500/10',
    iconColorLight: 'text-sky-600',
    iconColorDark: 'dark:text-sky-400',
  },
  {
    id: 'integrations',
    title: 'Connected Apps',
    subtitle: 'Google Calendar, Slack, GitHub and Drive integrations',
    icon: Grid,
    iconBgLight: 'bg-cyan-50',
    iconBgDark: 'dark:bg-cyan-500/10',
    iconColorLight: 'text-cyan-600',
    iconColorDark: 'dark:text-cyan-400',
  },
  {
    id: 'support',
    title: 'Help & Support',
    subtitle: 'Frequently asked questions, bug reports and help desk',
    icon: HelpCircle,
    iconBgLight: 'bg-orange-50',
    iconBgDark: 'dark:bg-orange-500/10',
    iconColorLight: 'text-orange-600',
    iconColorDark: 'dark:text-orange-400',
  },
  {
    id: 'about',
    title: 'About',
    subtitle: 'Application version, terms of service and compliance',
    icon: Info,
    iconBgLight: 'bg-slate-100',
    iconBgDark: 'dark:bg-white/5',
    iconColorLight: 'text-slate-700',
    iconColorDark: 'dark:text-slate-300',
  },
];

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

interface EmployeeSettingsViewProps {
  initialTab?: EmployeeSettingsTab | null;
  onTabChange?: (tab: EmployeeSettingsTab | null) => void;
}

export default function EmployeeSettingsView({
  initialTab = null,
  onTabChange,
}: EmployeeSettingsViewProps) {
  const { user, updateProfile, activeOrganization, activeOrganizationId, logout } = useAuthStore();
  const {
    darkMode,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    showToast,
    setSignOutModalOpen,
    commitAppearance,
    discardAppearance,
  } = useUIStore();

  const [activeTab, setActiveTab] = useState<EmployeeSettingsTab | null>(initialTab);
  const [searchFilter, setSearchFilter] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync activeTab when parent changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSelectTab = (tab: EmployeeSettingsTab | null) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (activeTab && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

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
  // 1. PROFILE STATE
  // --------------------------------------------------------------------------
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [designation, setDesignation] = useState(user?.designation || 'Software Engineer');
  const [department, setDepartment] = useState(user?.department || 'Engineering');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState(user?.skills || 'React, TypeScript, Project Management');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read-only enterprise attributes
  const employeeId = formatDisplayId(user?.employeeId || user?.uid || user?.id, 'EMP');
  const organizationName = activeOrganization?.organizationName || user?.organizationName || 'ABC Technology';
  const organizationCode = activeOrganization?.organizationCode || activeOrganizationId || 'ABC_123';
  const userEmail = user?.email || '';
  const dateJoined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '15 Aug 2024';

  // --------------------------------------------------------------------------
  // 2. ACCOUNT & LOGIN STATE
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

  // --------------------------------------------------------------------------
  // 3. SECURITY & PRIVACY STATE
  // --------------------------------------------------------------------------
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(userPreferences.twoFactorEnabled ?? false);
  const [twoFactorModal, setTwoFactorModal] = useState(false);
  useScrollLock(twoFactorModal);

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
      device: 'Android App - Samsung Galaxy S24',
      type: 'mobile',
      ip: '192.168.1.102',
      location: 'Bengaluru, India',
      lastActive: '2 hours ago',
      isCurrent: false,
    },
    {
      id: 'sess-tablet-1',
      device: 'Safari on iPad Pro',
      type: 'tablet',
      ip: '10.0.0.18',
      location: 'Bengaluru, India',
      lastActive: '1 day ago',
      isCurrent: false,
    },
  ]);

  const [recentSecurityLogs] = useState([
    { id: 'log-1', action: 'Successful Account Login', date: 'Today, 09:15 AM', ip: '192.168.1.45', device: 'Chrome on Windows 11', status: 'success' },
    { id: 'log-2', action: 'Password Authenticated', date: 'Yesterday, 06:40 PM', ip: '192.168.1.45', device: 'Chrome on Windows 11', status: 'success' },
    { id: 'log-3', action: 'Mobile App Session Refreshed', date: '05 Oct 2026, 02:12 PM', ip: '192.168.1.102', device: 'Samsung Galaxy S24', status: 'success' },
  ]);

  // --------------------------------------------------------------------------
  // 4. NOTIFICATIONS STATE
  // --------------------------------------------------------------------------
  const [notifications, setNotifications] = useState({
    // Tasks
    taskAssigned: { inApp: true, email: true, push: true },
    taskUpdated: { inApp: true, email: false, push: true },
    taskCompleted: { inApp: true, email: true, push: false },
    taskDeadline: { inApp: true, email: true, push: true },
    taskOverdue: { inApp: true, email: true, push: true },
    // Projects
    projectUpdates: { inApp: true, email: false, push: false },
    projectAnnouncements: { inApp: true, email: true, push: true },
    projectMilestones: { inApp: true, email: true, push: false },
    projectAssignments: { inApp: true, email: true, push: true },
    // Communication
    directMessage: { inApp: true, email: false, push: true },
    teamMessage: { inApp: true, email: false, push: true },
    channelMessage: { inApp: true, email: false, push: false },
    mention: { inApp: true, email: true, push: true },
    reply: { inApp: true, email: true, push: true },
    fileShared: { inApp: true, email: false, push: true },
    // System
    securityAlerts: { inApp: true, email: true, push: true },
    accountAlerts: { inApp: true, email: true, push: true },
    systemAnnouncements: { inApp: true, email: false, push: false },
  });

  // --------------------------------------------------------------------------
  // 5. COMMUNICATION & CHAT STATE
  // --------------------------------------------------------------------------
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'away' | 'busy' | 'offline'>(
    userPreferences.onlineStatus || 'online'
  );
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'everyone' | 'team' | 'nobody'>(
    userPreferences.lastSeenPrivacy || 'everyone'
  );
  const [readReceipts, setReadReceipts] = useState(userPreferences.readReceipts ?? true);
  const [typingIndicator, setTypingIndicator] = useState(userPreferences.typingIndicator ?? true);
  const [chatSound, setChatSound] = useState(userPreferences.chatSound ?? true);
  const [fileSharingNotifications, setFileSharingNotifications] = useState(
    userPreferences.fileSharingNotifications ?? true
  );

  // --------------------------------------------------------------------------
  // 6. APPEARANCE STATE
  // --------------------------------------------------------------------------
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    userPreferences.density || 'comfortable'
  );

  // --------------------------------------------------------------------------
  // 7. WORK PREFERENCES STATE
  // --------------------------------------------------------------------------
  const [workStartTime, setWorkStartTime] = useState(userPreferences.workStartTime || '09:00 AM');
  const [workEndTime, setWorkEndTime] = useState(userPreferences.workEndTime || '06:00 PM');
  const [workingDays, setWorkingDays] = useState<string[]>(
    userPreferences.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  );
  const [defaultTaskView, setDefaultTaskView] = useState<'list' | 'board' | 'timeline'>(
    userPreferences.defaultTaskView || 'list'
  );
  const [defaultProjectView, setDefaultProjectView] = useState<'grid' | 'list'>(
    userPreferences.defaultProjectView || 'grid'
  );
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'deadline' | 'updated' | 'title'>(
    userPreferences.taskSortBy || 'priority'
  );
  const [taskGroupBy, setTaskGroupBy] = useState<'status' | 'priority' | 'none'>(
    userPreferences.taskGroupBy || 'status'
  );
  const [deadlineDisplay, setDeadlineDisplay] = useState<'relative' | 'exact'>(
    userPreferences.deadlineDisplay || 'relative'
  );

  // --------------------------------------------------------------------------
  // 8. LANGUAGE & REGION STATE
  // --------------------------------------------------------------------------
  const [language, setLanguage] = useState(userPreferences.language || 'English (US)');
  const [timezone, setTimezone] = useState(userPreferences.timezone || 'UTC+05:30');
  const [dateFormat, setDateFormat] = useState(userPreferences.dateFormat || 'YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState(userPreferences.timeFormat || '12-hour');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(userPreferences.firstDayOfWeek || 'Monday');

  // --------------------------------------------------------------------------
  // 9. CONNECTED APPS STATE
  // --------------------------------------------------------------------------
  const [connectedApps, setConnectedApps] = useState([
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync assigned task deadlines and sprint milestone schedules directly to your personal Google Calendar.',
      icon: Calendar,
      iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
      connected: userPreferences.apps?.googleCalendar ?? true,
      scopes: ['Read / Write task calendar events', 'Meeting reminders'],
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Receive real-time direct task notifications, code review requests and mention pings in Slack.',
      icon: MessageSquare,
      iconColor: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
      connected: userPreferences.apps?.slack ?? true,
      scopes: ['Post notifications to DM', 'Sync slash command actions'],
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Link commits, pull requests and branch builds with your assigned workspace tasks automatically.',
      icon: Briefcase,
      iconColor: 'text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20',
      connected: userPreferences.apps?.github ?? true,
      scopes: ['Read commit metadata', 'Link PRs to task IDs'],
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Attach design mockups, architectural specifications and spreadsheets directly to sprint cards.',
      icon: Paperclip,
      iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
      connected: userPreferences.apps?.googleDrive ?? false,
      scopes: ['Select files from Drive picker', 'Read-only link access'],
    },
    {
      id: 'microsoft-teams',
      name: 'Microsoft Teams',
      description: 'Join sprint sync meetings and receive daily task digest updates in your Teams channel.',
      icon: Laptop,
      iconColor: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
      connected: userPreferences.apps?.msTeams ?? false,
      scopes: ['Teams meeting integration', 'Daily standup bot'],
    },
  ]);

  // --------------------------------------------------------------------------
  // 10. HELP & SUPPORT STATE
  // --------------------------------------------------------------------------
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Task Tracking');
  const [ticketSeverity, setTicketSeverity] = useState('Medium');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketAttachmentName, setTicketAttachmentName] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittedTickets, setSubmittedTickets] = useState<any[]>([
    {
      ticketId: 'TKT-7821-2026',
      title: 'Clarification on Step 4 Code Review submission',
      category: 'Task Tracking',
      status: 'Resolved',
      date: '02 Oct 2026',
    },
  ]);

  const FAQ_ITEMS = [
    {
      q: 'How do I submit my completed task deliverables for review?',
      a: 'Navigate to Tasks or Kanban Boards, open your assigned task, upload your deliverable or git PR link in the Deliverables tab, and click "Submit for Code Review". Your Team Leader will receive an instant notification.',
    },
    {
      q: 'Who can approve my task Step Verification stages?',
      a: 'Your assigned Team Leader or Project Administrator has the authority to verify and sign off on your task pipeline stages. Once signed off, the task transitions to Completed.',
    },
    {
      q: 'How does workspace isolation work in TaskFlow?',
      a: 'Every employee belongs to an authenticated organization. All chats, files, tasks, sprint boards, and teammates are strictly scoped to your organization. Users outside your company cannot access your data.',
    },
    {
      q: 'How do I upload and preview PDF deliverables?',
      a: 'Open the task card and click "Upload PDF". TaskFlow includes a built-in luxury PDF viewer that supports inline page zooming, page jumping, full-screen mode, and search.',
    },
    {
      q: 'Can I customize my working hours and deadline notifications?',
      a: 'Yes! Under Work Preferences and Notifications, you can set your shift hours, active working days, and decide whether you want alerts in-app, via email, or via push notifications.',
    },
  ];

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQ_ITEMS;
    const q = faqSearch.toLowerCase();
    return FAQ_ITEMS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [faqSearch]);

  // --------------------------------------------------------------------------
  // 11. ABOUT STATE & MODALS
  // --------------------------------------------------------------------------
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  useScrollLock(privacyModalOpen || termsModalOpen);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showToast('Invalid image type. Please select a JPG, PNG, or WEBP file.', 'error');
      return;
    }

    // Validate size (max 5MB)
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

  // Password update handler
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

  // Send password reset email
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

  // Toggle app connection
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

  // Terminate remote sessions
  const handleSignOutOtherSessions = () => {
    setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
    showToast('All other remote device sessions have been terminated.', 'success');
  };

  // Submit Support Bug Ticket
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
        ticketId: `TKT-${Math.floor(1000 + Math.random() * 9000)}-2026`,
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

  // Unified Save All Preferences
  const handleSaveAllPreferences = async () => {
    setSaving(true);
    try {
      const preferencesPayload = {
        twoFactorEnabled,
        notifications,
        onlineStatus,
        lastSeenPrivacy,
        readReceipts,
        typingIndicator,
        chatSound,
        fileSharingNotifications,
        density,
        workStartTime,
        workEndTime,
        workingDays,
        defaultTaskView,
        defaultProjectView,
        taskSortBy,
        taskGroupBy,
        deadlineDisplay,
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
        commitAppearance();
        setIsDirty(false);
        showToast('Settings & preferences saved successfully.', 'success');
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
    setDesignation(user?.designation || 'Software Engineer');
    setBio(user?.bio || '');
    setSkills(user?.skills || '');
    setProfilePhoto(user?.profilePhoto || '');
    setPhotoPreview(null);
    discardAppearance();
    setIsDirty(false);
    showToast('Changes discarded.', 'info');
  };

  // Filter modules for search bar
  const filteredModules = useMemo(() => {
    if (!searchFilter.trim()) return EMPLOYEE_MODULES;
    const q = searchFilter.toLowerCase();
    return EMPLOYEE_MODULES.filter(
      (m) => m.title.toLowerCase().includes(q) || m.subtitle.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  const activeModule = EMPLOYEE_MODULES.find((m) => m.id === activeTab);

  return (
    <div className="min-h-[calc(100vh-5rem)] pb-16">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Employee Settings
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              {organizationName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Settings &amp; Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personalize your workspace experience, notification alerts and security controls.
          </p>
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search settings..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition shadow-xs"
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

      {/* Main Grid: Master / Detail on Desktop, Dynamic on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: Module Navigation List (Sticky on desktop, hidden on mobile if a tab is open) */}
        <div
          className={`lg:col-span-4 space-y-2 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto custom-scroll-area pr-1 ${
            activeTab ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-2 sm:p-2.5 shadow-xs space-y-1">
            {filteredModules.map((mod) => {
              const IconComp = mod.icon;
              const isSelected = activeTab === mod.id;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleSelectTab(mod.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-500/15 border border-blue-500/30 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : `${mod.iconBgLight} ${mod.iconBgDark} ${mod.iconColorLight} ${mod.iconColorDark} border-slate-200/60 dark:border-white/5`
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {mod.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {mod.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400 translate-x-0.5'
                        : 'text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Quick Sign Out Card (Concept A: Apple Crimson Pill) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0e1322] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-rose-500/30 dark:hover:border-rose-500/30 transition-all flex items-center justify-between gap-3 group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-rose-500/15 to-red-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <LogOut className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Sign Out
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  End current session
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSignOutModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-[0_4px_14px_rgba(244,63,94,0.35)] dark:shadow-[0_4px_16px_rgba(244,63,94,0.45)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.55)] transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Selected Module Content */}
        <div className={`lg:col-span-8 ${!activeTab ? 'hidden lg:block' : 'block'}`}>
          {!activeTab ? (
            /* Desktop Empty State placeholder */
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Sliders className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Select a Settings Module
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                Choose any category from the left menu to customize your personal profile, notification triggers, theme and work preferences.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
                {EMPLOYEE_MODULES.slice(0, 6).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectTab(m.id)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200/80 dark:border-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition text-left"
                  >
                    {m.title}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Module Card Content */
            <div className="space-y-6">
              {/* Mobile Back Button Header */}
              <div className="lg:hidden flex items-center justify-between bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-3 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleSelectTab(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Settings</span>
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {activeModule?.title}
                </span>
              </div>

              {/* Module 1: PROFILE */}
              {activeTab === 'profile' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-500" />
                      Employee Profile
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Manage your personal identity, contact numbers and professional bio.
                    </p>
                  </div>

                  {/* Profile Photo Avatar Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative group">
                      <img
                        src={photoPreview || resolveAvatar(profilePhoto, user?.gender, name || userEmail)}
                        alt={name || 'Employee Avatar'}
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
                        Supports PNG, JPG, or WEBP up to 5MB. Visible to your organization team.
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs"
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

                  {/* Form Editable Fields */}
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition"
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition"
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition"
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Skills &amp; Tech Stack (comma separated)
                      </label>
                      <input
                        type="text"
                        value={skills}
                        onChange={(e) => {
                          setSkills(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="React, TypeScript, Node.js, UI/UX"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition"
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
                        placeholder="Brief summary of your background and responsibilities..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition resize-none"
                      />
                    </div>
                  </div>

                  {/* Read-Only Organization & Role Badges (Protected) */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Protected Enterprise Credentials (Read-Only)
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                        <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Role</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 truncate block">Employee</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                        <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Employee ID</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block" title={String(user?.employeeId || user?.uid || user?.id || employeeId)}>
                          {employeeId}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                        <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Organization</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block" title={organizationName}>{organizationName}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                        <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Workspace Code</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block" title={organizationCode}>{organizationCode}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                        <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Account Status</span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-500 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Active
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                        <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Date Joined</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{dateJoined}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                        <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Account Ownership</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">Organization Member</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 min-w-0 overflow-hidden">
                        <span className="text-[10px] text-slate-400 block mb-0.5 truncate">Authentication</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">Firebase Auth</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Module 2: ACCOUNT & LOGIN */}
              {activeTab === 'account' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-indigo-500" />
                      Account &amp; Login Security
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Manage your login credentials, password and account authentication status.
                    </p>
                  </div>

                  {/* Login Email Display */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Login Email</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">{userEmail}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
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
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition"
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
                              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition"
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
                              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition"
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
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {saving ? 'Updating Password...' : 'Save New Password'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Forgot / Reset Password by Email */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Forgot Password or need an email reset link?
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        We will send an encrypted password reset link to {userEmail}.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={resetEmailSending}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-50 transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {resetEmailSending ? 'Sending Link...' : 'Send Reset Link to Email'}
                    </button>
                  </div>
                </div>
              )}

              {/* Module 3: SECURITY & PRIVACY */}
              {activeTab === 'security' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-500" />
                      Security &amp; Device Sessions
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Monitor active signed-in devices, two-factor authentication and personal login activity.
                    </p>
                  </div>

                  {/* 2FA Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Two-Factor Authentication (2FA)
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {twoFactorEnabled
                            ? 'Enabled &bull; Requiring OTP code verification upon login'
                            : 'Disabled &bull; Recommended for high security account protection'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTwoFactorEnabled(!twoFactorEnabled);
                        setIsDirty(true);
                        showToast(
                          !twoFactorEnabled
                            ? 'Two-Factor Authentication activated.'
                            : 'Two-Factor Authentication disabled.',
                          'info'
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        twoFactorEnabled
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
                    </button>
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
                              {sess.type === 'mobile' ? (
                                <Smartphone className="w-4 h-4" />
                              ) : sess.type === 'tablet' ? (
                                <Smartphone className="w-4 h-4" />
                              ) : (
                                <Laptop className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {sess.device}
                                </span>
                                {sess.isCurrent && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Current Device
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                {sess.ip} &bull; {sess.location} &bull; {sess.lastActive}
                              </span>
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

                  {/* Recent Login Activity */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Recent Security Activity</h3>
                    <div className="space-y-2">
                      {recentSecurityLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block">{log.action}</span>
                              <span className="text-[10px] text-slate-400">{log.device} &bull; {log.ip}</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{log.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Module 4: NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-rose-500" />
                        Notification Preferences
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Customize how you receive alerts across In-App, Email and Push channels.
                      </p>
                    </div>
                  </div>

                  {/* Channel Headers Guide */}
                  <div className="grid grid-cols-12 text-xs font-bold text-slate-400 border-b border-slate-100 dark:border-white/10 pb-2 px-2">
                    <div className="col-span-6 sm:col-span-7">Event Trigger</div>
                    <div className="col-span-2 sm:col-span-2 text-center">In-App</div>
                    <div className="col-span-2 sm:col-span-2 text-center">Email</div>
                    <div className="col-span-2 sm:col-span-1 text-center">Push</div>
                  </div>

                  {/* Group 1: TASKS */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Tasks Alerts
                    </h3>
                    {[
                      { key: 'taskAssigned', label: 'Task Assigned to Me', desc: 'When a team leader assigns a new task' },
                      { key: 'taskUpdated', label: 'Task Details Updated', desc: 'Changes to scope, tags or steps' },
                      { key: 'taskCompleted', label: 'Task Completed & Signed-Off', desc: 'When step verification is accepted' },
                      { key: 'taskDeadline', label: 'Deadline Approaching (24h)', desc: 'Milestone reminder before due date' },
                      { key: 'taskOverdue', label: 'Task Overdue Escalation', desc: 'Urgent notice when deadline passes' },
                    ].map((item) => {
                      const cfg = (notifications as any)[item.key];
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Group 2: PROJECTS */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/10">
                    <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      Projects Alerts
                    </h3>
                    {[
                      { key: 'projectUpdates', label: 'Project Status Updates', desc: 'When project progress alters' },
                      { key: 'projectAnnouncements', label: 'Project Announcements', desc: 'Critical broadcast notices' },
                      { key: 'projectMilestones', label: 'Milestone Achieved', desc: 'When sprint targets are reached' },
                      { key: 'projectAssignments', label: 'Added to New Project', desc: 'When you are invited to a project' },
                    ].map((item) => {
                      const cfg = (notifications as any)[item.key];
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Group 3: COMMUNICATION */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/10">
                    <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Communication &amp; Mentions
                    </h3>
                    {[
                      { key: 'directMessage', label: 'Direct Messages', desc: '1-on-1 private chat messages' },
                      { key: 'mention', label: '@Mentions in Comments', desc: 'When teammate tags you in comments' },
                      { key: 'reply', label: 'Replies to Your Threads', desc: 'Responses to discussions you started' },
                      { key: 'fileShared', label: 'Files Shared with You', desc: 'When team members upload deliverables' },
                    ].map((item) => {
                      const cfg = (notifications as any)[item.key];
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
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
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Module 5: COMMUNICATION & CHAT */}
              {activeTab === 'communication' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-500" />
                      Communication &amp; Workspace Presence
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Control your presence visibility, read receipts and chat notification sounds.
                    </p>
                  </div>

                  {/* Strict Workspace Isolation Notice */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-500/10 border border-blue-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-blue-700 dark:text-blue-400 block mb-0.5">
                        Strict Workspace Scoped Isolation Active
                      </span>
                      Your direct messages, team chats, files and online presence are completely isolated within{' '}
                      <strong>{organizationName}</strong> (<code>{organizationCode}</code>). No external users from other organizations can view your chat or activity.
                    </div>
                  </div>

                  {/* Online Status Selection */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      My Online Presence Status
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'online', label: 'Online / Active', color: 'bg-emerald-500 text-emerald-600 border-emerald-500/30' },
                        { id: 'away', label: 'Away / Inactive', color: 'bg-amber-500 text-amber-600 border-amber-500/30' },
                        { id: 'busy', label: 'Do Not Disturb', color: 'bg-rose-500 text-rose-600 border-rose-500/30' },
                        { id: 'offline', label: 'Invisible', color: 'bg-slate-400 text-slate-500 border-slate-400/30' },
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
                              ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color.split(' ')[0]}`} />
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
                        <span className="text-[11px] text-slate-400 block">Show blue double checkmarks when messages are seen</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={readReceipts}
                        onChange={(e) => {
                          setReadReceipts(e.target.checked);
                          setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">Typing Indicator</span>
                        <span className="text-[11px] text-slate-400 block">Show when you are actively drafting a message in channel</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={typingIndicator}
                        onChange={(e) => {
                          setTypingIndicator(e.target.checked);
                          setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {chatSound ? <Volume2 className="w-4 h-4 text-purple-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">Chat Notification Sound</span>
                          <span className="text-[11px] text-slate-400 block">Play subtle chime for new incoming chat alerts</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={chatSound}
                        onChange={(e) => {
                          setChatSound(e.target.checked);
                          setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Module 6: APPEARANCE & THEME */}
              {activeTab === 'appearance' && (
                <AppearanceThemeSection onDirtyChange={setIsDirty} />
              )}

              {/* Module 7: WORK PREFERENCES */}
              {activeTab === 'work' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-teal-500" />
                      Work &amp; Dashboard Preferences
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure your standard working hours, default task views and sorting orders.
                    </p>
                  </div>

                  {/* Shift Working Hours */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Standard Working Shift Hours
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
                          { value: 'list', label: 'List View', subLabel: 'Structured table rows' },
                          { value: 'board', label: 'Kanban Board', subLabel: 'Agile visual workflow columns' },
                          { value: 'timeline', label: 'Timeline / Gantt', subLabel: 'Milestone schedule view' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Task Sorting Preference
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
                        Task Grouping Preference
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
                          { value: 'none', label: 'No Grouping', subLabel: 'Flat continuous list' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Deadline Display Preference
                      </label>
                      <LuxurySelect
                        value={deadlineDisplay}
                        onChange={(val) => {
                          setDeadlineDisplay(val as any);
                          setIsDirty(true);
                        }}
                        options={[
                          { value: 'relative', label: 'Relative ("In 2 days")', subLabel: 'Human-friendly relative time' },
                          { value: 'exact', label: 'Exact Date ("15 Oct 2026")', subLabel: 'Calendar date format' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Module 8: LANGUAGE & REGION */}
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
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        System Language
                      </label>
                      <LuxurySelect
                        value={language}
                        onChange={(val) => {
                          setLanguage(val);
                          setIsDirty(true);
                        }}
                        options={[
                          { value: 'English (US)', label: 'English (United States)', subLabel: 'Default workspace language' },
                          { value: 'English (UK)', label: 'English (United Kingdom)', subLabel: 'British English' },
                          { value: 'Español', label: 'Español (Coming soon)', subLabel: 'Spanish' },
                          { value: 'Français', label: 'Français (Coming soon)', subLabel: 'French' },
                          { value: 'Deutsch', label: 'Deutsch (Coming soon)', subLabel: 'German' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Workspace Timezone
                      </label>
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
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Date Format
                      </label>
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
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Time Format
                      </label>
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
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        First Day of the Week
                      </label>
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

              {/* Module 9: CONNECTED APPS */}
              {activeTab === 'integrations' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Grid className="w-5 h-5 text-cyan-500" />
                      Connected Applications
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Connect external tools like Google Calendar, Slack and GitHub to streamline your tasks.
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
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {app.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                    app.connected
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'
                                  }`}
                                >
                                  {app.connected ? 'Connected' : 'Disconnected'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
                                {app.description}
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {app.scopes.map((scope, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-2 py-0.5 rounded-md text-[9px] bg-slate-100 dark:bg-white/5 text-slate-400 font-medium"
                                  >
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
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
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

              {/* Module 10: HELP & SUPPORT */}
              {activeTab === 'support' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-orange-500" />
                      Help &amp; Employee Support
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Explore frequently asked questions, contact your administrator or report an issue.
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
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 transition-transform ${
                                  isOpen ? 'rotate-180 text-blue-500' : ''
                                }`}
                              />
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
                      Report a Problem or Submit a Bug Ticket
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
                          placeholder="e.g. PDF deliverable preview zoom issue in Chrome"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Category
                          </label>
                          <LuxurySelect
                            value={ticketCategory}
                            onChange={(val) => setTicketCategory(val)}
                            options={[
                              { value: 'Task Tracking', label: 'Task Tracking & Steps' },
                              { value: 'Chat & Messaging', label: 'Chat & Presence' },
                              { value: 'File Uploads', label: 'File Uploads & Previews' },
                              { value: 'UI & Display', label: 'UI Display & Alignment' },
                              { value: 'Performance', label: 'Performance & Network' },
                              { value: 'Other', label: 'Other' },
                            ]}
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Severity
                          </label>
                          <LuxurySelect
                            value={ticketSeverity}
                            onChange={(val) => setTicketSeverity(val)}
                            options={[
                              { value: 'Low', label: 'Low - Minor Cosmetic' },
                              { value: 'Medium', label: 'Medium - Workflow Inconvenience' },
                              { value: 'High', label: 'High - Blocker for Task' },
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
                          placeholder="Describe the steps to reproduce or details of the issue..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 resize-none"
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
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submittingTicket ? 'Submitting...' : 'Submit Ticket'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Submitted Tickets History */}
                    {submittedTickets.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Submitted Support Tickets
                        </span>
                        {submittedTickets.map((t, tIdx) => (
                          <div
                            key={tIdx}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{t.ticketId}</span>
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

              {/* Module 11: ABOUT */}
              {activeTab === 'about' && (
                <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Info className="w-5 h-5 text-slate-500" />
                      About TaskFlow PMS
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      System build details, security architecture and legal policies.
                    </p>
                  </div>

                  {/* App Identity Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-blue-600/15">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                      <img
                        src="/logo.png"
                        alt="TaskFlow Logo"
                        className="w-14 h-14 object-contain rounded-2xl bg-white/10 p-1.5 backdrop-blur-md"
                      />
                      <div>
                        <h3 className="text-xl font-extrabold tracking-tight">TaskFlow PMS</h3>
                        <p className="text-xs text-blue-100 font-medium">
                          Next-Generation Enterprise Project Management &amp; Sprint System
                        </p>
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20">
                          v2.4.0-enterprise &bull; Build 2026.10
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enterprise Specifications Table */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Organization</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{organizationName}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Workspace Code</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{organizationCode}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Architecture</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">React 18 + Node.js + Firebase Realtime</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Compliance</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> SOC2 Type II &bull; Multi-Org Isolation
                      </span>
                    </div>
                  </div>

                  {/* Legal Links */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPrivacyModalOpen(true)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Privacy Policy</span>
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                    <button
                      type="button"
                      onClick={() => setTermsModalOpen(true)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Terms of Service</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Save Action Bar in Header Section */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl mx-auto px-4 py-2 sm:py-2.5 rounded-full bg-slate-950/92 dark:bg-[#070913]/95 backdrop-blur-2xl text-white shadow-[0_16px_50px_rgba(0,0,0,0.65),0_0_25px_rgba(59,130,246,0.25)] flex items-center justify-between gap-3 border border-blue-500/35"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              <span className="text-xs font-bold whitespace-nowrap truncate text-slate-100">
                You have unsaved changes
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-3 py-1 rounded-full text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveAllPreferences}
                disabled={saving}
                className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      {privacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Privacy Policy</h3>
              <button onClick={() => setPrivacyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <p>
                TaskFlow PMS enforces strict organization-level boundary isolation. All data, communication threads, deliverables, and personal profiles are encrypted at rest and in transit.
              </p>
              <p>
                Your private password is encrypted using 10-round salted bcrypt hashes and is never stored in plaintext or logged in analytics.
              </p>
              <p>
                No third-party cookies or unauthorized tracking scripts are embedded. For inquiries, contact your system administrator.
              </p>
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setPrivacyModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Terms of Service</h3>
              <button onClick={() => setTermsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <p>
                By using TaskFlow PMS, you agree to access authorized project workspaces solely for company collaboration and sprint management.
              </p>
              <p>
                Deliverables, attachments, and code review comments submitted through TaskFlow remain the intellectual property of your respective organization.
              </p>
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setTermsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
