import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Branch } from '@/types'
import { Plus, Trash2, MapPin, Phone, Mail, Clock, Users, Edit3, X, Check, Save } from 'lucide-react'
import { useGymStore } from '@/lib/store'

export function BranchSettings() {
  const { branches, fetchBranches, addBranch, updateBranch, deleteBranch } = useGymStore()
  const [activeBranch, setActiveBranch] = React.useState<Branch | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [formData, setFormData] = React.useState<Partial<Branch>>({})

  React.useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const handleEditClick = (branch: Branch) => {
    setActiveBranch(branch)
    setFormData(branch)
    setIsEditing(true)
    setIsCreating(false)
  }

  const handleCreateClick = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      openingTime: '06:00',
      closingTime: '22:00',
      capacity: 50,
      isDefault: branches.length === 0
    })
    setIsCreating(true)
    setIsEditing(false)
  }

  const handleClose = () => {
    setIsEditing(false)
    setIsCreating(false)
    setActiveBranch(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isCreating) {
        await addBranch(formData as Omit<Branch, 'id'>)
      } else if (isEditing && activeBranch) {
        await updateBranch(activeBranch.id, formData)
      }
      await fetchBranches()
      handleClose()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMakeDefault = async (branch: Branch) => {
    try {
      await updateBranch(branch.id, { ...branch, isDefault: true })
      await fetchBranches()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Gym Branches & Locations</h2>
          <p className="text-sm text-muted-foreground">Manage your multi-location branches, schedules, and defaults.</p>
        </div>
        <Button onClick={handleCreateClick} className="gap-2 font-semibold shadow-md shadow-primary/10 hover:scale-105 active:scale-95 transition-transform">
          <Plus className="h-4 w-4" />
          Add New Branch
        </Button>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.map((branch) => (
          <Card key={branch.id} className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-md flex flex-col justify-between">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">{branch.name}</CardTitle>
                    {branch.isDefault ? (
                      <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-900/30">
                        Default
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleMakeDefault(branch)}
                        className="text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 px-2 py-0.5 rounded-full border border-dashed hover:border-solid border-slate-200 transition-colors"
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">ID: {branch.id.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400" onClick={() => handleEditClick(branch)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  {!branch.isDefault && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteBranch(branch.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 flex-grow">
              <div className="space-y-2.5">
                 <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{branch.address || 'No address set'}</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <span>{branch.phone || 'No phone set'}</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{branch.email || 'No email set'}</span>
                 </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">Hours of Operation</span>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                       <Clock className="h-3.5 w-3.5 text-indigo-500" />
                       {branch.openingTime} - {branch.closingTime}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">Max Capacity</span>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                       <Users className="h-3.5 w-3.5 text-indigo-500" />
                       {branch.capacity} active slots
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Slideout Form Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-slate-150 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">
                  {isCreating ? 'Add Location Branch' : `Edit Branch: ${activeBranch?.name}`}
                </h3>
                <p className="text-xs text-muted-foreground">Configure working hours and physical presence metadata.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">Branch Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name || ''} 
                  onChange={handleChange} 
                  required 
                  placeholder="e.g. Downtown Center"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openingTime" className="font-semibold">Opening Time *</Label>
                  <Input 
                    id="openingTime" 
                    name="openingTime" 
                    type="time"
                    value={formData.openingTime || '06:00'} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closingTime" className="font-semibold">Closing Time *</Label>
                  <Input 
                    id="closingTime" 
                    name="closingTime" 
                    type="time"
                    value={formData.closingTime || '22:00'} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="font-semibold">Maximum Capacity *</Label>
                  <Input 
                    id="capacity" 
                    name="capacity" 
                    type="number"
                    value={formData.capacity || 50} 
                    onChange={handleChange} 
                    required 
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-semibold">Branch Phone</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={formData.phone || ''} 
                    onChange={handleChange} 
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">Branch Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email"
                  value={formData.email || ''} 
                  onChange={handleChange} 
                  placeholder="branch@gymflow.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="font-semibold">Address *</Label>
                <Input 
                  id="address" 
                  name="address" 
                  value={formData.address || ''} 
                  onChange={handleChange} 
                  required 
                  placeholder="e.g. 456 Broadway St, Ste A"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={!!formData.isDefault}
                  onChange={handleChange}
                  aria-label="Mark as default branch"
                  className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary"
                />
                <Label htmlFor="isDefault" className="font-semibold cursor-pointer">
                  Mark as Default Branch (Default for new users & members)
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2 font-bold shadow-lg shadow-primary/20">
                  <Save className="h-4 w-4" />
                  {isCreating ? 'Create Branch' : 'Save Branch Details'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
