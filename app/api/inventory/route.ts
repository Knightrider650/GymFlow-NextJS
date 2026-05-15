import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await prisma.inventoryItem.findMany({
      where: { gymId: user.gymId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Fetch inventory error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    
    const newItem = await prisma.inventoryItem.create({
      data: {
        ...data,
        quantity: parseInt(data.quantity?.toString() || '0'),
        minThreshold: parseInt(data.minThreshold?.toString() || '0'),
        costPerUnit: parseFloat(data.costPerUnit?.toString() || '0'),
        gymId: user.gymId
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Add Inventory',
        details: `Added new item: ${newItem.name}`,
        entityType: 'InventoryItem',
        entityId: newItem.id,
        userName: user.email,
        userId: user.userId,
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true, data: newItem }, { status: 201 })
  } catch (error: any) {
    console.error('Create inventory error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create inventory item' }, { status: 500 })
  }
}
