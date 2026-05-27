import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppSettings } from '@/types'
import { Save, Sun, Moon, Monitor, Layout, Type } from 'lucide-react'

interface SystemSettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function SystemSettings({ settings, onSave }: SystemSettingsProps) {
  const [formData, setFormData] = React.useState(settings.system || {
    theme: 'light',
    language: 'en',
    timezone: 'UTC+5:30',
    compactMode: false,
    showHelpTooltips: true,
    fontSize: 'medium'
  })

  const [currency, setCurrency] = React.useState(settings.currency || 'INR')

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ system: formData, currency })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the platform looks for your staff</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
             <Label>Theme Mode</Label>
             <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  { id: 'system', icon: Monitor, label: 'Auto' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleChange('theme', item.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.theme === item.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <item.icon className={`h-6 w-6 ${formData.theme === item.id ? 'text-primary' : 'text-slate-400'}`} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
             </div>
          </div>

          <div className="flex items-center justify-between border-t pt-6">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Layout className="h-4 w-4 text-primary" />
                <Label>Compact Sidebar</Label>
              </div>
              <p className="text-xs text-muted-foreground">Collapse sidebar to show icons only by default</p>
            </div>
            <Switch 
              checked={formData.compactMode} 
              onCheckedChange={(checked) => handleChange('compactMode', checked)} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional & Accessibility</CardTitle>
          <CardDescription>Set locale, timezone and interaction preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={formData.language} onValueChange={(v) => handleChange('language', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (US)</SelectItem>
                  <SelectItem value="en-gb">English (UK)</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={formData.timezone} onValueChange={(v) => handleChange('timezone', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC+5:30">India (IST)</SelectItem>
                  <SelectItem value="UTC+0">London (GMT)</SelectItem>
                  <SelectItem value="UTC-5">New York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                  <SelectItem value="USD">US Dollar ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                  <SelectItem value="GBP">Pound Sterling (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <Label>Show In-App Help</Label>
              </div>
              <p className="text-xs text-muted-foreground">Show helpful tooltips and feature tours for new staff</p>
            </div>
            <Switch 
              checked={formData.showHelpTooltips} 
              onCheckedChange={(checked) => handleChange('showHelpTooltips', checked)} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          Save Preferences
        </Button>
      </div>
    </form>
  )
}
