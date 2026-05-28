'use client'

import React, { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Settings2,
  Sliders,
  Database,
  AlertTriangle,
  Play,
  RefreshCw,
  FileText,
  CheckCircle,
  X,
  Lock,
  Unlock,
  Settings,
  Layers,
  Shield,
  Plus,
  Grid,
  Filter,
  Trash2,
  Bell,
  FileCode,
  Folder,
  File,
  ArrowLeft
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/utils/format'

interface SuperStats {
  totalGyms: number
  totalMembers: number
  activeMembers: number
  totalRevenue: number
  suspendedGyms: number
  churnRate: number
  todaySignups: number
  mrr: number
}

interface GymOverview {
  id: string
  name: string
  subdomain: string
  status: 'active' | 'suspended' | 'pending'
  plan: 'Basic' | 'Pro' | 'Enterprise'
  email: string
  phone: string
  address: string
  activeMembers: number
  totalMembers: number
  totalRevenue: number
  staffCount: number
  branchesCount: number
  createdAt: string
  maxMembersLimit: number
  maxBranchesLimit: number
  enabledModules: string[]
}

interface LogEntry {
  id: string
  timestamp: string
  tenant: string
  level: 'INFO' | 'WARNING' | 'ERROR'
  message: string
  stackTrace?: string
  context?: string
}

interface JobQueueItem {
  id: string
  name: string
  tenant: string
  status: 'running' | 'success' | 'failed' | 'pending'
  retries: number
  scheduledFor: string
}

export default function SuperDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'plans' | 'flags' | 'logs' | 'editor'>('overview')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SuperStats>({
    totalGyms: 5,
    totalMembers: 730,
    activeMembers: 625,
    totalRevenue: 26300,
    suspendedGyms: 1,
    churnRate: 1.5,
    todaySignups: 1,
    mrr: 950
  })

  // Dynamic live tenants loaded from our API
  const [tenants, setTenants] = useState<GymOverview[]>([])

  const fetchGyms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/super-admin/gyms')
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setTenants(result.data)
          
          const list = result.data
          const totalGyms = list.length
          const totalMembers = list.reduce((sum: number, t: any) => sum + (t.totalMembers || 0), 0)
          const activeMembers = list.reduce((sum: number, t: any) => sum + (t.activeMembers || 0), 0)
          const totalRevenue = list.reduce((sum: number, t: any) => sum + (t.totalRevenue || 0), 0)
          const suspendedGyms = list.filter((t: any) => t.status === 'suspended').length
          const mrr = list.filter((t: any) => t.status === 'active').reduce((sum: number, t: any) => {
            const planRate = t.plan === 'Enterprise' ? 299 : t.plan === 'Pro' ? 149 : 49
            return sum + planRate
          }, 0)

          setStats({
            totalGyms,
            totalMembers,
            activeMembers,
            totalRevenue,
            suspendedGyms,
            churnRate: 1.2,
            todaySignups: list.filter((t: any) => {
              const days = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 3600 * 24)
              return days <= 1
            }).length,
            mrr
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch gyms:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGyms()
  }, [])

  // Simulated Alert Queue
  const [alerts, setAlerts] = useState([
    { id: '1', tenant: 'Elite Athletics Center', detail: 'Elite Athletics Center has reached 95% of active member plan limit (210/220).', type: 'limit', tenantId: 'elite-athletics' },
    { id: '2', tenant: 'Prime Fitness Club', detail: 'Stripe subscription renew payment failed for Invoice #8791 (tenant: Prime Fitness).', type: 'billing', tenantId: 'prime-fitness' },
    { id: '3', tenant: 'Platform Internal', detail: 'Job queue backlog: 14 notifications currently retry pending.', type: 'jobs', tenantId: 'gymflow-hq' }
  ])

  // Logs & jobs simulation state
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '101', timestamp: '2026-05-17T20:30:15Z', tenant: 'prime-fitness', level: 'ERROR', message: 'Stripe API call timed out on payment intent creation', stackTrace: 'Error: timeout of 10000ms exceeded\n    at createPaymentIntent (services/stripe.js:14:28)\n    at processPayment (routes/billing.js:45:12)\n    at handleRequest (node_modules/express/lib/router/layer.js:95:5)', context: '{"amount": 4900, "currency": "usd", "metadata": {"gymId": "prime-fitness", "invoiceId": "inv_98312"}}' },
    { id: '102', timestamp: '2026-05-17T20:25:40Z', tenant: 'elite-athletics', level: 'WARNING', message: 'Tenant hard member limit reached. Member save bypassed.', context: '{"gymId": "elite-athletics", "limit": 220, "active": 220}' },
    { id: '103', timestamp: '2026-05-17T20:12:00Z', tenant: 'gymflow-hq', level: 'INFO', message: 'Cron job sync_membership_expiry completed successfully', context: '{"processed": 45, "expired": 2}' }
  ])

  const [jobs, setJobs] = useState<JobQueueItem[]>([
    { id: 'job_01', name: 'send_expiry_notifications_sms', tenant: 'gymflow-hq', status: 'pending', retries: 0, scheduledFor: '2026-05-17T21:00:00Z' },
    { id: 'job_02', name: 'retry_failed_stripe_invoices', tenant: 'prime-fitness', status: 'failed', retries: 3, scheduledFor: '2026-05-17T20:00:00Z' },
    { id: 'job_03', name: 'compile_daily_attendance_digest', tenant: 'elite-athletics', status: 'running', retries: 0, scheduledFor: '2026-05-17T20:30:00Z' }
  ])

  // Feature Flags state
  const [globalFlags, setGlobalFlags] = useState([
    { id: 'flag_01', name: 'New Dashboard V2', description: 'Enable gorgeous dashboard charts and live telemetry widgets.', activeGlobally: false, betaTenants: ['gymflow-hq', 'elite-athletics'] },
    { id: 'flag_02', name: 'Supplements POS Integrations', description: 'Include barcode scanning & instant inventory check for drinks.', activeGlobally: true, betaTenants: [] },
    { id: 'flag_03', name: 'QR Check-in Support', description: 'Mark daily attendance via QR code scanners on frontdesk.', activeGlobally: false, betaTenants: ['gymflow-hq'] }
  ])

  // UI state for modals / details
  const [selectedTenant, setSelectedTenant] = useState<GymOverview | null>(null)
  const [isNewTenantOpen, setIsNewTenantOpen] = useState(false)
  const [newTenantData, setNewTenantData] = useState({
    name: '',
    subdomain: '',
    plan: 'Basic' as 'Basic' | 'Pro' | 'Enterprise',
    email: '',
    phone: '',
    address: ''
  })
  
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isNotifyOpen, setIsNotifyOpen] = useState(false)
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notifyTargetIds, setNotifyTargetIds] = useState<string[]>([])

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([])

  const [currentPath, setCurrentPath] = useState<string>('.')
  const [explorerFiles, setExplorerFiles] = useState<any[]>([])
  const [explorerLoading, setExplorerLoading] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  
  const [newItemName, setNewItemName] = useState<string>('')
  const [newItemIsFolder, setNewItemIsFolder] = useState<boolean>(false)
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState<boolean>(false)

  const [editorContent, setEditorContent] = useState<string>('')
  const [editorLoading, setEditorLoading] = useState<boolean>(false)
  const [editorSaving, setEditorSaving] = useState<boolean>(false)
  const [editorSuccess, setEditorSuccess] = useState<string>('')
  const [editorError, setEditorError] = useState<string>('')

  const switchGym = useAuthStore(state => state.switchGym)
  const router = useRouter()

  const handleOpenImpersonation = async (tenantId: string) => {
    localStorage.setItem('gymflow_support_session', 'true')
    const success = await switchGym(tenantId)
    if (success) {
      router.push('/dashboard')
    } else {
      alert(`Failed to impersonate tenant [${tenantId}]`)
    }
  }

  const handleCreateTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/super-admin/gyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenantData)
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await fetchGyms()
          setIsNewTenantOpen(false)
          setNewTenantData({ name: '', subdomain: '', plan: 'Basic', email: '', phone: '', address: '' })
        }
      } else {
        alert('Failed to provision tenant')
      }
    } catch (err) {
      console.error('Error provisioning tenant:', err)
    }
  }

  const handleSaveTenantLimits = async (updated: GymOverview) => {
    try {
      const response = await fetch(`/api/super-admin/gyms/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updated.status,
          plan: updated.plan,
          maxMembersLimit: updated.maxMembersLimit,
          maxBranchesLimit: updated.maxBranchesLimit,
          enabledModules: updated.enabledModules
        })
      })
      if (response.ok) {
        await fetchGyms()
        setSelectedTenant(updated)
      } else {
        alert('Failed to update tenant overrides')
      }
    } catch (err) {
      console.error('Error updating tenant overrides:', err)
    }
  }

  const handleDeleteAction = async () => {
    if (deleteTargetIds.length === 1) {
      await handleSingleDelete(deleteTargetIds[0])
    } else if (deleteTargetIds.length > 1) {
      await handleBulkDelete(deleteTargetIds)
    }
  }

  const handleSingleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/super-admin/gyms/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setSelectedIds(prev => prev.filter(x => x !== id))
        setIsDeleteOpen(false)
        setSelectedTenant(null)
        await fetchGyms()
      } else {
        alert('Failed to delete gym')
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const response = await fetch('/api/super-admin/gyms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      if (response.ok) {
        setSelectedIds([])
        setIsDeleteOpen(false)
        await fetchGyms()
      } else {
        alert('Failed to delete gyms')
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleSendNotifications = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      alert('Title and message are required')
      return
    }
    try {
      const response = await fetch('/api/super-admin/gyms/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: notifyTargetIds,
          title: notificationTitle,
          message: notificationMessage
        })
      })
      if (response.ok) {
        setIsNotifyOpen(false)
        setNotificationTitle('')
        setNotificationMessage('')
        alert(`Notifications successfully sent to ${notifyTargetIds.length} gym(s).`)
      } else {
        alert('Failed to send notifications')
      }
    } catch (err) {
      console.error('Notify error:', err)
    }
  }

  const fetchDirectory = async (dirPath: string) => {
    try {
      setExplorerLoading(true)
      const res = await fetch(`/api/super-admin/files?path=${encodeURIComponent(dirPath)}`)
      if (res.ok) {
        const result = await res.json()
        if (result.success && result.isDirectory) {
          setExplorerFiles(result.files)
          setCurrentPath(dirPath)
        }
      }
    } catch (err) {
      console.error('Fetch directory error:', err)
    } finally {
      setExplorerLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'editor') {
      fetchDirectory(currentPath || '.')
    }
  }, [activeTab])

  const handleSelectItem = async (item: { name: string; isDirectory: boolean; path: string }) => {
    if (item.isDirectory) {
      fetchDirectory(item.path)
    } else {
      setSelectedFile(item.path)
      try {
        setEditorLoading(true)
        setEditorError('')
        setEditorSuccess('')
        const res = await fetch(`/api/super-admin/files?path=${encodeURIComponent(item.path)}`)
        if (res.ok) {
          const result = await res.json()
          if (result.success && !result.isDirectory) {
            setEditorContent(result.content || '')
          } else {
            setEditorError(result.error || 'Failed to read file')
          }
        } else {
          setEditorError('Failed to read file')
        }
      } catch (err) {
        console.error(err)
        setEditorError('Failed to connect to API')
      } finally {
        setEditorLoading(false)
      }
    }
  }

  const handleSaveFileContent = async () => {
    if (!selectedFile) return
    try {
      setEditorSaving(true)
      setEditorError('')
      setEditorSuccess('')
      const response = await fetch('/api/super-admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', path: selectedFile, content: editorContent })
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setEditorSuccess('File saved successfully!')
          setTimeout(() => setEditorSuccess(''), 3000)
        } else {
          setEditorError(result.error || 'Failed to save file')
        }
      } else {
        setEditorError('Failed to save file')
      }
    } catch (err) {
      console.error('File save error:', err)
      setEditorError('Failed to connect to files API')
    } finally {
      setEditorSaving(false)
    }
  }

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    const newPath = currentPath === '.' ? newItemName : `${currentPath}/${newItemName}`
    try {
      setEditorSaving(true)
      const res = await fetch('/api/super-admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', path: newPath, isFolder: newItemIsFolder })
      })
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          setIsNewItemModalOpen(false)
          setNewItemName('')
          fetchDirectory(currentPath)
        } else {
          alert(result.error || 'Failed to create item')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setEditorSaving(false)
    }
  }

  const handleDeleteItem = async (itemPath: string) => {
    if (!confirm(`Are you sure you want to delete ${itemPath}? This action is irreversible.`)) return
    try {
      setEditorSaving(true)
      const res = await fetch('/api/super-admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', path: itemPath })
      })
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          if (selectedFile === itemPath) {
            setSelectedFile(null)
            setEditorContent('')
          }
          fetchDirectory(currentPath)
        } else {
          alert(result.error || 'Failed to delete item')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setEditorSaving(false)
    }
  }

  const handleRetryJob = (jobId: string) => {
    setJobs(jobs.map(j => {
      if (j.id === jobId) {
        return { ...j, status: 'running' as const }
      }
      return j
    }))
    setTimeout(() => {
      setJobs(jobs => jobs.map(j => {
        if (j.id === jobId) {
          return { ...j, status: 'success' as const }
        }
        return j
      }))
    }, 2000)
  }

  // Filtered tenants for search & metrics
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-slate-950 text-slate-100">
        
        {/* Modern Glassmorphic Platform Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
              <Globe className="h-8 w-8 text-violet-500 animate-spin-slow" />
              Developer Platform Console
            </h1>
            <p className="text-sm text-slate-400">
              Platform administration, subscription controls, telemetry widgets, and secure tenant impersonation filters.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant={activeTab === 'overview' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('overview')}
              className="gap-2 font-semibold"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard Overview
            </Button>
            <Button 
              variant={activeTab === 'tenants' ? 'default' : 'outline'} 
              onClick={() => {
                setActiveTab('tenants')
                setStatusFilter('all')
              }}
              className="gap-2 font-semibold"
            >
              <Building2 className="h-4 w-4" />
              Tenants ({tenants.length})
            </Button>
            <Button 
              variant={activeTab === 'plans' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('plans')}
              className="gap-2 font-semibold"
            >
              <Sliders className="h-4 w-4" />
              Billing Plans
            </Button>
            <Button 
              variant={activeTab === 'flags' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('flags')}
              className="gap-2 font-semibold"
            >
              <Shield className="h-4 w-4" />
              Feature Flags
            </Button>
            <Button 
              variant={activeTab === 'logs' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('logs')}
              className="gap-2 font-semibold"
            >
              <Database className="h-4 w-4" />
              Telemetry Logs
            </Button>
            <Button 
              variant={activeTab === 'editor' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('editor')}
              className="gap-2 font-semibold"
            >
              <FileCode className="h-4 w-4" />
              System Editor
            </Button>
          </div>
        </div>

        {/* ──────── TAB 1: OVERVIEW DASHBOARD ──────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Real-time Alerts Banner Panel */}
            {alerts.length > 0 && (
              <div className="bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                  Active Platform Warnings ({alerts.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {alerts.map(alert => (
                    <div 
                      key={alert.id} 
                      onClick={() => {
                        if (alert.tenantId) {
                          const matched = tenants.find(t => t.id === alert.tenantId)
                          if (matched) {
                            setSelectedTenant(matched)
                            setActiveTab('tenants')
                          }
                        }
                      }}
                      className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700/80 cursor-pointer transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-300">{alert.tenant}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-950/30 text-red-400 border-red-500/20 uppercase font-black">{alert.type}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-normal">{alert.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPI Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card 
                onClick={() => {
                  setActiveTab('tenants')
                  setStatusFilter('active')
                }}
                className="border-none bg-violet-950/20 hover:bg-violet-950/30 backdrop-blur-sm relative overflow-hidden group cursor-pointer transition-all duration-300 shadow-lg"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Building2 className="h-16 w-16 text-violet-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-violet-400 font-semibold uppercase text-[10px] tracking-wider">Active Tenants</CardDescription>
                  <CardTitle className="text-4xl font-extrabold text-violet-300">{stats.totalGyms - stats.suspendedGyms} <span className="text-xs font-normal text-slate-500">/ {stats.totalGyms} total</span></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[10px] text-violet-400/70 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    All database systems operational
                  </div>
                </CardContent>
              </Card>

              <Card 
                onClick={() => {
                  setActiveTab('tenants')
                  setStatusFilter('suspended')
                }}
                className="border-none bg-rose-950/20 hover:bg-rose-950/30 backdrop-blur-sm relative overflow-hidden group cursor-pointer transition-all duration-300 shadow-lg"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Lock className="h-16 w-16 text-rose-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-rose-400 font-semibold uppercase text-[10px] tracking-wider">Suspended Tenants</CardDescription>
                  <CardTitle className="text-4xl font-extrabold text-rose-300">{stats.suspendedGyms}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[10px] text-rose-400/70 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-rose-500" />
                    Unpaid billing subscription limits
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-cyan-950/20 backdrop-blur-sm relative overflow-hidden group transition-all duration-300 shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Users className="h-16 w-16 text-cyan-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-cyan-400 font-semibold uppercase text-[10px] tracking-wider">Global Members</CardDescription>
                  <CardTitle className="text-4xl font-extrabold text-cyan-300">{stats.totalMembers.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[10px] text-cyan-400/70 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stats.todaySignups} new signups across tenants today
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-emerald-950/20 backdrop-blur-sm relative overflow-hidden group transition-all duration-300 shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-16 w-16 text-emerald-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-emerald-400 font-semibold uppercase text-[10px] tracking-wider">MRR (Paid plans)</CardDescription>
                  <CardTitle className="text-4xl font-extrabold text-emerald-300">${stats.mrr.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[10px] text-emerald-400/70 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Churn index stable at {stats.churnRate}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Custom SVG Charts with Hover States */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Gym Growth & Revenue Trends Chart */}
              <Card className="border-none bg-slate-900/60 shadow-xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-violet-500" />
                    Gym Growth Trend & MRR Growth (2026)
                  </CardTitle>
                  <CardDescription>Visualized tenant signup acceleration index per quarter.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col items-center">
                  <div className="w-full h-[220px] flex items-end justify-between relative px-4 border-b border-l border-slate-800">
                    
                    {/* SVG Line path representation */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M 0 90 Q 25 70 50 45 T 100 15" fill="none" stroke="#8b5cf6" strokeWidth="2" />
                      </svg>
                    </div>

                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-violet-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">$14.2K</div>
                      <div className="w-6 bg-slate-800 group-hover:bg-violet-600 rounded-t h-16 transition-all duration-300"></div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold">Jan</span>
                    </div>
                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-violet-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">$18.5K</div>
                      <div className="w-6 bg-slate-800 group-hover:bg-violet-600 rounded-t h-24 transition-all duration-300"></div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold">Feb</span>
                    </div>
                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-violet-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">$21.0K</div>
                      <div className="w-6 bg-slate-800 group-hover:bg-violet-600 rounded-t h-32 transition-all duration-300"></div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold">Mar</span>
                    </div>
                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-violet-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">$23.5K</div>
                      <div className="w-6 bg-slate-800 group-hover:bg-violet-600 rounded-t h-36 transition-all duration-300"></div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold">Apr</span>
                    </div>
                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-violet-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">$24.8K</div>
                      <div className="w-6 bg-violet-500/80 rounded-t h-40 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-300"></div>
                      <span className="text-[10px] text-violet-400 mt-2 font-bold">Today</span>
                    </div>

                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 font-semibold">Hover charts to see granular values</p>
                </CardContent>
              </Card>

              {/* Global Member Growth Across Gyms */}
              <Card className="border-none bg-slate-900/60 shadow-xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-500" />
                    Tenant Member Registrations (YTD)
                  </CardTitle>
                  <CardDescription>Sum of all active members registered across all active gyms.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col items-center">
                  <div className="w-full h-[220px] flex items-end justify-between relative px-4 border-b border-l border-slate-800">
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M 0 85 Q 30 65 60 45 T 100 20" fill="none" stroke="#06b6d4" strokeWidth="2" />
                      </svg>
                    </div>

                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-cyan-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">840</div>
                      <div className="w-6 bg-slate-800 group-hover:bg-cyan-600 rounded-t h-20 transition-all duration-300"></div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold">Jan</span>
                    </div>
                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-cyan-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">1,120</div>
                      <div className="w-6 bg-slate-800 group-hover:bg-cyan-600 rounded-t h-28 transition-all duration-300"></div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold">Feb</span>
                    </div>
                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-cyan-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">1,340</div>
                      <div className="w-6 bg-slate-800 group-hover:bg-cyan-600 rounded-t h-32 transition-all duration-300"></div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold">Mar</span>
                    </div>
                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-cyan-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">1,680</div>
                      <div className="w-6 bg-slate-800 group-hover:bg-cyan-600 rounded-t h-40 transition-all duration-300"></div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold">Apr</span>
                    </div>
                    <div className="flex flex-col items-center w-12 group/bar">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 group-hover/bar:text-cyan-400 opacity-0 group-hover/bar:opacity-100 transition-opacity">1,842</div>
                      <div className="w-6 bg-cyan-500/80 rounded-t h-44 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300"></div>
                      <span className="text-[10px] text-cyan-400 mt-2 font-bold">Today</span>
                    </div>

                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 font-semibold">Hover charts to see granular values</p>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* ──────── TAB 2: TENANTS MANAGEMENT ──────── */}
        {activeTab === 'tenants' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Bulk Actions Banner */}
            {selectedIds.length > 0 && (
              <div className="bg-gradient-to-r from-violet-950/60 via-indigo-950/60 to-slate-950/80 border border-violet-500/30 rounded-2xl p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-2xl animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                  <Badge className="bg-violet-600 text-slate-50 font-black px-2.5 py-1 text-xs">{selectedIds.length} Selected</Badge>
                  <span className="text-sm font-semibold text-slate-200">Bulk operations on selected gym tenants.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    className="border-violet-500/20 text-violet-400 hover:bg-violet-500/10 font-bold text-xs"
                    onClick={() => {
                      setNotifyTargetIds(selectedIds)
                      setIsNotifyOpen(true)
                    }}
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    Send Broadcast Notification
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="font-bold text-xs bg-red-950/60 border border-red-500/30 text-red-400 hover:bg-red-900/60"
                    onClick={() => {
                      setDeleteTargetIds(selectedIds)
                      setIsDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 hover:bg-slate-800 text-slate-400 font-bold text-xs"
                    onClick={() => setSelectedIds([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search subdomain or email..." 
                    className="pl-10 w-[260px] bg-slate-900 border-slate-800 text-slate-100 focus:border-violet-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Status Toggle Filters */}
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                  <button 
                    onClick={() => setStatusFilter('all')} 
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === 'all' ? 'bg-violet-600 text-slate-50' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    All Status
                  </button>
                  <button 
                    onClick={() => setStatusFilter('active')} 
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === 'active' ? 'bg-violet-600 text-slate-50' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Active
                  </button>
                  <button 
                    onClick={() => setStatusFilter('suspended')} 
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === 'suspended' ? 'bg-violet-600 text-slate-50' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Suspended
                  </button>
                </div>
              </div>
 
              <Button 
                onClick={() => setIsNewTenantOpen(true)}
                className="gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4" />
                Provision Gym Tenant
              </Button>
            </div>
 
            {/* Gyms Directory Table */}
            <Card className="border-none bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 border-slate-800 hover:bg-slate-900">
                    <TableHead className="w-[50px] font-bold text-slate-300">
                      <input 
                        type="checkbox"
                        checked={filteredTenants.length > 0 && selectedIds.length === filteredTenants.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredTenants.map(g => g.id))
                          } else {
                            setSelectedIds([])
                          }
                        }}
                        className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="font-bold text-slate-300">Gym Identity</TableHead>
                    <TableHead className="font-bold text-slate-300">Subdomain Slug</TableHead>
                    <TableHead className="font-bold text-slate-300">Plan</TableHead>
                    <TableHead className="font-bold text-slate-300">System Usage</TableHead>
                    <TableHead className="font-bold text-slate-300">Branches</TableHead>
                    <TableHead className="font-bold text-slate-300">Status</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-slate-400 font-bold">
                        No customer gyms match current platform filter keys.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenants.map((gym) => (
                      <TableRow 
                        key={gym.id} 
                        onClick={() => setSelectedTenant(gym)}
                        className={`hover:bg-slate-900/60 border-slate-800 cursor-pointer transition-colors group ${
                          selectedIds.includes(gym.id) ? 'bg-violet-950/15' : ''
                        }`}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={selectedIds.includes(gym.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, gym.id])
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== gym.id))
                              }
                            }}
                            className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-200 group-hover:text-primary transition-colors">{gym.name}</span>
                            <span className="text-xs text-slate-400">{gym.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-indigo-400">
                          {gym.subdomain}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                            gym.plan === 'Enterprise' 
                              ? 'bg-purple-950/40 text-purple-400 border-purple-500/20' 
                              : gym.plan === 'Pro' 
                              ? 'bg-blue-950/40 text-blue-400 border-blue-500/20' 
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}>
                            {gym.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5 w-[140px]">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Members</span>
                              <span>{gym.activeMembers} / {gym.maxMembersLimit}</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (gym.activeMembers / gym.maxMembersLimit) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-300">
                          {gym.branchesCount} <span className="text-[10px] text-slate-500">/ {gym.maxBranchesLimit} max</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider ${
                            gym.status === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : gym.status === 'suspended' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {gym.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 hover:bg-slate-800 font-bold text-xs"
                              onClick={() => setSelectedTenant(gym)}
                            >
                              Config
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-2 border-violet-500/20 text-violet-400 hover:bg-violet-500/10 font-bold text-xs flex items-center gap-1"
                              onClick={() => handleOpenImpersonation(gym.id)}
                            >
                              <Play className="h-3 w-3" />
                              Impersonate
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-violet-400 hover:bg-slate-800"
                              title="Notify Gym"
                              onClick={() => {
                                setNotifyTargetIds([gym.id])
                                setIsNotifyOpen(true)
                              }}
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-800"
                              title="Delete Gym"
                              onClick={() => {
                                setDeleteTargetIds([gym.id])
                                setIsDeleteOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* ──────── TAB 3: BILLING PLANS CONFIGURATION ──────── */}
        {activeTab === 'plans' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-indigo-500" />
                  Subscription Plans Configurations
                </h2>
                <p className="text-xs text-slate-400">Configure global tenant caps and active database features allowed per subscription plan tier.</p>
              </div>
              <Button className="gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Add Pricing Plan
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Basic Card */}
              <Card className="border border-slate-800 bg-slate-900/30 flex flex-col justify-between overflow-hidden relative">
                <CardHeader className="bg-slate-900 p-6 border-b border-slate-800">
                  <Badge className="bg-slate-800 text-slate-300 w-fit mb-2">Tier 1</Badge>
                  <CardTitle className="text-xl font-bold">GymFlow Basic</CardTitle>
                  <div className="mt-2 text-2xl font-black text-slate-100">$49 <span className="text-xs font-normal text-slate-500">/ month</span></div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Max Members Allowed</span>
                      <span className="font-bold">150 active</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Max Branches Cap</span>
                      <span className="font-bold">1 branch</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Staff Management HR</div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Basic Attendance Desk</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500"><X className="h-3.5 w-3.5" /> POS Supplement Registers</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500"><X className="h-3.5 w-3.5" /> Inventory & Wastage CRM</div>
                  </div>
                </CardContent>
              </Card>

              {/* Pro Card */}
              <Card className="border border-violet-500/20 bg-slate-900/30 flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-violet-600 text-slate-50 text-[9px] font-black uppercase px-3 py-1 rounded-bl">Popular</div>
                <CardHeader className="bg-slate-900 p-6 border-b border-slate-800">
                  <Badge className="bg-violet-950 text-violet-400 w-fit mb-2">Tier 2</Badge>
                  <CardTitle className="text-xl font-bold">GymFlow Professional</CardTitle>
                  <div className="mt-2 text-2xl font-black text-slate-100">$149 <span className="text-xs font-normal text-slate-500">/ month</span></div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Max Members Allowed</span>
                      <span className="font-bold">500 active</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Max Branches Cap</span>
                      <span className="font-bold">3 branches</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Staff Management HR</div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Advanced Attendance Desk</div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> POS Supplement Registers</div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Inventory & Wastage CRM</div>
                  </div>
                </CardContent>
              </Card>

              {/* Enterprise Card */}
              <Card className="border border-slate-800 bg-slate-900/30 flex flex-col justify-between overflow-hidden relative">
                <CardHeader className="bg-slate-900 p-6 border-b border-slate-800">
                  <Badge className="bg-cyan-950 text-cyan-400 w-fit mb-2">Tier 3</Badge>
                  <CardTitle className="text-xl font-bold">GymFlow Enterprise</CardTitle>
                  <div className="mt-2 text-2xl font-black text-slate-100">$399 <span className="text-xs font-normal text-slate-500">/ month</span></div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Max Members Allowed</span>
                      <span className="font-bold">2,000 active</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Max Branches Cap</span>
                      <span className="font-bold">10 branches</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Unlimited Staff Management</div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Advanced Attendance Desk</div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> POS Supplement Registers</div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Multi-location Data sync & Reports</div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* ──────── TAB 4: SYSTEM FEATURE FLAGS ──────── */}
        {activeTab === 'flags' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                Global & Tenant Feature Flags
              </h2>
              <p className="text-xs text-slate-400">Control beta feature releases across tenant cohorts dynamically without code changes.</p>
            </div>

            <div className="grid gap-6">
              {globalFlags.map(flag => (
                <Card key={flag.id} className="border border-slate-800 bg-slate-900/30 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{flag.name}</span>
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider">{flag.id}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">{flag.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-slate-500 font-bold">Beta Tenants:</span>
                      {flag.betaTenants.length > 0 ? (
                        flag.betaTenants.map(bt => (
                          <Badge key={bt} variant="secondary" className="text-[8px] bg-slate-800 text-slate-300 border-none">{bt}</Badge>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-600">None (Globally Active)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Button 
                      variant={flag.activeGlobally ? 'default' : 'outline'}
                      size="sm"
                      className="font-bold text-xs"
                      onClick={() => {
                        setGlobalFlags(globalFlags.map(f => f.id === flag.id ? { ...f, activeGlobally: !f.activeGlobally } : f))
                      }}
                    >
                      {flag.activeGlobally ? 'Active Globally' : 'Inactive (Beta Only)'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ──────── TAB 5: SYSTEM TELEMETRY LOGS & JOBS ──────── */}
        {activeTab === 'logs' && (
          <div className="grid gap-8 lg:grid-cols-3 animate-in fade-in duration-300">
            
            {/* Logs Viewer */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  Live Platform Logs telemetry
                </h2>
                <p className="text-xs text-slate-400">Real-time error monitoring and warning logs across the SaaS platform.</p>
              </div>

              <div className="space-y-3">
                {logs.map(log => (
                  <Card 
                    key={log.id} 
                    className={`border border-slate-800 bg-slate-900/30 p-4 transition-all ${
                      expandedLogId === log.id ? 'ring-1 ring-violet-500' : ''
                    }`}
                  >
                    <div 
                      className="flex items-start justify-between gap-4 cursor-pointer"
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[9px] font-black uppercase ${
                            log.level === 'ERROR' 
                              ? 'bg-rose-950/40 text-rose-400' 
                              : log.level === 'WARNING' 
                              ? 'bg-amber-950/40 text-amber-400' 
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {log.level}
                          </Badge>
                          <span className="text-xs font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="text-xs font-bold text-indigo-400">{log.tenant}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 mt-1">{log.message}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {log.id}</span>
                    </div>

                    {/* Expanded Log Stack Trace Panel */}
                    {expandedLogId === log.id && (
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {log.stackTrace && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Stack Trace</span>
                            <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded border border-slate-800 text-rose-400/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {log.stackTrace}
                            </pre>
                          </div>
                        )}
                        {log.context && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Request Context Payload</span>
                            <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded border border-slate-800 text-cyan-400 overflow-x-auto">
                              {JSON.stringify(JSON.parse(log.context), null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Scheduled Jobs Monitor */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Scheduled Job Queue
                </h2>
                <p className="text-xs text-slate-400">Re-trigger or monitor asynchronous cron tasks and Stripe billing loops.</p>
              </div>

              <div className="space-y-4">
                {jobs.map(job => (
                  <Card key={job.id} className="border border-slate-800 bg-slate-900/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-200 block">{job.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Tenant: {job.tenant}</span>
                      </div>
                      <Badge className={`text-[9px] font-black uppercase ${
                        job.status === 'success' 
                          ? 'bg-emerald-950/40 text-emerald-400' 
                          : job.status === 'failed' 
                          ? 'bg-rose-950/40 text-rose-400' 
                          : job.status === 'running' 
                          ? 'bg-violet-950/40 text-violet-400 animate-pulse' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {job.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400">Scheduled: {new Date(job.scheduledFor).toLocaleTimeString()}</span>
                      {job.status === 'failed' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2 border-violet-500/20 text-violet-400 hover:bg-violet-500/10 font-bold text-[10px]"
                          onClick={() => handleRetryJob(job.id)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry Job
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ──────── TAB 6: SYSTEM EDITOR ──────── */}
        {activeTab === 'editor' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-indigo-500" />
                  System Configuration Code Workspace
                </h2>
                <p className="text-xs text-slate-400">Inspect and directly modify system configurations and source code files live from the browser.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewItemIsFolder(false)
                    setIsNewItemModalOpen(true)
                  }}
                  className="h-8 border-slate-800 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> New File
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewItemIsFolder(true)
                    setIsNewItemModalOpen(true)
                  }}
                  className="h-8 border-slate-800 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Folder
                </Button>
              </div>
            </div>

            <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <span className="font-extrabold text-white block mb-0.5">WARNING: High-Risk Support Override Console</span>
                Modifying environment parameters, server code, or bundler configs can cause immediate platform crashes or database connection drops. Ensure syntax validation before saving.
              </div>
            </div>

            {/* Path Breadcrumbs */}
            <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-500 font-bold">Location:</span>
              <button 
                onClick={() => fetchDirectory('.')}
                className="text-indigo-400 hover:underline"
              >
                root
              </button>
              {currentPath !== '.' && currentPath.split('/').map((segment, idx, arr) => {
                const stepPath = arr.slice(0, idx + 1).join('/')
                return (
                  <React.Fragment key={idx}>
                    <span className="text-slate-600">/</span>
                    <button 
                      onClick={() => fetchDirectory(stepPath)}
                      className="text-indigo-400 hover:underline"
                    >
                      {segment}
                    </button>
                  </React.Fragment>
                )
              })}
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              
              {/* File Selector Sidebar */}
              <Card className="border-none bg-slate-900/40 p-4 flex flex-col gap-3 min-h-[500px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">File Explorer</h3>
                  {currentPath !== '.' && (
                    <button
                      onClick={() => {
                        const parts = currentPath.split('/')
                        parts.pop()
                        fetchDirectory(parts.join('/') || '.')
                      }}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-bold"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[600px] flex-1">
                  {explorerLoading ? (
                    <div className="text-xs text-slate-500 text-center py-8">Loading folder...</div>
                  ) : explorerFiles.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-8">Empty directory</div>
                  ) : (
                    explorerFiles.map(f => (
                      <div
                        key={f.path}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all group ${
                          selectedFile === f.path 
                            ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <button
                          onClick={() => handleSelectItem(f)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          {f.isDirectory ? (
                            <Folder className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500/20 shrink-0" />
                          ) : (
                            <File className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          )}
                          <span className="truncate">{f.name}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteItem(f.path)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5 transition-opacity"
                          title={`Delete ${f.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Editor Workspace */}
              <div className="md:col-span-3 flex flex-col gap-4">
                <Card className="border-none bg-slate-950 overflow-hidden flex flex-col flex-1 shadow-2xl min-h-[500px]">
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-violet-400 truncate max-w-[300px]">
                      {selectedFile ? selectedFile : 'No file selected'}
                    </span>
                    <div className="flex items-center gap-3">
                      {editorSuccess && <span className="text-xs text-emerald-400 font-bold animate-pulse">{editorSuccess}</span>}
                      {editorError && <span className="text-xs text-rose-400 font-bold">{editorError}</span>}
                      {selectedFile && (
                        <Button
                          size="sm"
                          disabled={editorLoading || editorSaving}
                          onClick={handleSaveFileContent}
                          className="h-8 font-bold bg-violet-600 hover:bg-violet-500 text-slate-50 text-xs gap-1.5"
                        >
                          {editorSaving ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {editorSaving ? 'Saving...' : 'Save File'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 min-h-[500px]">
                    {editorLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                        <RefreshCw className="h-8 w-8 text-violet-500 animate-spin" />
                      </div>
                    ) : !selectedFile ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-2">
                        <File className="h-10 w-10 opacity-30" />
                        <p className="text-xs font-mono">Select a file from the explorer sidebar to modify it</p>
                      </div>
                    ) : (
                      <textarea
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                        spellCheck="false"
                        className="w-full h-full min-h-[500px] p-6 font-mono text-xs text-slate-300 bg-slate-950 focus:outline-none resize-none leading-relaxed border-none focus:ring-0"
                        style={{ fontFamily: 'Fira Code, JetBrains Mono, source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace' }}
                      />
                    )}
                  </div>
                </Card>
              </div>

            </div>

            {/* Creation Modal */}
            {isNewItemModalOpen && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100">
                      Create New {newItemIsFolder ? 'Folder' : 'File'}
                    </h3>
                    <button onClick={() => setIsNewItemModalOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateNewItem} className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemName">Name</Label>
                      <Input
                        id="itemName"
                        required
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={newItemIsFolder ? 'my-folder' : 'script.js'}
                        className="bg-slate-950 border-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => setIsNewItemModalOpen(false)} className="text-xs h-8">
                        Cancel
                      </Button>
                      <Button type="submit" className="text-xs h-8 bg-violet-600 hover:bg-violet-500">
                        Create
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ──────── MODAL 1: PROVISION NEW TENANT WIZARD ──────── */}
        {isNewTenantOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Provision Customer Gym Tenant</h3>
                  <p className="text-xs text-slate-400">Add subdomain endpoints and isolate transactional data.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsNewTenantOpen(false)} className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateTenantSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gymName">Gym Identity Display Name *</Label>
                  <Input 
                    id="gymName" 
                    required 
                    value={newTenantData.name}
                    onChange={(e) => setNewTenantData({ ...newTenantData, name: e.target.value })}
                    placeholder="e.g. Paramount Physical Fitness" 
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug">Subdomain slug</Label>
                    <Input 
                      id="slug" 
                      value={newTenantData.subdomain}
                      onChange={(e) => setNewTenantData({ ...newTenantData, subdomain: e.target.value })}
                      placeholder="paramount.gymflow.app" 
                      className="bg-slate-950 border-slate-800 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planSelect">Subscription Tier Plan *</Label>
                    <select 
                      id="planSelect"
                      value={newTenantData.plan}
                      onChange={(e) => setNewTenantData({ ...newTenantData, plan: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-md border border-slate-800 bg-slate-950 text-sm focus:outline-none"
                    >
                      <option value="Basic">Basic Plan ($49/mo)</option>
                      <option value="Pro">Pro Plan ($149/mo)</option>
                      <option value="Enterprise">Enterprise Plan ($399/mo)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Support Contact Email *</Label>
                    <Input 
                      id="email" 
                      required 
                      type="email"
                      value={newTenantData.email}
                      onChange={(e) => setNewTenantData({ ...newTenantData, email: e.target.value })}
                      placeholder="admin@paramount.com" 
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Direct Support Phone</Label>
                    <Input 
                      id="phone" 
                      value={newTenantData.phone}
                      onChange={(e) => setNewTenantData({ ...newTenantData, phone: e.target.value })}
                      placeholder="+1 (555) 123-9999" 
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Physical HQ Address *</Label>
                  <Input 
                    id="address" 
                    required 
                    value={newTenantData.address}
                    onChange={(e) => setNewTenantData({ ...newTenantData, address: e.target.value })}
                    placeholder="e.g. 789 Broadway Blvd, Ste C" 
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setIsNewTenantOpen(false)} className="border-slate-800 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" className="font-bold">
                    Deploy Tenant DB Isolation
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────── MODAL 2: TENANT DETAIL SLIDE-OVER / CARD DRAWER ──────── */}
        {selectedTenant && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-end">
            <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
              
              <div className="p-6 border-b border-slate-800 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-100">{selectedTenant.name}</h3>
                    <Badge className="bg-violet-950 text-violet-400 uppercase text-[9px]">{selectedTenant.plan}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">Tenant ID: {selectedTenant.id}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTenant(null)} className="h-8 w-8 text-slate-400 hover:text-slate-100">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-6 flex-1">
                
                {/* Impersonate Actions Panel */}
                <div className="bg-violet-950/20 border border-violet-500/20 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-violet-400 font-bold text-sm">
                    <Shield className="h-4 w-4 text-violet-400" />
                    Secure Support Impersonation Mode
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    Enter safe mode to log into this tenant&apos;s Gym Portal. All staff views and check-ins will display as read-only.
                  </p>
                  <Button 
                    className="w-full gap-2 font-bold bg-violet-600 hover:bg-violet-500 text-slate-50"
                    onClick={() => handleOpenImpersonation(selectedTenant.id)}
                  >
                    <Play className="h-4 w-4" />
                    Launch Portal Support Impersonation
                  </Button>
                </div>

                {/* Hard Limit Custom Sliders */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5" /> Limit Controls & Overrides
                  </h4>

                  <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Max Member Enrollment Limit</span>
                      <span className="font-mono font-bold text-indigo-400">{selectedTenant.maxMembersLimit} active members</span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="5000" 
                      step="50"
                      value={selectedTenant.maxMembersLimit} 
                      onChange={(e) => handleSaveTenantLimits({
                        ...selectedTenant, 
                        maxMembersLimit: parseInt(e.target.value)
                      })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                      <span>100 min</span>
                      <span>5,000 max</span>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Max Branches Location Cap</span>
                      <span className="font-mono font-bold text-indigo-400">{selectedTenant.maxBranchesLimit} branches</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={selectedTenant.maxBranchesLimit} 
                      onChange={(e) => handleSaveTenantLimits({
                        ...selectedTenant, 
                        maxBranchesLimit: parseInt(e.target.value)
                      })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                      <span>1 branch min</span>
                      <span>20 branches max</span>
                    </div>
                  </div>
                </div>

                {/* Subdomain & Metadata Info */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Tenant Metadata</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-500 block">Support Domain URL</span>
                      <span className="font-semibold text-slate-300 font-mono">{selectedTenant.subdomain}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block">Pricing Tier Plan</span>
                      <select 
                        value={selectedTenant.plan} 
                        onChange={(e) => handleSaveTenantLimits({
                          ...selectedTenant, 
                          plan: e.target.value as any
                        })}
                        className="h-8 px-2 rounded border border-slate-800 bg-slate-950 text-xs focus:outline-none w-full"
                      >
                        <option value="Basic">Basic Plan</option>
                        <option value="Pro">Pro Plan</option>
                        <option value="Enterprise">Enterprise Plan</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block">Created On</span>
                      <span className="font-semibold text-slate-300">{formatDate(selectedTenant.createdAt)}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block">Isolation Status</span>
                      <select 
                        value={selectedTenant.status} 
                        onChange={(e) => handleSaveTenantLimits({
                          ...selectedTenant, 
                          status: e.target.value as any
                        })}
                        className="h-8 px-2 rounded border border-slate-800 bg-slate-950 text-xs focus:outline-none w-full font-bold"
                      >
                        <option value="active">Active System</option>
                        <option value="suspended">Suspended DB</option>
                        <option value="pending">Provisioning Queue</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
                <Button 
                  variant="destructive" 
                  className="bg-red-950/60 border border-red-500/30 text-red-400 hover:bg-red-900/60 font-bold text-xs"
                  onClick={() => {
                    setDeleteTargetIds([selectedTenant.id])
                    setIsDeleteOpen(true)
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Tenant
                </Button>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    className="border-violet-500/20 text-violet-400 hover:bg-violet-500/10 font-bold text-xs"
                    onClick={() => {
                      setNotifyTargetIds([selectedTenant.id])
                      setIsNotifyOpen(true)
                    }}
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    Send Notification
                  </Button>
                  <Button onClick={() => setSelectedTenant(null)} className="font-bold text-xs">
                    Close Details
                  </Button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Send Notification Modal */}
        {isNotifyOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Send System Notification</h3>
                  <p className="text-xs text-slate-400">Broadcast notification to {notifyTargetIds.length} target tenant(s).</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsNotifyOpen(false)} className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notifyTitle">Notification Title *</Label>
                  <Input 
                    id="notifyTitle" 
                    required 
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="e.g., Platform Maintenance Window" 
                    className="bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notifyMessage">Message Content *</Label>
                  <textarea 
                    id="notifyMessage" 
                    required
                    rows={4}
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Write detailed system announcement details..." 
                    className="w-full rounded-md border border-slate-800 bg-slate-950 text-sm p-3 focus:outline-none text-slate-100 focus:border-violet-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setIsNotifyOpen(false)} className="border-slate-800 hover:bg-slate-800 font-bold text-xs">
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSendNotifications}
                    className="font-bold bg-violet-600 hover:bg-violet-500 text-slate-50 text-xs"
                  >
                    Send Announcement
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/20 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                  <h3 className="text-lg font-bold">Confirm Deletion</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsDeleteOpen(false)} className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Are you absolutely sure you want to delete <span className="font-bold text-white">{deleteTargetIds.length} selected tenant(s)</span>? 
                  This will permanently delete all isolated tables and database records for this tenant. This operation is irreversible.
                </p>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="border-slate-800 hover:bg-slate-800 font-bold text-xs">
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleDeleteAction}
                    className="font-bold bg-red-600 hover:bg-red-500 text-white text-xs"
                  >
                    Permanently Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedLayout>
  )
}
