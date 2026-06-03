import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'

// PUT /api/expenses/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const gymId = getGymIdContext(user, req)

    // Find the expense to make sure it exists and belongs to the user's gym
    const expense = await prisma.expense.findFirst({
      where: {
        id,
        ...(gymId ? { gymId } : {})
      }
    })

    if (!expense) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 })
    }

    const data = await req.json()
    const { amount, category, description, date } = data

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : expense.amount,
        category: category || expense.category,
        description: description !== undefined ? description : expense.description,
        date: date ? new Date(date) : expense.date
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Expense',
        details: `Updated expense: ${updatedExpense.category} - ${updatedExpense.amount}`,
        entityType: 'Expense',
        entityId: updatedExpense.id,
        userName: user.email,
        userId: user.userId,
        gymId: updatedExpense.gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedExpense })
  } catch (error: any) {
    console.error('Update expense error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update expense' }, { status: 500 })
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const gymId = getGymIdContext(user, req)

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        ...(gymId ? { gymId } : {})
      }
    })

    if (!expense) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 })
    }

    await prisma.expense.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Expense',
        details: `Deleted expense: ${expense.category} - ${expense.amount}`,
        entityType: 'Expense',
        entityId: expense.id,
        userName: user.email,
        userId: user.userId,
        gymId: expense.gymId
      }
    })

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' })
  } catch (error: any) {
    console.error('Delete expense error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete expense' }, { status: 500 })
  }
}
