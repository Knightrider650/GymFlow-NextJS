'use client'

import { useEffect, useState, useRef } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { useMembers, usePlans, useDebouncedSearch, useBranches } from '@/hooks'
import { useAuthStore, useGymStore } from '@/lib/store'
import { isTrainer } from '@/lib/permissions'
import { Plus, Search, Edit, Trash2, Calendar, AlertTriangle, UploadCloud, FileSpreadsheet, CheckCircle2, MoreHorizontal, Mail, Phone, MapPin, Download, Shield, QrCode, Printer, MessageSquare, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
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
  planId: z.string().optional().nullable(), // Link to plan instead of free-text type
  membershipType: z.string().optional(), // Optional fallback for backward compatibility
  status: z.enum(['active', 'pending', 'expired', 'cancelled']),
  joinDate: z.string(),
  expiryDate: z.string(),
  branchId: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  dob: z.string().optional().nullable().or(z.literal('')),
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
  const [selectedPassMember, setSelectedPassMember] = useState<Member | null>(null)
  const [isPassModalOpen, setIsPassModalOpen] = useState(false)

  const sendMessageToMembers = useGymStore(state => state.sendMessageToMembers)
  
  // Messaging Selection states
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  const [messageChannel, setMessageChannel] = useState('email')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [msgSuccessMessage, setMsgSuccessMessage] = useState('')
  const [msgErrorMessage, setMsgErrorMessage] = useState('')

  const handleSelectMember = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id))
    }
  }

  const clearSelection = () => {
    setSelectedMembers([])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMembers.length === 0) return
    
    setIsSendingMessage(true)
    setMsgSuccessMessage('')
    setMsgErrorMessage('')
    
    const result = await sendMessageToMembers({
      memberIds: selectedMembers,
      channel: messageChannel,
      subject: messageChannel === 'email' ? messageSubject : undefined,
      message: messageContent
    })
    
    setIsSendingMessage(false)
    if (result.success) {
      setMsgSuccessMessage(result.message || 'Messages dispatched successfully!')
      setMessageContent('')
      setMessageSubject('')
      setTimeout(() => {
        setIsMessageDialogOpen(false)
        setMsgSuccessMessage('')
        setSelectedMembers([])
      }, 2000)
    } else {
      setMsgErrorMessage(result.error || 'Failed to dispatch messages. Please try again.')
    }
  }

  const handleViewPass = (member: Member) => {
    setSelectedPassMember(member)
    setIsPassModalOpen(true)
  }

  const handlePrintPass = () => {
    if (!selectedPassMember) return
    const qrElement = document.getElementById('member-qr-code')
    if (!qrElement) return
    const qrSvg = qrElement.outerHTML

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Pass - \${selectedPassMember.name}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f1f5f9;
            }
            .pass-card {
              width: 320px;
              padding: 24px;
              background: #0f172a;
              color: white;
              border-radius: 16px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              text-align: center;
              border: 1px solid #1e293b;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 0.1em;
              color: #f8fafc;
              margin-bottom: 20px;
              border-bottom: 1px solid #334155;
              padding-bottom: 12px;
            }
            .qr-container {
              background: white;
              padding: 12px;
              border-radius: 12px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-container svg {
              display: block;
            }
            .name {
              font-size: 22px;
              font-weight: 700;
              margin: 0 0 4px 0;
            }
            .id {
              font-size: 11px;
              font-family: monospace;
              color: #94a3b8;
              margin-bottom: 16px;
              word-break: break-all;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              margin: 0 4px;
            }
            .badge-type {
              border: 1px solid #6366f1;
              color: #a5b4fc;
            }
            .badge-status {
              background: #10b981;
              color: white;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 20px;
              background: rgba(255,255,255,0.05);
              padding: 12px;
              border-radius: 8px;
              text-align: left;
              font-size: 12px;
            }
            .details-label {
              color: #94a3b8;
              font-size: 10px;
              text-transform: uppercase;
            }
            .details-val {
              font-weight: 600;
              color: #e2e8f0;
            }
            @media print {
              body { background: white; }
              .pass-card { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="pass-card">
            <div class="title">GYMFLOW MEMBERSHIP PASS</div>
            <div class="qr-container">
              \${qrSvg}
            </div>
            <h3 class="name">\${selectedPassMember.name}</h3>
            <p class="id">ID: \${selectedPassMember.id}</p>
            <div>
              <span class="badge badge-type">\${plans.find((p: any) => p.id === (selectedPassMember as any).planId)?.name || selectedPassMember.membershipType || 'Standard'}</span>
              <span class="badge badge-status" style="background: \${selectedPassMember.status === 'active' ? '#10b981' : '#ef4444'}">\${selectedPassMember.status}</span>
            </div>
            <div class="details-grid">
              <div>
                <div class="details-label">Branch</div>
                <div class="details-val">\${branches.find(b => b.id === selectedPassMember.branchId)?.name || 'Main Branch'}</div>
              </div>
              <div>
                <div class="details-label">Expires</div>
                <div class="details-val">\${formatDate(selectedPassMember.expiryDate)}</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownloadPass = () => {
    if (!selectedPassMember) return
    const qrElement = document.getElementById('member-qr-code')
    if (!qrElement) return

    // Serialize SVG
    const svgString = new XMLSerializer().serializeToString(qrElement)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const qrImage = new Image()
    qrImage.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 600
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 600)
      grad.addColorStop(0, '#0f172a') // Slate 900
      grad.addColorStop(1, '#020617') // Slate 950
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 400, 600)

      // Draw subtle branding background circles
      ctx.fillStyle = 'rgba(99, 102, 241, 0.05)'
      ctx.beginPath()
      ctx.arc(0, 0, 200, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(79, 70, 229, 0.05)'
      ctx.beginPath()
      ctx.arc(400, 600, 200, 0, Math.PI * 2)
      ctx.fill()

      // Header branding
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 18px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('GYMFLOW PASS', 200, 45)

      // Header border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(20, 65)
      ctx.lineTo(380, 65)
      ctx.stroke()

      // Draw QR Code background card
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(90, 95, 220, 220, 16)
      ctx.fill()

      // Draw QR Code image
      ctx.drawImage(qrImage, 100, 105, 200, 200)

      // Member Name
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
      ctx.fillText(selectedPassMember.name, 200, 360)

      // Member ID
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px monospace'
      ctx.fillText(`ID: \${selectedPassMember.id}`, 200, 385)

      // Badges
      const typeText = (plans.find((p: any) => p.id === (selectedPassMember as any).planId)?.name || selectedPassMember.membershipType || 'STANDARD').toUpperCase()
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif'
      const typeWidth = ctx.measureText(typeText).width + 20
      
      const statusText = selectedPassMember.status.toUpperCase()
      const statusWidth = ctx.measureText(statusText).width + 20

      const gap = 10
      const totalWidth = typeWidth + statusWidth + gap
      let startX = 200 - totalWidth / 2

      // Draw Membership type badge
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'
      ctx.fillStyle = 'rgba(99, 102, 241, 0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(startX, 405, typeWidth, 22, 11)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#a5b4fc'
      ctx.textAlign = 'center'
      ctx.fillText(typeText, startX + typeWidth / 2, 419)

      startX += typeWidth + gap

      // Draw Status badge
      const isActive = selectedPassMember.status === 'active'
      ctx.fillStyle = isActive ? '#10b981' : '#ef4444'
      ctx.beginPath()
      ctx.roundRect(startX, 405, statusWidth, 22, 11)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(statusText, startX + statusWidth / 2, 419)

      // Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.beginPath()
      ctx.moveTo(30, 460)
      ctx.lineTo(370, 460)
      ctx.stroke()

      // Footer labels & values
      ctx.textAlign = 'left'
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 9px system-ui, -apple-system, sans-serif'
      ctx.fillText('BRANCH', 45, 490)
      ctx.fillText('EXPIRES', 225, 490)

      ctx.fillStyle = '#f1f5f9'
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
      const branchName = branches.find(b => b.id === selectedPassMember.branchId)?.name || 'Main Branch'
      ctx.fillText(branchName, 45, 515)
      ctx.fillText(formatDate(selectedPassMember.expiryDate), 225, 515)

      // Instructions
      ctx.textAlign = 'center'
      ctx.fillStyle = '#64748b'
      ctx.font = '10px system-ui, -apple-system, sans-serif'
      ctx.fillText('Scan at reception desk to check in/out', 200, 565)

      // Create download link
      const dataURL = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `GymPass_${selectedPassMember.name.replace(/\s+/g, '_')}.png`
      link.href = dataURL
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobURL)
    }
    qrImage.src = blobURL
  }

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
    planId: '',
    membershipType: '',
    status: 'active',
    joinDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branchId: '',
    emergencyContact: '',
    emergencyPhone: '',
    dob: '',
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
    watch,
    formState: { errors, isSubmitting },
  } = form

  const watchedPlanId = watch('planId')
  const watchedJoinDate = watch('joinDate')

  const lastPlanIdRef = useRef<string>('')
  const lastJoinDateRef = useRef<string>('')

  useEffect(() => {
    if (!isDialogOpen) return
    if (editingMember) {
      lastPlanIdRef.current = (editingMember as any).planId || ''
      lastJoinDateRef.current = editingMember.joinDate ? editingMember.joinDate.split('T')[0] : ''
    } else {
      lastPlanIdRef.current = ''
      lastJoinDateRef.current = new Date().toISOString().split('T')[0]
    }
  }, [isDialogOpen, editingMember])

  useEffect(() => {
    if (!isDialogOpen) return
    if (!watchedPlanId || !watchedJoinDate) return
    
    const hasChanged = watchedPlanId !== lastPlanIdRef.current || watchedJoinDate !== lastJoinDateRef.current
    if (!hasChanged) return

    const selectedPlan = plans.find((p: any) => p.id === watchedPlanId)
    if (!selectedPlan) return

    const baseDate = new Date(watchedJoinDate)
    if (isNaN(baseDate.getTime())) return

    if (selectedPlan.durationDays || selectedPlan.duration_days) {
      const days = selectedPlan.durationDays || selectedPlan.duration_days
      baseDate.setDate(baseDate.getDate() + days)
    } else {
      const months = selectedPlan.durationMonths || selectedPlan.duration_months || 1
      baseDate.setMonth(baseDate.getMonth() + months)
    }
    
    setValue('expiryDate', baseDate.toISOString().split('T')[0])
  }, [watchedPlanId, watchedJoinDate, plans, setValue, isDialogOpen])

  useEffect(() => {
    fetchMembers()
    fetchPlans()
    fetchBranches()
  }, [fetchMembers, fetchPlans, fetchBranches])

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
      planId: '',
      membershipType: '',
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      branchId: '',
      emergencyContact: '',
      emergencyPhone: '',
      dob: '',
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
        planId: (editingMember as any).planId || '',
        membershipType: editingMember.membershipType as any,
        status: editingMember.status as any,
        joinDate: editingMember.joinDate.split('T')[0],
        expiryDate: editingMember.expiryDate.split('T')[0],
        branchId: editingMember.branchId || '',
        emergencyContact: editingMember.emergencyContact || '',
        emergencyPhone: editingMember.emergencyPhone || '',
        dob: editingMember.dob ? editingMember.dob.split('T')[0] : '',
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

      const formattedMembers: Array<any> = jsonData.map((item: any) => {
        const planName = item.Type || item.membershipType || item.Plan || 'Basic'
        const selectedPlan = plans.find((p: any) => p.name === planName)
        const join = new Date()
        const expiry = new Date()
        
        if (selectedPlan) {
          if (selectedPlan.durationDays || selectedPlan.duration_days) {
            expiry.setDate(join.getDate() + (selectedPlan.durationDays || selectedPlan.duration_days))
          } else {
            expiry.setMonth(join.getMonth() + (selectedPlan.durationMonths || selectedPlan.duration_months || 1))
          }
        } else {
          expiry.setDate(join.getDate() + 30) // Fallback 30 days
        }

        return {
          name: item.Name || item.name || '',
          email: item.Email || item.email || '',
          phone: String(item.Phone || item.phone || ''),
          planId: selectedPlan?.id || null,
          membershipType: planName,
          status: 'active',
          joinDate: join.toISOString().split('T')[0],
          expiryDate: expiry.toISOString().split('T')[0],
          dob: item.DOB || item.dob || item['Date of Birth'] || item['date of birth'] || '',
        }
      })

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
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4" />
                        Add New Member
                      </Button>
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
                          <Label htmlFor="planId">Select Membership Plan</Label>
                          <select
                            id="planId"
                            {...register('planId')}
                            className="w-full h-10 px-3 rounded-md border border-input text-sm bg-background"
                          >
                            <option value="">Select a plan</option>
                            {plans && plans.length > 0 ? (
                              plans.map((plan: any) => (
                                <option key={plan.id} value={plan.id}>
                                  {plan.name} - ₹{plan.price.toFixed(2)} ({plan.durationMonths ? `${plan.durationMonths} months` : `${plan.durationDays} days`})
                                </option>
                              ))
                            ) : (
                              <option disabled value="">No plans available</option>
                            )}
                          </select>
                          {errors.planId && <p className="text-xs text-red-500">{errors.planId.message}</p>}
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
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            type="date"
                            {...register('dob')}
                            className={errors.dob ? 'border-red-500' : ''}
                          />
                          {errors.dob && <p className="text-xs text-red-500">{errors.dob.message}</p>}
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

        {selectedMembers.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-primary/5 border border-primary/10 backdrop-blur-md rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold">
                {selectedMembers.length} Selected
              </Badge>
              <span className="text-sm font-semibold text-slate-700">
                members selected for updates & broadcast messaging
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/95 text-white"
                onClick={() => setIsMessageDialogOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                Send Messages
              </Button>
            </div>
          </div>
        )}

        {/* Members Table */}
        <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all members"
                        checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                    </TableHead>
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
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Plus className="h-4 w-4 animate-spin" />
                          Synchronizing member database...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No members found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="w-12 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select member ${member.name}`}
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => handleSelectMember(member.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{member.name}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-2.5 w-2.5 text-primary" />
                              {branches.find(b => b.id === member.branchId)?.name || 'Default Branch'}
                            </span>
                            {member.dob && (
                              <span className="text-xs text-slate-500 mt-0.5">
                                DOB: {formatDate(member.dob)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getMembershipColor((member as any).planId ? plans.find((p: any) => p.id === (member as any).planId)?.name : member.membershipType)}>
                            {(member as any).planId 
                              ? plans.find((p: any) => p.id === (member as any).planId)?.name 
                              : (member.membershipType || 'N/A')}
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
                                <DropdownMenuItem className="gap-2" onClick={() => handleViewPass(member)}>
                                  <QrCode className="h-4 w-4 text-primary" /> View Pass / QR Code
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

        {/* Member Pass Dialog */}
        <Dialog open={isPassModalOpen} onOpenChange={setIsPassModalOpen}>
          <DialogContent className="sm:max-w-[420px] bg-slate-950 border-slate-800 text-white overflow-hidden p-0 rounded-2xl shadow-2xl">
            {/* Card Body */}
            <div className="relative p-6 space-y-6 flex flex-col items-center">
              {/* Elegant Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-emerald-950/20 z-0" />
              <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-3xl z-0 animate-pulse" />
              <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-3xl z-0 animate-pulse" style={{ animationDelay: '1s' }} />

              <div className="relative z-10 w-full flex flex-col items-center text-center space-y-4">
                {/* Gym Branding */}
                <div className="flex items-center gap-2 border-b border-white/10 pb-4 w-full justify-center">
                  <Shield className="h-6 w-6 text-primary fill-primary/10 animate-bounce" />
                  <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
                    GYMFLOW PASS
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-2xl shadow-2xl border-4 border-slate-800/80 hover:scale-105 transition-transform duration-300">
                  {selectedPassMember && (
                    <QRCodeSVG
                      id="member-qr-code"
                      value={selectedPassMember.id}
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  )}
                </div>

                {/* Member Details */}
                <div className="space-y-1.5 w-full mt-2">
                  <h3 className="text-2xl font-bold tracking-tight text-white">{selectedPassMember?.name}</h3>
                  <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">ID: {selectedPassMember?.id}</p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge variant="outline" className="border-indigo-500/50 text-indigo-300 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold uppercase">
                      {selectedPassMember?.membershipType}
                    </Badge>
                    <Badge className={`px-2 py-0.5 text-xs font-semibold uppercase border-none ${selectedPassMember?.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      {selectedPassMember?.status}
                    </Badge>
                  </div>
                </div>

                {/* Expiry and Gym Location */}
                <div className="grid grid-cols-2 gap-4 w-full bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10 text-left text-xs mt-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Branch</span>
                    <span className="font-semibold text-slate-200">
                      {branches.find(b => b.id === selectedPassMember?.branchId)?.name || 'Main Branch'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Expires</span>
                    <span className="font-semibold text-slate-200">
                      {selectedPassMember ? formatDate(selectedPassMember.expiryDate) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <DialogFooter className="bg-slate-950/80 backdrop-blur-md p-4 border-t border-slate-800/80 flex sm:flex-row gap-2 w-full justify-between items-center z-10 relative">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-900 hover:bg-slate-900 hover:text-white border-white/10 text-slate-300 gap-2 flex-1"
                onClick={handlePrintPass}
              >
                <Printer className="h-4 w-4" /> Print Pass
              </Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white gap-2 flex-1"
                onClick={handleDownloadPass}
              >
                <Download className="h-4 w-4" /> Download Pass
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Send Message Dialog */}
        <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Send Update Message
              </DialogTitle>
              <DialogDescription>
                Compose a message to send to the {selectedMembers.length} selected members.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendMessage} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="msgChannel">Message Channel / Type</Label>
                <select
                  id="msgChannel"
                  value={messageChannel}
                  onChange={(e) => setMessageChannel(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input text-sm bg-background"
                >
                  <option value="email">📧 Email Notification</option>
                  <option value="sms">💬 SMS Text Message</option>
                  <option value="whatsapp">🟢 WhatsApp Broadcast</option>
                  <option value="in-app">📱 In-App System Alert</option>
                </select>
              </div>

              {messageChannel === 'email' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label htmlFor="msgSubject">Email Subject *</Label>
                  <Input
                    id="msgSubject"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="e.g. Schedule Update, Gym Announcement"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="msgContent">Message Content *</Label>
                <textarea
                  id="msgContent"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={5}
                  placeholder="Type your message details here..."
                  className="w-full p-3 rounded-md border border-input text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              {msgSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 animate-bounce" />
                  {msgSuccessMessage}
                </div>
              )}

              {msgErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  {msgErrorMessage}
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsMessageDialogOpen(false)}
                  disabled={isSendingMessage}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gap-2" disabled={isSendingMessage}>
                  {isSendingMessage ? 'Sending...' : 'Send Updates'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  )
}
