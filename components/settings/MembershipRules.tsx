import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AppSettings } from '@/types'
import { Save, Info } from 'lucide-react'

interface MembershipRulesProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function MembershipRules({ settings, onSave }: MembershipRulesProps) {
  const [formData, setFormData] = React.useState(settings.membershipRules || {
    defaultDuration: 30,
    renewalGracePeriod: 7,
    allowBackDatedRenewals: false,
    allowFutureDatedStarts: true,
    minFreezeDays: 7,
    maxFreezeDays: 90,
    allowMultipleFreezes: false,
    inactiveAfterExpiryDays: 30,
    blockExpiredCheckIn: true
  })

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ membershipRules: formData })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Membership Behavior</CardTitle>
          <CardDescription>Configure how memberships are created and renewed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Default Plan Duration (Days)</Label>
              <Input 
                type="number" 
                value={formData.defaultDuration} 
                onChange={(e) => handleChange('defaultDuration', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Renewal Grace Period (Days)</Label>
              <Input 
                type="number" 
                value={formData.renewalGracePeriod} 
                onChange={(e) => handleChange('renewalGracePeriod', parseInt(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Days allowed for check-in after expiry
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Back-dated Renewals</Label>
                <p className="text-xs text-muted-foreground">Enable starting a plan from a past date</p>
              </div>
              <Switch 
                checked={formData.allowBackDatedRenewals} 
                onCheckedChange={(checked) => handleChange('allowBackDatedRenewals', checked)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Future-dated Starts</Label>
                <p className="text-xs text-muted-foreground">Enable scheduling a plan to start in the future</p>
              </div>
              <Switch 
                checked={formData.allowFutureDatedStarts} 
                onCheckedChange={(checked) => handleChange('allowFutureDatedStarts', checked)} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Freeze & Expiry Rules</CardTitle>
          <CardDescription>Define limits for membership suspension and inactivity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Min Freeze Duration (Days)</Label>
              <Input 
                type="number" 
                value={formData.minFreezeDays} 
                onChange={(e) => handleChange('minFreezeDays', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Total Freeze (Days)</Label>
              <Input 
                type="number" 
                value={formData.maxFreezeDays} 
                onChange={(e) => handleChange('maxFreezeDays', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label>Allow Multiple Freezes</Label>
              <p className="text-xs text-muted-foreground">Allow members to freeze their plan multiple times per cycle</p>
            </div>
            <Switch 
              checked={formData.allowMultipleFreezes} 
              onCheckedChange={(checked) => handleChange('allowMultipleFreezes', checked)} 
            />
          </div>

          <div className="space-y-2 pt-4">
            <Label>Auto-mark Inactive After (Days)</Label>
            <Input 
              type="number" 
              value={formData.inactiveAfterExpiryDays} 
              onChange={(e) => handleChange('inactiveAfterExpiryDays', parseInt(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">Mark member as inactive if they don&apos;t renew within this period</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-100 bg-red-50/10">
        <CardHeader>
          <CardTitle className="text-red-900">Enforcement</CardTitle>
          <CardDescription>Strictness of membership checks at front desk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-red-900">Block Expired Check-ins</Label>
              <p className="text-xs text-red-700/60">Strictly prevent check-in if membership is expired (and outside grace period)</p>
            </div>
            <Switch 
              checked={formData.blockExpiredCheckIn} 
              onCheckedChange={(checked) => handleChange('blockExpiredCheckIn', checked)} 
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          Save Rules
        </Button>
      </div>
    </form>
  )
}
