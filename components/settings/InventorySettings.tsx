import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AppSettings } from '@/types'
import { Save, Package, AlertTriangle, Boxes, BarChart3 } from 'lucide-react'

interface InventorySettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function InventorySettings({ settings, onSave }: InventorySettingsProps) {
  const [formData, setFormData] = React.useState(settings.inventoryRules || {
    lowStockThreshold: 5,
    allowNegativeStock: false,
    trackBatches: false,
    enablePosModule: true
  })

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ inventoryRules: formData })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Rules</CardTitle>
          <CardDescription>Configure how products and stock levels are managed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Threshold (Units)
            </Label>
            <Input 
              type="number" 
              value={formData.lowStockThreshold} 
              onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground italic">Warning trigger for items running low in stock</p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Negative Stock</Label>
                <p className="text-xs text-muted-foreground">Allow sales even if recorded quantity is zero</p>
              </div>
              <Switch 
                checked={formData.allowNegativeStock} 
                onCheckedChange={(checked) => handleChange('allowNegativeStock', checked)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Track Batch Numbers / Expiry</Label>
                <p className="text-xs text-muted-foreground">Enable fields for batch tracking and expiration dates</p>
              </div>
              <Switch 
                checked={formData.trackBatches} 
                onCheckedChange={(checked) => handleChange('trackBatches', checked)} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>POS Integration</CardTitle>
          <CardDescription>Manage the Point of Sale visibility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Enable POS Module</Label>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Show the POS and Inventory modules in the sidebar</p>
            </div>
            <Switch 
              checked={formData.enablePosModule} 
              onCheckedChange={(checked) => handleChange('enablePosModule', checked)} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          Save Inventory Config
        </Button>
      </div>
    </form>
  )
}
