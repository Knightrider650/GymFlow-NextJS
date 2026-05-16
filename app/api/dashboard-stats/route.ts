import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { isTrainer as checkIsTrainer } from '@/lib/permissions'
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
    
    // Standardize today string to YYYY-MM-DD in local-relative time for consistency with check-ins
    const todayStr = now.toISOString().split('T')[0]

    // Role-based filters
    const isTrainer = checkIsTrainer(user.role)
    const memberFilter: any = { gymId }
    if (isTrainer) {
      memberFilter.assignedTrainerId = user.userId
    }

    const attendanceFilter: any = { member: memberFilter }
    const invoiceFilter: any = { gymId }
    if (isTrainer) {
      invoiceFilter.member = { assignedTrainerId: user.userId }
    }

    // 1. Basic counts
    const [activeMembers, totalMembers, pendingPayments, todayVisits] = await Promise.all([
      prisma.member.count({ where: { ...memberFilter, status: 'active' } }),
      prisma.member.count({ where: memberFilter }),
      prisma.invoice.count({ where: { ...invoiceFilter, status: 'pending' } }),
      prisma.attendance.count({ 
        where: { 
          recordedDate: todayStr,
          ...attendanceFilter
        } 
      })
    ])

    // 2. Revenue calculations (Hide or filter for trainers)
    let todayRevenue = 0
    let monthlyRevenue = 0

    if (!isTrainer) {
      const [todayRevenueData, monthlyRevenueData] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            paymentDate: { gte: todayStart, lte: todayEnd },
            invoice: { gymId }
          },
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: {
            paymentDate: { gte: monthStart },
            invoice: { gymId }
          },
          _sum: { amount: true }
        })
      ])
      todayRevenue = todayRevenueData._sum.amount || 0
      monthlyRevenue = monthlyRevenueData._sum.amount || 0
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
        retention: '98%'
      }
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
