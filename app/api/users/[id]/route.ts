import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext } from '@/lib/auth'
import { ELEVATED_ROLES, canManageRole, type UserRole } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

// PATCH /api/users/[id] — update user role
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthUser(req)
    if (!actor || !ELEVATED_ROLES.includes(actor.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { role, fullname } = await req.json()
    const gymId = getGymIdContext(actor, req)

    // Fetch the target user
    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        ...(gymId ? { gymId } : {})
      }
    })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Cannot modify yourself via this endpoint
    if (targetUser.id === actor.userId) {
      return NextResponse.json({ success: false, error: 'Cannot modify your own account via this endpoint' }, { status: 400 })
    }

    // Check actor can manage the target's current role
    if (!canManageRole(actor.role as UserRole, targetUser.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to modify this user' }, { status: 403 })
    }

    // If changing role, also check new role
    if (role && !canManageRole(actor.role as UserRole, role as UserRole)) {
      return NextResponse.json({ success: false, error: `Cannot assign role: ${role}` }, { status: 403 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(fullname && { fullname }),
      },
      select: { id: true, email: true, fullname: true, role: true, createdAt: true },
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update User',
        details: `Updated user ${updated.email}: ${role ? `role → ${role}` : ''}${fullname ? ` name → ${fullname}` : ''}`,
        entityType: 'User',
        entityId: id,
        userName: actor.email,
        userId: actor.userId,
        gymId: targetUser.gymId,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — remove user from gym
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAuthUser(req)
    if (!actor || !ELEVATED_ROLES.includes(actor.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
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

    if (targetUser.id === actor.userId) {
      return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 })
    }

    if (!canManageRole(actor.role as UserRole, targetUser.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to delete this user' }, { status: 403 })
    }

    await prisma.user.delete({ where: { id } })

    await prisma.activityLog.create({
      data: {
        action: 'Delete User',
        details: `Deleted user: ${targetUser.fullname} (${targetUser.email})`,
        entityType: 'User',
        entityId: id,
        userName: actor.email,
        userId: actor.userId,
        gymId: targetUser.gymId,
      },
    })

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 })
  }
}
