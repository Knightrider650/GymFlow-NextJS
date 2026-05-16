import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        gym: true
      }
    })

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const { password, ...userWithoutPassword } = userData

    return NextResponse.json({
      success: true,
      data: {
        ...userWithoutPassword,
        gymId: user.gymId, // Use gymId from JWT (contextual)
        isGlobal: user.isGlobal // Include isGlobal from JWT
      }
    })
  } catch (error) {
    console.error('Auth Me error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
