import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AppSettings } from '@/types'
import { Save, Plus, Trash2, Receipt } from 'lucide-react'

interface BillingSettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function BillingSettings({ settings, onSave }: BillingSettingsProps) {
  const [formData, setFormData] = React.useState(settings.billing || {
    defaultTaxRate: 18,
    additionalTaxes: [],
    invoicePrefix: 'INV',
    invoiceFormat: '{prefix}-{year}-{sequence}',
    autoGenerateInvoice: true,
    allowPartialPayments: true,
    requireRefundReason: true,
    requireRefundApproval: false,
    defaultPaymentDueDays: 7
  })

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddTax = () => {
    const taxes = [...(formData.additionalTaxes || []), { label: 'New Tax', rate: 0 }]
    handleChange('additionalTaxes', taxes)
  }

  const handleRemoveTax = (index: number) => {
    const taxes = (formData.additionalTaxes || []).filter((_, i) => i !== index)
    handleChange('additionalTaxes', taxes)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ billing: formData })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Configuration</CardTitle>
          <CardDescription>Manage default tax rates and extra levies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Default GST/Tax Percentage (%)</Label>
            <Input 
              type="number" 
              value={formData.defaultTaxRate} 
              onChange={(e) => handleChange('defaultTaxRate', parseFloat(e.target.value))}
            />
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Additional Taxes (Local/Cess)</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTax} className="h-7 gap-1">
                <Plus className="h-3 w-3" />
                Add Tax
              </Button>
            </div>
            {formData.additionalTaxes?.map((tax, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Tax Label</Label>
                  <Input 
                    value={tax.label} 
                    onChange={(e) => {
                      const taxes = [...formData.additionalTaxes!]
                      taxes[index].label = e.target.value
                      handleChange('additionalTaxes', taxes)
                    }} 
                  />
                </div>
                <div className="w-32 space-y-1.5">
                  <Label className="text-xs">Rate (%)</Label>
                  <Input 
                    type="number" 
                    value={tax.rate} 
                    onChange={(e) => {
                      const taxes = [...formData.additionalTaxes!]
                      taxes[index].rate = parseFloat(e.target.value)
                      handleChange('additionalTaxes', taxes)
                    }} 
                  />
                </div>
                <Button variant="ghost" size="icon" className="text-destructive h-10" onClick={() => handleRemoveTax(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Settings</CardTitle>
          <CardDescription>Customize invoice numbering and format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input 
                value={formData.invoicePrefix} 
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Format</Label>
              <Input 
                value={formData.invoiceFormat} 
                onChange={(e) => handleChange('invoiceFormat', e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground font-mono">Tokens: &#123;prefix&#125;, &#123;year&#125;, &#123;sequence&#125;</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label>Auto-generate Invoices</Label>
              <p className="text-xs text-muted-foreground">Automatically create an invoice for every membership sale</p>
            </div>
            <Switch 
              checked={formData.autoGenerateInvoice} 
              onCheckedChange={(checked) => handleChange('autoGenerateInvoice', checked)} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Behavior</CardTitle>
          <CardDescription>Rules for payments, refunds, and credits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Partial Payments</Label>
              <p className="text-xs text-muted-foreground">Allow members to pay invoices in multiple installments</p>
            </div>
            <Switch 
              checked={formData.allowPartialPayments} 
              onCheckedChange={(checked) => handleChange('allowPartialPayments', checked)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Refund Reason</Label>
              <p className="text-xs text-muted-foreground">Capture mandatory reason for every refund issued</p>
            </div>
            <Switch 
              checked={formData.requireRefundReason} 
              onCheckedChange={(checked) => handleChange('requireRefundReason', checked)} 
            />
          </div>

          <div className="space-y-2 pt-4">
            <Label>Default Payment Due Period (Days)</Label>
            <Input 
              type="number" 
              value={formData.defaultPaymentDueDays} 
              onChange={(e) => handleChange('defaultPaymentDueDays', parseInt(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          Save Billing Settings
        </Button>
      </div>
    </form>
  )
}
