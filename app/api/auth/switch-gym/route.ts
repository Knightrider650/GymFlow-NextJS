import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback_secret'

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

    // Verify the gym exists
    const gym = await prisma.gym.findUnique({ where: { id: gymId } })
    if (!gym) {
      return NextResponse.json({ success: false, error: 'Gym not found' }, { status: 404 })
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
