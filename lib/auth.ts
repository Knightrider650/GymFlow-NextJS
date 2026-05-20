import { NextRequest } from 'next/server'
import { getAuthUser, AuthUser } from './auth-edge'

export { getAuthUser, type AuthUser }

export function getGymIdContext(user: AuthUser, req: NextRequest): string | undefined {
  if (user.gymId === 'all' || user.isGlobal) {
    const { searchParams } = new URL(req.url)
    const headerGymId = req.headers.get('X-Gym-ID') || req.headers.get('X-Tenant-ID')
    const queryGymId = searchParams.get('gymId') || searchParams.get('tenantId')
    const targetGymId = headerGymId || queryGymId
    if (targetGymId && targetGymId !== 'all') {
      return targetGymId
    }
    return undefined
  }
  return user.gymId
}

export async function getRequiredGymId(user: AuthUser, req: NextRequest, data?: any): Promise<string> {
  const gymId = getGymIdContext(user, req)
  if (gymId) return gymId

  if (data && data.gymId && data.gymId !== 'all') return data.gymId

  const prisma = (await import('@/lib/prisma')).default
  const firstGym = await prisma.gym.findFirst()
  return firstGym?.id || 'default-gym'
}

