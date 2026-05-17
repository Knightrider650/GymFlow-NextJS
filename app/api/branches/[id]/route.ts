import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Only allow admin, ceo, cto to update branches
    if (!['admin', 'ceo', 'cto'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()

    // Validate that branch belongs to the user's gym
    const existingBranch = await prisma.branch.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existingBranch) {
      return NextResponse.json({ success: false, error: 'Branch not found' }, { status: 404 })
    }

    // If setting to default, unset other defaults
    if (data.isDefault) {
      await prisma.branch.updateMany({
        where: { gymId: user.gymId, isDefault: true, NOT: { id } },
        data: { isDefault: false }
      })
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        openingTime: data.openingTime,
        closingTime: data.closingTime,
        capacity: data.capacity !== undefined ? parseInt(data.capacity.toString()) : undefined,
        isDefault: data.isDefault !== undefined ? !!data.isDefault : undefined
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Branch',
        details: `Updated branch: ${updatedBranch.name}`,
        entityType: 'Branch',
        entityId: updatedBranch.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedBranch })
  } catch (error: any) {
    console.error('Update branch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update branch' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Only allow admin, ceo, cto to delete branches
    if (!['admin', 'ceo', 'cto'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existingBranch = await prisma.branch.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existingBranch) {
      return NextResponse.json({ success: false, error: 'Branch not found' }, { status: 404 })
    }

    await prisma.branch.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Branch',
        details: `Deleted branch: ${existingBranch.name}`,
        entityType: 'Branch',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete branch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete branch' }, { status: 500 })
  }
}
