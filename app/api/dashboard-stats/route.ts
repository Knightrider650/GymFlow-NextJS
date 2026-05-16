import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { startOfDay, endOfDay, startOfMonth, subDays, format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const gymId = user.gymId
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const monthStart = startOfMonth(now)
    const todayStr = format(now, 'yyyy-MM-dd')

    // 1. Basic counts
    const [activeMembers, totalMembers, pendingPayments, todayVisits] = await Promise.all([
      prisma.member.count({ where: { gymId, status: 'active' } }),
      prisma.member.count({ where: { gymId } }),
      prisma.invoice.count({ where: { gymId, status: 'pending' } }),
      prisma.attendance.count({ 
        where: { 
          recordedDate: todayStr,
          member: { gymId }
        } 
      })
    ])

    // 2. Revenue calculations
    const todayRevenueData = await prisma.payment.aggregate({
      where: {
        paymentDate: { gte: todayStart, lte: todayEnd },
        invoice: { gymId }
      },
      _sum: { amount: true }
    })

    const monthlyRevenueData = await prisma.payment.aggregate({
      where: {
        paymentDate: { gte: monthStart },
        invoice: { gymId }
      },
      _sum: { amount: true }
    })

    // 3. Trends (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(now, 6 - i)
      return {
        date: d,
        dateStr: format(d, 'yyyy-MM-dd'),
        name: format(d, 'EEE')
      }
    })

    const revenueTrend = await Promise.all(
      last7Days.map(async (day) => {
        const sum = await prisma.payment.aggregate({
          where: {
            paymentDate: { gte: startOfDay(day.date), lte: endOfDay(day.date) },
            invoice: { gymId }
          },
          _sum: { amount: true }
        })
        return {
          name: day.name,
          revenue: sum._sum.amount || 0
        }
      })
    )

    const attendanceTrend = await Promise.all(
      last7Days.map(async (day) => {
        const count = await prisma.attendance.count({
          where: {
            recordedDate: day.dateStr,
            member: { gymId }
          }
        })
        return {
          name: day.name,
          visits: count
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        activeMembers,
        totalMembers,
        todayRevenue: todayRevenueData._sum.amount || 0,
        monthlyRevenue: monthlyRevenueData._sum.amount || 0,
        todayVisits,
        pendingPayments,
        revenueTrend,
        attendanceTrend,
        retention: '98%' // Simplified for now
      }
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
