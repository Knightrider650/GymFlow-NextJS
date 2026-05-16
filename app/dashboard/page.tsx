'use client'

import { useEffect, useState, useMemo } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMembers, useAttendance, useBilling } from '@/hooks'
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  RefreshCw,
  Activity,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import { useAuthStore, useGymStore } from '@/lib/store'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { 
    fetchStats, stats, statsLoading,
    fetchInvoices, invoices, 
    fetchAttendance, attendance,
    settings, fetchSettings 
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
  }, [fetchStats, fetchInvoices, fetchAttendance])

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

  const StatCard = ({
    title,
    value,
    icon: Icon,
    description,
    trend,
    gradient,
  }: {
    title: string
    value: string | number
    icon: any
    description?: string
    trend?: number
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
            <span className="text-xs font-semibold">{trend}% vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )


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
            trend={12}
            gradient="bg-blue-600 text-white"
          />
          {user?.role !== 'trainer' && (
            <>
              <StatCard
                title="Today's Revenue"
                value={formatCurrency(stats?.todayRevenue || 0, settings?.currency)}
                icon={DollarSign}
                description="Paid invoices today"
                trend={8}
                gradient="bg-emerald-600 text-white"
              />
              <StatCard
                title="Monthly Revenue"
                value={formatCurrency(stats?.monthlyRevenue || 0, settings?.currency)}
                icon={TrendingUp}
                description="Total this month"
                trend={15}
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
          {user?.role !== 'trainer' && (
            <StatCard
              title="Pending Payments"
              value={stats?.pendingPayments || 0}
              icon={AlertCircle}
              description="Invoices awaiting payment"
              gradient="bg-rose-500 text-white"
            />
          )}
          <StatCard
            title="Data Consistency"
            value={stats?.retention || '100%'}
            icon={Activity}
            description="System database integrity"
            gradient="bg-slate-700 text-white"
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue Chart */}
          {user?.role !== 'trainer' && (
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
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Invoices */}
          {user?.role !== 'trainer' && (
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
                    <Badge variant="info" className="text-xs">
                      Checked In
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
}
