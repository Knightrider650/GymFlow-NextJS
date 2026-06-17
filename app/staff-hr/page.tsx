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
import { useStaff, useSettings, useBranches } from '@/hooks'
import { useAuthStore } from '@/lib/store'
import { isTrainer } from '@/lib/permissions'
import { Plus, Edit2, Trash2, Users, Mail, Phone, Briefcase, MapPin, Filter, Search } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/utils/format'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function StaffPage() {
  const { staff, isLoading, fetchStaff, addStaffMember, updateStaffMember, deleteStaffMember } = useStaff()
  const { settings, fetchSettings } = useSettings()
  const { branches, fetchBranches } = useBranches()
  const user = useAuthStore((state: any) => state.user)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'Trainer' as const,
    salary: '',
    status: 'active' as const,
    branchId: '',
  })

  useEffect(() => {
    fetchStaff()
    fetchSettings()
    fetchBranches()
  }, [fetchStaff, fetchSettings, fetchBranches])

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.position.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesBranch = selectedBranch === 'all' || s.branchId === selectedBranch
    
    return matchesSearch && matchesBranch
  })

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.email && formData.salary) {
      const salaryVal = parseFloat(formData.salary) || 0
      if (editingStaffId) {
        await updateStaffMember(editingStaffId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          salary: salaryVal,
          status: formData.status,
          branchId: formData.branchId,
        })
      } else {
        await addStaffMember({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          salary: salaryVal,
          status: formData.status,
          branchId: formData.branchId,
          joinDate: new Date().toISOString().split('T')[0],
        })
      }
      setIsDialogOpen(false)
      setEditingStaffId(null)
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: 'Trainer',
        salary: '',
        status: 'active',
        branchId: '',
      })
      await fetchStaff()
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-sm text-muted-foreground">
            Oversee your gym&apos;s team and personnel details
          </p>
        </div>

        {/* Controls: Search, Filter, and Actions */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-muted/20 p-4 rounded-xl border border-muted-foreground/10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-10 h-11 bg-card placeholder:text-muted-foreground/75"
              placeholder="Search staff by name, email, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {branches.length > 1 && (
              <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border h-11 shadow-sm">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[180px] border-none bg-transparent focus:ring-0">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!isTrainer(user?.role) && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                  setEditingStaffId(null)
                  setFormData({ name: '', email: '', phone: '', position: 'Trainer', salary: '', status: 'active', branchId: '' })
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingStaffId(null)
                      setFormData({ name: '', email: '', phone: '', position: 'Trainer', salary: '', status: 'active', branchId: '' })
                    }}
                    className="gap-2 h-11 bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20"
                  >
                    <Plus className="h-4 w-4" />
                    Add Staff Member
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingStaffId ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
                  <DialogDescription>
                    {editingStaffId ? 'Update the details for this employee.' : 'Enter the details for a new member of the gym\'s staff.'}
                  </DialogDescription>
                </DialogHeader>
              <form onSubmit={handleAddStaff} className="space-y-4 py-4">
                  {/* ... form content ... */}
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
                        aria-label="Staff position"
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
                      <Label htmlFor="staff-branch">Assigned Branch *</Label>
                      <Select 
                        value={formData.branchId} 
                        onValueChange={(val) => setFormData({ ...formData, branchId: val })}
                        required
                      >
                        <SelectTrigger id="staff-branch">
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None / No Branch</SelectItem>
                          {branches.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="staff-status">Initial Status</Label>
                      <select
                        id="staff-status"
                        aria-label="Staff status"
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
                    <Button type="submit" className="w-full font-semibold">{editingStaffId ? 'Save Changes' : 'Confirm Onboarding'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
          </div>
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
                    {!isTrainer(user?.role) && <TableHead>Compensation</TableHead>}
                    <TableHead className="text-right">Status</TableHead>
                    {!isTrainer(user?.role) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {isLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>Fetching employee records...</span>
                          </div>
                        ) : 'No staff members found in the current directory.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell>
                          <div className="font-semibold text-primary text-base">{member.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            {branches.find(b => b.id === member.branchId)?.name || 'Main Branch'}
                          </div>
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
                        {!isTrainer(user?.role) && (
                          <TableCell className="font-bold text-foreground">
                            {formatCurrency(member.salary, settings?.currency)}
                            <span className="text-[10px] ml-1 font-normal text-muted-foreground">/mo</span>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Badge 
                            className={member.status === 'active' 
                              ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' 
                              : 'bg-muted text-muted-foreground'}
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        {!isTrainer(user?.role) && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 hover:text-primary"
                                onClick={() => {
                                  setFormData({
                                    name: member.name,
                                    email: member.email,
                                    phone: member.phone || '',
                                    position: member.position as any,
                                    salary: member.salary.toString(),
                                    status: member.status as any,
                                    branchId: member.branchId || '',
                                  })
                                  setEditingStaffId(member.id)
                                  setIsDialogOpen(true)
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (confirm('Are you sure you want to remove this staff member?')) {
                                    deleteStaffMember(member.id)
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
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


