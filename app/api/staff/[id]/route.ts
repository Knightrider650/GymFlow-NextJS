import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'
import { ELEVATED_ROLES } from '@/lib/permissions'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Enforce role authorization
    if (!ELEVATED_ROLES.includes(user.role as any)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()
    const { id } = await params
    const gymId = await getRequiredGymId(user, req, data)
    
    const existing = await prisma.staff.findFirst({
      where: { id, gymId }
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 })

    const targetBranchId = (data.branchId === 'none' || data.branchId === '') ? null : (data.branchId || null)

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        position: data.position,
        salary: data.salary !== undefined ? parseFloat(data.salary.toString()) : undefined,
        status: data.status,
        emergencyContact: data.emergencyContact,
        branchId: targetBranchId
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
        gymId: gymId
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
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Enforce role authorization
    if (!ELEVATED_ROLES.includes(user.role as any)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const gymId = getGymIdContext(user, req)
    
    const existing = await prisma.staff.findFirst({
      where: gymId ? { id, gymId } : { id }
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
        gymId: existing.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete staff error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete staff member' }, { status: 500 })
  }
}
