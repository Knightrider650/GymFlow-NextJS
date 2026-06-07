import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthUser } from './lib/auth-edge'
import { ROUTE_PERMISSIONS, canAccessRoute } from './lib/permissions'

const PLATFORM_ROUTES = ['/super-dashboard', '/team']

function getRouteScope(pathname: string): 'platform' | 'tenant' | null {
  if (pathname === '/login' || pathname === '/register' || pathname === '/403') {
    return null
  }

  if (PLATFORM_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return 'platform'
  }

  return 'tenant'
}

// Proxy to enforce route-level RBAC based on ROUTE_PERMISSIONS
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow static, api and next internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // If route isn't listed in permissions, allow by default
  const matchesPermission = Object.keys(ROUTE_PERMISSIONS).some((r) => {
    return pathname === r || pathname.startsWith(r + '/')
  })
  if (!matchesPermission) return NextResponse.next()

  // Authenticate user from Authorization header (bearer token)
  const actor = await getAuthUser(req as any)
  if (!actor) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  const routeScope = getRouteScope(pathname)
  if (routeScope && actor.scope && actor.scope !== routeScope) {
    // Global administrators are allowed to access both platform and tenant routes for impersonation/support
    if (actor.isGlobal || ['cto', 'ceo', 'admin'].includes((actor.role || '').toLowerCase())) {
      return NextResponse.next()
    }
    const target = actor.scope === 'platform' ? '/super-dashboard' : '/dashboard'
    return NextResponse.redirect(new URL(target, req.url))
  }

  // Authorize based on role
  if (!canAccessRoute(actor.role as any, pathname)) {
    const forbiddenUrl = new URL('/403', req.url)
    return NextResponse.redirect(forbiddenUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
