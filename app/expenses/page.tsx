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
import { Plus, Search, Edit2, Trash2, Wallet, DollarSign, Calendar, TrendingDown, ArrowUpRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useGymStore } from '@/lib/store'
import { format } from 'date-fns'
import { formatCurrency } from '@/utils/format'

const expenseSchema = z.object({
  amount: z.preprocess((val) => Number(val), z.number().positive('Amount must be a positive number')),
  category: z.enum(['Rent', 'Salaries', 'Utilities', 'Inventory', 'Marketing', 'Other']),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

export default function ExpensesPage() {
  const fetchExpenses = useGymStore((state) => state.fetchExpenses)
  const expenses = useGymStore((state) => state.expenses) || []
  const createExpense = useGymStore((state) => state.createExpense)
  const updateExpense = useGymStore((state) => state.updateExpense)
  const deleteExpense = useGymStore((state) => state.deleteExpense)
  const expensesLoading = useGymStore((state) => state.expensesLoading)
  const stats = useGymStore((state) => state.stats)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      category: 'Other',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = form

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const onOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setTimeout(() => {
        reset()
        setEditingId(null)
      }, 200)
    }
  }

  const handleEdit = (expense: any) => {
    setEditingId(expense.id)
    setValue('amount', expense.amount)
    setValue('category', expense.category)
    setValue('description', expense.description || '')
    setValue('date', format(new Date(expense.date), 'yyyy-MM-dd'))
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      if (editingId) {
        await updateExpense(editingId, data)
      } else {
        await createExpense(data)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error(error)
    }
  }

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          exp.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Calculate totals
  const totalMonthlyExpenses = expenses.reduce((sum, exp) => {
    const expDate = new Date(exp.date)
    const isCurrentMonth = expDate.getMonth() === new Date().getMonth() && 
                           expDate.getFullYear() === new Date().getFullYear()
    return isCurrentMonth ? sum + exp.amount : sum
  }, 0)

  const todayExpenses = expenses.reduce((sum, exp) => {
    const expDate = new Date(exp.date)
    const isToday = expDate.getDate() === new Date().getDate() && 
                    expDate.getMonth() === new Date().getMonth() &&
                    expDate.getFullYear() === new Date().getFullYear()
    return isToday ? sum + exp.amount : sum
  }, 0)

  // Category breakdown for monthly expenses
  const categoryTotals = expenses.reduce((acc: Record<string, number>, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {})

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Expense Ledger</h1>
            <p className="text-sm text-muted-foreground mt-1">Log and track gym operational expenditures</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Log Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Expense' : 'Log New Expense'}</DialogTitle>
                <DialogDescription>
                  Enter details to register a business expense.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (INR) *</Label>
                  <Input id="amount" type="number" step="0.01" {...register('amount')} />
                  {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <select id="category" {...register('category')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="Rent">Rent</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Expense Date *</Label>
                  <Input id="date" type="date" {...register('date')} />
                  {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description / Notes</Label>
                  <Input id="description" {...register('description')} placeholder="e.g. Electricity bill May 2026" />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (editingId ? 'Update Expense' : 'Save Expense')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-md bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMonthlyExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total logged this month</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Expenses</CardTitle>
              <Wallet className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">Logged today</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit (Monthly)</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency((stats?.monthlyRevenue || 0) - totalMonthlyExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue ({formatCurrency(stats?.monthlyRevenue || 0)}) - Expenses
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {Object.keys(categoryTotals).length > 0 
                  ? Object.entries(categoryTotals).sort((a,b) => b[1] - a[1])[0][0]
                  : 'None'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Highest source of expense</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and List */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-10 h-11"
                placeholder="Search description or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {['All', 'Rent', 'Salaries', 'Utilities', 'Inventory', 'Marketing', 'Other'].map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                  className="px-4"
                  size="sm"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Category</TableHead>
                      <TableHead className="font-bold">Description</TableHead>
                      <TableHead className="font-bold">Amount</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading expenses...
                        </TableCell>
                      </TableRow>
                    ) : filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No expenses found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(exp.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              exp.category === 'Rent' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              exp.category === 'Salaries' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                              exp.category === 'Utilities' ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' :
                              exp.category === 'Inventory' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                              exp.category === 'Marketing' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                              'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            }>
                              {exp.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[300px] truncate">
                            {exp.description || '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-red-400">
                            {formatCurrency(exp.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}>
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { if(confirm('Delete expense?')) deleteExpense(exp.id) }}>
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
        </div>
      </div>
    </ProtectedLayout>
  )
}
