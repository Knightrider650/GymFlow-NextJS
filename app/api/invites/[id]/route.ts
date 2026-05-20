import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

// DELETE /api/invites/[id]
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

    const existing = await prisma.invite.findFirst({
      where: {
        id,
        ...(gymId ? { gymId } : {})
      }
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 })
    }

    await prisma.invite.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Invite Cancelled',
        details: `Cancelled invitation for: ${existing.email}`,
        entityType: 'Invite',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: existing.gymId
      }
    })

    return NextResponse.json({ success: true, message: 'Invite cancelled successfully' })
  } catch (error: any) {
    console.error('Delete invite error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete invite' }, { status: 500 })
  }
}
