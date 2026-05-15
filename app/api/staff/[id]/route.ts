import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const { id } = await params
    
    const existing = await prisma.staff.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 })

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        position: data.position,
        salary: data.salary !== undefined ? parseFloat(data.salary.toString()) : undefined,
        status: data.status,
        emergencyContact: data.emergencyContact
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Staff',
        details: `Updated staff details for: ${updatedStaff.name}`,
        entityType: 'Staff',
        entityId: updatedStaff.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedStaff })
  } catch (error: any) {
    console.error('Update staff error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update staff member' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    
    const existing = await prisma.staff.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 })

    await prisma.staff.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Staff',
        details: `Removed staff member: ${existing.name}`,
        entityType: 'Staff',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete staff error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete staff member' }, { status: 500 })
  }
}
