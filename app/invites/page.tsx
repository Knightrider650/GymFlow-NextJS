'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Mail, Copy, Send, Trash2, Clock, CheckCircle2, UserPlus } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface Invite {
  id: string
  email: string
  role: string
  status: 'pending' | 'accepted' | 'expired'
  sentAt: string
  expiresAt: string
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'member'
  })

  const fetchInvites = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/api/invites')
      if (response.success) {
        setInvites(response.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch invites:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvites()
  }, [])

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await apiClient.post('/api/invites', {
        ...formData,
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      })
      if (response.success) {
        setFormData({ email: '', role: 'member' })
        fetchInvites()
      }
    } catch (err) {
      console.error('Failed to send invite:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteInvite = async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/invites/${id}`)
      if (response.success) {
        fetchInvites()
      }
    } catch (err) {
      console.error('Failed to delete invite:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>
      case 'accepted': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Accepted</Badge>
      case 'expired': return <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20">Expired</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-primary" />
            Invitations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invite new members or staff to join your gym ecosystem
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-1 h-fit border-none bg-card/40 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle>Send New Invite</CardTitle>
              <CardDescription>Generated invites expire in 7 days</CardDescription>
            </CardHeader>
            <form onSubmit={handleSendInvite}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                     id="email" 
                     type="email" 
                     placeholder="name@example.com" 
                     required 
                     value={formData.email}
                     onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Assign Role</Label>
                  <select 
                     id="role" 
                     className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     value={formData.role}
                     onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="member">Member</option>
                    <option value="trainer">Trainer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="lg:col-span-2 border-none bg-card/40 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle>Recent Invites</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">Loading...</TableCell>
                    </TableRow>
                  ) : invites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No active invites</TableCell>
                    </TableRow>
                  ) : (
                    invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.email}</TableCell>
                        <TableCell>{invite.role}</TableCell>
                        <TableCell>{getStatusBadge(invite.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(invite.sentAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => handleDeleteInvite(invite.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
}
