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
import { useBilling, useMembers, usePlans, useSettings, usePagination } from '@/hooks'
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
    method: 'cash' as string,
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
    if (member) {
      let plan = null
      if (member.planId) {
        plan = plans.find((p: any) => p.id === member.planId)
      }
      if (!plan && member.membershipType) {
        const memberType = member.membershipType.toLowerCase()
        plan = plans.find((p: any) => p.name.toLowerCase() === memberType)
          || plans.find((p: any) => p.name.toLowerCase().includes(memberType) || memberType.includes(p.name.toLowerCase()))
      }
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
    
    if (!invoiceForm.memberId || !invoiceForm.amount) {
      return;
    }
 
    const selectedMember = members.find(m => m.id === invoiceForm.memberId)
    if (selectedMember) {
      try {
        const subtotal = parseFloat(invoiceForm.amount)
        const taxRate = settings?.billing?.defaultTaxRate || 0
        const taxAmount = (subtotal * taxRate) / 100
        const totalAmount = subtotal + taxAmount

        await createInvoice({
          invoiceNumber: `${settings?.invoicePrefix || 'INV'}-${Date.now()}`,
          memberId: invoiceForm.memberId,
          memberName: selectedMember.name,
          amount: totalAmount,
          subtotal: subtotal,
          taxAmount: taxAmount,
          description: invoiceForm.description || 'Membership Fee',
          status: 'pending',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: invoiceForm.dueDate,
        })
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
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedInvoiceId && paymentForm.amount) {
      try {
        await recordPayment(selectedInvoiceId, parseFloat(paymentForm.amount), paymentForm.method)
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

  const {
    currentPage,
    totalPages,
    currentItems: paginatedInvoices,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination(filteredInvoices, 10)

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
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Billing & Revenue</h1>
          <p className="text-sm text-muted-foreground">
            Monitor financial health and manage member subscriptions
          </p>
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

        {/* Controls: Search and Actions */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-muted/20 p-4 rounded-xl border border-muted-foreground/10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-10 h-11 bg-card placeholder:text-muted-foreground/75"
              placeholder="Search by member name or invoice reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-11 bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20">
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
        </div>

        {/* Invoice Table Container */}
        <div className="space-y-4">

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
                  {paginatedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No invoices found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInvoices.map((invoice) => (
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
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-muted">
                <div className="text-xs text-muted-foreground font-semibold">
                  Showing {Math.min((currentPage - 1) * 10 + 1, filteredInvoices.length)} to {Math.min(currentPage * 10, filteredInvoices.length)} of {filteredInvoices.length} invoices
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={!hasPrevPage}
                    className="text-xs"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1
                    if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-8 h-8 text-xs p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    }
                    if (pageNum === 2 && currentPage > 3) {
                      return <span key="ellipsis-start" className="text-muted-foreground px-1 text-xs">...</span>
                    }
                    if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                      return <span key="ellipsis-end" className="text-muted-foreground px-1 text-xs">...</span>
                    }
                    return null
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={!hasNextPage}
                    className="text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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
                    method: e.target.value,
                  })
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="cash">Cash Payment</option>
                <option value="card">Card Transaction</option>
                <option value="transfer">Bank Transfer</option>
                <option value="upi">UPI QR Code</option>
                <option value="cheque">Cheque Deposit</option>
              </select>
            </div>
            {paymentForm.method === 'upi' && selectedInvoiceId && (
              <div className="space-y-3 p-4 rounded-xl border border-dashed border-white/10 bg-slate-900/40 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-xs text-muted-foreground block mb-1">Scan QR Code using GPay, PhonePe, Paytm</Label>
                <div className="bg-white p-2 rounded-lg inline-block mx-auto border shadow-md">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      `upi://pay?pa=gymflow@upi&pn=${encodeURIComponent(settings?.gymName || 'GymFlow')}&am=${paymentForm.amount}&cu=INR&tn=${encodeURIComponent(invoices.find(i => i.id === selectedInvoiceId)?.invoiceNumber || '')}`
                    )}`}
                    alt="UPI QR Code"
                    className="h-40 w-40"
                  />
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  UPI ID: gymflow@upi
                </div>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-bold">
                {paymentForm.method === 'upi' ? 'I Have Paid - Confirm Payment' : 'Complete Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  )
}
