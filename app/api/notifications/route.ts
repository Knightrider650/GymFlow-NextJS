import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const gymId = getGymIdContext(user, req)
    
    // Fetch notifications belonging to this gym and optionally user-scoped
    const notifications = await prisma.notification.findMany({
      where: {
        gymId: gymId || undefined,
        OR: [
          { userId: user.userId },
          { userId: null }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: notifications })
  } catch (error: any) {
    console.error('Fetch notifications error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
