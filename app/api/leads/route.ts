import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const leads = await prisma.lead.findMany({
      where: { gymId: user.gymId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: leads })
  } catch (error: any) {
    console.error('Fetch leads error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()

    const newLead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        status: data.status || 'New',
        notes: data.notes || '',
        gymId: user.gymId
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Add Lead',
        details: `Added new lead: ${newLead.name}`,
        entityType: 'Lead',
        entityId: newLead.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: newLead }, { status: 201 })
  } catch (error: any) {
    console.error('Create lead error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create lead' }, { status: 500 })
  }
}
