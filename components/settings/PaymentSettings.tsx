import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AppSettings } from '@/types'
import { Save, Wallet, Smartphone, CreditCard, Banknote } from 'lucide-react'

interface PaymentSettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function PaymentSettings({ settings, onSave }: PaymentSettingsProps) {
  const [formData, setFormData] = React.useState({
    enabledMethods: settings.pos?.enabledMethods || ['cash', 'card'],
    methodLabels: {
      cash: 'Cash Payment',
      card: 'Debit/Credit Card',
      upi: 'UPI (GPay/PhonePe)',
      transfer: 'Bank Transfer',
      ...(settings.pos?.methodLabels || {})
    },
    autoPrintReceipt: settings.pos?.autoPrintReceipt ?? false,
    allowGuestSales: settings.pos?.allowGuestSales ?? true
  })

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleMethod = (method: string) => {
    const methods = formData.enabledMethods.includes(method)
      ? formData.enabledMethods.filter(m => m !== method)
      : [...formData.enabledMethods, method]
    handleChange('enabledMethods', methods)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ pos: formData })
  }

  const paymentIcons: Record<string, any> = {
    cash: Banknote,
    card: CreditCard,
    upi: Smartphone,
    transfer: Wallet
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Enable and label the payment options available at your gym</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['cash', 'card', 'upi', 'transfer'].map((method) => {
              const Icon = paymentIcons[method]
              const isEnabled = formData.enabledMethods.includes(method)
              return (
                <div key={method} className={`p-4 rounded-xl border transition-all ${isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-transparent opacity-60'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-bold capitalize">{method}</span>
                    </div>
                    <Switch checked={isEnabled} onCheckedChange={() => toggleMethod(method)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Display Label in POS</Label>
                    <Input 
                      value={(formData.methodLabels as any)[method] || ''} 
                      onChange={(e) => {
                        const labels = { ...(formData.methodLabels || {}) } as any
                        labels[method] = e.target.value
                        handleChange('methodLabels', labels)
                      }}
                      disabled={!isEnabled}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>POS Behavior</CardTitle>
          <CardDescription>Configure point-of-sale interaction rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-print Receipts</Label>
              <p className="text-xs text-muted-foreground">Trigger print dialog automatically after payment confirmation</p>
            </div>
            <Switch 
              checked={formData.autoPrintReceipt} 
              onCheckedChange={(checked) => handleChange('autoPrintReceipt', checked)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Guest Sales</Label>
              <p className="text-xs text-muted-foreground">Allow selling products/services without linking to a registered member</p>
            </div>
            <Switch 
              checked={formData.allowGuestSales} 
              onCheckedChange={(checked) => handleChange('allowGuestSales', checked)} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          Save Payment Methods
        </Button>
      </div>
    </form>
  )
}
