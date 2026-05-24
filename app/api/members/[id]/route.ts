import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'
import { isTrainer } from '@/lib/permissions'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (isTrainer(user.role)) {
      return NextResponse.json({ success: false, error: 'Trainers cannot update member records' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()

    // Scoping validation
    const existingMember = await prisma.member.findUnique({
      where: { id }
    })
    if (!existingMember) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    if (user.gymId !== 'all' && !user.isGlobal && existingMember.gymId !== user.gymId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const targetBranchId = (data.branchId === 'none' || data.branchId === '') ? null : (data.branchId || undefined)
    const { id: dummy, gymId: dummy2, branchId: dummy3, ...rest } = data

    const updateData: any = {
      ...rest
    }

    if (updateData.dob) {
      updateData.dob = new Date(updateData.dob)
    } else if (updateData.dob === '') {
      updateData.dob = null
    }

    if (targetBranchId !== undefined) {
      updateData.branchId = targetBranchId
    }
    if (data.joinDate) {
      updateData.joinDate = new Date(data.joinDate)
    }
    if (data.expiryDate) {
      updateData.expiryDate = new Date(data.expiryDate)
    }

    const updatedMember = await prisma.member.update({
      where: { id },
      data: updateData
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Member',
        details: `Updated member details: ${updatedMember.name}`,
        entityType: 'Member',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: existingMember.gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedMember })
  } catch (error: any) {
    console.error('Update member error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (isTrainer(user.role)) {
      return NextResponse.json({ success: false, error: 'Trainers cannot delete member records' }, { status: 403 })
    }

    const { id } = await params

    // Scoping validation
    const existingMember = await prisma.member.findUnique({
      where: { id }
    })
    if (!existingMember) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    if (user.gymId !== 'all' && !user.isGlobal && existingMember.gymId !== user.gymId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Clean up related records in a transaction to prevent constraint errors
    await prisma.$transaction(async (tx) => {
      // 1. Delete member attendance
      await tx.attendance.deleteMany({
        where: { memberId: id }
      })

      // 2. Find invoices and delete payments associated with them
      const invoices = await tx.invoice.findMany({
        where: { memberId: id },
        select: { id: true }
      })
      const invoiceIds = invoices.map(inv => inv.id)

      if (invoiceIds.length > 0) {
        await tx.payment.deleteMany({
          where: { invoiceId: { in: invoiceIds } }
        })
        await tx.invoice.deleteMany({
          where: { id: { in: invoiceIds } }
        })
      }

      // 3. Delete the member record
      await tx.member.delete({
        where: { id }
      })
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Member',
        details: `Deleted member record: ${existingMember.name}`,
        entityType: 'Member',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: existingMember.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete member error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete member' }, { status: 500 })
  }
}
