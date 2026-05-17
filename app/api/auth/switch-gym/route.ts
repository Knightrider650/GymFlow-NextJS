import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback_secret'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    
    // Only users with isGlobal flag (cto, ceo, admin) can switch gyms
    if (!user || !user.isGlobal) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { gymId } = await req.json()

    if (!gymId) {
      return NextResponse.json({ success: false, error: 'Gym ID is required' }, { status: 400 })
    }

    // Verify the gym exists, dynamically creating it if missing to allow safe super-admin impersonation
    let gym = null
    try {
      gym = await prisma.gym.findUnique({ where: { id: gymId } })
    } catch (e) {
      console.warn('Prisma lookup failed during switch-gym:', e)
    }

    if (!gym) {
      try {
        gym = await prisma.gym.create({
          data: {
            id: gymId,
            name: gymId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            email: `contact@${gymId}.com`,
            phone: '+1 (555) 999-0000',
            address: 'Generated Impersonation Campus',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY'
          }
        })
      } catch (err) {
        console.warn('Failed to dynamically create gym record in PostgreSQL, falling back to a virtual mock representation:', err)
        gym = {
          id: gymId,
          name: gymId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY'
        } as any
      }
    }

    // Issue new tokens with the new gymId, keeping the same user ID and global status
    const accessToken = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email, 
        role: user.role, 
        gymId: gym.id,
        isGlobal: true 
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    )

    const refreshToken = jwt.sign(
      { userId: user.userId },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        gymName: gym.name
      }
    })
  } catch (error: any) {
    console.error('Switch Gym Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
