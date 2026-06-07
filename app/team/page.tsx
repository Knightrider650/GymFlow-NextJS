'use client'

import { useState, useEffect, useCallback } from 'react'
import React from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  UserCog,
  UserPlus,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  KeyRound,
  Crown,
  Zap,
  Briefcase,
  ChevronDown,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { formatDate } from '@/utils/format'
import {
  ROLE_DEFINITIONS,
  ELEVATED_ROLES,
  canManageRole,
  getCreatableRoles,
  type UserRole,
  type RoleDefinition,
} from '@/lib/permissions'

interface SystemUser {
  id: string
  fullname: string
  email: string
  role: UserRole
  createdAt: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  cto: 'Super Admin (CTO)',
  ceo: 'Super Admin (CEO)',
  admin: 'Super Admin (Admin)',
  owner: 'Gym Owner',
  manager: 'Gym Manager',
  trainer: 'Trainer',
  staff: 'Staff',
}

const ROLE_COLORS: Record<UserRole, string> = {
  cto: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  ceo: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  admin: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  owner: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  manager: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  trainer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  staff: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
}

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  cto: <Zap className="h-3.5 w-3.5" />,
  ceo: <Crown className="h-3.5 w-3.5" />,
  admin: <ShieldAlert className="h-3.5 w-3.5" />,
  owner: <Crown className="h-3.5 w-3.5 text-orange-400" />,
  manager: <Briefcase className="h-3.5 w-3.5" />,
  trainer: <ShieldCheck className="h-3.5 w-3.5" />,
  staff: <Shield className="h-3.5 w-3.5" />,
}

