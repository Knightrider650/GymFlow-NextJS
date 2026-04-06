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
import { Plus, Search, Edit2, Trash2, ArrowRightCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useGymStore } from '@/lib/store'

const leadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Phone must be at least 7 digits'),
  status: z.enum(['New', 'Contacted', 'Converted', 'Lost']),
  notes: z.string().optional(),
})

type LeadFormValues = z.infer<typeof leadSchema>

export default function LeadsPage() {
  const fetchLeads = useGymStore(state => state.fetchLeads)
  const leads = useGymStore(state => state.leads) || []
  const createLead = useGymStore(state => state.createLead)
  const updateLead = useGymStore(state => state.updateLead)
  const deleteLead = useGymStore(state => state.deleteLead)
  const convertLead = useGymStore(state => state.convertLead)
  const leadsLoading = useGymStore(state => state.leadsLoading)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLeads = leads.filter(lead =>
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      status: 'New',
      notes: '',
    },
  })

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = form

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setTimeout(() => {
        reset()
        setEditingId(null)
      }, 200)
    }
  }

  const handleEdit = (lead: any) => {
    setEditingId(lead.id)
    setValue('name', lead.name)
    setValue('email', lead.email)
    setValue('phone', lead.phone)
    setValue('status', lead.status || 'New')
    setValue('notes', lead.notes || '')
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: LeadFormValues) => {
    try {
      if (editingId) {
        await updateLead(editingId, data)
      } else {
        await createLead(data)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error(error)
    }
  }

  const handleConvert = async (leadId: string) => {
    try {
      if (confirm('Convert lead to full active member?')) {
        await convertLead(leadId, {
          membershipType: 'Basic',
          status: 'active',
          joinDate: new Date().toISOString().split('T')[0],
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Lead Management</h1>
          <p className="text-slate-400">Track and convert gym prospects</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter prospect details to follow up later.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...register('name')} className="bg-slate-800 border-slate-700" />
                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} className="bg-slate-800 border-slate-700" />
                  {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} className="bg-slate-800 border-slate-700" />
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" {...register('status')} className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-200">
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" {...register('notes')} className="bg-slate-800 border-slate-700" />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Lead' : 'Save Lead')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search leads..."
              className="pl-9 bg-slate-800 border-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-800/50">
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="font-semibold text-slate-300">Name</TableHead>
                  <TableHead className="font-semibold text-slate-300">Contact</TableHead>
                  <TableHead className="font-semibold text-slate-300">Status</TableHead>
                  <TableHead className="font-semibold text-slate-300">Notes</TableHead>
                  <TableHead className="text-right font-semibold text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      Loading leads...
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No leads found. Create a new lead to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-slate-200">
                        {lead.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-300">{lead.email}</div>
                        <div className="text-xs text-slate-500">{lead.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          lead.status === 'New' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          lead.status === 'Contacted' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          lead.status === 'Converted' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }>
                          {lead.status || 'New'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">
                        {lead.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(lead)}>
                            <Edit2 className="h-4 w-4 text-slate-400 hover:text-white" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleConvert(lead.id)} disabled={lead.status === 'Converted'}>
                            <ArrowRightCircle className="h-4 w-4 text-green-400 hover:text-green-300" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if(confirm('Delete lead?')) deleteLead(lead.id) }}>
                            <Trash2 className="h-4 w-4 text-red-400 hover:text-red-300" />
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
    </ProtectedLayout>
  )
}
