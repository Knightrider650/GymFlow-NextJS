import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

// GET /api/feedback
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const gymId = getGymIdContext(user, req)
    const feedback = await prisma.feedback.findMany({
      where: gymId ? { gymId } : {},
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: feedback })
  } catch (error: any) {
    console.error('Fetch feedback error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch feedback' }, { status: 500 })
  }
}

// POST /api/feedback
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const { category, title, details } = data

    if (!category || !title || !details) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const gymId = await getRequiredGymId(user, req, data)

    const newFeedback = await prisma.feedback.create({
      data: {
        category,
        title,
        details,
        gymId
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Feedback Submitted',
        details: `Submitted feedback: ${title}`,
        entityType: 'Feedback',
        entityId: newFeedback.id,
        userName: user.email,
        userId: user.userId,
        gymId
      }
    })

    return NextResponse.json({ success: true, data: newFeedback }, { status: 201 })
  } catch (error: any) {
    console.error('Create feedback error:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit feedback' }, { status: 500 })
  }
}
