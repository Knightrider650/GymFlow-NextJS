'use client'

import { useState, useEffect, useMemo } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api-client'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { Download, FileText, Table as TableIcon, Loader2, TrendingUp, Users, Calendar, DollarSign, Activity, Package, UserCheck, Zap } from 'lucide-react'

type ReportType = 
  | 'member-summary' 
  | 'expiring-members' 
  | 'revenue' 
  | 'attendance' 
  | 'class-utilization' 
  | 'equipment-status' 
  | 'leads-conversion' 
  | 'staff-performance'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

import { useAuthStore, useGymStore } from '@/lib/store'
import { formatCurrency } from '@/utils/format'
import { UserRole } from '@/lib/permissions'

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('member-summary')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const settings = useGymStore(state => state.settings)
  const fetchSettings = useGymStore(state => state.fetchSettings)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const fetchReport = async (type: ReportType) => {
    setIsLoading(true)
    try {
      const response = await apiClient.get(`/api/reports/${type}`)
      if (response.success) {
        setData(response.data)
      }
    } catch (err) {
      console.error('Failed to fetch report:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReport(reportType)
  }, [reportType])

  const handleExport = (format: 'pdf' | 'csv') => {
    alert(`Exporting ${reportType} as ${format.toUpperCase()}... (Logic implemented in production API)`)
  }

  const renderReportContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[450px] text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
          <p className="font-semibold text-base">Aggregating real-time data metrics...</p>
        </div>
      )
    }

    if (!data) return <p className="text-center py-20 text-muted-foreground text-sm">Select a report criteria to begin analysis.</p>

    switch (reportType) {
      case 'member-summary':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="border-none bg-primary/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Total Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{data.total || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-none bg-emerald-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-500" />
                    Active Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-500">{data.active || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-none bg-rose-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-rose-500" />
                    Expired
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-rose-500">{data.expired || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-none bg-amber-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-500" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-500">{data.pending || 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-card/40 rounded-2xl p-6 border border-white/5 shadow-sm">
                <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Growth Trend (Last 6 Months)
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.registrationTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none' }} />
                      <Line type="monotone" dataKey="members" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card/40 rounded-2xl p-6 border border-white/5 shadow-sm">
                <h3 className="font-bold text-base text-white mb-4">Recent Member Sign-ups</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Name</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(data.recentMembers || []).map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-3 py-2 text-white font-medium">{m.name}</td>
                          <td className="px-3 py-2">{m.membershipType}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              m.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                              m.status === 'expired' ? 'bg-rose-500/10 text-rose-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )

      case 'expiring-members':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-amber-500">Membership Expirations (Next 30 Days)</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Below are members whose accounts are expiring soon. Proactive outreach can improve retention rates.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card/40 rounded-2xl border border-white/5 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Member</th>
                      <th className="px-6 py-4 font-semibold">Contact</th>
                      <th className="px-6 py-4 font-semibold">Membership</th>
                      <th className="px-6 py-4 font-semibold">Expiration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(!data.expiring || data.expiring.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-muted-foreground">No member memberships are expiring in the next 30 days.</td>
                      </tr>
                    ) : (
                      data.expiring.map((m: any) => (
                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{m.name}</td>
                          <td className="px-6 py-4 text-xs">
                            <div>{m.email}</div>
                            <div className="text-muted-foreground">{m.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4">{m.membershipType}</td>
                          <td className="px-6 py-4 text-amber-500 font-mono text-xs">
                            {new Date(m.expiryDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'revenue':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-none bg-primary/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Gross Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{formatCurrency(data.totalRevenue || 0, settings?.currency)}</div>
                  <p className="text-xs text-muted-foreground mt-1 text-green-600">Lifetime system aggregate</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-amber-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                    Pending Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{data.pendingInvoicesCount || 0} Invoices</div>
                  <p className="text-xs text-muted-foreground mt-1 text-amber-600">Awaiting processing</p>
                </CardContent>
              </Card>
            </div>
            <div className="bg-card/40 rounded-2xl p-6 border border-white/5 shadow-sm">
              <h3 className="font-bold text-base text-white mb-4">Monthly Revenue Trends</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 11}} 
                      tickFormatter={(val) => formatCurrency(val, settings?.currency)}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none' }}
                      formatter={(value: any) => [formatCurrency(value, settings?.currency), 'Revenue']}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )

      case 'attendance':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-none bg-primary/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Total Visits (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.totalVisits || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1 text-blue-600">Active member entries</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-card/40 rounded-2xl p-6 border border-white/5 shadow-sm">
                <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Traffic by Weekday
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weekdayDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="visits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card/40 rounded-2xl p-6 border border-white/5 shadow-sm">
                <h3 className="font-bold text-base text-white mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Peak Attendance Hours
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hourDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="visits" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )

      case 'class-utilization':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-card/40 rounded-2xl border border-white/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="font-bold text-base text-white">Class Booking & Utilization Rate</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Class Name</th>
                      <th className="px-6 py-4 font-semibold">Instructor</th>
                      <th className="px-6 py-4 font-semibold">Enrollment / Capacity</th>
                      <th className="px-6 py-4 font-semibold">Occupancy Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(!data.classes || data.classes.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-muted-foreground">No fitness classes scheduled.</td>
                      </tr>
                    ) : (
                      data.classes.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                          <td className="px-6 py-4">{c.instructor}</td>
                          <td className="px-6 py-4 font-mono text-xs">{c.enrollment} / {c.capacity}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <svg className="w-24 h-2 bg-white/10 rounded-full overflow-hidden" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
                                <rect x="0" y="0" width={Math.min(c.occupancyRate, 100)} height="8" rx="4" fill={c.occupancyRate >= 80 ? '#10b981' : c.occupancyRate >= 50 ? '#3b82f6' : '#f59e0b'} />
                              </svg>
                              <span className="font-bold text-xs text-white">{c.occupancyRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'equipment-status':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-none bg-primary/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Total Inventory Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.totalItems || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-rose-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-rose-500" />
                    Low Stock Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-500">{data.lowStock || 0} Items</div>
                  <p className="text-xs text-muted-foreground mt-1 text-rose-600">Requires restocking</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-emerald-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Inventory Asset Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500">{formatCurrency(data.totalValue || 0, settings?.currency)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Cost valuation basis</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-card/40 rounded-2xl border border-white/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="font-bold text-base text-white">Gym Inventory Details</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Item Name</th>
                      <th className="px-6 py-4 font-semibold">Category</th>
                      <th className="px-6 py-4 font-semibold">Quantity</th>
                      <th className="px-6 py-4 font-semibold">Cost Per Unit</th>
                      <th className="px-6 py-4 font-semibold">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(!data.items || data.items.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-muted-foreground">No inventory items tracked.</td>
                      </tr>
                    ) : (
                      data.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">
                            <div>{item.name}</div>
                            {item.quantity <= item.minThreshold && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-rose-500/10 text-rose-500 mt-1">
                                Low Stock
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">{item.category}</td>
                          <td className="px-6 py-4 font-mono text-xs">{item.quantity}</td>
                          <td className="px-6 py-4 font-mono text-xs">{formatCurrency(item.costPerUnit, settings?.currency)}</td>
                          <td className="px-6 py-4 font-mono text-xs text-white">{formatCurrency(item.quantity * item.costPerUnit, settings?.currency)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'leads-conversion':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-none bg-primary/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Total Leads Tracked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.totalLeads || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Acquired from marketing channels</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1 bg-card/40 rounded-2xl p-6 border border-white/5 shadow-sm flex flex-col justify-center items-center">
                <h3 className="font-bold text-base text-white mb-4 self-start">Pipeline Status</h3>
                <div className="h-[200px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.distribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(data.distribution || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-2 bg-card/40 rounded-2xl p-6 border border-white/5 shadow-sm">
                <h3 className="font-bold text-base text-white mb-4">Pipeline Status Details</h3>
                <div className="space-y-4">
                  {(data.distribution || []).map((d: any, index: number) => {
                    const pct = data.totalLeads > 0 ? Math.round((d.value / data.totalLeads) * 100) : 0
                    return (
                      <div key={d.name} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 rounded-full" viewBox="0 0 12 12" aria-hidden="true">
                              <circle cx="6" cy="6" r="6" fill={COLORS[index % COLORS.length]} />
                            </svg>
                            <span className="font-medium text-white">{d.name}</span>
                          </div>
                          <span className="text-muted-foreground font-mono">{d.value} ({pct}%)</span>
                        </div>
                        <svg className="w-full h-2 bg-white/10 rounded-full overflow-hidden" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
                          <rect x="0" y="0" width={pct} height="8" rx="4" fill={COLORS[index % COLORS.length]} />
                        </svg>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )

      case 'staff-performance':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-none bg-primary/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Total Staff Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.totalStaff || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-none bg-emerald-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-500 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-500" />
                    Active Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500">{data.activeStaff || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-none bg-primary/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Monthly Payroll Burden
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{formatCurrency(data.monthlyPayroll || 0, settings?.currency)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-card/40 rounded-2xl border border-white/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="font-bold text-base text-white">Staff Members & Details</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Position</th>
                      <th className="px-6 py-4 font-semibold">Salary (Monthly)</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(!data.staffList || data.staffList.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-muted-foreground">No staff profiles registered.</td>
                      </tr>
                    ) : (
                      data.staffList.map((s: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{s.name}</td>
                          <td className="px-6 py-4">{s.position}</td>
                          <td className="px-6 py-4 font-mono text-xs">{formatCurrency(s.salary, settings?.currency)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              s.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-xl bg-muted/20">
            <Zap className="h-12 w-12 text-primary/20 mb-4" />
            <p className="text-muted-foreground text-lg font-medium">Dashboard for {reportType} is under construction</p>
            <p className="text-xs text-muted-foreground mt-2">Integrating logic for the specific data pipeline.</p>
          </div>
        )
    }
  }

  const actorRole = useAuthStore(s => s.user?.role) as UserRole
  const isManagerOrAdmin = ['cto', 'ceo', 'admin', 'manager'].includes(actorRole)

  const reportOptions = useMemo(() => {
    return [
      { value: 'member-summary', label: 'Member Growth & Summary', icon: Users, roles: ['cto', 'ceo', 'admin', 'manager', 'staff', 'trainer'] },
      { value: 'expiring-members', label: 'Membership Retention Alerts', icon: UserCheck, roles: ['cto', 'ceo', 'admin', 'manager', 'staff'] },
      { value: 'revenue', label: 'Financial Revenue Trends', icon: DollarSign, roles: ['cto', 'ceo', 'admin', 'manager'] },
      { value: 'attendance', label: 'Traffic & Attendance Patterns', icon: Activity, roles: ['cto', 'ceo', 'admin', 'manager', 'staff', 'trainer'] },
      { value: 'class-utilization', label: 'Class Enrollment Metrics', icon: Calendar, roles: ['cto', 'ceo', 'admin', 'manager', 'staff', 'trainer'] },
      { value: 'equipment-status', label: 'Equipment Maintenance Log', icon: Package, roles: ['cto', 'ceo', 'admin', 'manager', 'staff'] },
      { value: 'leads-conversion', label: 'Lead Conversion Pipeline', icon: Zap, roles: ['cto', 'ceo', 'admin', 'manager'] },
      { value: 'staff-performance', label: 'Trainer & Staff Performance', icon: TrendingUp, roles: ['cto', 'ceo', 'admin', 'manager'] },
    ].filter(opt => opt.roles.includes(actorRole))
  }, [actorRole])

  // Set initial report type to the first available option for that role
  useEffect(() => {
    if (reportOptions.length > 0 && !reportOptions.find(o => o.value === reportType)) {
      setReportType(reportOptions[0].value as ReportType)
    }
  }, [actorRole, reportOptions, reportType])

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 min-h-screen bg-slate-50/50">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Analytics & Reporting</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Data-driven insights for gym operations and revenue growth
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-2 shadow-sm bg-white">
              <TableIcon className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="gap-2 shadow-sm bg-white">
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Control Panel</CardTitle>
                <CardDescription>Select metric layer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Report Category</label>
                  <Select value={reportType} onValueChange={(val: string) => setReportType(val as ReportType)}>
                    <SelectTrigger className="w-full bg-slate-50 border-slate-100 h-11 focus:ring-primary/20">
                      <SelectValue placeholder="Select Report" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="py-2.5">
                          <div className="flex items-center gap-3">
                            <opt.icon className="h-4 w-4 text-primary" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[11px] text-muted-foreground italic mb-2 leading-tight">
                    * Advanced filtering by date and gym location available in Franchise Tier.
                  </p>
                  <Button variant="secondary" className="w-full text-xs h-9 font-bold bg-primary/5 hover:bg-primary/10 text-primary border-none" onClick={() => fetchReport(reportType)}>
                    Refresh Live Buffer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Visual Content */}
          <div className="lg:col-span-3">
            <Card className="border-none shadow-2xl min-h-[600px] overflow-hidden bg-white/60 backdrop-blur-xl">
              <CardHeader className="bg-slate-50/30 border-b border-slate-100 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                      {reportOptions.find(o => o.value === reportType)?.label}
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Targeted analytical view of business performance datasets
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white/50 animate-pulse border-primary/20 text-primary font-mono">LIVE FEED</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {renderReportContent()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
