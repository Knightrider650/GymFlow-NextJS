import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback_secret'

function isDatabaseUnavailable(error: any): boolean {
  const message = String(error?.message || '')
  return error?.code === 'ECONNREFUSED' || /ECONNREFUSED|Can't reach database server|database server/i.test(message)
}

async function tryBackendRefresh(refreshToken: string) {
  const backendUrl = process.env.API_FALLBACK_URL || process.env.NEXT_PUBLIC_API_URL
  if (!backendUrl || !/^https?:\/\//.test(backendUrl)) {
    return null
  }

  const response = await fetch(`${backendUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Verify refresh token
    let decoded: any
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET)
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    let user: any
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { gym: true }
      })
    } catch (dbError: any) {
      if (isDatabaseUnavailable(dbError)) {
        const fallback = await tryBackendRefresh(refreshToken)
        if (fallback) return fallback
      }
      throw dbError
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, gymId: user.gymId },
      JWT_SECRET,
      { expiresIn: '1d' }
    )

    // Optionally generate a new refresh token (refresh token rotation)
    const newRefreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullname: user.fullname,
          role: user.role,
          gymId: user.gymId
        }
      }
    })
  } catch (error: any) {
    console.error('Refresh token error:', error)
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
