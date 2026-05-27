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
import { useBilling, useMembers, usePlans, useSettings } from '@/hooks'
import { formatCurrency, formatDate, getStatusBadgeColor } from '@/utils/format'
import { Plus, DollarSign, Search, CreditCard, Receipt, Clock, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { UserRole } from '@/lib/permissions'

export default function BillingPage() {
  const { invoices, isLoading, fetchInvoices, createInvoice, recordPayment } = useBilling()
  const { members, fetchMembers } = useMembers()
  const { plans, fetchPlans } = usePlans()
  const { settings, fetchSettings } = useSettings()
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm)
  )

  const [invoiceForm, setInvoiceForm] = useState({
    memberId: '',
    amount: '',
    description: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash' as const,
  })

  useEffect(() => {
    fetchInvoices()
    fetchMembers()
    fetchPlans()
    fetchSettings()
  }, [fetchInvoices, fetchMembers, fetchPlans, fetchSettings])

  // Auto-fill amount when member is selected
  const handleMemberSelect = (memberId: string) => {
    setInvoiceForm(prev => ({ ...prev, memberId }))
    const member = members.find(m => m.id === memberId)
    if (member && member.membershipType) {
      const memberType = member.membershipType.toLowerCase()
      // Exact match first, then fuzzy (contains) match
      const plan = plans.find((p: any) => p.name.toLowerCase() === memberType)
        || plans.find((p: any) => p.name.toLowerCase().includes(memberType) || memberType.includes(p.name.toLowerCase()))
      if (plan) {
        setInvoiceForm(prev => ({
          ...prev,
          memberId,
          amount: plan.price.toString(),
          description: `${plan.name} - Membership Fee`,
        }))
      }
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Attempting to create invoice:', invoiceForm);
    if (!invoiceForm.memberId || !invoiceForm.amount) {
      console.warn('Missing required fields for invoice');
      return;
    }

    const selectedMember = members.find(m => m.id === invoiceForm.memberId)
    if (selectedMember) {
      console.log('Selected member found:', selectedMember);
      try {
        await createInvoice({
          invoiceNumber: `${settings?.invoicePrefix || 'INV'}-${Date.now()}`,
          memberId: invoiceForm.memberId,
          memberName: selectedMember.name,
          amount: parseFloat(invoiceForm.amount),
          subtotal: parseFloat(invoiceForm.amount),
          taxAmount: 0,
          description: invoiceForm.description || 'Membership Fee',
          status: 'pending',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: invoiceForm.dueDate,
        })
        console.log('Invoice creation dispatch triggered');
        setIsInvoiceDialogOpen(false)
        setInvoiceForm({
          memberId: '',
          amount: '',
          description: '',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
      } catch (err) {
        console.error('Error in handleCreateInvoice:', err);
      }
    } else {
      console.error('Member NOT found for ID:', invoiceForm.memberId);
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedInvoiceId && paymentForm.amount) {
      console.log(`Recording payment for invoice ${selectedInvoiceId}:`, paymentForm);
      try {
        await recordPayment(selectedInvoiceId, parseFloat(paymentForm.amount), paymentForm.method)
        console.log('Payment recording dispatch triggered');
        setIsPaymentDialogOpen(false)
        setPaymentForm({ amount: '', method: 'cash' })
        setSelectedInvoiceId('')
      } catch (err) {
        console.error('Error in handleRecordPayment:', err);
      }
    }
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const stats = {
    totalRevenue: invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0),
    taxRevenue: invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.taxAmount || 0), 0),
    monthlyRevenue: invoices
      .filter(i => {
        if (i.status !== 'paid' || !i.paymentDate) return false
        const d = new Date(i.paymentDate)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, i) => sum + i.amount, 0),
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(i => i.status === 'paid').length,
    pendingAmount: invoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.amount || 0), 0),
  }

  const actorRole = useAuthStore(s => s.user?.role) as UserRole
  const isManagerOrAdmin = ['cto', 'ceo', 'admin', 'manager'].includes(actorRole)

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Revenue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor financial health and manage member subscriptions
            </p>
          </div>
          <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-fit bg-primary shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Create New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Generate New Invoice</DialogTitle>
                <DialogDescription>
                  Issue a billing statement for a gym member.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="member">Select Member *</Label>
                  <select
                    id="member"
                    aria-label="Select member"
                    value={invoiceForm.memberId}
                    onChange={(e) => handleMemberSelect(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    required
                  >
                    <option value="">-- Choose a member --</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({settings?.currency || 'USD'}) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground select-none">
                      {settings?.currency === 'INR' ? '₹' : settings?.currency === 'EUR' ? '€' : settings?.currency === 'GBP' ? '£' : '$'}
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      className="pl-9"
                      value={invoiceForm.amount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Invoice Description</Label>
                  <Input
                    id="description"
                    value={invoiceForm.description}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                    placeholder="e.g. Premium Monthly Plan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full font-bold">Generate Invoice</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        {isManagerOrAdmin && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalRevenue, settings?.currency)}</p>
                <p className="text-xs text-green-600/70 mt-1">Successfully processed</p>
              </CardContent>
            </Card>
 
            <Card className="border-none shadow-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(stats.pendingAmount, settings?.currency)}</p>
                <p className="text-xs text-amber-600/70 mt-1">Pending verification</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Invoices</CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                <p className="text-xs text-muted-foreground mt-1 text-balance overflow-hidden">Total generated this term</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(stats.taxRevenue, settings?.currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">Included in total revenue</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Table */}
        <div className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              className="pl-10 h-11 bg-card/50 border-none shadow-inner"
              placeholder="Search by member name or invoice reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[150px]">Invoice Ref</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No invoices found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="font-mono text-sm text-primary font-bold">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="font-medium">{invoice.memberName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatCurrency(invoice.subtotal || invoice.amount, settings?.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatCurrency(invoice.taxAmount || 0, settings?.currency)}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {formatCurrency(invoice.amount, settings?.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`font-semibold capitalize ${
                              invoice.status === 'paid' 
                                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' 
                                : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                            }`}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-medium">
                          {formatDate(invoice.dueDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.status !== 'paid' && (
                            <Button
                              size="sm"
                              className="gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id)
                                setPaymentForm({
                                  amount: invoice.amount.toString(),
                                  method: 'cash'
                                })
                                setIsPaymentDialogOpen(true)
                              }}
                            >
                              <CreditCard className="h-3 w-3" />
                              Process Payment
                            </Button>
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
        </div>
      </div>

      {/* Payment Dialog - Moved outside loop */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment Flow</DialogTitle>
            <DialogDescription>
              Finalize transaction for invoice {invoices.find(i => i.id === selectedInvoiceId)?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Receivable Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground select-none">
                  {settings?.currency === 'INR' ? '₹' : settings?.currency === 'EUR' ? '€' : settings?.currency === 'GBP' ? '£' : '$'}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  className="pl-9"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <select
                aria-label="Payment method"
                value={paymentForm.method}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    method: e.target.value as any,
                  })
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="cash">Cash Payment</option>
                <option value="card">Card Transaction</option>
                <option value="transfer">Bank Transfer</option>
                <option value="cheque">Cheque Deposit</option>
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-bold">Complete Transaction</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  )
}
