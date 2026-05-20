import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

// GET /api/communications/logs
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const gymId = getGymIdContext(user, req)
    const logs = await prisma.reminder.findMany({
      where: gymId ? { gymId } : {},
      orderBy: { sentAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error: any) {
    console.error('Fetch communication logs error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 })
  }
}
