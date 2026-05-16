import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const membershipType = searchParams.get('membershipType')
    const searchTerm = searchParams.get('searchTerm')

    const where: any = {
      gymId: user.gymId
    }

    // Report requirement: Trainers view assigned members only
    if (user.role === 'trainer') {
      where.assignedTrainerId = user.userId
    }

    if (status) where.status = status
    if (membershipType) where.membershipType = membershipType
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } }
      ]
    }

    const members = await prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: members })
  } catch (error: any) {
    console.error('Fetch members error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Report requirement: Trainer should not manage broad member records
    if (user.role === 'trainer') {
      return NextResponse.json({ success: false, error: 'Trainers cannot create member records' }, { status: 403 })
    }

    const data = await req.json()
    
    const newMember = await prisma.member.create({
      data: {
        ...data,
        gymId: user.gymId,
        joinDate: new Date(data.joinDate || Date.now()),
        expiryDate: new Date(data.expiryDate || Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'Add Member',
        details: `Added new member: ${newMember.name}`,
        entityType: 'Member',
        entityId: newMember.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: newMember }, { status: 201 })
  } catch (error: any) {
    console.error('Create member error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create member' }, { status: 500 })
  }
}
