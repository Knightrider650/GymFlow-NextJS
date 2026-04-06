'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMembers, useDebouncedSearch, useFormSubmit } from '@/hooks'
import { formatDate, getMembershipColor, getStatusBadgeColor } from '@/utils/format'
import { Plus, Search, Edit2, Trash2, Calendar, AlertTriangle } from 'lucide-react'
import { Member } from '@/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import * as xlsx from 'xlsx'
import { useRef } from 'react'
import { UploadCloud } from 'lucide-react'

const memberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Phone must be at least 7 digits'),
  address: z.string().optional(),
  membershipType: z.enum(['Basic', 'Premium', 'Elite', 'Trial']),
  status: z.enum(['active', 'expired', 'pending', 'cancelled']),
  joinDate: z.string(),
  expiryDate: z.string(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
})

type MemberFormValues = z.infer<typeof memberSchema>

export default function MembersPage() {
  const { members, isLoading, fetchMembers, createMember, bulkCreateMembers, updateMember, deleteMember } = useMembers()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    member.phone.includes(debouncedSearch)
  )

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      membershipType: 'Basic',
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      emergencyContact: '',
      emergencyPhone: '',
    },
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
  }, [])

  const onFormSubmit = async (data: MemberFormValues) => {
    try {
      const success = editingMember 
        ? await updateMember(editingMember.id, data)
        : await createMember(data)
      
      setIsDialogOpen(false)
      // resetForm will be called by onOpenChange for better animation transition
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
      membershipType: 'Basic',
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
        emergencyContact: editingMember.emergencyContact || '',
        emergencyPhone: editingMember.emergencyPhone || '',
      })
    }
  }, [editingMember, isDialogOpen, reset])

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setIsDialogOpen(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = xlsx.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = xlsx.utils.sheet_to_json<any>(worksheet)

        // Simple row mapper catching common arbitrary headers
        const parsedMembers = json.map((row) => ({
          name: row['Full Name'] || row['Name'] || row.name || 'Unknown',
          email: row['E-Mail'] || row['Email'] || row.email || `${Math.random().toString(36).substring(7)}@import.com`,
          phone: row['Phone'] || row['Mobile'] || row.phone || '000000000',
          membershipType: row['Membership'] || row.membershipType || 'Basic',
          status: row['Status'] || row.status || 'active',
          joinDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }))

        await bulkCreateMembers(parsedMembers)
        // Reset the input so the same file could potentially be triggerable again
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (error) {
        console.error('Failed to parse Excel file', error)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDeleteClick = (memberId: string) => {
    setMemberToDelete(memberId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (memberToDelete) {
      await deleteMember(memberToDelete)
      setIsDeleteDialogOpen(false)
      setMemberToDelete(null)
      await fetchMembers()
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Members</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage gym members and memberships
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <Button variant="outline" className="gap-2 w-fit" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="h-4 w-4" />
              Import Excel
            </Button>
            <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                // Delay clearing editingMember to prevent title flicker during close animation
                setTimeout(() => {
                  setEditingMember(null)
                  reset({
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    membershipType: 'Basic',
                    status: 'active',
                    joinDate: new Date().toISOString().split('T')[0],
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    emergencyContact: '',
                    emergencyPhone: '',
                  })
                }, 500)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 w-fit" onClick={() => {
                setEditingMember(null)
                reset({
                  name: '',
                  email: '',
                  phone: '',
                  address: '',
                  membershipType: 'Basic',
                  status: 'active',
                  joinDate: new Date().toISOString().split('T')[0],
                  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  emergencyContact: '',
                  emergencyPhone: '',
                })
              }}>
                <Plus className="h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? 'Edit Member' : 'Add New Member'}
                </DialogTitle>
                <DialogDescription>
                  {editingMember ? 'Update member information' : 'Create a new gym member account'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
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
                    <Label htmlFor="email">Email *</Label>
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
                      <option value="Basic">Basic</option>
                      <option value="Premium">Premium</option>
                      <option value="Elite">Elite</option>
                      <option value="Trial">Trial</option>
                    </select>
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
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Members Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        {isLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <span>Loading members...</span>
                          </div>
                        ) : (
                          'No members found.'
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-sm">{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getMembershipColor(member.membershipType)}>
                            {member.membershipType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getStatusBadgeColor(member.status)}
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(member.joinDate)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(member.expiryDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(member)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClick(member.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this member? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  )
}
