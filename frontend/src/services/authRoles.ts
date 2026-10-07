export type AppRole = 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_EMPLOYEE';

export function normalizeRole(role: unknown): AppRole | null {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'role_admin') return 'ROLE_ADMIN';
  if (['teamleader', 'team_leader', 'role_manager', 'role_team_lead', 'role_team_leader', 'manager', 'lead', 'team lead', 'teamlead'].includes(normalized)) return 'ROLE_MANAGER';
  if (normalized === 'employee' || normalized === 'role_employee') return 'ROLE_EMPLOYEE';
  return null;
}

export function getDashboardPathForRole(role: unknown): string | null {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'ROLE_ADMIN') return '/admin/dashboard';
  if (normalizedRole === 'ROLE_MANAGER') return '/team-lead/dashboard';
  if (normalizedRole === 'ROLE_EMPLOYEE') return '/employee/dashboard';
  return null;
}

export function formatRoleName(role: unknown, style: 'upper' | 'title' = 'upper'): string {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'ROLE_ADMIN') return style === 'title' ? 'Admin' : 'ADMIN';
  if (normalizedRole === 'ROLE_MANAGER') return style === 'title' ? 'Team Lead' : 'TEAM LEAD';
  if (normalizedRole === 'ROLE_EMPLOYEE') return style === 'title' ? 'Employee' : 'EMPLOYEE';

  const raw = String(role ?? '').replace(/^ROLE_/i, '').trim();
  if (raw.toLowerCase() === 'manager') return style === 'title' ? 'Team Lead' : 'TEAM LEAD';
  if (style === 'title') {
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : 'Member';
  }
  return raw.toUpperCase() || 'MEMBER';
}

export function formatDisplayId(idStr?: unknown, prefix: 'TL' | 'EMP' | 'ADM' = 'EMP'): string {
  if (!idStr) return `${prefix}-00102`;
  const raw = String(idStr).trim();
  if (!raw) return `${prefix}-00102`;

  // If already standard formatted like EMP-00124, TL-00102, ADM-0001
  if (/^(TL|EMP|ADM)-[0-9A-Z]{3,8}$/i.test(raw)) {
    return raw.toUpperCase();
  }

  // If numeric or short digits (e.g. 1, 42, 102)
  if (/^\d+$/.test(raw) && raw.length <= 6) {
    return `${prefix}-${raw.padStart(4, '0')}`;
  }

  // Strip any leading prefix
  const clean = raw.replace(/^(TL|EMP|ADM)[-_]?/i, '');
  if (/^\d+$/.test(clean) && clean.length <= 6) {
    return `${prefix}-${clean.padStart(4, '0')}`;
  }

  // If clean is a long UID (like "00I6emhrfGfqZvGAlxmBDqk5Zt")
  // Return formatted first 8 chars uppercase
  const shortHash = clean.slice(0, 8).toUpperCase();
  return `${prefix}-${shortHash}`;
}