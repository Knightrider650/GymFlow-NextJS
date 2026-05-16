import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Lock, History, UserX, AlertTriangle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export function SecuritySettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session & Login Security</CardTitle>
          <CardDescription>Configure how users authenticate and maintain sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Session Timeout (Hours)</Label>
              <Select defaultValue="12">
                <SelectTrigger>
                  <SelectValue placeholder="Select Timeout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="12">12 Hours</SelectItem>
                  <SelectItem value="24">24 Hours</SelectItem>
                  <SelectItem value="168">7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Password Complexity</Label>
              <Select defaultValue="strong">
                <SelectTrigger>
                  <SelectValue placeholder="Select Policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (6+ chars)</SelectItem>
                  <SelectItem value="strong">Strong (8+ chars, upper, symbol)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (12+ chars, rotated 90d)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
             <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Multi-Factor Authentication (MFA)</Label>
                  <p className="text-xs text-muted-foreground">Require OTP via Email/SMS for all staff logins</p>
                </div>
                <Switch checked={false} />
             </div>
             <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Block Multiple Logins</Label>
                  <p className="text-xs text-muted-foreground">Prevent the same user account from being logged in on multiple devices</p>
                </div>
                <Switch checked={true} />
             </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit & Activity Logs</CardTitle>
              <CardDescription>Track all administrative actions and security events</CardDescription>
            </div>
            <Link href="/activity-log">
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                View All Logs
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 text-xs">
                 <div className="w-2 h-2 rounded-full bg-green-500" />
                 <span className="font-mono text-slate-500">2024-05-20 14:22:10</span>
                 <span className="font-bold">Admin</span>
                 <span className="text-muted-foreground italic">updated gym branding colors</span>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 text-xs">
                 <div className="w-2 h-2 rounded-full bg-blue-500" />
                 <span className="font-mono text-slate-500">2024-05-20 12:05:45</span>
                 <span className="font-bold">Manager</span>
                 <span className="text-muted-foreground italic">processed refund for INV-2024-089</span>
              </div>
           </div>
        </CardContent>
      </Card>

      <Card className="border-red-100 bg-red-50/10">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Critical Security Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-white">
              <div className="space-y-0.5">
                 <div className="font-bold text-red-900">Revoke All Active Sessions</div>
                 <p className="text-xs text-red-700/60">Logout all users immediately across all devices</p>
              </div>
              <Button variant="destructive" size="sm">Revoke All</Button>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
