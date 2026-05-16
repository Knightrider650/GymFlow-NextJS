'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  Search,
  LayoutDashboard,
  Globe,
  Settings2
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { Input } from '@/components/ui/input'

import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface SuperStats {
  totalGyms: number
  totalMembers: number
  activeMembers: number
  totalRevenue: number
}

interface GymOverview {
  id: string
  name: string
  email: string
  phone: string
  address: string
  activeMembers: number
  totalMembers: number
  totalRevenue: number
  staffCount: number
  createdAt: string
}

export default function SuperDashboard() {
  const [stats, setStats] = useState<SuperStats | null>(null)
  const [gyms, setGyms] = useState<GymOverview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const switchGym = useAuthStore(state => state.switchGym)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [statsRes, gymsRes] = await Promise.all([
          apiClient.get('/api/super-admin/overview'),
          apiClient.get('/api/super-admin/gyms')
        ])

        if (statsRes.success) setStats(statsRes.data)
        if (gymsRes.success) setGyms(gymsRes.data)
      } catch (err) {
        console.error('Failed to fetch super admin data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleManageGym = async (gymId: string, gymName: string) => {
    const success = await switchGym(gymId)
    if (success) {
      router.push('/dashboard')
    } else {
      alert(`Failed to switch to ${gymName}`)
    }
  }

  const filteredGyms = gyms.filter(gym => 
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
              <Globe className="h-8 w-8 text-violet-500" />
              Global Platform Overview
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time performance metrics across all registered gym locations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search gyms..." 
                className="pl-10 w-[250px] bg-white/5 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Platform Settings
            </Button>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none bg-violet-500/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Building2 className="h-16 w-16" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-violet-400 font-medium uppercase text-[10px] tracking-wider">Total Gyms</CardDescription>
              <CardTitle className="text-3xl text-violet-300">{stats?.totalGyms || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] text-violet-400/60 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +2 this month
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-blue-500/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Users className="h-16 w-16" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-400 font-medium uppercase text-[10px] tracking-wider">Global Members</CardDescription>
              <CardTitle className="text-3xl text-blue-300">{stats?.totalMembers.toLocaleString() || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] text-blue-400/60 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {stats?.activeMembers} currently active
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-emerald-500/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <DollarSign className="h-16 w-16" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-400 font-medium uppercase text-[10px] tracking-wider">Total Revenue</CardDescription>
              <CardTitle className="text-3xl text-emerald-300">${stats?.totalRevenue.toLocaleString() || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] text-emerald-400/60 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +12% from last quarter
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-amber-500/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Activity className="h-16 w-16" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-400 font-medium uppercase text-[10px] tracking-wider">Avg. Retention</CardDescription>
              <CardTitle className="text-3xl text-amber-300">84.2%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] text-amber-400/60 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Top performing industry
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gyms Table */}
        <Card className="border-none bg-card/40 backdrop-blur-sm shadow-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/[0.02] py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Gym Directory</CardTitle>
                <CardDescription>Detailed overview of every facility on the platform</CardDescription>
              </div>
              <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20">
                {filteredGyms.length} Total Locations
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[300px]">Gym Details</TableHead>
                  <TableHead>Active Members</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Revenue (Paid)</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground animate-pulse">
                      Synthesizing global gym data...
                    </TableCell>
                  </TableRow>
                ) : filteredGyms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                      No gyms found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGyms.map((gym) => (
                    <TableRow key={gym.id} className="hover:bg-muted/30 transition-colors group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 group-hover:text-primary transition-colors">{gym.name}</span>
                          <span className="text-xs text-muted-foreground">{gym.email}</span>
                          <span className="text-[10px] text-muted-foreground/60 truncate max-w-[200px] mt-0.5">{gym.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-400">{gym.activeMembers}</span>
                          <span className="text-[10px] text-muted-foreground">out of {gym.totalMembers} total</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-white/5 text-slate-400 border-none">
                          {gym.staffCount} Staff
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-emerald-400 font-bold">
                          ${gym.totalRevenue.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(gym.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 hover:bg-violet-500/10 hover:text-violet-400"
                          onClick={() => handleManageGym(gym.id, gym.name)}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Manage Gym
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
