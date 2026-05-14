import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.gym.findUnique({
      where: { id: user.gymId }
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can update gym settings' }, { status: 403 })
    }

    const data = await req.json()
    
    const updatedSettings = await prisma.gym.update({
      where: { id: user.gymId },
      data
    })

    return NextResponse.json({ success: true, data: updatedSettings })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 })
  }
}
