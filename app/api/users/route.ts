import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ELEVATED_ROLES, canManageRole, getCreatableRoles, type UserRole } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

// GET /api/users — list all users in the gym (cto/ceo/admin only)
export async function GET(req: NextRequest) {
  try {
    const actor = await getAuthUser(req)
    if (!actor || !ELEVATED_ROLES.includes(actor.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      where: { gymId: actor.gymId },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        gymId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users — create a new user with credentials
export async function POST(req: NextRequest) {
  try {
    const actor = await getAuthUser(req)
    if (!actor || !ELEVATED_ROLES.includes(actor.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { fullname, email, password, role } = await req.json()

    // Validate required fields
    if (!fullname || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'fullname, email, password and role are required' },
        { status: 400 }
      )
    }

    // Check the actor is allowed to assign this role
    if (!canManageRole(actor.role as UserRole, role as UserRole)) {
      return NextResponse.json(
        { success: false, error: `Your role (${actor.role}) cannot create users with role (${role})` },
        { status: 403 }
      )
    }

    // Ensure email is unique
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        email,
        fullname,
        password: hashedPassword,
        role,
        gymId: actor.gymId,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        gymId: true,
        createdAt: true,
      },
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'Create User',
        details: `Created new user: ${fullname} (${email}) with role: ${role}`,
        entityType: 'User',
        entityId: newUser.id,
        userName: actor.email,
        userId: actor.userId,
        gymId: actor.gymId,
      },
    })

    return NextResponse.json({ success: true, data: newUser }, { status: 201 })
  } catch (error) {
    console.error('POST /api/users error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 })
  }
}
