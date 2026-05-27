import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // 1. Get lead
    const lead = await prisma.lead.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    // 2. Perform conversion inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // Look up the selected membership plan to determine the duration
      const plan = await tx.plan.findFirst({
        where: {
          name: body.membershipType || 'Monthly',
          gymId: user.gymId
        }
      })

      let expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default fallback 30 days
      if (plan) {
        if (plan.durationMonths) {
          const d = new Date()
          d.setMonth(d.getMonth() + plan.durationMonths)
          expiryDate = d
        } else if (plan.durationDays) {
          expiryDate = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)
        }
      }

      // Create new member
      const newMember = await tx.member.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: '',
          membershipType: body.membershipType || 'Monthly',
          status: 'active',
          joinDate: new Date(),
          expiryDate,
          gymId: user.gymId
        }
      })

      // Update lead status
      await tx.lead.update({
        where: { id },
        data: { status: 'Converted' }
      })

      // Log activity
      await tx.activityLog.create({
        data: {
          action: 'Convert Lead',
          details: `Converted lead ${lead.name} to member`,
          entityType: 'Member',
          entityId: newMember.id,
          userName: user.email,
          userId: user.userId,
          gymId: user.gymId
        }
      })

      return newMember
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Convert lead error:', error)
    return NextResponse.json({ success: false, error: 'Failed to convert lead' }, { status: 500 })
  }
}
