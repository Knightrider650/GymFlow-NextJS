import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback_secret'
)

export interface AuthUser {
  userId: string
  email: string
  role: string
  gymId: string
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
    return payload as unknown as AuthUser
  } catch (error) {
    return null
  }
}
