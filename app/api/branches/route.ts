import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const branches = await prisma.branch.findMany({
      where: { gymId: user.gymId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ success: true, data: branches })
  } catch (error: any) {
    console.error('Fetch branches error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch branches' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Only allow admin, ceo, cto to add branches
    if (!['admin', 'ceo', 'cto'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()

    // If this is set to default, we must unset other defaults for this gym
    if (data.isDefault) {
      await prisma.branch.updateMany({
        where: { gymId: user.gymId, isDefault: true },
        data: { isDefault: false }
      })
    }

    const newBranch = await prisma.branch.create({
      data: {
        name: data.name,
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        openingTime: data.openingTime || '06:00',
        closingTime: data.closingTime || '22:00',
        capacity: parseInt(data.capacity?.toString() || '50'),
        isDefault: !!data.isDefault,
        gymId: user.gymId
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Add Branch',
        details: `Added new branch: ${newBranch.name}`,
        entityType: 'Branch',
        entityId: newBranch.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: newBranch }, { status: 201 })
  } catch (error: any) {
    console.error('Create branch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create branch' }, { status: 500 })
  }
}
