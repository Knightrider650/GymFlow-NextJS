import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/store'
import { Shield, User, Users, Lock, ChevronRight, UserCog } from 'lucide-react'
import Link from 'next/link'

export function UserPermissionsSettings() {
  const user = useAuthStore(state => state.user)
  
  // Mock roles for UI demonstration of 7.2
  const roles = [
    { name: 'Manager', permissions: ['Manage Billing', 'Refunds', 'Delete Members', 'Manage Staff'] },
    { name: 'Staff', permissions: ['Register Members', 'Check-in', 'View Reports'] },
    { name: 'Trainer', permissions: ['View Assigned Members', 'Mark Attendance', 'View Classes'] }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick link to User Management */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Team Management</CardTitle>
                <CardDescription>Add, invite or deactivate users</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/team">
              <Button className="w-full gap-2">
                Manage Team Members
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Personal Profile Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <UserCog className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-lg">My Profile</CardTitle>
                <CardDescription>Manage your personal account settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                  {user?.fullname?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="font-bold text-sm">{user?.fullname}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions (RBAC)</CardTitle>
          <CardDescription>Review and customize granular permissions for each staff role</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="Manager" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {roles.map(r => (
                <TabsTrigger key={r.name} value={r.name}>{r.name}</TabsTrigger>
              ))}
            </TabsList>
            {roles.map(role => (
              <TabsContent key={role.name} value={role.name} className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {['Can process refunds', 'Can delete members', 'Can view revenue', 'Can manage inventory', 'Can check-in members', 'Can edit classes'].map(perm => (
                       <div key={perm} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                          <span className="text-sm">{perm}</span>
                          <Switch checked={role.name === 'Manager' || perm.includes('check-in')} />
                       </div>
                     ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-amber-100 bg-amber-50/10">
        <CardHeader>
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Login
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require 2FA for Admins</Label>
                <p className="text-xs text-muted-foreground">Force Multi-Factor Authentication for sensitive roles</p>
              </div>
              <Switch checked={false} className="data-[state=checked]:bg-amber-600" />
           </div>
           <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Staff IP Restriction</Label>
                <p className="text-xs text-muted-foreground">Allow staff login only from verified gym Wi-Fi IP addresses</p>
              </div>
              <Button variant="outline" size="sm" className="text-amber-700 border-amber-200">Configure IP</Button>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
