'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useStaff } from '@/hooks'
import { Plus, Edit2, Trash2, Users, Mail, Phone, Briefcase } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/utils/format'

export default function StaffPage() {
  const { staff, isLoading, fetchStaff, addStaffMember } = useStaff()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'Trainer' as const,
    salary: '',
    status: 'active' as const,
  })

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.email && formData.salary) {
      await addStaffMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        salary: parseFloat(formData.salary),
        status: formData.status,
        joinDate: new Date().toISOString().split('T')[0],
      })
      setIsDialogOpen(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: 'Trainer',
        salary: '',
        status: 'active',
      })
      await fetchStaff()
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Oversee your gym's team and personnel details
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-fit bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Enter the details for a new member of the gym's staff.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddStaff} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="staff-name">Full Name *</Label>
                    <Input
                      id="staff-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Robert Smith"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-email">Email Address *</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="robert@gym.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-phone">Phone Number</Label>
                    <Input
                      id="staff-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="555-0123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-position">Position *</Label>
                    <select
                      id="staff-position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="Trainer">Trainer</option>
                      <option value="Receptionist">Receptionist</option>
                      <option value="Manager">Manager</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-salary">Monthly Salary *</Label>
                    <Input
                      id="staff-salary"
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="staff-status">Initial Status</Label>
                    <select
                      id="staff-status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full font-semibold">Confirm Onboarding</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Staff Table */}
        <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Staff Directory</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[250px]">Staff Name</TableHead>
                    <TableHead>Contact info</TableHead>
                    <TableHead>Role & Position</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {isLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>Fetching employee records...</span>
                          </div>
                        ) : 'No staff members found in the current directory.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    staff.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell>
                          <div className="font-semibold text-primary text-base">{member.name}</div>
                          <div className="text-xs text-muted-foreground">Emp ID: {member.id.substring(0, 8)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {member.email}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-sm">{member.position}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {formatCurrency(member.salary)}
                          <span className="text-[10px] ml-1 font-normal text-muted-foreground">/mo</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            className={member.status === 'active' 
                              ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' 
                              : 'bg-muted text-muted-foreground'}
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
