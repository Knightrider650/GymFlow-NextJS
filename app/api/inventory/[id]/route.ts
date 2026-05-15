import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const { id } = await params
    
    // Ensure the item exists and belongs to the user's gym
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, gymId: user.gymId }
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
        gymId: user.gymId
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
    if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, gymId: user.gymId }
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
        gymId: user.gymId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete inventory error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete inventory item' }, { status: 500 })
  }
}
