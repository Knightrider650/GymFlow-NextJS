import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

// PUT /api/campaigns/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const gymId = getGymIdContext(user, req)

    const existing = await prisma.campaign.findFirst({
      where: {
        id,
        ...(gymId ? { gymId } : {})
      }
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    const data = await req.json()
    const { title, subject, content, targetSegment, status } = data

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(subject && { subject }),
        ...(content && { content }),
        ...(targetSegment && { targetSegment }),
        ...(status && { status })
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Campaign',
        details: `Updated campaign: ${updated.title}`,
        entityType: 'Campaign',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: updated.gymId
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Update campaign error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update campaign' }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const gymId = getGymIdContext(user, req)

    const existing = await prisma.campaign.findFirst({
      where: {
        id,
        ...(gymId ? { gymId } : {})
      }
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    await prisma.campaign.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Campaign',
        details: `Deleted campaign: ${existing.title}`,
        entityType: 'Campaign',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: existing.gymId
      }
    })

    return NextResponse.json({ success: true, message: 'Campaign deleted successfully' })
  } catch (error: any) {
    console.error('Delete campaign error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete campaign' }, { status: 500 })
  }
}
