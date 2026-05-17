import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { classId, memberId } = await req.json()
    if (!classId || !memberId) {
      return NextResponse.json({ success: false, error: 'Missing classId or memberId' }, { status: 400 })
    }

    // 1. Get class
    const fitnessClass = await prisma.fitnessClass.findFirst({
      where: { id: classId, gymId: user.gymId }
    })
    if (!fitnessClass) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 })
    }

    // 2. Get member
    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId: user.gymId }
    })
    if (!member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    // 3. Check capacity
    if (fitnessClass.currentEnrollment >= fitnessClass.maxCapacity) {
      return NextResponse.json({ success: false, error: 'Class is already fully booked' }, { status: 400 })
    }

    // 4. Update enrollment counter
    const updatedClass = await prisma.fitnessClass.update({
      where: { id: classId },
      data: {
        currentEnrollment: {
          increment: 1
        }
      }
    })

    // 5. Create activity log
    await prisma.activityLog.create({
      data: {
        action: 'Class Enrollment',
        details: `Enrolled member ${member.name} into class ${fitnessClass.name}`,
        entityType: 'FitnessClass',
        entityId: classId,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedClass })
  } catch (error: any) {
    console.error('Class booking error:', error)
    return NextResponse.json({ success: false, error: 'Failed to enroll member' }, { status: 500 })
  }
}
