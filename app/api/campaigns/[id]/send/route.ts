import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

// POST /api/campaigns/[id]/send
export async function POST(
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

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        ...(gymId ? { gymId } : {})
      }
    })

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    // Find targeted members
    const targetQuery = gymId ? { gymId } : {}
    const members = await prisma.member.findMany({
      where: targetQuery
    })

    // Perform inside transaction: create reminders for all members and update campaign status
    await prisma.$transaction(async (tx) => {
      // 1. Create reminder logs for each member
      for (const member of members) {
        await tx.reminder.create({
          data: {
            channel: 'Email',
            memberName: member.name,
            type: 'Campaign',
            content: campaign.content,
            status: 'sent',
            gymId: campaign.gymId
          }
        })
      }

      // 2. Update campaign status
      await tx.campaign.update({
        where: { id },
        data: {
          status: 'sent',
          sentAt: new Date()
        }
      })

      // 3. Create activity log
      await tx.activityLog.create({
        data: {
          action: 'Send Campaign',
          details: `Sent campaign "${campaign.title}" to ${members.length} members`,
          entityType: 'Campaign',
          entityId: id,
          userName: user.email,
          userId: user.userId,
          gymId: campaign.gymId
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully to ${members.length} members`,
      data: { reminderCount: members.length }
    })
  } catch (error: any) {
    console.error('Send campaign error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send campaign' }, { status: 500 })
  }
}
