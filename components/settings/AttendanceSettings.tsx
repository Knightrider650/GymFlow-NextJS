import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AppSettings } from '@/types'
import { Save, QrCode, Fingerprint, MousePointer2, AlertCircle } from 'lucide-react'

interface AttendanceSettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function AttendanceSettings({ settings, onSave }: AttendanceSettingsProps) {
  const [formData, setFormData] = React.useState(settings.attendanceRules || {
    maxCheckInsPerDay: 2,
    lateCutoffMinutes: 15,
    autoNoShow: true,
    blockExpiredCheckIn: true
  })

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ attendanceRules: formData })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check-in Methods</CardTitle>
          <CardDescription>Configure how members enter the gym</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-slate-50 flex flex-col items-center gap-3">
              <MousePointer2 className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Front Desk</span>
              <Switch checked={true} disabled />
            </div>
            <div className="p-4 rounded-xl border bg-slate-50 flex flex-col items-center gap-3 opacity-60">
              <QrCode className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">QR Self Check-in</span>
              <Switch checked={false} />
            </div>
            <div className="p-4 rounded-xl border bg-slate-50 flex flex-col items-center gap-3 opacity-60">
              <Fingerprint className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Biometric</span>
              <Switch checked={false} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Rules & Limits</CardTitle>
          <CardDescription>Enforce daily limits and check-in behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Max Check-ins per Day</Label>
              <Input 
                type="number" 
                value={formData.maxCheckInsPerDay} 
                onChange={(e) => handleChange('maxCheckInsPerDay', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Class Late Cutoff (Minutes)</Label>
              <Input 
                type="number" 
                value={formData.lateCutoffMinutes} 
                onChange={(e) => handleChange('lateCutoffMinutes', parseInt(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">Cannot check-in to class after this many minutes</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto No-Show Handling</Label>
                <p className="text-xs text-muted-foreground">Automatically mark booked members as no-show if they don&apos;t check in</p>
              </div>
              <Switch 
                checked={formData.autoNoShow} 
                onCheckedChange={(checked) => handleChange('autoNoShow', checked)} 
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="space-y-0.5">
                  <Label className="text-amber-900">Block Expired Members</Label>
                  <p className="text-xs text-amber-700/70">Prevent check-in if plan is expired (overrides grace period)</p>
                </div>
              </div>
              <Switch 
                checked={formData.blockExpiredCheckIn} 
                onCheckedChange={(checked) => handleChange('blockExpiredCheckIn', checked)} 
                className="data-[state=checked]:bg-amber-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          Save Attendance Rules
        </Button>
      </div>
    </form>
  )
}
