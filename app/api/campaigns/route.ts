import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

// GET /api/campaigns
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const gymId = getGymIdContext(user, req)
    const campaigns = await prisma.campaign.findMany({
      where: gymId ? { gymId } : {},
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: campaigns })
  } catch (error: any) {
    console.error('Fetch campaigns error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

// POST /api/campaigns
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()
    const { title, subject, content, targetSegment } = data

    if (!title || !subject || !content) {
      return NextResponse.json({ success: false, error: 'Title, subject and content are required' }, { status: 400 })
    }

    const gymId = await getRequiredGymId(user, req, data)

    const campaign = await prisma.campaign.create({
      data: {
        title,
        subject,
        content,
        targetSegment: targetSegment || 'All Members',
        gymId,
        status: 'draft'
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Create Campaign',
        details: `Created campaign: ${title}`,
        entityType: 'Campaign',
        entityId: campaign.id,
        userName: user.email,
        userId: user.userId,
        gymId
      }
    })

    return NextResponse.json({ success: true, data: campaign }, { status: 201 })
  } catch (error: any) {
    console.error('Create campaign error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create campaign' }, { status: 500 })
  }
}
