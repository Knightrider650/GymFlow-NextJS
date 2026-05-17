import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const data = await req.json()

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existingInvoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        amount: data.amount !== undefined ? parseFloat(data.amount.toString()) : undefined,
        status: data.status,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Invoice',
        details: `Updated invoice: ${updatedInvoice.invoiceNumber}`,
        entityType: 'Invoice',
        entityId: updatedInvoice.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedInvoice })
  } catch (error: any) {
    console.error('Update invoice error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!existingInvoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    // Delete related payments first to prevent foreign key constraint failures
    await prisma.payment.deleteMany({
      where: { invoiceId: id }
    })

    await prisma.invoice.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Invoice',
        details: `Deleted invoice: ${existingInvoice.invoiceNumber}`,
        entityType: 'Invoice',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete invoice error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete invoice' }, { status: 500 })
  }
}
