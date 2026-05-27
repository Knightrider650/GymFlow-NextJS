import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const gymId = getGymIdContext(user, req)
    const invoices = await prisma.invoice.findMany({
      where: gymId ? { gymId } : {},
      include: {
        member: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const mappedInvoices = invoices.map(inv => ({
      ...inv,
      memberName: inv.member?.name || 'Unknown'
    }))

    return NextResponse.json({ success: true, data: mappedInvoices })
  } catch (error: any) {
    console.error('Fetch invoices error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const { memberId, amount, description, dueDate } = data

    if (!memberId || amount === undefined || !dueDate) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Lookup the member to get their gymId context to avoid mismatch issues
    const memberRecord = await prisma.member.findUnique({
      where: { id: memberId }
    })
    if (!memberRecord) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }
    const gymId = memberRecord.gymId

    // Perform inside transaction to auto-increment nextInvoiceNumber safely
    const newInvoice = await prisma.$transaction(async (tx) => {
      // 1. Get gym settings
      const gym = await tx.gym.findUnique({
        where: { id: gymId }
      })
      if (!gym) {
        throw new Error('Gym not found')
      }

      const prefix = gym.invoicePrefix || 'GF-'
      const invoiceNum = gym.nextInvoiceNumber || 1000
      const invoiceNumber = `${prefix}${invoiceNum}`

      // 2. Increment nextInvoiceNumber
      await tx.gym.update({
        where: { id: gymId },
        data: {
          nextInvoiceNumber: {
            increment: 1
          }
        }
      })

      // 3. Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          amount: parseFloat(amount.toString()),
          status: 'pending',
          description: description || 'Gym Membership',
          dueDate: new Date(dueDate),
          memberId,
          gymId: gymId
        },
        include: {
          member: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      // 4. Create activity log
      await tx.activityLog.create({
        data: {
          action: 'Create Invoice',
          details: `Created invoice ${invoiceNumber} for member ${invoice.member.name}`,
          entityType: 'Invoice',
          entityId: invoice.id,
          userName: user.email,
          userId: user.userId,
          gymId: gymId
        }
      })

      return invoice
    })

    return NextResponse.json({ success: true, data: newInvoice }, { status: 201 })
  } catch (error: any) {
    console.error('Create invoice error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create invoice' }, { status: 500 })
  }
}