// ─── Password Generator ────────────────────────────────────────────────────────
function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function TeamPage() {
  const currentUser = useAuthStore((s) => s.user)
  const actorRole = (currentUser?.role ?? 'staff') as UserRole
  const isElevated = ELEVATED_ROLES.includes(actorRole)

  const [users, setUsers] = useState<SystemUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('users')

  // Create User Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    fullname: '',
    email: '',
    password: '',
    role: getCreatableRoles(actorRole)[0] ?? 'staff',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Reset Password Modal
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  // Change Role Modal
  const [roleTarget, setRoleTarget] = useState<SystemUser | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('staff')
  const [roleLoading, setRoleLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.get('/api/users')
      if (res.success) setUsers(res.data ?? [])
    } catch (e) {
      console.error('Failed to fetch users:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isElevated) fetchUsers()
    else setIsLoading(false)
  }, [isElevated, fetchUsers])

  // ─── Create User ────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError('')
    try {
      const res = await apiClient.post('/api/users', createForm)
      if (res.success) {
        setCreateOpen(false)
        setCreateForm({ fullname: '', email: '', password: '', role: getCreatableRoles(actorRole)[0] ?? 'staff' })
        fetchUsers()
      } else {
        setCreateError(res.error ?? 'Failed to create user')
      }
    } catch {
      setCreateError('Unexpected error occurred')
    } finally {
      setCreateLoading(false)
    }
  }

  // ─── Delete User ────────────────────────────────────────────────────────────
  const handleDelete = async (user: SystemUser) => {
    if (!confirm(`Delete ${user.fullname}? This cannot be undone.`)) return
    await apiClient.delete(`/api/users/${user.id}`)
    fetchUsers()
  }

  // ─── Reset Password ─────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword) return
    setResetLoading(true)
    setResetError('')
    try {
      const res = await apiClient.post(`/api/users/${resetTarget.id}/reset-password`, { newPassword: resetPassword })
      if (res.success) {
        setResetTarget(null)
        setResetPassword('')
      } else {
        setResetError(res.error ?? 'Failed to reset password')
      }
    } catch {
      setResetError('Unexpected error')
    } finally {
      setResetLoading(false)
    }
  }

  // ─── Change Role ─────────────────────────────────────────────────────────────
  const handleRoleChange = async () => {
    if (!roleTarget) return
    setRoleLoading(true)
    try {
      const res = await apiClient.patch(`/api/users/${roleTarget.id}`, { role: newRole })
      if (res.success) {
        setRoleTarget(null)
        fetchUsers()
      }
    } finally {
      setRoleLoading(false)
    }
  }

  const creatableRoles = getCreatableRoles(actorRole)

  // ─── Role Definition Card ───────────────────────────────────────────────────
  const RoleCard = ({ def }: { def: RoleDefinition }) => (
    <div className={`rounded-xl border p-5 transition-all hover:scale-[1.01] ${def.bgColor} ${def.borderColor}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{def.icon}</span>
        <div>
          <h3 className={`font-bold text-base ${def.color}`}>{def.title}</h3>
          <p className="text-xs text-muted-foreground">{def.description}</p>
        </div>
      </div>
      <ul className="space-y-1.5 mt-3">
        {def.capabilities.map((cap, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className={`mt-0.5 shrink-0 font-bold ${def.color}`}>✓</span>
            {cap}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <UserCog className="h-8 w-8 text-primary" />
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage system users, roles, and access credentials for your platform
            </p>
          </div>
          {isElevated && creatableRoles.length > 0 && (
            <Button
              id="create-user-btn"
              onClick={() => setCreateOpen(true)}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <UserPlus className="h-4 w-4" />
              Create New User
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {(['users', 'roles'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'users' ? '👥 Users' : '📋 Role Definitions'}
            </button>
          ))}
        </div>

        {/* ─── USERS TABLE TAB ─────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {ROLE_DEFINITIONS.map((def) => {
                const count = users.filter((u) => u.role === def.role).length
                return (
                  <Card key={def.role} className={`border ${def.borderColor} ${def.bgColor}`}>
                    <CardHeader className="p-3 pb-1">
                      <CardDescription className={`text-[10px] uppercase tracking-wider font-bold ${def.color}`}>
                        {def.title}
                      </CardDescription>
                      <CardTitle className={`text-2xl ${def.color}`}>{count}</CardTitle>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>

            {/* Users Table */}
            <Card className="border-none bg-card/40 backdrop-blur-sm shadow-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-base">System Users ({users.length})</CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      {isElevated && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-16 text-muted-foreground animate-pulse">
                          Loading team data...
                        </TableCell>
                      </TableRow>
                    ) : !isElevated ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                          🔒 You need Admin, CEO, or CTO access to view system users
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                          No users found. Create your first user above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => {
                        const isSelf = u.id === currentUser?.id
                        const canAct = canManageRole(actorRole, u.role as UserRole)
                        return (
                          <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{u.fullname}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                                {isSelf && (
                                  <span className="text-[10px] text-primary font-medium mt-0.5">● You</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`gap-1.5 text-[11px] font-medium ${ROLE_COLORS[u.role]}`}
                              >
                                {ROLE_ICONS[u.role]}
                                {ROLE_LABELS[u.role]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(u.createdAt)}
                            </TableCell>
                            {isElevated && (
                              <TableCell className="text-right">
                                {!isSelf && canAct ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                      <DropdownMenuLabel>Manage {u.fullname}</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => {
                                          setRoleTarget(u)
                                          setNewRole(u.role)
                                        }}
                                      >
                                        <Shield className="h-4 w-4" />
                                        Change Role
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => {
                                          setResetTarget(u)
                                          setResetPassword(generatePassword())
                                        }}
                                      >
                                        <KeyRound className="h-4 w-4" />
                                        Reset Password
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="gap-2 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
                                        onClick={() => handleDelete(u)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete User
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <span className="text-xs text-muted-foreground px-3">{isSelf ? '(you)' : '—'}</span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* ─── ROLE DEFINITIONS TAB ────────────────────────────────────────── */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Each role has a clearly defined set of capabilities. Roles are hierarchical — higher roles can manage lower roles.
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ROLE_DEFINITIONS.map((def) => (
                <RoleCard key={def.role} def={def} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE USER MODAL ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Create login credentials for a new team member. They can log in immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="cu-fullname">Full Name</Label>
                <Input
                  id="cu-fullname"
                  placeholder="John Smith"
                  required
                  autoComplete="off"
                  value={createForm.fullname}
                  onChange={(e) => setCreateForm({ ...createForm, fullname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cu-email">Email Address</Label>
                <Input
                  id="cu-email"
                  type="email"
                  placeholder="john@yourgym.com"
                  required
                  autoComplete="off"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cu-password">Temporary Password</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0 text-xs text-primary"
                    onClick={() => setCreateForm({ ...createForm, password: generatePassword() })}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Generate
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="cu-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    autoComplete="off"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cu-role">Role</Label>
                <select
                  id="cu-role"
                  aria-label="Select role for new user"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                >
                  {creatableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]} — {ROLE_DEFINITIONS.find((d) => d.role === r)?.description.split('—')[0].trim()}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  As <span className="font-semibold capitalize">{actorRole}</span>, you can create:{' '}
                  {creatableRoles.map((r) => ROLE_LABELS[r]).join(', ')}
                </p>
              </div>
              {createError && (
                <p className="text-sm text-rose-500 bg-rose-500/10 px-3 py-2 rounded-md">{createError}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading} className="gap-2">
                {createLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {createLoading ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── RESET PASSWORD MODAL ──────────────────────────────────────────── */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-400" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-semibold">{resetTarget?.fullname}</span>.
              Share it with them securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label>New Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto py-0 text-xs text-primary"
                onClick={() => setResetPassword(generatePassword())}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Generate
              </Button>
            </div>
            <div className="relative">
              <Input
                type={showResetPassword ? 'text' : 'password'}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowResetPassword(!showResetPassword)}
              >
                {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {resetError && <p className="text-sm text-rose-500">{resetError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetLoading || resetPassword.length < 8}
              className="gap-2"
            >
              {resetLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CHANGE ROLE MODAL ─────────────────────────────────────────────── */}
      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              Change Role
            </DialogTitle>
            <DialogDescription>
              Update role for <span className="font-semibold">{roleTarget?.fullname}</span>.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-3 py-2">
            <Label htmlFor="change-role-select">New Role</Label>
            <select
              id="change-role-select"
              aria-label="Change user role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            >
              {getCreatableRoles(actorRole).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={roleLoading} className="gap-2">
              {roleLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  )
}
