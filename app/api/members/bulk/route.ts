import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Role check: Only admin, ceo, cto, manager can bulk import members
    if (!['admin', 'ceo', 'cto', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()
    const { members } = data

    if (!Array.isArray(members)) {
      return NextResponse.json({ success: false, error: 'Expected "members" array in payload' }, { status: 400 })
    }

    const gymId = await getRequiredGymId(user, req, data)

    // Prepare members payload for insertion
    const preparedMembers = members.map((m: any) => {
      const joinDate = m.joinDate ? new Date(m.joinDate) : new Date()
      const expiryDate = m.expiryDate ? new Date(m.expiryDate) : new Date(joinDate.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Handle branchId: map 'none' or '' to null
      let targetBranchId = m.branchId
      if (targetBranchId === 'none' || targetBranchId === '') {
        targetBranchId = null
      }

      return {
        name: m.name || 'Unknown',
        email: m.email || '',
        phone: m.phone || '',
        address: m.address || null,
        membershipType: m.membershipType || 'Standard',
        status: m.status || 'active',
        joinDate,
        expiryDate,
        emergencyContact: m.emergencyContact || null,
        emergencyPhone: m.emergencyPhone || null,
        assignedTrainerId: m.assignedTrainerId || null,
        branchId: targetBranchId || null,
        gymId: gymId
      }
    })

    // Batch insert using createMany
    const created = await prisma.member.createMany({
      data: preparedMembers
    })

    // Log bulk activity
    await prisma.activityLog.create({
      data: {
        action: 'Bulk Member Import',
        details: `Imported ${created.count} members in bulk`,
        entityType: 'Member',
        userName: user.email,
        userId: user.userId,
        gymId: gymId
      }
    })

    return NextResponse.json({ success: true, data: { count: created.count } }, { status: 201 })
  } catch (error: any) {
    console.error('Bulk create members error:', error)
    return NextResponse.json({ success: false, error: 'Failed to bulk import members' }, { status: 500 })
  }
}
