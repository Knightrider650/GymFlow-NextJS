'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks'
import { DashboardLayout } from '@/components/layout/sidebar'
import { useAuthStore } from '@/lib/store'

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, checkAuth } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Role-based route protection
  const user = useAuthStore(state => state.user)
  const pathname = usePathname()

  const routePermissions: Record<string, string[]> = {
    '/staff': ['admin', 'owner'],
    '/settings': ['admin', 'owner'],
    '/activity-log': ['admin', 'owner'],
    '/billing': ['admin', 'owner', 'manager'],
    '/inventory': ['admin', 'owner', 'manager'],
    '/communications': ['admin', 'owner', 'manager'],
    '/plans': ['admin', 'owner', 'manager'],
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const allowedRoles = routePermissions[pathname]
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/dashboard') // Redirect unauthorized to dashboard
      }
    }
  }, [pathname, user, isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] text-primary">
        <div className="flex flex-col items-center gap-6 animate-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-ping absolute inset-0"></div>
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,200,255,0.4)]">
              <span className="text-2xl font-black text-[#0a0c10]">G</span>
            </div>
          </div>
          <div className="space-y-2 text-center">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-primary/80 animate-pulse">GymFlow Syncing</p>
            <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-primary animate-[shimmer_1.5s_infinite] w-24"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardLayout>
      <div key={pathname} className="page-transition h-full w-full">
        {children}
      </div>
    </DashboardLayout>
  )
}
