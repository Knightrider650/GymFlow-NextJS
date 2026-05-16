import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AppSettings } from '@/types'
import { Save, Calendar, Clock, Users, ArrowRightLeft } from 'lucide-react'

interface ClassSettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function ClassSettings({ settings, onSave }: ClassSettingsProps) {
  const [formData, setFormData] = React.useState(settings.classRules || {
    defaultDuration: 60,
    defaultCapacity: 20,
    bookingLeadTimeHours: 48,
    bookingCutoffMinutes: 30,
    cancellationWindowMinutes: 120,
    enableWaitlist: true,
    autoFillWaitlist: true
  })

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ classRules: formData })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Class Defaults</CardTitle>
          <CardDescription>Default values for creating new fitness classes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Default Duration (Minutes)</Label>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  value={formData.defaultDuration} 
                  onChange={(e) => handleChange('defaultDuration', parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Capacity (Members)</Label>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  value={formData.defaultCapacity} 
                  onChange={(e) => handleChange('defaultCapacity', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking & Cancellation Rules</CardTitle>
          <CardDescription>Control how members book and cancel class slots</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Booking Lead Time (Hours)</Label>
              <Input 
                type="number" 
                value={formData.bookingLeadTimeHours} 
                onChange={(e) => handleChange('bookingLeadTimeHours', parseInt(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">How far in advance booking opens</p>
            </div>
            <div className="space-y-2">
              <Label>Booking Cutoff (Minutes)</Label>
              <Input 
                type="number" 
                value={formData.bookingCutoffMinutes} 
                onChange={(e) => handleChange('bookingCutoffMinutes', parseInt(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">Booking closes before class starts</p>
            </div>
            <div className="space-y-2">
              <Label>Cancellation Window (Min)</Label>
              <Input 
                type="number" 
                value={formData.cancellationWindowMinutes} 
                onChange={(e) => handleChange('cancellationWindowMinutes', parseInt(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">Minimum time to cancel without penalty</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Waitlist Logic</CardTitle>
          <CardDescription>Manage waitlist behavior for fully booked classes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Waitlist</Label>
              <p className="text-xs text-muted-foreground">Allow members to join a waitlist when class is full</p>
            </div>
            <Switch 
              checked={formData.enableWaitlist} 
              onCheckedChange={(checked) => handleChange('enableWaitlist', checked)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Auto-fill from Waitlist</Label>
                <ArrowRightLeft className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Automatically move waitlisted members to confirmed when someone cancels</p>
            </div>
            <Switch 
              checked={formData.autoFillWaitlist} 
              onCheckedChange={(checked) => handleChange('autoFillWaitlist', checked)} 
              disabled={!formData.enableWaitlist}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          Save Class Rules
        </Button>
      </div>
    </form>
  )
}
