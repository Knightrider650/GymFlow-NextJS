import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser, getGymIdContext, getRequiredGymId } from '@/lib/auth'

const AUTHORIZED_ROLES = ['cto', 'ceo', 'admin', 'owner', 'manager', 'staff']

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()
    const { id } = await params
    const gymId = await getRequiredGymId(user, req, data)
    
    // Ensure the item exists and belongs to the user's gym
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, gymId }
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity !== undefined ? parseInt(data.quantity.toString()) : undefined,
        minThreshold: data.minThreshold !== undefined ? parseInt(data.minThreshold.toString()) : undefined,
        costPerUnit: data.costPerUnit !== undefined ? parseFloat(data.costPerUnit.toString()) : undefined,
        supplier: data.supplier
      }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Update Inventory',
        details: `Updated item: ${updatedItem.name}`,
        entityType: 'InventoryItem',
        entityId: updatedItem.id,
        userName: user.email,
        userId: user.userId,
        gymId: gymId
      }
    })

    return NextResponse.json({ success: true, data: updatedItem })
  } catch (error: any) {
    console.error('Update inventory error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update inventory item' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const gymId = getGymIdContext(user, req)
    
    const existing = await prisma.inventoryItem.findFirst({
      where: gymId ? { id, gymId } : { id }
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })

    await prisma.inventoryItem.delete({
      where: { id }
    })

    await prisma.activityLog.create({
      data: {
        action: 'Delete Inventory',
        details: `Deleted item: ${existing.name}`,
        entityType: 'InventoryItem',
        entityId: id,
        userName: user.email,
        userId: user.userId,
        gymId: existing.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete inventory error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete inventory item' }, { status: 500 })
  }
}
