import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'
import { isTrainer } from '@/lib/permissions'

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

    const gymId = getGymIdContext(user, req)
    const where: any = gymId ? { gymId } : {}

    // Report requirement: Trainers view assigned members only
    if (isTrainer(user.role)) {
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
    if (isTrainer(user.role)) {
      return NextResponse.json({ success: false, error: 'Trainers cannot create member records' }, { status: 403 })
    }

    const data = await req.json()
    const gymId = await getRequiredGymId(user, req, data)
    const targetBranchId = (data.branchId === 'none' || data.branchId === '') ? null : (data.branchId || null)
    
    const { gymId: dummy, branchId: dummy2, ...rest } = data

    if (rest.dob) {
      rest.dob = new Date(rest.dob)
    } else {
      delete rest.dob
    }

    // Validate planId if provided
    if (rest.planId) {
      const plan = await prisma.plan.findFirst({
        where: {
          id: rest.planId,
          gymId: gymId
        }
      })
      
      if (!plan) {
        return NextResponse.json({ success: false, error: 'Invalid plan selected' }, { status: 400 })
      }
    }

    const newMember = await prisma.member.create({
      data: {
        ...rest,
        gymId: gymId,
        branchId: targetBranchId,
        joinDate: new Date(data.joinDate || Date.now()),
        expiryDate: new Date(data.expiryDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
        planId: rest.planId || null
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'Add Member',
        details: `Added new member: ${newMember.name}${(newMember as any).planId ? ` with plan` : ''}`,
        entityType: 'Member',
        entityId: newMember.id,
        userName: user.email,
        userId: user.userId,
        gymId: gymId
      }
    })

    return NextResponse.json({ success: true, data: newMember }, { status: 201 })
  } catch (error: any) {
    console.error('Create member error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create member' }, { status: 500 })
  }
}
