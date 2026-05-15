import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await prisma.staff.findMany({
      where: { gymId: user.gymId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Fetch staff error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch staff members' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    
    const newStaff = await prisma.staff.create({
      data: {
        ...data,
        salary: parseFloat(data.salary?.toString() || '0'),
        joinDate: new Date(data.joinDate || Date.now()),
        gymId: user.gymId
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Add Staff',
        details: `Added new staff member: ${newStaff.name} as ${newStaff.position}`,
        entityType: 'Staff',
        entityId: newStaff.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: newStaff }, { status: 201 })
  } catch (error: any) {
    console.error('Create staff error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create staff member' }, { status: 500 })
  }
}
