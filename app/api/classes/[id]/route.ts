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

    // Only allow admin, ceo, cto to update classes
    if (!['admin', 'ceo', 'cto'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()

    const existingClass = await prisma.fitnessClass.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existingClass) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 })
    }

    const updatedClass = await prisma.fitnessClass.update({
      where: { id },
      data: {
        name: data.name,
        instructorName: data.instructorName,
        instructorId: data.instructorId || null,
        maxCapacity: data.maxCapacity !== undefined ? parseInt(data.maxCapacity.toString()) : undefined,
        time: data.time,
        days: data.days,
        description: data.description,
        branchId: data.branchId || null
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Class',
        details: `Updated fitness class: ${updatedClass.name}`,
        entityType: 'FitnessClass',
        entityId: updatedClass.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedClass })
  } catch (error: any) {
    console.error('Update class error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update class' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Only allow admin, ceo, cto to delete classes
    if (!['admin', 'ceo', 'cto'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existingClass = await prisma.fitnessClass.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existingClass) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 })
    }

    await prisma.fitnessClass.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Class',
        details: `Deleted fitness class: ${existingClass.name}`,
        entityType: 'FitnessClass',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete class error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete class' }, { status: 500 })
  }
}
