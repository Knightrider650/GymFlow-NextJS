import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { memberId, notes } = await req.json()
    
    if (!memberId) {
      return NextResponse.json({ success: false, error: 'Member ID is required' }, { status: 400 })
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId: user.gymId }
    })

    if (!member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Check if already checked in today without checking out
    const activeCheckin = await prisma.attendance.findFirst({
      where: {
        memberId,
        recordedDate: today,
        checkOutTime: null
      }
    })

    if (activeCheckin) {
      return NextResponse.json({ success: false, error: 'Member is already checked in' }, { status: 400 })
    }

    const record = await prisma.attendance.create({
      data: {
        memberId,
        notes: notes || '',
        recordedDate: today
      },
      include: {
        member: {
          select: { name: true, membershipType: true, status: true }
        }
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Check In',
        details: `${member.name} checked in`,
        entityType: 'Attendance',
        entityId: record.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    const formattedData = {
      ...record,
      memberName: record.member.name,
      membershipType: record.member.membershipType,
      memberStatus: record.member.status
    }

    return NextResponse.json({ success: true, data: formattedData }, { status: 201 })
  } catch (error: any) {
    console.error('Check-in error:', error)
    return NextResponse.json({ success: false, error: 'Failed to record check-in' }, { status: 500 })
  }
}
