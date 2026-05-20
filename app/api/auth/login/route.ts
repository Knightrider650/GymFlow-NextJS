import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { ADMIN_ROLES } from '@/lib/permissions'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback_secret'

function isDatabaseUnavailable(error: any): boolean {
  const message = String(error?.message || '')
  return error?.code === 'ECONNREFUSED' || /ECONNREFUSED|Can't reach database server|database server/i.test(message)
}

async function tryBackendLogin(email: string, password: string) {
  const backendUrl = process.env.API_FALLBACK_URL || process.env.NEXT_PUBLIC_API_URL
  if (!backendUrl || !/^https?:\/\//.test(backendUrl)) {
    return null
  }

  const response = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const payload = await response.json()
  return NextResponse.json(payload, { status: response.status })
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const backendUrl = process.env.API_FALLBACK_URL || process.env.NEXT_PUBLIC_API_URL
    if (backendUrl && /^https?:\/\//.test(backendUrl)) {
      try {
        const backendResponse = await tryBackendLogin(email, password)
        if (backendResponse) return backendResponse
      } catch {
        // Fall back to the local Prisma-backed auth path when the backend is unreachable.
      }
    }

    let user: any
    try {
      user = await prisma.user.findUnique({
        where: { email },
        include: { gym: true }
      })
    } catch (dbError: any) {
      if (isDatabaseUnavailable(dbError)) {
        const fallback = await tryBackendLogin(email, password)
        if (fallback) return fallback
      }
      throw dbError
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isGlobal = ADMIN_ROLES.includes(user.role as any)

    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        gymId: user.gymId,
        isGlobal 
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    )

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
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
