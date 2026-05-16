/**
 * GymFlow RBAC Permission Matrix
 * Defines what each role can see and do across the system.
 */

export type UserRole = 'cto' | 'ceo' | 'admin' | 'manager' | 'trainer' | 'staff'

// ─── Role Hierarchy ────────────────────────────────────────────────────────────
// Higher number = higher authority. Cannot manage someone at same or higher level.
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  cto: 100,
  ceo: 90,
  admin: 70,
  manager: 50,
  trainer: 30,
  staff: 10,
}

// ─── Role Definitions (for UI display) ────────────────────────────────────────
export interface RoleDefinition {
  role: UserRole
  title: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
  capabilities: string[]
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: 'cto',
    title: 'CTO',
    description: 'Chief Technology Officer — Full system authority with complete control over all platform features, users, and settings.',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    icon: '⚡',
    capabilities: [
      'Full access to all features & pages',
      'Create & manage all user roles including CEO',
      'System settings & configurations',
      'Audit logs & security reports',
      'Reset any user password',
      'Data exports & backups',
    ],
  },
  {
    role: 'ceo',
    title: 'CEO',
    description: 'Chief Executive Officer — Full operational and financial authority across all gym management features.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: '👑',
    capabilities: [
      'Full access to all features & pages',
      'Create & manage Admins, Managers, Trainers, Staff',
      'Full financial access (billing, revenue, reports)',
      'Team management & performance oversight',
      'View all activity logs',
      'Business settings & branding',
    ],
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Administrator — Full operational control for day-to-day gym management.',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    icon: '🛡️',
    capabilities: [
      'Create Managers, Trainers, and Staff accounts',
      'Members, Attendance & Billing management',
      'Inventory & Equipment management',
      'Classes, Plans & Leads (CRM)',
      'Staff HR management',
      'View activity logs (read-only)',
    ],
  },
  {
    role: 'manager',
    title: 'Manager',
    description: 'Manager — Operational access for member-facing and revenue-generating activities.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: '📋',
    capabilities: [
      'Members & Attendance management',
      'Billing & Invoice management',
      'Leads (CRM) management',
      'Classes & Membership Plans',
      'Inventory access',
      'No user/credential management',
    ],
  },
  {
    role: 'trainer',
    title: 'Trainer',
    description: 'Trainer — Focused access for fitness class delivery and member check-ins.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: '💪',
    capabilities: [
      'View members (read-only)',
      'Attendance check-in / check-out',
      'Classes management',
      'Calendar access',
      'Notifications',
      'No financial or admin access',
    ],
  },
  {
    role: 'staff',
    title: 'Staff',
    description: 'Staff — Basic access for front desk and daily operations.',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: '👤',
    capabilities: [
      'Dashboard (read-only)',
      'Member lookup (read-only)',
      'Attendance check-in only',
      'View notifications',
      'No financial access',
      'No management features',
    ],
  },
]

// ─── Permission Helpers ────────────────────────────────────────────────────────

/** Returns true if the actor role can manage the target role (create/edit/delete) */
export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

/** Returns the list of roles that the actor is allowed to create */
export function getCreatableRoles(actorRole: UserRole): UserRole[] {
  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
    (role) => ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[role]
  )
}

/** Returns true if the actor has permission to access the given route */
export function canAccessRoute(actorRole: UserRole, route: string): boolean {
  const permissions = ROUTE_PERMISSIONS[route]
  if (!permissions) return true // Open routes
  return permissions.includes(actorRole)
}

/** Elevated roles — can access Team Management */
export const ELEVATED_ROLES: UserRole[] = ['cto', 'ceo', 'admin']

/** Administrative roles — top-level authority */
export const ADMIN_ROLES: UserRole[] = ['cto', 'ceo']

// ─── Route Permission Map ──────────────────────────────────────────────────────
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/super-dashboard': ['cto', 'ceo'],
  '/dashboard': ['cto', 'ceo', 'admin', 'manager', 'trainer', 'staff'],
  '/members': ['cto', 'ceo', 'admin', 'manager', 'trainer', 'staff'],
  '/attendance': ['cto', 'ceo', 'admin', 'manager', 'trainer', 'staff'],
  '/calendar': ['cto', 'ceo', 'admin', 'manager', 'trainer', 'staff'],
  '/notifications': ['cto', 'ceo', 'admin', 'manager', 'trainer', 'staff'],
  '/classes': ['cto', 'ceo', 'admin', 'manager', 'trainer'],
  '/leads': ['cto', 'ceo', 'admin', 'manager'],
  '/billing': ['cto', 'ceo', 'admin', 'manager'],
  '/plans': ['cto', 'ceo', 'admin', 'manager'],
  '/inventory': ['cto', 'ceo', 'admin', 'manager'],
  '/communications': ['cto', 'ceo', 'admin', 'manager'],
  '/reports': ['cto', 'ceo', 'admin'],
  '/staff': ['cto', 'ceo', 'admin'],
  '/settings': ['cto', 'ceo', 'admin'],
  '/activity-log': ['cto', 'ceo', 'admin'],
  '/team': ['cto', 'ceo', 'admin'],
  '/invites': ['cto', 'ceo', 'admin'],
  '/feedback': ['cto', 'ceo', 'admin', 'manager'],
}

/** Nav items and which roles can see them */
export const NAV_VISIBILITY: Record<string, UserRole[]> = {
  ...ROUTE_PERMISSIONS,
}
