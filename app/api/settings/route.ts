import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const gymId = getGymIdContext(user, req)
    if (!gymId) {
      const firstGym = await prisma.gym.findFirst()
      return NextResponse.json({ success: true, data: firstGym })
    }

    const settings = await prisma.gym.findUnique({
      where: { id: gymId }
    })

    return NextResponse.json({ success: true, data: settings })
  } catch (error: any) {
    console.error('Fetch settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !['admin', 'ceo', 'cto', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to update gym settings' }, { status: 403 })
    }

    const data = await req.json()
    const gymId = await getRequiredGymId(user, req, data)
    const { id: dummy, gymId: dummy2, ...rest } = data
    
    const updatedSettings = await prisma.gym.update({
      where: { id: gymId },
      data: rest
    })

    return NextResponse.json({ success: true, data: updatedSettings })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 })
  }
}
