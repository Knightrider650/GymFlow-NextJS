import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

// GET /api/invites
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const gymId = getGymIdContext(user, req)
    const invites = await prisma.invite.findMany({
      where: gymId ? { gymId } : {},
      orderBy: { sentAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: invites })
  } catch (error: any) {
    console.error('Fetch invites error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch invites' }, { status: 500 })
  }
}

// POST /api/invites
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()
    const { email, role: rawRole, expiresAt } = data

    if (!email || !rawRole) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const role = rawRole.toLowerCase()
    const gymId = await getRequiredGymId(user, req, data)

    // Check if invite already exists
    const existing = await prisma.invite.findFirst({
      where: { email, gymId }
    })

    if (existing && existing.status === 'pending') {
      return NextResponse.json({ success: false, error: 'An invite is already pending for this email' }, { status: 400 })
    }

    const invite = await prisma.invite.create({
      data: {
        email,
        role,
        status: 'pending',
        sentAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        gymId
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Invite Sent',
        details: `Sent invitation to ${email} for role: ${role}`,
        entityType: 'Invite',
        entityId: invite.id,
        userName: user.email,
        userId: user.userId,
        gymId
      }
    })

    return NextResponse.json({ success: true, data: invite }, { status: 201 })
  } catch (error: any) {
    console.error('Create invite error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create invite' }, { status: 500 })
  }
}
