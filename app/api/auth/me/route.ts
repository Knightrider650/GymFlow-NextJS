import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

function isDatabaseUnavailable(error: any): boolean {
  const message = String(error?.message || '')
  return error?.code === 'ECONNREFUSED' || /ECONNREFUSED|Can't reach database server|database server/i.test(message)
}

async function tryBackendMe(req: NextRequest) {
  const backendUrl = process.env.API_FALLBACK_URL || process.env.NEXT_PUBLIC_API_URL
  if (!backendUrl || !/^https?:\/\//.test(backendUrl)) {
    return null
  }

  const token = req.headers.get('Authorization') || `Bearer ${req.cookies.get('token')?.value || ''}`
  const response = await fetch(`${backendUrl}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}

export async function GET(req: NextRequest) {
  try {
    const backendUrl = process.env.API_FALLBACK_URL || process.env.NEXT_PUBLIC_API_URL
    if (backendUrl && /^https?:\/\//.test(backendUrl)) {
      try {
        const backendResponse = await tryBackendMe(req)
        if (backendResponse) return backendResponse
      } catch {
        // Fall back to the local Prisma-backed auth path when the backend is unreachable.
      }
    }

    const user = await getAuthUser(req)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let userData: any
    try {
      userData = await prisma.user.findUnique({
        where: { id: user.userId },
        include: {
          gym: true
        }
      })
    } catch (dbError: any) {
      if (isDatabaseUnavailable(dbError)) {
        const fallback = await tryBackendMe(req)
        if (fallback) return fallback
      }
      throw dbError
    }

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const { password, ...userWithoutPassword } = userData

    let currentGym = userData.gym
    if (user.gymId && user.gymId !== userData.gymId) {
      try {
        const activeGym = await prisma.gym.findUnique({ where: { id: user.gymId } })
        if (activeGym) {
          currentGym = activeGym
        }
      } catch (e) {
        console.warn('Failed to fetch contextual gym during /me:', e)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...userWithoutPassword,
        gym: currentGym,
        gymId: user.gymId, // Use gymId from JWT (contextual)
        isGlobal: user.isGlobal // Include isGlobal from JWT
      }
    })
  } catch (error) {
    console.error('Auth Me error:', error)
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json(
        { success: false, error: 'Database unavailable. Start PostgreSQL or configure API_FALLBACK_URL/NEXT_PUBLIC_API_URL.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
