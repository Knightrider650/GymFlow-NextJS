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
import { useClasses, useStaff } from '@/hooks'
import { Plus, Edit2, Trash2, Clock, Users, User, Calendar, MapPin } from 'lucide-react'

export default function ClassesPage() {
  const { classes, isLoading, fetchClasses, createClass, updateClass, deleteClass } = useClasses()
  const { staff, fetchStaff } = useStaff()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    instructorName: '',
    maxCapacity: '',
    description: '',
    time: '10:00 AM',
    days: 'Mon, Wed, Fri'
  })

  useEffect(() => {
    fetchClasses()
    fetchStaff()
  }, [])

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault()
    await createClass({
      ...formData,
      maxCapacity: parseInt(formData.maxCapacity) || 0,
      currentEnrollment: 0
    })
    setIsAddDialogOpen(false)
    setFormData({ name: '', instructorName: '', maxCapacity: '', description: '', time: '10:00 AM', days: 'Mon, Wed, Fri' })
    fetchClasses()
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Class Scheduling</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize fitness sessions and monitor enrollment capacity
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-fit shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                <Plus className="h-4 w-4" />
                Add New Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-slate-50 -m-6 mb-0 p-6 border-b border-slate-100">
                <DialogTitle className="text-xl">Create Fitness Session</DialogTitle>
                <DialogDescription>
                  Define a new class schedule and assign a specialized instructor.
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
                      value={formData.instructorName}
                      onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">Select Instructor</option>
                      {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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
                    <Input 
                      id="time" 
                      type="text" 
                      placeholder="9:00 AM" 
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="days">Active Days</Label>
                    <Input 
                      id="days" 
                      type="text" 
                      placeholder="Mon - Fri" 
                      value={formData.days}
                      onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                    />
                  </div>
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
                  <Button type="submit" className="w-full font-bold h-11 text-lg">Save Class Schedule</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classes Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-white/50">
              <Calendar className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-xl font-semibold text-slate-500">
                {isLoading ? 'Synchronizing schedule data...' : 'No active sessions scheduled.'}
              </p>
              <p className="text-slate-400 mt-1">Start by adding your first gym class above.</p>
            </div>
          ) : (
            classes.map((fitnessClass) => {
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
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-slate-400 hover:text-primary"
                          onClick={() => {
                            setFormData({
                              name: fitnessClass.name,
                              instructorName: fitnessClass.instructorName || '',
                              maxCapacity: fitnessClass.maxCapacity.toString(),
                              description: fitnessClass.description || '',
                              time: fitnessClass.time || '10:00 AM',
                              days: fitnessClass.days || 'Mon, Wed, Fri'
                            })
                            setIsAddDialogOpen(true)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteClass(fitnessClass.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            enrollmentPercent > 90 ? 'bg-red-500' : 'bg-primary'
                          }`}
                          style={{ width: `${enrollmentPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                       <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 italic italic-muted">
                        &quot;{fitnessClass.description || 'Join our elite training session designed for all skill levels.'}&quot;
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">{fitnessClass.days || 'Weekdays'}</Badge>
                      <Badge className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-none font-bold">Standard Session</Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </ProtectedLayout>
  )
}
