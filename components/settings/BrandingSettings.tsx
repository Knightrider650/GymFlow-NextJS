import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AppSettings } from '@/types'
import { Save } from 'lucide-react'

interface BrandingSettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function BrandingSettings({ settings, onSave }: BrandingSettingsProps) {
  const [formData, setFormData] = React.useState<Partial<AppSettings>>({})

  React.useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gym Identity</CardTitle>
          <CardDescription>Configure your gym&apos;s basic profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gymName">Gym Display Name</Label>
                <Input id="gymName" name="gymName" value={formData.gymName || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input id="legalName" name="legalName" value={formData.legalName || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymEmail">Primary Email</Label>
                <Input id="gymEmail" name="gymEmail" type="email" value={formData.gymEmail || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymPhone">Primary Phone</Label>
                <Input id="gymPhone" name="gymPhone" value={formData.gymPhone || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="gymAddress">Gym Address</Label>
                <Input id="gymAddress" name="gymAddress" value={formData.gymAddress || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / GST Number</Label>
                <Input id="taxId" name="taxId" value={formData.taxId || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding & Theme</CardTitle>
          <CardDescription>Customize the look and feel of your gym platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-8">
             <div className="space-y-2">
                <Label>Gym Logo</Label>
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                  {formData.gymLogo ? (
                    <img src={formData.gymLogo} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground/40" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="text-xs h-7">Change</Button>
                  </div>
                </div>
             </div>
             <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" name="primaryColor" value={formData.primaryColor || '#3b82f6'} className="w-12 p-1 h-10" onChange={handleChange} />
                    <Input type="text" value={formData.primaryColor || '#3b82f6'} className="flex-1" readOnly />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" name="secondaryColor" value={formData.secondaryColor || '#64748b'} className="w-12 p-1 h-10" onChange={handleChange} />
                    <Input type="text" value={formData.secondaryColor || '#64748b'} className="flex-1" readOnly />
                  </div>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
import { Building2 } from 'lucide-react'
