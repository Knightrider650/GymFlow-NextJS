'use client'

import { useEffect, useState, useRef } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { useMembers, usePlans, useDebouncedSearch, useBranches } from '@/hooks'
import { useAuthStore } from '@/lib/store'
import { isTrainer } from '@/lib/permissions'
import { Plus, Search, Edit, Trash2, Calendar, AlertTriangle, UploadCloud, FileSpreadsheet, CheckCircle2, MoreHorizontal, Mail, Phone, MapPin, Download, Shield } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import * as xlsx from 'xlsx'
import { Member } from '@/types'
import { formatDate, getMembershipColor, getStatusBadgeColor } from '@/utils/format'

const memberSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  address: z.string().optional(),
  membershipType: z.string().min(1, 'Membership type is required'),
  status: z.enum(['active', 'pending', 'expired', 'cancelled']),
  joinDate: z.string(),
  expiryDate: z.string(),
  branchId: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
})

type MemberFormValues = z.infer<typeof memberSchema>

export default function MembersPage() {
  const { members, isLoading, fetchMembers, createMember, bulkCreateMembers, updateMember, deleteMember } = useMembers()
  const { plans, fetchPlans } = usePlans()
  const { branches, fetchBranches } = useBranches()
  const user = useAuthStore(state => state.user)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      member.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      member.phone.includes(debouncedSearch)
    
    const matchesBranch = selectedBranch === 'all' || member.branchId === selectedBranch
    
    return matchesSearch && matchesBranch
  })

  const defaultMemberValues: MemberFormValues = {
    name: '',
    email: '',
    phone: '',
    address: '',
    membershipType: '',
    status: 'active',
    joinDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branchId: '',
    emergencyContact: '',
    emergencyPhone: '',
  }

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: defaultMemberValues,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = form

  useEffect(() => {
    fetchMembers()
    fetchPlans()
    fetchBranches()
  }, [])

  const onFormSubmit = async (data: MemberFormValues) => {
    try {
      if (editingMember) {
        await updateMember(editingMember.id, data)
      } else {
        await createMember(data)
      }
      
      setIsDialogOpen(false)
      await fetchMembers()
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  const resetForm = () => {
    reset({
      name: '',
      email: '',
      phone: '',
      address: '',
      membershipType: '',
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      branchId: '',
      emergencyContact: '',
      emergencyPhone: '',
    })
    setEditingMember(null)
  }

  useEffect(() => {
    if (editingMember && isDialogOpen) {
      reset({
        name: editingMember.name,
        email: editingMember.email,
        phone: editingMember.phone,
        address: editingMember.address || '',
        membershipType: editingMember.membershipType as any,
        status: editingMember.status as any,
        joinDate: editingMember.joinDate.split('T')[0],
        expiryDate: editingMember.expiryDate.split('T')[0],
        branchId: editingMember.branchId || '',
        emergencyContact: editingMember.emergencyContact || '',
        emergencyPhone: editingMember.emergencyPhone || '',
      })
    }
  }, [editingMember, isDialogOpen, reset])

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (memberToDelete) {
      await deleteMember(memberToDelete)
      setIsDeleteDialogOpen(false)
      setMemberToDelete(null)
      await fetchMembers()
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = xlsx.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = xlsx.utils.sheet_to_json(worksheet)

      const formattedMembers: Array<Omit<Member, 'id' | 'createdAt' | 'updatedAt'>> = jsonData.map((item: any) => ({
        name: item.Name || item.name || '',
        email: item.Email || item.email || '',
        phone: String(item.Phone || item.phone || ''),
        membershipType: item.Type || item.membershipType || 'Basic',
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }))

      await bulkCreateMembers(formattedMembers)
      await fetchMembers()
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Member Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Maintain your gym&apos;s community and membership status across {branches.length} branches
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              aria-label="Import members file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            {!isTrainer(user?.role) && (
              <>
                <Button variant="outline" className="gap-2 shadow-sm" onClick={handleImportClick}>
                  <UploadCloud className="h-4 w-4" />
                  Import Excel
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open)
                  if (!open) resetForm()
                }}>
                  <DialogTrigger asChild>
                    <div className="flex gap-2">
                      <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger className="w-[180px] h-10 shadow-sm bg-card border-muted-foreground/20">
                          <SelectValue placeholder="All Branches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Branches</SelectItem>
                          {branches.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button className="gap-2 shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4" />
                        Add New Member
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
                      <DialogDescription>
                        Fill in the member details below to {editingMember ? 'update' : 'create'} a membership record.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-4">
                      {/* ... form content ... */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            {...register('name')}
                            placeholder="John Doe"
                            className={errors.name ? 'border-red-500' : ''}
                          />
                          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            {...register('email')}
                            placeholder="john@example.com"
                            className={errors.email ? 'border-red-500' : ''}
                          />
                          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone *</Label>
                          <Input
                            id="phone"
                            {...register('phone')}
                            placeholder="+1 (555) 000-0000"
                            className={errors.phone ? 'border-red-500' : ''}
                          />
                          {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            {...register('address')}
                            placeholder="123 Main St"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="membershipType">Membership Type *</Label>
                          <select
                            id="membershipType"
                            {...register('membershipType')}
                            className="w-full h-10 px-3 rounded-md border border-input text-sm bg-background"
                          >
                            <option value="None">None</option>
                            <option value="">Select a plan</option>
                            {plans.length > 0 ? (
                              plans.map((plan: any) => (
                                <option key={plan.id} value={plan.name}>{plan.name}</option>
                              ))
                            ) : (
                              <>
                                <option value="Basic">Basic</option>
                                <option value="Premium">Premium</option>
                                <option value="Elite">Elite</option>
                              </>
                            )}
                          </select>
                          {errors.membershipType && <p className="text-xs text-red-500">{errors.membershipType.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Status *</Label>
                          <select
                            id="status"
                            {...register('status')}
                            className="w-full h-10 px-3 rounded-md border border-input text-sm bg-background"
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="expired">Expired</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="joinDate">Join Date *</Label>
                          <Input
                            id="joinDate"
                            type="date"
                            {...register('joinDate')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">Expiry Date *</Label>
                          <Input
                            id="expiryDate"
                            type="date"
                            {...register('expiryDate')}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="branchId">Assigned Branch *</Label>
                        <select
                          id="branchId"
                          {...register('branchId')}
                          className="w-full h-10 px-3 rounded-md border border-input text-sm bg-background"
                        >
                          <option value="none">None / No Branch</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyContact">Emergency Contact</Label>
                          <Input
                            id="emergencyContact"
                            {...register('emergencyContact')}
                            placeholder="Contact name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                          <Input
                            id="emergencyPhone"
                            {...register('emergencyPhone')}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>

                      <DialogFooter className="mt-6">
                        <Button type="submit" className="w-full sm:w-auto gap-2" disabled={isSubmitting}>
                          {isSubmitting && <Plus className="h-4 w-4 animate-spin" />}
                          {editingMember ? 'Update Member' : 'Add Member'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10 h-11"
            placeholder="Search by name, email, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Members Table */}
        <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-bold">Member Info</TableHead>
                    <TableHead className="font-bold">Membership</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Dates</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Plus className="h-4 w-4 animate-spin" />
                          Synchronizing member database...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No members found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{member.name}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-2.5 w-2.5 text-primary" />
                              {branches.find(b => b.id === member.branchId)?.name || 'Default Branch'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getMembershipColor(member.membershipType)}>
                            {member.membershipType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusBadgeColor(member.status)} border-none`}>
                            {member.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs font-medium">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Joined: {formatDate(member.joinDate)}
                            </span>
                            <span className="mt-1 text-slate-600 font-bold">
                              Expires: {formatDate(member.expiryDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isTrainer(user?.role) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2" onClick={() => handleEdit(member)}>
                                  <Edit className="h-4 w-4 text-blue-500" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => {
                                  setMemberToDelete(member.id)
                                  setIsDeleteDialogOpen(true)
                                }}>
                                  <Trash2 className="h-4 w-4" /> Terminate Membership
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Terminate Membership?
              </DialogTitle>
              <DialogDescription>
                This action will permanently revoke membership access for this user. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Confirm Termination</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  )
}
