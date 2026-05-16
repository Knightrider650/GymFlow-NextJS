import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ELEVATED_ROLES, canManageRole, type UserRole } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

// POST /api/users/[id]/reset-password — admin-initiated password reset
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthUser(req)
    if (!actor || !ELEVATED_ROLES.includes(actor.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { newPassword } = await req.json()

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findFirst({ where: { id, gymId: actor.gymId } })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (!canManageRole(actor.role as UserRole, targetUser.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to reset this user\'s password' }, { status: 403 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id }, data: { password: hashedPassword } })

    await prisma.activityLog.create({
      data: {
        action: 'Reset Password',
        details: `Admin reset password for: ${targetUser.fullname} (${targetUser.email})`,
        entityType: 'User',
        entityId: id,
        userName: actor.email,
        userId: actor.userId,
        gymId: actor.gymId,
      },
    })

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ success: false, error: 'Failed to reset password' }, { status: 500 })
  }
}
