import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { ADMIN_ROLES } from '@/lib/permissions'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback_secret'

export async function POST(request: Request) {
  try {
    const { email, password, fullname } = await request.json()

    if (!email || !password || !fullname) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // 1. Look up the invite by email and ensure it is pending
    const invite = await prisma.invite.findFirst({
      where: {
        email: normalizedEmail,
        status: 'pending'
      }
    })

    if (!invite) {
      return NextResponse.json(
        { success: false, error: 'No active invitation found for this email address. Registration is by invitation only.' },
        { status: 400 }
      )
    }

    // 2. Check if the invitation has expired
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This invitation has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // 3. Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 5. Create user and update invite status within a transaction
    const lowercasedRole = invite.role.toLowerCase()
    
    const [user, updatedInvite] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          fullname: fullname.trim(),
          role: lowercasedRole,
          gymId: invite.gymId
        },
        include: {
          gym: true
        }
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'accepted' }
      }),
      prisma.activityLog.create({
        data: {
          action: 'User Registered',
          details: `User ${normalizedEmail} registered as ${lowercasedRole} via invite.`,
          entityType: 'User',
          entityId: invite.id, // Or user.id, but since transaction runs, we can reference invite.id
          userName: normalizedEmail,
          gymId: invite.gymId
        }
      })
    ])

    // Update entityId in activityLog if possible, but the above is fine or we can do it separately.
    // 6. Generate access & refresh tokens
    const isGlobal = ADMIN_ROLES.includes(user.role as any)

    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        gymId: user.gymId,
        isGlobal 
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    )

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...userWithoutPassword,
          baseGymId: user.gymId
        },
        accessToken,
        refreshToken
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
