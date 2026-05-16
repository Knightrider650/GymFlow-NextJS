import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Zap, CheckCircle2, Crown, ArrowUpRight, HelpCircle } from 'lucide-react'

export function AccountSettings() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Crown className="h-32 w-32" />
        </div>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge className="bg-primary text-white border-transparent">ANNUAL PLAN</Badge>
            <div className="text-xs text-slate-400">Renews on Jan 12, 2025</div>
          </div>
          <CardTitle className="text-2xl mt-4">GymFlow Pro</CardTitle>
          <CardDescription className="text-slate-400">Premium management suite for growing gyms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">$49</span>
            <span className="text-slate-400 mb-1">/ month (billed annually)</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Member Limit (850 / 2,000)</span>
              <span className="text-primary font-bold">42% used</span>
            </div>
            <Progress value={42} className="h-2 bg-slate-700" />
          </div>

          <div className="flex gap-3 pt-4">
             <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">Manage Billing</Button>
             <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                Upgrade Plan
                <ArrowUpRight className="h-4 w-4" />
             </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing History</CardTitle>
            <CardDescription>Recent subscription payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {[
               { id: 'GF-908', date: 'May 12, 2024', amount: '$490.00', status: 'Paid' },
               { id: 'GF-772', date: 'May 12, 2023', amount: '$490.00', status: 'Paid' }
             ].map(inv => (
               <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="text-sm font-bold">{inv.id}</div>
                    <div className="text-[10px] text-muted-foreground">{inv.date}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{inv.amount}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Zap className="h-4 w-4 text-primary" /></Button>
                  </div>
               </div>
             ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Support & Help</CardTitle>
            <CardDescription>Get assistance with your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-4 rounded-xl border bg-slate-50 flex items-start gap-4">
                <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                   <div className="font-bold text-sm">Dedicated Support</div>
                   <p className="text-xs text-muted-foreground mb-3">Priority response within 2 hours for Pro users.</p>
                   <Button size="sm" variant="secondary">Contact Support</Button>
                </div>
             </div>
             <div className="text-center">
                <Button variant="link" className="text-xs">Browse Knowledge Base</Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
