import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const gymId = getGymIdContext(user, req)
    const logs = await prisma.activityLog.findMany({
      where: gymId ? { gymId } : {},
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to last 100 logs for performance
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error: any) {
    console.error('Fetch logs error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    let gymId = getGymIdContext(user, req) || user.gymId
    if (gymId === 'all') {
      gymId = user.gymId
    }

    const log = await prisma.activityLog.create({
      data: {
        action: data.action,
        details: data.details || '',
        entityType: data.entityType || 'General',
        entityId: data.entityId,
        userName: user.email,
        userId: user.userId,
        gymId: gymId
      }
    })

    return NextResponse.json({ success: true, data: log })
  } catch (error: any) {
    console.error('Create log error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create log' }, { status: 500 })
  }
}
