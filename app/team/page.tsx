'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users2, Shield, ShieldCheck, ShieldAlert, MoreHorizontal, Settings2, UserCog } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Manager' | 'Trainer' | 'Staff'
  status: 'active' | 'inactive'
  lastActive: string
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTeam = async () => {
    setIsLoading(true)
    try {
      // Re-using staff endpoint but filtering for administrative view
      const response = await apiClient.get('/api/staff')
      if (response.success) {
        setTeam(response.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch team:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <ShieldAlert className="h-4 w-4 text-rose-500" />
      case 'Manager': return <ShieldCheck className="h-4 w-4 text-amber-500" />
      case 'Trainer': return <Shield className="h-4 w-4 text-blue-500" />
      default: return <Shield className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <UserCog className="h-8 w-8 text-primary" />
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure roles, permissions, and platform access for your team
            </p>
          </div>
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Settings2 className="h-4 w-4" />
            Role Permissions
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-none bg-emerald-500/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-600 font-medium uppercase text-[10px] tracking-wider">Total Admins</CardDescription>
              <CardTitle className="text-2xl text-emerald-700">{team.filter(m => m.role === 'Admin').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none bg-blue-500/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-600 font-medium uppercase text-[10px] tracking-wider">Active Trainers</CardDescription>
              <CardTitle className="text-2xl text-blue-700">{team.filter(m => m.role === 'Trainer').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none bg-amber-500/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-600 font-medium uppercase text-[10px] tracking-wider">Managers</CardDescription>
              <CardTitle className="text-2xl text-amber-700">{team.filter(m => m.role === 'Manager').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none bg-slate-500/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-600 font-medium uppercase text-[10px] tracking-wider">Total Staff</CardDescription>
              <CardTitle className="text-2xl text-slate-700">{team.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-none bg-card/40 backdrop-blur-sm shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[250px]">Team Member</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Access Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground animate-pulse">Synchronizing team data...</TableCell>
                  </TableRow>
                ) : (
                  team.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <span className="text-sm font-medium">{member.role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={member.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}>
                          {member.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {member.lastActive || 'Today at 10:45 AM'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Manage Permissions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2">
                              <Shield className="h-4 w-4" /> Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <ShieldCheck className="h-4 w-4" /> Reset 2FA
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-rose-600">
                              <ShieldAlert className="h-4 w-4" /> Revoke Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
