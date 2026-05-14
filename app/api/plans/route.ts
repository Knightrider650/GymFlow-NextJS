import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const plans = await prisma.plan.findMany({
      where: { gymId: user.gymId },
      orderBy: { price: 'asc' }
    })

    return NextResponse.json({ success: true, data: plans })
  } catch (error: any) {
    console.error('Fetch plans error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch plans' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role === 'trainer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const data = await req.json()
    
    const newPlan = await prisma.plan.create({
      data: {
        ...data,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: newPlan }, { status: 201 })
  } catch (error: any) {
    console.error('Create plan error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create plan' }, { status: 500 })
  }
}
