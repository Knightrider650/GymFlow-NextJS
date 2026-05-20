import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'
import { isTrainer } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const memberId = searchParams.get('memberId')

    const gymId = getGymIdContext(user, req)
    const where: any = {
      member: gymId ? { gymId } : {}
    }

    // Role-based isolation for trainers
    if (isTrainer(user.role)) {
      where.member.assignedTrainerId = user.userId
    }

    if (date) where.recordedDate = date
    if (memberId) where.memberId = memberId

    const data = await prisma.attendance.findMany({
      where,
      include: {
        member: {
          select: { name: true, membershipType: true, status: true }
        }
      },
      orderBy: { checkInTime: 'desc' }
    })

    // Flatten member details for frontend compatibility
    const formattedData = data.map(record => ({
      ...record,
      memberName: record.member.name,
      membershipType: record.member.membershipType,
      memberStatus: record.member.status
    }))

    return NextResponse.json({ success: true, data: formattedData })
  } catch (error: any) {
    console.error('Fetch attendance error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch attendance records' }, { status: 500 })
  }
}
