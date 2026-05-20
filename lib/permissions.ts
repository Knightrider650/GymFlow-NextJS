/**
 * GymFlow RBAC Permission Matrix
 * Defines what each role can see and do across the system.
 */

export type UserRole = 'cto' | 'ceo' | 'admin' | 'owner' | 'manager' | 'trainer' | 'staff'

// ─── Role Hierarchy ────────────────────────────────────────────────────────────
// Higher number = higher authority. Cannot manage someone at same or higher level.
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  cto: 100,
  ceo: 95,
  admin: 90,
  owner: 80,
  manager: 70,
  staff: 50,
  trainer: 30,
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
    title: 'Super Admin (CTO)',
    description: 'Platform Layer — Owns and operates the SaaS platform, manages tenants and global settings.',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    icon: '⚡',
    capabilities: [
      'Create, activate, and manage gym tenants',
      'Manage platform-wide subscriptions & billing',
      'Access support tools & platform diagnostics',
      'View platform-wide analytics & trends',
      'Configure global system defaults',
    ],
  },
  {
    role: 'ceo',
    title: 'Super Admin (CEO)',
    description: 'Platform Layer — Strategic and financial oversight of the entire GymFlow ecosystem.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: '👑',
    capabilities: [
      'Monitor platform revenue & subscription growth',
      'Review high-level system usage trends',
      'Audit platform-level security & activity',
      'Strategic tenant management',
      'Global financial reporting',
    ],
  },
  {
    role: 'admin',
    title: 'Super Admin (Admin)',
    description: 'Platform Layer — Operational administration and tenant support.',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    icon: '🛡️',
    capabilities: [
      'Support tenant onboarding & diagnostics',
      'Manage platform users & support access',
      'Review system audit logs',
      'Access tenant support visibility',
      'Maintain platform stability',
    ],
  },
  {
    role: 'owner',
    title: 'Gym Owner',
    description: 'Tenant Layer — Full ownership of a single gym tenant, including financial settings and billing.',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    icon: '🏢',
    capabilities: [
      'Full administrative access to gym operations',
      'Manage billing, invoices, and payment gateway rules',
      'Manage branches/locations and staff permissions',
      'View detailed financial reports and audit logs',
    ],
  },
  {
    role: 'manager',
    title: 'Gym Manager',
    description: 'Tenant Layer — Full operational control over one gym tenant.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: '📋',
    capabilities: [
      'Manage members, plans, and renewals',
      'Full billing: invoices, dues, refunds, expenses',
      'Create and manage Staff/Trainer accounts',
      'Manage classes, schedules, and assignments',
      'View full tenant reports and audit logs',
    ],
  },
  {
    role: 'staff',
    title: 'Staff',
    description: 'Tenant Layer — Day-to-day front desk and operational tasks.',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: '👤',
    capabilities: [
      'Search, create, and update member records',
      'Mark attendance & handle check-ins',
      'Record payments and generate receipts',
      'Book classes and manage basic leads',
      'Update limited inventory transactions',
    ],
  },
  {
    role: 'trainer',
    title: 'Trainer',
    description: 'Tenant Layer — Focus on classes and member engagement.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: '💪',
    capabilities: [
      'View assigned classes and schedules',
      'Mark attendance for assigned scope',
      'View assigned member training profiles',
      'Add training notes and progress comments',
      'View limited class occupancy reports',
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
export const ELEVATED_ROLES: UserRole[] = ['cto', 'ceo', 'admin', 'owner', 'manager']

/** Administrative roles — top-level authority */
export const ADMIN_ROLES: UserRole[] = ['cto', 'ceo', 'admin']

// ─── Route Permission Map ──────────────────────────────────────────────────────
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/super-dashboard': ['cto', 'ceo', 'admin'],
  '/dashboard': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff', 'trainer'],
  '/members': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff', 'trainer'],
  '/attendance': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff', 'trainer'],
  '/calendar': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff', 'trainer'],
  '/notifications': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff', 'trainer'],
  '/classes': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff', 'trainer'],
  '/leads': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff'],
  '/billing': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff'],
  '/plans': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff'],
  '/inventory': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff', 'trainer'],
  '/communications': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff'],
  '/reports': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff', 'trainer'],
  '/staff': ['cto', 'ceo', 'admin', 'owner', 'manager'],
  '/settings': ['cto', 'ceo', 'admin', 'owner', 'manager'],
  '/activity-log': ['cto', 'ceo', 'admin', 'owner', 'manager'],
  '/team': ['cto', 'ceo', 'admin', 'owner', 'manager'],
  '/invites': ['cto', 'ceo', 'admin', 'owner', 'manager'],
  '/feedback': ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff'],
}

/** Nav items and which roles can see them */
export const NAV_VISIBILITY: Record<string, UserRole[]> = {
  ...ROUTE_PERMISSIONS,
}

// ─── Convenience role helpers ───────────────────────────────────────────────
/** Returns true if the supplied role string equals 'trainer' */
export function isTrainer(role?: string | null): boolean {
  return role === 'trainer'
}

/** Safe cast helper: returns the role as `UserRole` if valid, otherwise `undefined` */
export function asUserRole(role?: string | null): UserRole | undefined {
  if (!role) return undefined
  const keys = Object.keys(ROLE_HIERARCHY) as UserRole[]
  return keys.includes(role as UserRole) ? (role as UserRole) : undefined
}
