import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !['admin', 'ceo', 'cto', 'owner'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to purge data' }, { status: 403 })
    }

    const gymId = getGymIdContext(user, req)
    if (!gymId) {
      return NextResponse.json({ success: false, error: 'Target gym context must be resolved' }, { status: 400 })
    }

    // Execute deletion of transactional data scoped to the current gymId
    await prisma.$transaction([
      // Delete Payments related to invoices of this gym
      prisma.payment.deleteMany({
        where: {
          invoice: {
            gymId: gymId
          }
        }
      }),
      // Delete Invoices
      prisma.invoice.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Attendance
      prisma.attendance.deleteMany({
        where: {
          member: {
            gymId: gymId
          }
        }
      }),
      // Delete Members
      prisma.member.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Staff
      prisma.staff.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Fitness Classes
      prisma.fitnessClass.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Inventory Items
      prisma.inventoryItem.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Leads
      prisma.lead.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Campaigns
      prisma.campaign.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Reminders
      prisma.reminder.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Notifications
      prisma.notification.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Feedback
      prisma.feedback.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Invites
      prisma.invite.deleteMany({
        where: { gymId: gymId }
      }),
      // Delete Activity Logs
      prisma.activityLog.deleteMany({
        where: { gymId: gymId }
      })
    ])

    // Create a new activity log to record the purge
    await prisma.activityLog.create({
      data: {
        action: 'System Reset / Purge Data',
        details: `Successfully purged all transactional and operational data for Gym ID: ${gymId}`,
        entityType: 'System',
        userName: user.email,
        userId: user.userId,
        gymId: gymId
      }
    })

    return NextResponse.json({ success: true, message: 'Gym transactional data purged successfully' })
  } catch (error: any) {
    console.error('Purge data error:', error)
    return NextResponse.json({ success: false, error: 'Failed to purge gym data' }, { status: 500 })
  }
}
