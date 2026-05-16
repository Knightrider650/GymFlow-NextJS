import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { AppSettings } from '@/types'
import { Globe, MessageSquare, CreditCard, Webhook, ChevronRight, CheckCircle2 } from 'lucide-react'

export function IntegrationSettings() {
  const integrations = [
    { name: 'Twilio', type: 'SMS & WhatsApp', status: 'connected', icon: MessageSquare },
    { name: 'SendGrid', type: 'Email Service', status: 'disconnected', icon: MessageSquare },
    { name: 'Stripe', type: 'Payment Gateway', status: 'connected', icon: CreditCard },
    { name: 'Razorpay', type: 'Payment Gateway', status: 'disconnected', icon: CreditCard },
    { name: 'Zapier', type: 'Automation', status: 'coming_soon', icon: Webhook }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Third-Party Integrations</CardTitle>
          <CardDescription>Connect external services to power notifications and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrations.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 rounded-xl border bg-white hover:border-primary/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                   <div className={`p-2 rounded-lg ${item.status === 'connected' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                      <item.icon className="h-5 w-5" />
                   </div>
                   <div>
                      <div className="font-bold flex items-center gap-2">
                        {item.name}
                        {item.status === 'connected' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   {item.status === 'connected' ? (
                      <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Connected</Badge>
                   ) : item.status === 'coming_soon' ? (
                      <Badge variant="outline" className="text-slate-400 bg-slate-50 border-slate-200">Coming Soon</Badge>
                   ) : (
                      <Button variant="ghost" size="sm" className="h-8">Connect</Button>
                   )}
                   <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
          <CardDescription>Receive real-time event notifications in your own apps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input placeholder="https://your-api.com/webhooks" className="flex-1" />
                <Button variant="secondary">Test</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Events: member.created, payment.received, class.booked</p>
           </div>
           <div className="pt-4 flex items-center justify-between border-t">
              <div className="space-y-0.5">
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">Activate webhook delivery for this tenant</p>
              </div>
              <Switch checked={false} />
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
