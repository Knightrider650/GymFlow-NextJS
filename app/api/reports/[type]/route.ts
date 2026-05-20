import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'
import { startOfDay, endOfDay, startOfMonth, subMonths, format } from 'date-fns'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { type } = await params
    const gymId = getGymIdContext(user, req)
    const filter: any = gymId ? { gymId } : {}

    let reportData: any = {}

    switch (type) {
      case 'member-summary': {
        const [active, expired, pending, total, list] = await Promise.all([
          prisma.member.count({ where: { ...filter, status: 'active' } }),
          prisma.member.count({ where: { ...filter, status: 'expired' } }),
          prisma.member.count({ where: { ...filter, status: 'pending' } }),
          prisma.member.count({ where: filter }),
          prisma.member.findMany({
            where: filter,
            take: 10,
            orderBy: { joinDate: 'desc' },
            select: { name: true, email: true, membershipType: true, status: true, joinDate: true }
          })
        ])

        // Monthly registration trend
        const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))
        const registrationTrend = await Promise.all(
          months.map(async (m) => {
            const start = startOfMonth(m)
            const end = endOfDay(new Date(m.getFullYear(), m.getMonth() + 1, 0))
            const count = await prisma.member.count({
              where: {
                ...filter,
                joinDate: { gte: start, lte: end }
              }
            })
            return {
              name: format(m, 'MMM'),
              members: count
            }
          })
        )

        reportData = { active, expired, pending, total, recentMembers: list, registrationTrend }
        break
      }

      case 'expiring-members': {
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

        const expiring = await prisma.member.findMany({
          where: {
            ...filter,
            status: 'active',
            expiryDate: {
              gte: new Date(),
              lte: thirtyDaysFromNow
            }
          },
          orderBy: { expiryDate: 'asc' },
          select: { id: true, name: true, email: true, phone: true, expiryDate: true, membershipType: true }
        })

        reportData = { expiring }
        break
      }

      case 'revenue': {
        const [totalRevenueData, pendingInvoicesCount] = await Promise.all([
          prisma.payment.aggregate({
            where: gymId ? { invoice: { gymId } } : {},
            _sum: { amount: true }
          }),
          prisma.invoice.count({
            where: { ...filter, status: 'pending' }
          })
        ])

        const totalRevenue = totalRevenueData._sum.amount || 0

        // Last 5 months monthly revenue trend
        const months = Array.from({ length: 5 }, (_, i) => subMonths(new Date(), 4 - i))
        const revenueTrend = await Promise.all(
          months.map(async (m) => {
            const start = startOfMonth(m)
            const end = endOfDay(new Date(m.getFullYear(), m.getMonth() + 1, 0))
            const sum = await prisma.payment.aggregate({
              where: {
                paymentDate: { gte: start, lte: end },
                invoice: gymId ? { gymId } : {}
              },
              _sum: { amount: true }
            })
            return {
              name: format(m, 'MMM'),
              amount: sum._sum.amount || 0
            }
          })
        )

        reportData = { totalRevenue, pendingInvoicesCount, revenueTrend }
        break
      }

      case 'attendance': {
        const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        // Aggregate check-ins over the last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const attendanceLogs = await prisma.attendance.findMany({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            member: gymId ? { gymId } : {}
          },
          select: { checkInTime: true }
        })

        // Day of week distribution
        const dayCounts = Array(7).fill(0)
        // Hour distribution
        const hourCounts = Array(24).fill(0)

        attendanceLogs.forEach(log => {
          const d = new Date(log.checkInTime)
          dayCounts[d.getDay()]++
          hourCounts[d.getHours()]++
        })

        const weekdayDistribution = weekdayNames.map((name, index) => ({
          name,
          visits: dayCounts[index]
        }))

        const hourDistribution = Array.from({ length: 14 }, (_, i) => {
          const hour = i + 6 // 6 AM to 8 PM
          return {
            name: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`,
            visits: hourCounts[hour] || 0
          }
        })

        reportData = { weekdayDistribution, hourDistribution, totalVisits: attendanceLogs.length }
        break
      }

      case 'class-utilization': {
        const classes = await prisma.fitnessClass.findMany({
          where: filter,
          select: { name: true, maxCapacity: true, currentEnrollment: true, instructorName: true }
        })

        const formatted = classes.map(c => ({
          name: c.name,
          enrollment: c.currentEnrollment,
          capacity: c.maxCapacity,
          occupancyRate: c.maxCapacity > 0 ? Math.round((c.currentEnrollment / c.maxCapacity) * 100) : 0,
          instructor: c.instructorName || 'TBD'
        }))

        reportData = { classes: formatted }
        break
      }

      case 'equipment-status': {
        const items = await prisma.inventoryItem.findMany({
          where: filter
        })

        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
        const lowStock = items.filter(item => item.quantity <= item.minThreshold).length
        const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0)

        reportData = { items, totalItems, lowStock, totalValue }
        break
      }

      case 'leads-conversion': {
        const leads = await prisma.lead.findMany({
          where: filter,
          select: { status: true }
        })

        const counts: Record<string, number> = { 'New': 0, 'Contacted': 0, 'Converted': 0, 'Lost': 0 }
        leads.forEach(l => {
          if (counts[l.status] !== undefined) {
            counts[l.status]++
          }
        })

        const distribution = Object.keys(counts).map(key => ({
          name: key,
          value: counts[key]
        }))

        reportData = { distribution, totalLeads: leads.length }
        break
      }

      case 'staff-performance': {
        const staff = await prisma.staff.findMany({
          where: filter,
          select: { name: true, position: true, salary: true, status: true }
        })

        const totalStaff = staff.length
        const activeStaff = staff.filter(s => s.status === 'active').length
        const monthlyPayroll = staff.reduce((sum, s) => sum + s.salary, 0)

        reportData = { totalStaff, activeStaff, monthlyPayroll, staffList: staff }
        break
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown report type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: reportData })
  } catch (error: any) {
    console.error('Reports error:', error)
    return NextResponse.json({ success: false, error: 'Failed to compile report data' }, { status: 500 })
  }
}
