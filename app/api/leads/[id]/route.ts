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

    const { id } = await params
    const data = await req.json()

    const existingLead = await prisma.lead.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existingLead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        notes: data.notes
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Lead',
        details: `Updated lead: ${updatedLead.name}`,
        entityType: 'Lead',
        entityId: updatedLead.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedLead })
  } catch (error: any) {
    console.error('Update lead error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const existingLead = await prisma.lead.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existingLead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    await prisma.lead.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Lead',
        details: `Deleted lead: ${existingLead.name}`,
        entityType: 'Lead',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete lead error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete lead' }, { status: 500 })
  }
}
