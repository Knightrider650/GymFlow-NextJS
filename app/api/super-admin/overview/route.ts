import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ADMIN_ROLES, type UserRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [gymCount, memberCount, revenueSum, activeMemberCount] = await Promise.all([
      prisma.gym.count(),
      prisma.member.count(),
      prisma.invoice.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
      }),
      prisma.member.count({
        where: { status: 'active' }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalGyms: gymCount,
        totalMembers: memberCount,
        activeMembers: activeMemberCount,
        totalRevenue: revenueSum._sum.amount || 0
      }
    })
  } catch (error: any) {
    console.error('Super Admin Overview Fetch Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch overview stats' }, { status: 500 })
  }
}
