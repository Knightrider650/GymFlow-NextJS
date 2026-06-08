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
import { Plus, Search, Edit2, Trash2, ArrowRightCircle, Mail, Phone, Calendar, User, Move } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useGymStore } from '@/lib/store'
import { format } from 'date-fns'

const leadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').or(z.literal('')),
  phone: z.string().min(7, 'Phone must be at least 7 digits'),
  status: z.enum(['New', 'Contacted', 'Converted', 'Lost']),
  notes: z.string().optional(),
})

type LeadFormValues = z.infer<typeof leadSchema>

type LeadStatus = 'New' | 'Contacted' | 'Converted' | 'Lost'

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

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)

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
    setValue('email', lead.email || '')
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

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    if ((lead.status || 'New') === newStatus) return

    if (newStatus === 'Converted') {
      openConvertDialog(leadId)
      return
    }

    try {
      await updateLead(leadId, {
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone,
        notes: lead.notes || '',
        status: newStatus
      })
    } catch (err) {
      console.error('Failed to drag update lead status:', err)
    }
  }

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    lead.phone.includes(searchTerm)
  )

  // Group leads into columns
  const columns: Record<LeadStatus, any[]> = {
    New: filteredLeads.filter(l => (l.status || 'New') === 'New'),
    Contacted: filteredLeads.filter(l => l.status === 'Contacted'),
    Converted: filteredLeads.filter(l => l.status === 'Converted'),
    Lost: filteredLeads.filter(l => l.status === 'Lost'),
  }

  const columnHeaders: Record<LeadStatus, { label: string, colorClass: string }> = {
    New: { label: 'New Lead', colorClass: 'border-t-blue-500 bg-blue-500/5' },
    Contacted: { label: 'Contacted', colorClass: 'border-t-yellow-500 bg-yellow-500/5' },
    Converted: { label: 'Converted', colorClass: 'border-t-green-500 bg-green-500/5' },
    Lost: { label: 'Lost', colorClass: 'border-t-red-500 bg-red-500/5' }
  }

  const convertingLead = leads.find(l => l.id === convertingLeadId)

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Prospect pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1">Drag and drop leads to track conversion stages</p>
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
                  Enter prospect details to log into CRM pipeline.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
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
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" {...register('phone')} />
                    {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Pipeline Stage *</Label>
                  <select id="status" {...register('status')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / Requirements</Label>
                  <Input id="notes" {...register('notes')} placeholder="e.g. Looking for personal trainer" />
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
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10 h-11"
            placeholder="Search prospects by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Kanban Board Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1 min-h-[500px]">
          {(Object.keys(columns) as LeadStatus[]).map((status) => (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedLeadId) {
                  handleStatusChange(draggedLeadId, status)
                  setDraggedLeadId(null)
                }
              }}
              className={`rounded-xl border border-white/5 border-t-4 p-4 flex flex-col h-full ${columnHeaders[status].colorClass}`}
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-bold text-sm text-foreground/80 tracking-wide uppercase">
                  {columnHeaders[status].label}
                </h3>
                <Badge variant="secondary" className="px-2 py-0.5 rounded-full font-bold">
                  {columns[status].length}
                </Badge>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto min-h-[400px] max-h-[600px] pr-1">
                {leadsLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Loading...</p>
                ) : columns[status].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/5 p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center h-full min-h-[150px]">
                    <Move className="h-5 w-5 opacity-20 mb-2" />
                    Drag leads here
                  </div>
                ) : (
                  columns[status].map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLeadId(lead.id)}
                      className="group cursor-grab active:cursor-grabbing border-white/5 bg-card hover:bg-muted/10 transition-all hover:shadow-md hover:scale-[1.01] relative"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-foreground/90">{lead.name}</h4>
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              Logged: {format(new Date(lead.createdAt || Date.now()), 'dd MMM')}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[9px] px-1 py-0.2 bg-white/5 border-none opacity-0 group-hover:opacity-100 transition-opacity">
                            Drag
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          {lead.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 shrink-0" />
                              {lead.phone}
                            </p>
                          )}
                          {lead.email && (
                            <p className="flex items-center gap-1.5 truncate" title={lead.email}>
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </p>
                          )}
                        </div>

                        {lead.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded italic line-clamp-2">
                            &quot;{lead.notes}&quot;
                          </p>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(lead)}
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => { if(confirm('Delete lead?')) deleteLead(lead.id) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {lead.status !== 'Converted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10 px-2 py-1 h-7 gap-1"
                              onClick={() => openConvertDialog(lead.id)}
                            >
                              <ArrowRightCircle className="h-3.5 w-3.5" />
                              Convert
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Convert Lead Dialog */}
        <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Convert Lead to Member</DialogTitle>
              <DialogDescription>
                {convertingLead
                  ? `Select a membership plan to convert "${convertingLead.name}" into a registered active gym member.`
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
                      <option key={plan.id} value={plan.name}>
                        {plan.name} — INR {plan.price} ({plan.durationMonths || plan.durationDays / 30} Months)
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Basic">Basic Plan</option>
                      <option value="Premium">Premium Plan</option>
                      <option value="Elite">Elite Plan</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => {
                setIsConvertDialogOpen(false)
                setConvertingLeadId(null)
              }}>Cancel</Button>
              <Button onClick={handleConvert} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
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
