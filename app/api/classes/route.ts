import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const where: any = { gymId: user.gymId }
    if (user.role === 'trainer') {
      where.instructorId = user.userId
    }

    const classes = await prisma.fitnessClass.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: classes })
  } catch (error: any) {
    console.error('Fetch classes error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch classes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Only allow admin, ceo, cto to add classes
    if (!['admin', 'ceo', 'cto'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()

    const newClass = await prisma.fitnessClass.create({
      data: {
        name: data.name,
        instructorName: data.instructorName || '',
        instructorId: data.instructorId || null,
        maxCapacity: parseInt(data.maxCapacity?.toString() || '20'),
        currentEnrollment: 0,
        time: data.time || '10:00 AM',
        days: data.days || 'Mon, Wed, Fri',
        description: data.description || '',
        branchId: data.branchId || null,
        gymId: user.gymId
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Add Class',
        details: `Created fitness class: ${newClass.name}`,
        entityType: 'FitnessClass',
        entityId: newClass.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: newClass }, { status: 201 })
  } catch (error: any) {
    console.error('Create class error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create class' }, { status: 500 })
  }
}
