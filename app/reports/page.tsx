'use client'

import { useState, useEffect } from 'react'
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

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('member-summary')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

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
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="font-medium">Aggregating real-time data metrics...</p>
        </div>
      )
    }

    if (!data) return <p className="text-center py-20 text-muted-foreground">Select a report criteria to begin analysis.</p>

    switch (reportType) {
      case 'revenue':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-none bg-primary/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Gross Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$12,450.00</div>
                  <p className="text-xs text-muted-foreground mt-1 text-green-600">+12.5% from last month</p>
                </CardContent>
              </Card>
              {/* Add more metric cards here */}
            </div>
            <div className="h-[400px] w-full bg-card/30 rounded-xl p-4 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Jan', amount: 4000 },
                  { name: 'Feb', amount: 3000 },
                  { name: 'Mar', amount: 5000 },
                  { name: 'Apr', amount: 4500 },
                  { name: 'May', amount: 6000 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      // More cases for other reports will go here
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

  const reportOptions = [
    { value: 'member-summary', label: 'Member Growth & Summary', icon: Users },
    { value: 'expiring-members', label: 'Membership Retention Alerts', icon: UserCheck },
    { value: 'revenue', label: 'Financial Revenue Trends', icon: DollarSign },
    { value: 'attendance', label: 'Traffic & Attendance Patterns', icon: Activity },
    { value: 'class-utilization', label: 'Class Enrollment Metrics', icon: Calendar },
    { value: 'equipment-status', label: 'Equipment Maintenance Log', icon: Package },
    { value: 'leads-conversion', label: 'Lead Conversion Pipeline', icon: Zap },
    { value: 'staff-performance', label: 'Trainer & Staff Performance', icon: TrendingUp },
  ]

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
