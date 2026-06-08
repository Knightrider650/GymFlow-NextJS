'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  UserCheck, 
  Calendar, 
  CreditCard, 
  Clock, 
  QrCode, 
  LogOut, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Lock,
  Activity,
  User
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, formatDate, formatDateTime, getStatusBadgeColor } from '@/utils/format'
import { QRCodeSVG } from 'qrcode.react'

interface MemberData {
  id: string
  name: string
  email: string
  phone: string
  status: string
  membershipType?: string | null
  joinDate?: string | Date
  expiryDate: string | Date
  address?: string | null
  plan?: {
    name: string
    price: number
    features: string
    durationMonths: number
  } | null
}

export default function MemberPortal() {
  const [emailInput, setEmailInput] = useState('')
  const [selectedDemoEmail, setSelectedDemoEmail] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [member, setMember] = useState<MemberData | null>(null)
  
  const [attendance, setAttendance] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  
  const [activeTab, setActiveTab] = useState('overview')
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const fetchPortalData = async (memberId: string) => {
    try {
      const [attendanceRes, invoicesRes, classesRes] = await Promise.all([
        apiClient.get('/api/attendance'),
        apiClient.get('/api/billing'),
        apiClient.get('/api/classes')
      ])
      
      if (attendanceRes.success) {
        const filteredAttendance = (attendanceRes.data || []).filter((a: any) => a.memberId === memberId)
        setAttendance(filteredAttendance)
      }
      if (invoicesRes.success) {
        const filteredInvoices = (invoicesRes.data || []).filter((i: any) => i.memberId === memberId)
        setInvoices(filteredInvoices)
      }
      if (classesRes.success) {
        setClasses(classesRes.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      setIsInitialLoading(true)
      const savedMemberId = localStorage.getItem('gymflow_member_id')
      if (savedMemberId) {
        try {
          const res = await apiClient.get(`/api/members/${savedMemberId}`)
          if (res.success && res.data) {
            setMember(res.data)
            await fetchPortalData(res.data.id)
          } else {
            localStorage.removeItem('gymflow_member_id')
          }
        } catch (err) {
          console.error('Failed to load session:', err)
          localStorage.removeItem('gymflow_member_id')
        }
      }
      setIsInitialLoading(false)
    }
    checkSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailToAuth = selectedDemoEmail || emailInput.trim()
    if (!emailToAuth) {
      setLoginError('Please enter or select an email address')
      return
    }

    setIsLoggingIn(true)
    setLoginError('')
    try {
      const membersRes = await apiClient.get('/api/members')
      if (membersRes.success) {
        const matched = (membersRes.data || []).find((m: any) => m.email.toLowerCase() === emailToAuth.toLowerCase())
        if (matched) {
          // Resolve full member profile
          const profileRes = await apiClient.get(`/api/members/${matched.id}`)
          if (profileRes.success && profileRes.data) {
            setMember(profileRes.data)
            localStorage.setItem('gymflow_member_id', profileRes.data.id)
            await fetchPortalData(profileRes.data.id)
          }
        } else {
          setLoginError('No member account found with this email address')
        }
      } else {
        setLoginError('Failed to verify credentials. Please try again.')
      }
    } catch (err: any) {
      setLoginError(err.message || 'An error occurred during login')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('gymflow_member_id')
    setMember(null)
    setAttendance([])
    setInvoices([])
    setEmailInput('')
    setSelectedDemoEmail('')
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-ping absolute"></div>
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,200,255,0.4)] relative">
          <span className="text-2xl font-black text-slate-950">G</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 animate-pulse mt-8">Loading Portal...</p>
      </div>
    )
  }

  // --- LOGIN SCREEN ---
  if (!member) {
    return (
      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-background to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Logo & Header */}
          <div className="text-center">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,200,255,0.3)] mx-auto mb-4 scale-110">
              <span className="text-2xl font-black text-slate-950">💪</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-400 to-blue-500 bg-clip-text text-transparent">
              GymFlow Member Portal
            </h1>
            <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-bold">
              Self-Service Plan, Check-in & Payments
            </p>
          </div>

          <Card className="border-none bg-slate-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Lock className="h-4 w-4 text-primary" />
                Member Authentication
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Enter your registered gym email address to access your profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Demo Quick Access Selector */}
                <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                  <Label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Demo Sandbox Access
                  </Label>
                  <select 
                    className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 text-xs px-2.5 text-slate-200 outline-none"
                    value={selectedDemoEmail}
                    onChange={(e) => {
                      setSelectedDemoEmail(e.target.value)
                      setEmailInput('')
                    }}
                  >
                    <option value="">-- Select Pre-seeded Profile --</option>
                    <option value="john@example.com">John Doe (Premium Plan - Expired)</option>
                    <option value="jane@example.com">Jane Smith (Basic Plan - Expired)</option>
                  </select>
                </div>

                {!selectedDemoEmail && (
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs text-slate-300">Registered Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="e.g. john@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 h-10 text-sm focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {loginError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoggingIn}
                  className="w-full bg-primary hover:bg-primary/90 text-slate-950 font-bold h-10 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? 'Verifying...' : 'Access Dashboard'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --- MEMBER DASHBOARD ---
  const isPlanExpired = member.status === 'expired' || (member.expiryDate && new Date(member.expiryDate) < new Date())

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-slate-950 shadow-md">
              💪
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">GymFlow Member Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline">Welcome, <span className="font-semibold text-white">{member.name}</span></span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 gap-1.5 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow space-y-8 w-full">
        {/* Profile Card Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Member Info details */}
          <Card className="border-none bg-slate-900/40 backdrop-blur-md md:col-span-2 relative overflow-hidden flex flex-col justify-between p-6">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <User className="h-32 w-32" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/20 text-primary font-bold text-lg rounded-full flex items-center justify-center shadow-inner">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{member.name}</h2>
                  <p className="text-xs text-slate-400">Member ID: {member.id}</p>
                </div>
              </div>
              <Badge 
                className={`w-fit text-xs font-bold py-1 px-3 ${
                  isPlanExpired 
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                }`}
              >
                {isPlanExpired ? 'Membership Expired' : 'Active Member'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-sm">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Email Contact</span>
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  {member.email}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Phone Contact</span>
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  {member.phone || 'No phone set'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Gym Address</span>
                <span className="font-semibold text-slate-200 flex items-center gap-2 truncate">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {member.address || 'No address set'}
                </span>
              </div>
            </div>
          </Card>

          {/* QR Code Check-in card */}
          <Card className="border-none bg-gradient-to-br from-indigo-950/40 to-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h3 className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-1.5">
              <QrCode className="h-4 w-4 text-primary" />
              Check-In Pass QR
            </h3>
            <div className="bg-white p-3.5 rounded-2xl shadow-lg shadow-black/40 border border-white/10 scale-95">
              <QRCodeSVG value={member.id} size={110} />
            </div>
            <p className="text-[10px] text-slate-400 mt-3 max-w-[200px]">
              Scan this QR code at the desk scanner for quick attendance check-in.
            </p>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/50 p-1 border border-white/5 h-12">
            <TabsTrigger value="overview" className="px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-slate-950 font-bold text-xs gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Membership Plan
            </TabsTrigger>
            <TabsTrigger value="attendance" className="px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-slate-950 font-bold text-xs gap-2">
              <Clock className="h-3.5 w-3.5" />
              Check-In History
            </TabsTrigger>
            <TabsTrigger value="billing" className="px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-slate-950 font-bold text-xs gap-2">
              <CreditCard className="h-3.5 w-3.5" />
              Invoice Logs
            </TabsTrigger>
            <TabsTrigger value="classes" className="px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-slate-950 font-bold text-xs gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Classes List
            </TabsTrigger>
          </TabsList>

          {/* Overview / Membership Plan */}
          <TabsContent value="overview">
            <Card className="border-none bg-slate-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg">Membership Plan details</CardTitle>
                <CardDescription>Verify your subscription benefits and key date durations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Expired alert warning */}
                {isPlanExpired && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Subscription Expired</h4>
                      <p className="text-xs text-rose-300/80 mt-1">
                        Your membership status is currently Expired. Please contact gym administration or make a renewal payment to reactivate check-in credentials.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-bold">Plan Category</span>
                        <div className="text-lg font-bold text-white mt-0.5">{member.membershipType || 'Standard Plan'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 font-bold">Join Date</span>
                          <div className="font-mono text-sm text-slate-200 mt-0.5">{formatDate(member.joinDate)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 font-bold">Expiration Date</span>
                          <div className={`font-mono text-sm font-bold mt-0.5 ${isPlanExpired ? 'text-rose-500 animate-pulse' : 'text-slate-200'}`}>
                            {formatDate(member.expiryDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 h-full flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-bold">Membership Rules & Benefits</span>
                        <ul className="text-xs text-slate-300 space-y-2 mt-3 list-disc list-inside">
                          <li>Access to standard gym weights & locker rooms</li>
                          <li>Scan QR code pass at front desk to register check-in</li>
                          <li>Automatic check-out recorded on gym exit</li>
                          <li>View invoice receipts in Billing tab</li>
                        </ul>
                      </div>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-slate-950 font-bold text-xs mt-4">
                        Renew Membership
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Check-In History */}
          <TabsContent value="attendance">
            <Card className="border-none bg-slate-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Attendance Check-In Logs
                </CardTitle>
                <CardDescription>List of recent check-ins recorded at the branch desk</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendance.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No recent check-in logs registered.</p>
                  ) : (
                    attendance.map((log) => (
                      <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all gap-4">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>Check-In Recorded</span>
                            <Badge className="bg-slate-800 text-slate-400 border-none font-mono text-[9px]">ID: {log.id.slice(0, 8)}</Badge>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Check-in: <span className="font-semibold text-slate-200">{formatDateTime(log.checkInTime, 'MMM dd, yyyy • hh:mm a')}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {log.checkOutTime ? (
                            <div>
                              <Badge className="bg-green-500/10 text-green-500 border-none">Checked Out</Badge>
                              <div className="text-[10px] text-slate-400 mt-1">
                                Duration: {log.checkOutTime ? new Date(new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime()).getUTCMinutes() : '—'} mins
                              </div>
                            </div>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-500 border-none animate-pulse">Checked In</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Logs */}
          <TabsContent value="billing">
            <Card className="border-none bg-slate-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg">Subscription Invoices</CardTitle>
                <CardDescription>Track billing history, receipts, and pending invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No billing history found.</p>
                  ) : (
                    invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all gap-4">
                        <div>
                          <div className="font-bold text-white text-sm">{inv.invoiceNumber || `INV-${inv.id.slice(0, 6).toUpperCase()}`}</div>
                          <div className="text-[10px] text-slate-400 mt-1">Date: {formatDate(inv.invoiceDate)}</div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <span className="font-mono text-sm font-bold text-white block">{formatCurrency(inv.amount)}</span>
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${getStatusBadgeColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Class Schedule */}
          <TabsContent value="classes">
            <Card className="border-none bg-slate-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg">Fitness Class Schedules</CardTitle>
                <CardDescription>Join or browse scheduled group classes available at the branch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {classes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center col-span-2 py-10">No scheduled fitness classes found.</p>
                  ) : (
                    classes.map((cls) => {
                      const utilPct = cls.maxCapacity > 0 ? Math.round((cls.currentEnrollment / cls.maxCapacity) * 100) : 0
                      return (
                        <div key={cls.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-white text-base">{cls.name}</h4>
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">{cls.days || 'Daily'}</Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{cls.description || 'No description provided.'}</p>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-white/5 text-xs text-slate-300">
                            <div className="flex justify-between">
                              <span>Instructor</span>
                              <span className="font-semibold text-white">{cls.instructorName || 'Mike Tyson'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Schedule Time</span>
                              <span className="font-semibold text-white">{cls.time || '10:00 AM'}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Capacity ({cls.currentEnrollment} / {cls.maxCapacity})</span>
                                <span>{utilPct}% full</span>
                              </div>
                              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${utilPct}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
