import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Branch } from '@/types'
import { Plus, Trash2, MapPin, Phone, Mail, Clock, Users } from 'lucide-react'
import { useGymStore } from '@/lib/store'

export function BranchSettings() {
  const { branches, fetchBranches, addBranch, updateBranch, deleteBranch } = useGymStore()
  const [isAdding, setIsAdding] = React.useState(false)

  React.useEffect(() => {
    fetchBranches()
  }, [])

  const handleAdd = () => {
    addBranch({
      name: 'New Branch',
      address: '',
      phone: '',
      email: '',
      openingTime: '06:00',
      closingTime: '22:00',
      capacity: 50,
      isDefault: branches.length === 0
    })
    setIsAdding(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Gym Locations</h2>
          <p className="text-sm text-muted-foreground">Manage your gym branches and their operating details</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {branches.map((branch) => (
          <Card key={branch.id} className="overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{branch.name}</CardTitle>
                  {branch.isDefault && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Default</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteBranch(branch.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                   <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {branch.address || 'No address set'}
                   </div>
                   <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {branch.phone || 'No phone set'}
                   </div>
                   <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {branch.email || 'No email set'}
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-3 text-sm font-medium">
                      <Clock className="h-4 w-4 text-primary" />
                      {branch.openingTime} - {branch.closingTime}
                   </div>
                   <div className="flex items-center gap-3 text-sm font-medium">
                      <Users className="h-4 w-4 text-primary" />
                      Capacity: {branch.capacity} Members
                   </div>
                </div>
                <div className="flex items-end justify-end">
                   <Button variant="outline" size="sm">Edit Details</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
