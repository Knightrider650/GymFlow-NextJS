'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { apiClient } from '@/lib/api-client'
import { History, User, Activity, Clock, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface ActivityRecord {
  id: string
  action: string
  details: string
  timestamp: string
  userName: string
  userId: string
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/api/activity-log')
      if (response.success) {
        setActivities(response.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  const filteredActivities = activities.filter(activity => 
    (activity.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (activity.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (activity.details || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getActionColor = (action: string) => {
    const a = action.toLowerCase()
    if (a.includes('add') || a.includes('create')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    if (a.includes('delete') || a.includes('remove')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    if (a.includes('update') || a.includes('edit')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    if (a.includes('login')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <History className="h-8 w-8 text-primary" />
              Activity Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Full audit trail of all system actions and user movements
            </p>
          </div>
          
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by user or action..." 
              className="pl-10 bg-card/50 border-white/5 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="font-medium animate-pulse">Retrieving audit records...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Activity className="h-12 w-12 opacity-20 mb-4" />
                <p className="text-lg font-medium">No activity records found</p>
                <p className="text-sm">New actions will appear here in real-time</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredActivities.map((activity, idx) => (
                <Card key={activity.id} className="border-none bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300 group overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/5 text-primary">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getActionColor(activity.action)}`}>
                            {activity.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.timestamp), 'MMM dd, yyyy • hh:mm:ss a')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{activity.details}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-full self-start md:self-center">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {activity.userName.charAt(0)}
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">{activity.userName}</p>
                        <p className="text-[10px] text-muted-foreground">User ID: {activity.userId.substring(0, 8)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  )
}
