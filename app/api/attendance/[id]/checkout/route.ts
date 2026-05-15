import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    
    const record = await prisma.attendance.findFirst({
      where: { id, member: { gymId: user.gymId } },
      include: {
        member: {
          select: { name: true, membershipType: true, status: true }
        }
      }
    })

    if (!record) {
      return NextResponse.json({ success: false, error: 'Attendance record not found' }, { status: 404 })
    }

    if (record.checkOutTime) {
      return NextResponse.json({ success: false, error: 'Member is already checked out' }, { status: 400 })
    }

    const updatedRecord = await prisma.attendance.update({
      where: { id },
      data: { checkOutTime: new Date() },
      include: {
        member: {
          select: { name: true, membershipType: true, status: true }
        }
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Check Out',
        details: `${record.member.name} checked out`,
        entityType: 'Attendance',
        entityId: updatedRecord.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    const formattedData = {
      ...updatedRecord,
      memberName: updatedRecord.member.name,
      membershipType: updatedRecord.member.membershipType,
      memberStatus: updatedRecord.member.status
    }

    return NextResponse.json({ success: true, data: formattedData })
  } catch (error: any) {
    console.error('Check-out error:', error)
    return NextResponse.json({ success: false, error: 'Failed to record check-out' }, { status: 500 })
  }
}
