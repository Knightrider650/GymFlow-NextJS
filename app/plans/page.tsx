'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore, useGymStore } from '@/lib/store'
import { formatCurrency } from '@/utils/format'
import { UserRole } from '@/lib/permissions'

const planSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  durationMonths: z.coerce.number().min(1, 'Duration must be at least 1 month'),
  features: z.string().optional(),
})

type PlanFormValues = z.infer<typeof planSchema>

export default function PlansPage() {
  const fetchPlans = useGymStore(state => state.fetchPlans)
  const plans = useGymStore(state => state.plans) || []
  const createPlan = useGymStore(state => state.createPlan)
  const updatePlan = useGymStore(state => state.updatePlan)
  const deletePlan = useGymStore(state => state.deletePlan)
  const settings = useGymStore(state => state.settings)
  const fetchSettings = useGymStore(state => state.fetchSettings)
  const plansLoading = useGymStore(state => state.plansLoading)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      price: 0,
      durationMonths: 1,
      features: '',
    },
  })

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = form

  useEffect(() => {
    fetchPlans()
    fetchSettings()
  }, [fetchPlans, fetchSettings])

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setTimeout(() => {
        reset()
        setEditingId(null)
      }, 200)
    }
  }

  const handleEdit = (plan: any) => {
    setEditingId(plan.id)
    setValue('name', plan.name)
    setValue('price', plan.price)
    setValue('durationMonths', plan.durationMonths || plan.duration_months)
    setValue('features', plan.features || '')
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: PlanFormValues) => {
    try {
      if (editingId) {
        await updatePlan(editingId, data)
      } else {
        await createPlan(data)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error(error)
    }
  }

  const actorRole = useAuthStore(s => s.user?.role) as UserRole
  const canManagePlans = ['cto', 'ceo', 'admin', 'manager'].includes(actorRole)

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Membership Plans</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure pricing tiers and durations</p>
          </div>

        {canManagePlans && (
          <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Configure plan cost and active length.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Title</Label>
                  <Input id="name" {...register('name')} className="bg-slate-800 border-slate-700" />
                  {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input id="price" type="number" step="0.01" {...register('price')} className="bg-slate-800 border-slate-700" />
                    {errors.price && <p className="text-xs text-red-400">{errors.price.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMonths">Duration (Months)</Label>
                    <Input id="durationMonths" type="number" {...register('durationMonths')} className="bg-slate-800 border-slate-700" />
                    {errors.durationMonths && <p className="text-xs text-red-400">{errors.durationMonths.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Features (comma separated)</Label>
                  <Input id="features" {...register('features')} className="bg-slate-800 border-slate-700" />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (editingId ? 'Update Plan' : 'Save Plan')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          <div className="rounded-md border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-800/50">
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="font-semibold text-slate-300">Plan Name</TableHead>
                  <TableHead className="font-semibold text-slate-300">Duration</TableHead>
                  <TableHead className="font-semibold text-slate-300">Price</TableHead>
                  <TableHead className="font-semibold text-slate-300">Features</TableHead>
                  {canManagePlans && <TableHead className="text-right font-semibold text-slate-300">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plansLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      Loading plans...
                    </TableCell>
                  </TableRow>
                ) : plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No plans found. Create a new plan to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-primary">
                        {plan.name}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {plan.durationMonths || plan.duration_months} Months
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(plan.price, settings?.currency)}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">
                        {plan.features || '-'}
                      </TableCell>
                      {canManagePlans && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                              <Edit2 className="h-4 w-4 text-slate-400 hover:text-white" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { if(confirm('Delete plan?')) deletePlan(plan.id) }}>
                              <Trash2 className="h-4 w-4 text-red-400 hover:text-red-300" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    </ProtectedLayout>
  )
}
