import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppSettings } from '@/types'
import { Save, Bell, Mail, MessageSquare, Phone, Plus, Trash2, Clock } from 'lucide-react'

interface NotificationSettingsProps {
  settings: AppSettings
  onSave: (data: Partial<AppSettings>) => void
}

export function NotificationSettings({ settings, onSave }: NotificationSettingsProps) {
  const [formData, setFormData] = React.useState(settings.notifications || {
    enabledChannels: ['email', 'in-app'],
    providers: {},
    automations: [
      { id: '1', trigger: 'membership_expiry', days: 3, channel: 'email', templateId: 'exp-1', enabled: true },
      { id: '2', trigger: 'payment_due', days: 1, channel: 'sms', templateId: 'pay-1', enabled: false }
    ]
  })

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleChannel = (channel: any) => {
    const channels = formData.enabledChannels.includes(channel)
      ? formData.enabledChannels.filter(c => c !== channel)
      : [...formData.enabledChannels, channel]
    handleChange('enabledChannels', channels)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ notifications: formData })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Communication Channels</CardTitle>
          <CardDescription>Enable or disable notification delivery methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { id: 'email', icon: Mail, label: 'Email' },
              { id: 'sms', icon: Phone, label: 'SMS' },
              { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp' },
              { id: 'in-app', icon: Bell, label: 'In-App' }
            ].map((channel) => {
              const isEnabled = formData.enabledChannels.includes(channel.id as any)
              return (
                <div key={channel.id} className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-transparent'}`}>
                  <channel.icon className={`h-6 w-6 ${isEnabled ? 'text-primary' : 'text-slate-300'}`} />
                  <span className="text-sm font-medium">{channel.label}</span>
                  <Switch checked={isEnabled} onCheckedChange={() => toggleChannel(channel.id)} />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="automations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="automations">Automation Rules</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="automations" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Triggers & Reminders</CardTitle>
                <CardDescription>Automated messages based on member actions</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1">
                <Plus className="h-3 w-3" /> Add Rule
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.automations?.map((rule) => (
                <div key={rule.id} className="p-4 rounded-lg border bg-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-full">
                      <Clock className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="font-bold text-sm capitalize">{String(rule.trigger).replace('_', ' ')}</div>
                      <p className="text-xs text-muted-foreground">
                        Send via <span className="font-medium text-primary uppercase">{rule.channel}</span> {rule.days} day(s) before/after
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={rule.enabled} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Library</CardTitle>
              <CardDescription>Manage content for each notification type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 <div className="p-4 rounded-lg border bg-slate-50 flex items-center justify-between">
                    <div className="font-medium">Welcome Message</div>
                    <Button variant="link" className="text-xs">Edit Content</Button>
                 </div>
                 <div className="p-4 rounded-lg border bg-slate-50 flex items-center justify-between">
                    <div className="font-medium">Membership Expiry Alert</div>
                    <Button variant="link" className="text-xs">Edit Content</Button>
                 </div>
                 <div className="p-4 rounded-lg border bg-slate-50 flex items-center justify-between">
                    <div className="font-medium">Payment Receipt</div>
                    <Button variant="link" className="text-xs">Edit Content</Button>
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2 px-8">
          <Save className="h-4 w-4" />
          Save Notifications
        </Button>
      </div>
    </form>
  )
}
