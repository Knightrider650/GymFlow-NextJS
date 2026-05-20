'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useInventory, useSettings } from '@/hooks'
import { Plus, AlertCircle, Package, Edit2, Trash2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, getStatusBadgeColor } from '@/utils/format'

export default function InventoryPage() {
  const { inventory, isLoading, fetchInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory()
  const { settings, fetchSettings } = useSettings()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Equipment' as const,
    quantity: '',
    minThreshold: '',
    costPerUnit: '',
  })

  useEffect(() => {
    fetchInventory()
    fetchSettings()
  }, [])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.quantity && formData.costPerUnit) {
      await addInventoryItem({
        name: formData.name,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        minThreshold: parseInt(formData.minThreshold) || 0,
        costPerUnit: parseFloat(formData.costPerUnit),
      })
      setIsDialogOpen(false)
      setFormData({
        name: '',
        category: 'Equipment',
        quantity: '',
        minThreshold: '',
        costPerUnit: '',
      })
      await fetchInventory()
    }
  }

  const lowStockItems = inventory.filter(item => item.quantity <= item.minThreshold)

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1 text-balance">
              Track equipment, supplies, and merchandise
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-fit bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
                <DialogDescription>
                  Add a new item to your gym&apos;s inventory tracking.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Yoga Mats"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="Equipment">Equipment</option>
                      <option value="Consumables">Consumables</option>
                      <option value="Merchandise">Merchandise</option>
                      <option value="Services">Services</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minThreshold">Min. Threshold</Label>
                    <Input
                      id="minThreshold"
                      type="number"
                      value={formData.minThreshold}
                      onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
                      placeholder="Low stock alert at..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Unit Cost *</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.costPerUnit}
                      onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full">Save Item</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-4 py-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-900 dark:text-red-300 text-lg">Low Stock Alert</CardTitle>
                <CardDescription className="text-red-800 dark:text-red-400">
                  {lowStockItems.length} item(s) are currently below their minimum threshold and may need restocking.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Inventory Table */}
        <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Inventory Stock List</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[300px]">Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Min. Threshold</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {isLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>Loading inventory logs...</span>
                          </div>
                        ) : 'No items found in system inventory.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="font-semibold text-primary">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-lg font-bold ${item.quantity <= item.minThreshold ? 'text-red-500' : 'text-foreground'}`}>
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.minThreshold}</TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatCurrency(item.costPerUnit, settings?.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={item.quantity <= item.minThreshold ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}
                          >
                            {item.quantity <= item.minThreshold ? 'Restock Soon' : 'Optimal'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-primary">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-slate-400 hover:text-rose-500"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this item?')) {
                                  deleteInventoryItem(item.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
