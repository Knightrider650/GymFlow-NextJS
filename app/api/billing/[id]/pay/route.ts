import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // 1. Get invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id, gymId: user.gymId }
    })
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    // 2. Process payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update invoice status to paid
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: { status: 'paid' }
      })

      // Create payment ledger entry
      const payment = await tx.payment.create({
        data: {
          invoiceId: id,
          amount: invoice.amount,
          method: body.method || 'cash',
          notes: body.notes || 'Full payment received'
        }
      })

      // Log activity
      await tx.activityLog.create({
        data: {
          action: 'Record Payment',
          details: `Recorded payment of $${invoice.amount} on invoice ${invoice.invoiceNumber}`,
          entityType: 'Invoice',
          entityId: id,
          userName: user.email,
          userId: user.userId,
          gymId: user.gymId
        }
      })

      return { invoice: updatedInvoice, payment }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Record payment error:', error)
    return NextResponse.json({ success: false, error: 'Failed to record payment' }, { status: 500 })
  }
}
