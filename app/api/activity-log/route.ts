import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const logs = await prisma.activityLog.findMany({
      where: { gymId: user.gymId },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to last 100 logs for performance
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error: any) {
    console.error('Fetch logs error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 })
  }
}
