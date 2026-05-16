'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth, useSettings } from '@/hooks'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BarChart3,
  Users,
  Calendar,
  CreditCard,
  Package,
  Users2,
  Settings,
  LogOut,
  Menu,
  Home,
  Bell,
  MessageSquare,
  Briefcase,
  Map,
  CalendarDays,
  Activity,
  UserCog,
  UserPlus,
  FileText,
} from 'lucide-react'
import { useState } from 'react'
import { NAV_VISIBILITY, type UserRole } from '@/lib/permissions'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  section?: string
}

const ALL_NAV_ITEMS: NavItem[] = [
  // ── Core ──────────────────────────────────────────────────────────────
  { href: '/dashboard',      label: 'Dashboard',       icon: Home,         section: 'core' },
  { href: '/notifications',  label: 'Notifications',   icon: Bell,         section: 'core' },
  // ── Operations ────────────────────────────────────────────────────────
  { href: '/leads',          label: 'Leads (CRM)',     icon: Briefcase,    section: 'operations' },
  { href: '/members',        label: 'Members',         icon: Users,        section: 'operations' },
  { href: '/attendance',     label: 'Attendance',      icon: Calendar,     section: 'operations' },
  { href: '/calendar',       label: 'Calendar',        icon: CalendarDays, section: 'operations' },
  { href: '/classes',        label: 'Classes',         icon: BarChart3,    section: 'operations' },
  // ── Finance & Inventory ───────────────────────────────────────────────
  { href: '/plans',          label: 'Plans',           icon: Map,          section: 'finance' },
  { href: '/billing',        label: 'Billing',         icon: CreditCard,   section: 'finance' },
  { href: '/inventory',      label: 'Inventory',       icon: Package,      section: 'finance' },
  // ── Communications ───────────────────────────────────────────────────
  { href: '/communications', label: 'Communications',  icon: MessageSquare, section: 'comms' },
  { href: '/feedback',       label: 'Feedback',        icon: FileText,     section: 'comms' },
  // ── Admin ────────────────────────────────────────────────────────────
  { href: '/staff',          label: 'Staff HR',        icon: Users2,       section: 'admin' },
  { href: '/reports',        label: 'Reports',         icon: BarChart3,    section: 'admin' },
  { href: '/activity-log',   label: 'Activity Log',    icon: Activity,     section: 'admin' },
  { href: '/settings',       label: 'Settings',        icon: Settings,     section: 'admin' },
  { href: '/invites',        label: 'Invites',         icon: UserPlus,     section: 'admin' },
  { href: '/team',           label: 'Team Management', icon: UserCog,      section: 'admin' },
]

const SECTION_LABELS: Record<string, string> = {
  core: 'Overview',
  operations: 'Operations',
  finance: 'Finance',
  comms: 'Communications',
  admin: 'Administration',
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuth()
  const { settings } = useSettings()
  const [isOpen, setIsOpen] = useState(false)

  const actorRole = (user?.role ?? 'staff') as UserRole

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // Filter nav items by role visibility
  const visibleItems = ALL_NAV_ITEMS.filter((item) => {
    const allowed = NAV_VISIBILITY[item.href]
    if (!allowed) return true
    return allowed.includes(actorRole)
  })

  // Group by section while preserving order
  const sections = Array.from(new Set(visibleItems.map((i) => i.section ?? 'core')))

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
        title="Toggle navigation menu"
        className="fixed top-4 left-4 z-40 lg:hidden p-2 hover:bg-gray-200 rounded"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-glass border-r border-white/5 shadow-2xl transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-2 p-6 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity">
            {settings?.gymLogo ? (
              <img src={settings.gymLogo} alt="Gym Logo" className="w-8 h-8 rounded-md object-cover" />
            ) : (
              <div className="text-2xl">💪</div>
            )}
            <span>{settings?.gymName || 'GymFlow'}</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">{user?.fullname}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary uppercase tracking-wider">
            {user?.role}
          </span>
        </div>

        {/* Navigation — role-filtered, grouped by section */}
        <nav className="flex-1 overflow-y-auto p-4">
          {sections.map((section) => {
            const items = visibleItems.filter((i) => (i.section ?? 'core') === section)
            if (items.length === 0) return null
            return (
              <div key={section} className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 px-2 mb-1">
                  {SECTION_LABELS[section]}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,200,255,0.4)] scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-border p-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
