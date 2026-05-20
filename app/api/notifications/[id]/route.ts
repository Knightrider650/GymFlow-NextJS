import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        read: body.read !== undefined ? !!body.read : undefined
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Update notification error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 })
  }
}
