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
  const fetchPlans = useGymStore(state => state.fetchPlans)
  const plans = useGymStore(state => state.plans) || []

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Conversion dialog state
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState('')

  const matchesSearch = (text: string, query: string) => {
    if (!text) return false
    const normText = text.toLowerCase()
    const normQuery = query.toLowerCase()
    if (normText.includes(normQuery)) return true
    
    if (normQuery.length < 3) return false
    
    // Check if query is a subsequence of the text (allows gaps)
    let qIdx = 0
    for (let i = 0; i < normText.length; i++) {
      if (normText[i] === normQuery[qIdx]) {
        qIdx++
        if (qIdx === normQuery.length) return true
      }
    }

    // Check transposition / character presence (e.g., prahsant vs prash)
    let matchedChars = 0
    let tempText = normText
    for (let i = 0; i < normQuery.length; i++) {
      const idx = tempText.indexOf(normQuery[i])
      if (idx !== -1) {
        matchedChars++
        tempText = tempText.substring(0, idx) + tempText.substring(idx + 1)
      }
    }
    
    if (matchedChars >= normQuery.length - 1) {
      return normText[0] === normQuery[0]
    }
    
    return false
  }

  const filteredLeads = leads.filter(lead =>
    matchesSearch(lead.name, searchTerm) ||
    matchesSearch(lead.email, searchTerm)
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
    fetchPlans()
  }, [fetchLeads, fetchPlans])

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

  const openConvertDialog = (leadId: string) => {
    setConvertingLeadId(leadId)
    setSelectedPlan(plans.length > 0 ? plans[0].name : 'Basic')
    setIsConvertDialogOpen(true)
  }

  const handleConvert = async () => {
    if (!convertingLeadId) return
    try {
      await convertLead(convertingLeadId, {
        membershipType: selectedPlan || 'Basic',
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
      })
      setIsConvertDialogOpen(false)
      setConvertingLeadId(null)
      setSelectedPlan('')
    } catch (err) {
      console.error(err)
    }
  }

  const convertingLead = leads.find(l => l.id === convertingLeadId)

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Lead Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and convert gym prospects</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                <DialogDescription>
                  Enter prospect details to follow up later.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register('phone')} />
                    {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" {...register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" {...register('notes')} />
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10 h-11"
            placeholder="Search leads by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Contact</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Notes</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading leads...
                      </TableCell>
                    </TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No leads found. Create a new lead to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          {lead.name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{lead.email}</div>
                          <div className="text-xs text-muted-foreground">{lead.phone}</div>
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
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {lead.notes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(lead)}>
                              <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openConvertDialog(lead.id)} disabled={lead.status === 'Converted'}>
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

        {/* Convert Lead Dialog — with plan selection */}
        <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Convert Lead to Member</DialogTitle>
              <DialogDescription>
                {convertingLead
                  ? `You are about to convert "${convertingLead.name}" into an active gym member.`
                  : 'Select a membership plan for the new member.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Membership Plan *</Label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  {plans.length > 0 ? (
                    plans.map((plan: any) => (
                      <option key={plan.id} value={plan.name}>{plan.name} — ${plan.price}/{plan.durationMonths}mo</option>
                    ))
                  ) : (
                    <>
                      <option value="Basic">Basic</option>
                      <option value="Premium">Premium</option>
                      <option value="Elite">Elite</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsConvertDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConvert} className="gap-2">
                <ArrowRightCircle className="h-4 w-4" />
                Confirm Conversion
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  )
}
