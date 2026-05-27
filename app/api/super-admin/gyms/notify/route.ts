import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ADMIN_ROLES, type UserRole } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { ids, title, message } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0 || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: ids, title, and message are required' },
        { status: 400 }
      )
    }

    let createdCount = 0
    for (const gymId of ids) {
      try {
        await prisma.notification.create({
          data: {
            gymId,
            type: 'system',
            title,
            message,
            read: false,
          },
        })
        createdCount++
      } catch (e) {
        console.warn(`Prisma failed to create notification for gym ${gymId}:`, e)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent notification to ${createdCount} gyms`,
    })
  } catch (error: any) {
    console.error('Super Admin Gym Notify Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send notifications' }, { status: 500 })
  }
}
