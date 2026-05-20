import { jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback_secret'
)

export interface AuthUser {
  userId: string
  email: string
  role: string
  scope?: 'platform' | 'tenant'
  gymId: string
  tenantId?: string | null
  isGlobal?: boolean
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get('Authorization')
    let token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null

    if (!token) {
      token = req.cookies.get('token')?.value || null;
    }

    if (!token) return null

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const rawPayload = payload as any

    // Normalize properties for Next.js and standalone Express JWT schema compatibility
    const userId = rawPayload.userId || rawPayload.id || ''
    const email = rawPayload.email || ''
    const role = rawPayload.role || ''
    const gymId = rawPayload.gymId || rawPayload.tenantId || rawPayload.gym_id || ''
    const scope = rawPayload.scope || (['cto', 'ceo', 'admin'].includes(role) ? 'platform' : 'tenant')
    const isGlobal = rawPayload.isGlobal !== undefined ? rawPayload.isGlobal : ['cto', 'ceo', 'admin'].includes(role)

    return {
      userId,
      email,
      role,
      scope,
      gymId,
      tenantId: gymId,
      isGlobal
    }
  } catch (error) {
    return null
  }
}
