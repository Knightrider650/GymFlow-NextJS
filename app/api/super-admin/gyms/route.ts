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

    const gyms = await prisma.gym.findMany({
      include: {
        _count: {
          select: {
            members: true,
            users: true,
            invoices: true,
          }
        },
        members: {
          select: {
            status: true
          }
        },
        invoices: {
          select: {
            amount: true,
            status: true
          }
        }
      }
    })

    const formattedGyms = gyms.map(gym => {
      const activeMembers = gym.members.filter(m => m.status === 'active').length
      const totalRevenue = gym.invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount, 0)

      return {
        id: gym.id,
        name: gym.name,
        email: gym.email,
        phone: gym.phone,
        address: gym.address,
        activeMembers,
        totalMembers: gym._count.members,
        totalRevenue,
        staffCount: gym._count.users,
        createdAt: gym.createdAt
      }
    })

    return NextResponse.json({ success: true, data: formattedGyms })
  } catch (error: any) {
    console.error('Super Admin Gyms Fetch Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch gyms' }, { status: 500 })
  }
}
