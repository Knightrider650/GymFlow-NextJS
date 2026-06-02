'use client'

import { useEffect, useState, useMemo } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMembers, useAttendance, useBilling } from '@/hooks'
import { isTrainer } from '@/lib/permissions'
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  RefreshCw,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import { useAuthStore, useGymStore } from '@/lib/store'

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendLabel = 'vs last month',
  gradient,
}: {
  title: string
  value: string | number
  icon: any
  description?: string
  trend?: number
  trendLabel?: string
  gradient?: string
}) => (
  <Card className={`overflow-hidden border-none shadow-lg relative ${gradient || 'bg-card text-card-foreground'}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="p-2 rounded-full bg-white/10">
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent className="relative">
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs opacity-80 mt-1">{description}</p>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs font-semibold">{trend}% {trendLabel}</span>
        </div>
      )}
    </CardContent>
  </Card>
)

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { 
    fetchStats, stats, statsLoading,
    fetchInvoices, invoices, 
    fetchAttendance, attendance,
    settings, fetchSettings,
    scanErrors, clearScanErrors
  } = useGymStore()
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true)
      try {
        await Promise.all([
          fetchStats(),
          fetchInvoices(),
          fetchAttendance(),
          fetchSettings()
        ])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadData()
  }, [fetchStats, fetchInvoices, fetchAttendance, fetchSettings])

  // Data is now pre-aggregated on the server
  if (!stats && isInitialLoading) {
    return (
      <ProtectedLayout>
        <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin mb-4" />
          <p className="font-medium">Aggregating real-time performance metrics...</p>
        </div>
      </ProtectedLayout>
    )
  }


  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back! Here&apos;s your gym overview.
            </p>
          </div>
          <Button
            onClick={() => fetchStats(true)}
            disabled={statsLoading}
            variant="outline"
            className="gap-2 w-fit"
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            {statsLoading ? 'Updating Metrics...' : 'Refresh Live Data'}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Active Members"
            value={stats?.activeMembers || 0}
            icon={Users}
            description={`of ${stats?.totalMembers || 0} total members`}
            trend={stats?.activeMembersTrend}
            trendLabel="vs last month"
            gradient="bg-blue-600 text-white"
          />
          {!isTrainer(user?.role) && (
            <>
              <StatCard
                title="Today's Revenue"
                value={formatCurrency(stats?.todayRevenue || 0, settings?.currency)}
                icon={DollarSign}
                description="Paid invoices today"
                trend={stats?.todayRevenueTrend}
                trendLabel="vs yesterday"
                gradient="bg-emerald-600 text-white"
              />
              <StatCard
                title="Monthly Revenue"
                value={formatCurrency(stats?.monthlyRevenue || 0, settings?.currency)}
                icon={TrendingUp}
                description="Total this month"
                trend={stats?.monthlyRevenueTrend}
                trendLabel="vs last month"
                gradient="bg-purple-600 text-white"
              />
            </>
          )}
          <StatCard
            title="Today's Visits"
            value={stats?.todayVisits || 0}
            icon={Calendar}
            description="Members checked in"
            gradient="bg-orange-500 text-white"
          />
          {!isTrainer(user?.role) && (
            <StatCard
              title="Pending Payments"
              value={stats?.pendingPayments || 0}
              icon={AlertCircle}
              description="Invoices awaiting payment"
              gradient="bg-rose-500 text-white"
            />
          )}
          <StatCard
            title="Member Retention"
            value={stats?.retention || '100%'}
            icon={Activity}
            description="Year-to-date retention rate"
            gradient="bg-slate-700 text-white"
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue Chart */}
          {!isTrainer(user?.role) && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue this week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats?.revenueTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Attendance Chart */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Attendance Trend</CardTitle>
              <CardDescription>Daily gym visits this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.attendanceTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar
                    dataKey="visits"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className={`grid gap-4 ${isTrainer(user?.role) ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          {/* Recent Invoices */}
          {!isTrainer(user?.role) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{invoice.memberName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(invoice.invoiceDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatCurrency(invoice.amount, settings?.currency)}</p>
                        <Badge
                          variant={
                            invoice.status === 'paid'
                              ? 'success'
                              : invoice.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                          className="text-xs"
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Check-ins */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendance.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{record.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.checkInTime).toLocaleTimeString()}
                      </p>
                    </div>
                    {record.checkOutTime ? (
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
                          Checked Out
                        </Badge>
                        {record.duration && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                            {record.duration} mins
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="info" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                        Checked In
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live Alerts & Warnings */}
          <Card className="border-none shadow-xl bg-card/65 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 text-red-500/10 pointer-events-none">
              <AlertCircle className="h-24 w-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold">Live Scan Alerts</CardTitle>
                <CardDescription>Real-time check-in warnings & failures</CardDescription>
              </div>
              {scanErrors.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10" 
                  onClick={clearScanErrors}
                >
                  Clear Logs
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scanErrors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/30 mb-2" />
                    <p className="text-xs font-semibold">No recent scanner issues</p>
                    <p className="text-[10px] text-muted-foreground">Scan events are normal</p>
                  </div>
                ) : (
                  scanErrors.map((err) => (
                    <div
                      key={err.id}
                      className="flex items-start justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 animate-in fade-in slide-in-from-top-2 duration-300"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs text-foreground">
                          {err.memberName || 'Unknown Member'}
                        </p>
                        <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          {err.error || 'Check-in blocked'}
                        </p>
                        <span className="text-[9px] text-muted-foreground font-mono block">
                          ID: {err.memberId?.substring(0, 8)}...
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {new Date(err.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
}
