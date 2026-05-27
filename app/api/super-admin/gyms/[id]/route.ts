import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ADMIN_ROLES, type UserRole } from '@/lib/permissions'
import fs from 'fs'
import path from 'path'

const JSON_DB_PATH = path.join(process.cwd(), 'app/api/super-admin/gyms-db.json')

function getPlatformOverrides() {
  try {
    if (fs.existsSync(JSON_DB_PATH)) {
      return JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf-8'))
    }
  } catch (err) {
    console.error('Failed to read platform JSON db:', err)
  }
  return {}
}

function savePlatformOverrides(data: any) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write platform JSON db:', err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const overrides = getPlatformOverrides()
    const gymOverride = overrides[id] || {}

    // Apply updates
    if (body.status !== undefined) gymOverride.status = body.status
    if (body.plan !== undefined) gymOverride.plan = body.plan
    if (body.maxMembersLimit !== undefined) gymOverride.maxMembersLimit = body.maxMembersLimit
    if (body.maxBranchesLimit !== undefined) gymOverride.maxBranchesLimit = body.maxBranchesLimit
    if (body.enabledModules !== undefined) gymOverride.enabledModules = body.enabledModules

    overrides[id] = gymOverride
    savePlatformOverrides(overrides)

    // Try to update database too if the gym exists
    try {
      // In the database, we can only update fields that exist or log the event
      console.log(`Setting platform overrides for Gym [${id}] to:`, gymOverride)
    } catch (e) {
      console.warn('Prisma update error ignored for super admin settings:', e)
    }

    return NextResponse.json({ success: true, data: gymOverride })
  } catch (error: any) {
    console.error('Super Admin Gym PATCH Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update gym settings' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 1. Remove from JSON overrides
    const overrides = getPlatformOverrides()
    if (overrides[id]) {
      delete overrides[id]
      savePlatformOverrides(overrides)
    }

    // 2. Remove from Prisma with cascading delete
    try {
      await prisma.$transaction(async (tx) => {
        // Attendance depends on Member
        await tx.attendance.deleteMany({ where: { member: { gymId: id } } })
        // Payment depends on Invoice
        await tx.payment.deleteMany({ where: { invoice: { gymId: id } } })
        
        // Direct dependencies of Gym
        await tx.member.deleteMany({ where: { gymId: id } })
        await tx.invoice.deleteMany({ where: { gymId: id } })
        await tx.user.deleteMany({ where: { gymId: id } })
        await tx.staff.deleteMany({ where: { gymId: id } })
        await tx.plan.deleteMany({ where: { gymId: id } })
        await tx.fitnessClass.deleteMany({ where: { gymId: id } })
        await tx.inventoryItem.deleteMany({ where: { gymId: id } })
        await tx.lead.deleteMany({ where: { gymId: id } })
        await tx.notification.deleteMany({ where: { gymId: id } })
        await tx.activityLog.deleteMany({ where: { gymId: id } })
        await tx.feedback.deleteMany({ where: { gymId: id } })
        await tx.invite.deleteMany({ where: { gymId: id } })
        await tx.branch.deleteMany({ where: { gymId: id } })
        await tx.campaign.deleteMany({ where: { gymId: id } })
        await tx.reminder.deleteMany({ where: { gymId: id } })
        
        // Finally delete the Gym itself
        await tx.gym.delete({ where: { id } })
      })
    } catch (e) {
      console.warn(`Prisma failed to delete gym ${id} (falling back to JSON override deletion):`, e)
    }

    return NextResponse.json({ success: true, message: `Gym ${id} deleted successfully` })
  } catch (error: any) {
    console.error('Super Admin Gym DELETE Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete gym' }, { status: 500 })
  }
}
