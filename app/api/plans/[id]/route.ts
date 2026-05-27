import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { isTrainer } from '@/lib/permissions'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (isTrainer(user.role)) {
      return NextResponse.json({ success: false, error: 'Trainers cannot update plans' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()

    // Scoping validation
    const existingPlan = await prisma.plan.findUnique({
      where: { id }
    })
    if (!existingPlan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    if (user.gymId !== 'all' && !user.isGlobal && existingPlan.gymId !== user.gymId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id: dummy, gymId: dummy2, ...rest } = data

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: {
        ...rest
      }
    })

    return NextResponse.json({ success: true, data: updatedPlan })
  } catch (error: any) {
    console.error('Update plan error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update plan' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (isTrainer(user.role)) {
      return NextResponse.json({ success: false, error: 'Trainers cannot delete plans' }, { status: 403 })
    }

    const { id } = await params

    // Scoping validation
    const existingPlan = await prisma.plan.findUnique({
      where: { id }
    })
    if (!existingPlan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    if (user.gymId !== 'all' && !user.isGlobal && existingPlan.gymId !== user.gymId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await prisma.plan.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete plan error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete plan' }, { status: 500 })
  }
}
