import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'
import { ELEVATED_ROLES, canManageRole, type UserRole } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
}

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

    const gymId = getGymIdContext(actor, req)
    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        ...(gymId ? { gymId } : {})
      }
    })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const adminRoles = ['admin', 'ceo', 'cto', 'owner', 'manager'];
    if (adminRoles.includes(targetUser.role)) {
      if (!isStrongPassword(newPassword)) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 8 characters long, and contain a mix of uppercase letters, lowercase letters, and numbers.' },
          { status: 400 }
        )
      }
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
        gymId: targetUser.gymId,
      },
    })

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ success: false, error: 'Failed to reset password' }, { status: 500 })
  }
}
