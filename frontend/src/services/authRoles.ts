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