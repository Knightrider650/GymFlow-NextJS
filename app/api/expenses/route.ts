import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

// GET /api/expenses
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const gymId = getGymIdContext(user, req)
    const expenses = await prisma.expense.findMany({
      where: gymId ? { gymId } : {},
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({ success: true, data: expenses })
  } catch (error: any) {
    console.error('Fetch expenses error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()
    const { amount, category, description, date } = data

    if (amount === undefined || !category) {
      return NextResponse.json({ success: false, error: 'Amount and category are required' }, { status: 400 })
    }

    const gymId = await getRequiredGymId(user, req, data)

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description: description || '',
        date: date ? new Date(date) : new Date(),
        gymId
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Log Expense',
        details: `Logged expense: ${category} - ${amount}`,
        entityType: 'Expense',
        entityId: expense.id,
        userName: user.email,
        userId: user.userId,
        gymId
      }
    })

    return NextResponse.json({ success: true, data: expense }, { status: 201 })
  } catch (error: any) {
    console.error('Create expense error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create expense' }, { status: 500 })
  }
}
