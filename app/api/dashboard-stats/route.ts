import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'
import { isTrainer as checkIsTrainer } from '@/lib/permissions'
import { startOfDay, endOfDay, startOfMonth, subDays, subMonths, format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const gymId = getGymIdContext(user, req)
    
    let timeZone = 'UTC'
    if (gymId && gymId !== 'all') {
      const gym = await prisma.gym.findUnique({ where: { id: gymId } })
      if (gym?.timeZone) {
        timeZone = gym.timeZone
      }
    }

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const monthStart = startOfMonth(now)
    
    // Standardize today string to YYYY-MM-DD in local-relative time for consistency with check-ins
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

    // Role-based filters
    const isTrainer = checkIsTrainer(user.role)
    const memberFilter: any = gymId ? { gymId } : {}
    if (isTrainer) {
      memberFilter.assignedTrainerId = user.userId
    }

    const attendanceFilter: any = { member: memberFilter }
    const invoiceFilter: any = gymId ? { gymId } : {}
    if (isTrainer) {
      invoiceFilter.member = { assignedTrainerId: user.userId }
    }

    // 1. Basic counts
    const [activeMembers, totalMembers, pendingPayments, todayVisits, active30DaysAgo] = await Promise.all([
      prisma.member.count({ where: { ...memberFilter, status: 'active' } }),
      prisma.member.count({ where: memberFilter }),
      prisma.invoice.count({ where: { ...invoiceFilter, status: 'pending' } }),
      prisma.attendance.count({ 
        where: { 
          recordedDate: todayStr,
          ...attendanceFilter
        } 
      }),
      prisma.member.count({
        where: {
          ...memberFilter,
          status: 'active',
          joinDate: { lt: subDays(now, 30) }
        }
      })
    ])

    const activeMembersTrend = active30DaysAgo > 0 ? Math.round(((activeMembers - active30DaysAgo) / active30DaysAgo) * 100) : 0

    // 2. Revenue calculations (Hide or filter for trainers)
    let todayRevenue = 0
    let monthlyRevenue = 0
    let todayRevenueTrend = 0
    let monthlyRevenueTrend = 0

    if (!isTrainer) {
      const yesterdayStart = startOfDay(subDays(now, 1))
      const yesterdayEnd = endOfDay(subDays(now, 1))
      const prevMonthStart = startOfMonth(subMonths(now, 1))
      const prevMonthSameTime = subMonths(now, 1)

      const [todayRevenueData, monthlyRevenueData, yesterdayRevenueData, lastMonthRevenueData] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            paymentDate: { gte: todayStart, lte: todayEnd },
            invoice: gymId ? { gymId } : {}
          },
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: {
            paymentDate: { gte: monthStart },
            invoice: gymId ? { gymId } : {}
          },
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: {
            paymentDate: { gte: yesterdayStart, lte: yesterdayEnd },
            invoice: gymId ? { gymId } : {}
          },
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: {
            paymentDate: { gte: prevMonthStart, lte: prevMonthSameTime },
            invoice: gymId ? { gymId } : {}
          },
          _sum: { amount: true }
        })
      ])
      todayRevenue = todayRevenueData._sum.amount || 0
      monthlyRevenue = monthlyRevenueData._sum.amount || 0
      const yesterdayRevenue = yesterdayRevenueData._sum.amount || 0
      const lastMonthRevenue = lastMonthRevenueData._sum.amount || 0

      todayRevenueTrend = yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0
      monthlyRevenueTrend = lastMonthRevenue > 0 ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0
    }

    // 3. Trends (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(now, 6 - i)
      return {
        date: d,
        dateStr: d.toISOString().split('T')[0],
        name: format(d, 'EEE')
      }
    })

    const revenueTrend = isTrainer ? [] : await Promise.all(
      last7Days.map(async (day) => {
        const sum = await prisma.payment.aggregate({
          where: {
            paymentDate: { gte: startOfDay(day.date), lte: endOfDay(day.date) },
            invoice: gymId ? { gymId } : {}
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
            ...attendanceFilter
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
        todayRevenue,
        monthlyRevenue,
        todayVisits,
        pendingPayments,
        revenueTrend,
        attendanceTrend,
        activeMembersTrend,
        todayRevenueTrend,
        monthlyRevenueTrend,
        retention: '98%'
      }
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
