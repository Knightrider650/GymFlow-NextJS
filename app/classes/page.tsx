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
import { useClasses, useStaff, useBranches, useMembers } from '@/hooks'
import { Plus, Edit2, Trash2, Clock, Users, User, Calendar, MapPin, CheckCircle2, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/store'
import { apiClient } from '@/lib/api-client'

export default function ClassesPage() {
  const { classes, isLoading, fetchClasses, createClass, updateClass, deleteClass } = useClasses()
  const { staff, fetchStaff } = useStaff()
  const { branches, fetchBranches } = useBranches()
  const { members, fetchMembers } = useMembers()
  const user = useAuthStore((state: any) => state.user)
  const userRole = user?.role || 'staff'
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: '',
    instructorName: '',
    instructorId: '',
    maxCapacity: '',
    description: '',
    time: '10:00 AM',
    days: 'Mon, Wed, Fri',
    branchId: '',
  })

  const timePresets = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '06:30 PM', '07:00 PM', '08:00 PM'
  ]

  const daysPresets = [
    'Mon, Wed, Fri',
    'Tue, Thu',
    'Mon, Tue, Wed, Thu, Fri',
    'Sat, Sun',
    'Mon, Tue, Wed, Thu, Fri, Sat, Sun'
  ]

  const isPresetDays = daysPresets.includes(formData.days)
  const isPresetTime = timePresets.includes(formData.time)

  useEffect(() => {
    fetchClasses()
    fetchStaff()
    fetchBranches()
    fetchMembers()
  }, [fetchClasses, fetchStaff, fetchBranches, fetchMembers])

  useEffect(() => {
    const canFetchUsers = ['admin', 'ceo', 'cto', 'owner', 'manager'].includes(userRole)
    if (!canFetchUsers) return

    const loadUsers = async () => {
      try {
        const res = await apiClient.get('/api/users')
        if (res.success && res.data) {
          setUsers(res.data)
        }
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }
    loadUsers()
  }, [userRole])

  const activeTrainers = staff.filter(
    (s) => s.status === 'active' && s.position?.toLowerCase() === 'trainer'
  )

  const canAddClass = ['admin', 'ceo', 'cto', 'owner', 'manager'].includes(userRole)
  const canEditDeleteClass = ['admin', 'ceo', 'cto', 'owner', 'manager'].includes(userRole)
  const canEnrollMember = ['admin', 'ceo', 'cto', 'owner', 'manager', 'staff'].includes(userRole)

  const getSelectedStaffId = () => {
    if (formData.instructorId) {
      const matchingUser = users.find(u => u.id === formData.instructorId)
      if (matchingUser) {
        const matchingStaff = activeTrainers.find(s => s.email === matchingUser.email)
        if (matchingStaff) return matchingStaff.id
      }
    }
    if (formData.instructorName) {
      const matchingStaff = activeTrainers.find(s => s.name === formData.instructorName)
      if (matchingStaff) return matchingStaff.id
    }
    return ''
  }

  const filteredClasses = selectedBranch === 'all'
    ? classes
    : classes.filter(c => c.branchId === selectedBranch)

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const capacity = parseInt(formData.maxCapacity) || 0
    if (editingClassId) {
      await updateClass(editingClassId, {
        ...formData,
        maxCapacity: capacity,
      })
    } else {
      await createClass({
        ...formData,
        maxCapacity: capacity,
        currentEnrollment: 0
      })
    }
    setIsAddDialogOpen(false)
    setEditingClassId(null)
    setFormData({ name: '', instructorName: '', instructorId: '', maxCapacity: '', description: '', time: '10:00 AM', days: 'Mon, Wed, Fri', branchId: '' })
    fetchClasses()
  }

  const handleBookMember = async () => {
    if (!selectedClassId || !selectedMemberId) return
    
    try {
      const response = await fetch('/api/classes/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          memberId: selectedMemberId
        })
      })
      
      if (response.ok) {
        setIsBookDialogOpen(false)
        setSelectedMemberId('')
        fetchClasses()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to book member')
      }
    } catch (err) {
      console.error('Booking error:', err)
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Classes & Booking
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage class schedules, trainers, enrollment capacity, and member bookings
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
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
            {canAddClass && (
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open)
                if (!open) {
                  setEditingClassId(null)
                  setFormData({ name: '', instructorName: '', instructorId: '', maxCapacity: '', description: '', time: '10:00 AM', days: 'Mon, Wed, Fri', branchId: '' })
                }
              }}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingClassId(null)
                    setFormData({ name: '', instructorName: '', instructorId: '', maxCapacity: '', description: '', time: '10:00 AM', days: 'Mon, Wed, Fri', branchId: '' })
                  }}
                  className="gap-2 w-fit shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Add New Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto border-none shadow-2xl">
                <DialogHeader className="bg-slate-50 -m-6 mb-0 p-6 border-b border-slate-100">
                  <DialogTitle className="text-xl">{editingClassId ? 'Edit Fitness Session' : 'Create Fitness Session'}</DialogTitle>
                  <DialogDescription>
                    {editingClassId ? 'Modify the class parameters and assigned instructor.' : 'Define a new class schedule and assign a specialized instructor.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddClass} className="space-y-4 py-8 px-1">
                  <div className="space-y-2">
                    <Label htmlFor="name">Class Name *</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Morning Strength & Conditioning" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required 
                      className="focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instructor">Lead Instructor</Label>
                      <select
                        id="instructor"
                        aria-label="Lead instructor"
                        value={getSelectedStaffId()}
                        onChange={(e) => {
                          const staffId = e.target.value
                          if (!staffId) {
                            setFormData({ ...formData, instructorName: '', instructorId: '' })
                            return
                          }
                          const selectedStaff = activeTrainers.find(s => s.id === staffId)
                          if (selectedStaff) {
                            const matchingUser = users.find(u => u.email === selectedStaff.email && u.role === 'trainer')
                            setFormData({
                              ...formData,
                              instructorName: selectedStaff.name,
                              instructorId: matchingUser ? matchingUser.id : ''
                            })
                          }
                        }}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        <option value="">None / Unassigned</option>
                        {activeTrainers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Max Capacity *</Label>
                    <Input 
                      id="capacity" 
                      type="number" 
                      placeholder="20" 
                      value={formData.maxCapacity}
                      onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                      required 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time</Label>
                    <Select
                      value={isPresetTime ? formData.time : "custom"}
                      onValueChange={(val) => {
                        if (val === "custom") {
                          setFormData({ ...formData, time: formData.time || "09:00 AM" })
                        } else {
                          setFormData({ ...formData, time: val })
                        }
                      }}
                    >
                      <SelectTrigger id="time">
                        <SelectValue placeholder="Select session time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timePresets.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Time...</SelectItem>
                      </SelectContent>
                    </Select>
                    {!isPresetTime && (
                      <Input
                        type="text"
                        placeholder="e.g. 09:15 AM"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="days">Active Days</Label>
                    <Select
                      value={isPresetDays ? formData.days : "custom"}
                      onValueChange={(val) => {
                        if (val === "custom") {
                          setFormData({ ...formData, days: "Mon" })
                        } else {
                          setFormData({ ...formData, days: val })
                        }
                      }}
                    >
                      <SelectTrigger id="days">
                        <SelectValue placeholder="Select active days" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mon, Wed, Fri">Mon, Wed, Fri</SelectItem>
                        <SelectItem value="Tue, Thu">Tue, Thu</SelectItem>
                        <SelectItem value="Mon, Tue, Wed, Thu, Fri">Mon - Fri (Weekdays)</SelectItem>
                        <SelectItem value="Sat, Sun">Sat, Sun (Weekends)</SelectItem>
                        <SelectItem value="Mon, Tue, Wed, Thu, Fri, Sat, Sun">Everyday (Mon - Sun)</SelectItem>
                        <SelectItem value="custom">Custom Selection...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!isPresetDays && (
                  <div className="space-y-2">
                    <Label>Select Days</Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-slate-100/50">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                        const currentDaysList = formData.days.split(',').map(d => d.trim()).filter(Boolean)
                        const active = currentDaysList.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              let newDays: string[]
                              if (active) {
                                newDays = currentDaysList.filter(d => d !== day)
                              } else {
                                const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                                newDays = [...currentDaysList, day].sort((a, b) => order.indexOf(a) - order.indexOf(b))
                              }
                              setFormData({ ...formData, days: newDays.join(', ') })
                            }}
                            className={`h-8 px-3 text-xs font-semibold rounded-full border transition-all duration-200 ${
                              active 
                                ? 'bg-primary border-primary text-white shadow-sm shadow-primary/20 scale-105' 
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="branch">Target Branch *</Label>
                  <Select 
                    value={formData.branchId} 
                    onValueChange={(val) => setFormData({ ...formData, branchId: val })}
                    required
                  >
                    <SelectTrigger id="branch">
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
                <div className="space-y-2">
                  <Label htmlFor="desc">Program Description</Label>
                  <Input 
                    id="desc" 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief overview of class goals..." 
                  />
                </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full font-bold h-11 text-lg">{editingClassId ? 'Save Changes' : 'Save Class Schedule'}</Button>
                  </DialogFooter>
               </form>
             </DialogContent>
           </Dialog>
           )}
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-white/50">
              <Calendar className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-xl font-semibold text-slate-500">
                {isLoading
                  ? 'Synchronizing schedule data...'
                  : userRole === 'trainer'
                  ? 'No assigned sessions.'
                  : 'No active sessions scheduled.'}
              </p>
              <p className="text-slate-400 mt-1">
                {isLoading
                  ? ''
                  : userRole === 'trainer'
                  ? 'You do not have any assigned fitness sessions at this time.'
                  : 'Start by adding your first gym class above.'}
              </p>
            </div>
          ) : (
            filteredClasses.map((fitnessClass) => {
              const enrollmentPercent = Math.min(100, (fitnessClass.currentEnrollment / (fitnessClass.maxCapacity || 1)) * 100)
              
              return (
                <Card key={fitnessClass.id} className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="bg-muted/30 pb-3 border-b border-white/5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">{fitnessClass.name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <User className="h-3 w-3 text-primary" />
                          <span>Led by {fitnessClass.instructorName || 'Expert Trainer'}</span>
                        </div>
                      </div>
                      {canEditDeleteClass && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-slate-400 hover:text-primary"
                            onClick={() => {
                              setFormData({
                                name: fitnessClass.name,
                                instructorName: fitnessClass.instructorName || '',
                                instructorId: fitnessClass.instructorId || '',
                                maxCapacity: fitnessClass.maxCapacity.toString(),
                                description: fitnessClass.description || '',
                                time: fitnessClass.time || '10:00 AM',
                                days: fitnessClass.days || 'Mon, Wed, Fri',
                                branchId: fitnessClass.branchId || ''
                              })
                              setEditingClassId(fitnessClass.id)
                              setIsAddDialogOpen(true)
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteClass(fitnessClass.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>{fitnessClass.time || 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold justify-end">
                        <MapPin className="h-4 w-4 text-indigo-500" />
                        <span className="text-muted-foreground truncate">Main Studio</span>
                      </div>
                    </div>
 
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span>Enrollment Density</span>
                        <span className={enrollmentPercent > 90 ? 'text-red-500' : 'text-primary'}>
                          {fitnessClass.currentEnrollment}/{fitnessClass.maxCapacity} Seats
                        </span>
                      </div>
                      <svg className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
                        <rect x="0" y="0" width={Math.min(enrollmentPercent, 100)} height="8" rx="4" fill={enrollmentPercent > 90 ? '#ef4444' : '#3b82f6'} />
                      </svg>
                    </div>
 
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">{fitnessClass.days || 'Weekdays'}</Badge>
                      <Badge className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-none font-bold">
                        {branches.find(b => b.id === fitnessClass.branchId)?.name || 'Main Branch'}
                      </Badge>
                    </div>
 
                    {canEnrollMember && (
                      <div className="pt-4 border-t border-white/10">
                        <Button 
                          className="w-full gap-2 font-bold" 
                          variant={fitnessClass.currentEnrollment >= fitnessClass.maxCapacity ? 'secondary' : 'default'}
                          disabled={fitnessClass.currentEnrollment >= fitnessClass.maxCapacity}
                          onClick={() => {
                            setSelectedClassId(fitnessClass.id)
                            setIsBookDialogOpen(true)
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {fitnessClass.currentEnrollment >= fitnessClass.maxCapacity ? 'Fully Booked' : 'Enroll Member'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Enrollment Dialog */}
        <Dialog open={isBookDialogOpen} onOpenChange={setIsBookDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Member in Session</DialogTitle>
              <DialogDescription>
                Select a member to add to the &quot;{classes.find(c => c.id === selectedClassId)?.name}&quot; class.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="member-select">Select Member</Label>
                <select
                  id="member-select"
                  aria-label="Select member"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleBookMember} className="w-full font-bold">Confirm Enrollment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  )
}
