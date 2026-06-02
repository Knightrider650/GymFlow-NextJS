'use client'

import { useEffect, useState, useRef } from 'react'
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
import { useAttendance, useMembers, useBranches, usePagination } from '@/hooks'
import { formatDateTime, calculateDuration, formatDuration } from '@/utils/format'
import { Plus, LogOut, Search, Filter, MapPin, Camera, CheckCircle, AlertTriangle, Volume2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'
import { useGymStore } from '@/lib/store'

export default function AttendancePage() {
  const { attendance, isLoading, fetchAttendance, checkInMember, checkOutMember } = useAttendance()
  const { members, fetchMembers } = useMembers()
  const { branches, fetchBranches } = useBranches()
  const settings = useGymStore(state => state.settings)
  const fetchSettings = useGymStore(state => state.fetchSettings)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [notes, setNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  
  // Scanner state variables
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanStatus, setScanStatus] = useState<{
    type: 'checkin' | 'checkout' | 'error'
    title: string
    details: string
    warning?: string | null
    duration?: string
  } | null>(null)

  const scannerRef = useRef<any>(null)

  // Synthesize a beep using browser Web Audio API (cross-browser support)
  const playBeep = (type: 'success' | 'checkout' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime) // High pleasant pitch
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
      } else if (type === 'checkout') {
        osc.frequency.setValueAtTime(660, ctx.currentTime) // Slightly lower tone
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      } else {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(220, ctx.currentTime) // Low buzzer error tone
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch (e) {
      console.warn('Audio Context is not allowed or supported', e)
    }
  }

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return
    setIsProcessing(true)

    try {
      const result = (await apiClient.post('/api/attendance/scan', { memberId: decodedText })) as any

      if (result.success) {
        const record = result.data
        if (result.action === 'checkin') {
          playBeep('success')
          setScanStatus({
            type: 'checkin',
            title: 'Checked In Successfully!',
            details: `Welcome back, ${record.memberName}!`,
            warning: result.warning
          })
        } else {
          playBeep('checkout')
          const duration = record.checkOutTime
            ? formatDuration(calculateDuration(record.checkInTime, record.checkOutTime))
            : ''
          setScanStatus({
            type: 'checkout',
            title: 'Checked Out Successfully!',
            details: `Goodbye, ${record.memberName}!`,
            duration: duration ? `Duration: ${duration}` : undefined
          })
        }
        await fetchAttendance()
      } else {
        playBeep('error')
        setScanStatus({
          type: 'error',
          title: 'Scan Refused',
          details: result.error || 'Failed to process check-in.'
        })
      }
    } catch (error) {
      playBeep('error')
      setScanStatus({
        type: 'error',
        title: 'Network Error',
        details: 'Failed to communicate with scanner server.'
      })
    } finally {
      // Hold status overlay for 3 seconds, then clear and allow next scan
      setTimeout(() => {
        setScanStatus(null)
        setIsProcessing(false)
      }, 3000)
    }
  }

  // Camera scanner hook controller
  useEffect(() => {
    let activeScanner: any = null

    if (isScannerOpen) {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        const scanner = new Html5Qrcode('qr-reader')
        activeScanner = scanner
        scannerRef.current = scanner

        scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7
              return { width: size, height: size }
            }
          },
          (decodedText) => {
            handleScanSuccess(decodedText)
          },
          () => {
            // silent scan fail
          }
        ).catch(err => {
          console.error('Error starting camera scanner:', err)
        })
      })
    }

    return () => {
      if (activeScanner) {
        if (activeScanner.isScanning) {
          activeScanner.stop().then(() => {
            activeScanner.clear()
          }).catch((err: any) => console.error('Error stopping camera:', err))
        }
      }
    }
  }, [isScannerOpen])

  useEffect(() => {
    fetchAttendance()
    fetchMembers()
    fetchBranches()
    fetchSettings()
  }, [fetchAttendance, fetchMembers, fetchBranches, fetchSettings])

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMemberId) {
      await checkInMember(selectedMemberId, notes)
      setIsDialogOpen(false)
      setSelectedMemberId('')
      setNotes('')
      await fetchAttendance()
    }
  }

  const handleCheckOut = async (attendanceId: string) => {
    await checkOutMember(attendanceId)
    await fetchAttendance()
  }

  const filteredAttendance = attendance.filter(record => {
    const matchesSearch = record.memberName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBranch = selectedBranch === 'all' || (record as any).branchId === selectedBranch
    return matchesSearch && matchesBranch
  })

  const {
    currentPage,
    totalPages,
    currentItems: paginatedAttendance,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination(filteredAttendance, 10)

  const todayAttendance = filteredAttendance.filter(record => {
    const timeZone = settings?.timeZone || 'UTC'
    const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    return record.recordedDate.startsWith(today)
  })

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track member check-ins and check-outs
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[180px] border-none bg-transparent focus:ring-0">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="gap-2 w-fit border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm"
              onClick={() => setIsScannerOpen(true)}
            >
              <Camera className="h-4 w-4 text-primary" />
              Scan Member QR
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-fit">
                  <Plus className="h-4 w-4" />
                  Check-in Member
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Check-in Member</DialogTitle>
                <DialogDescription>
                  Record member arrival at the gym
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div>
                  <Label htmlFor="member">Select Member *</Label>
                  <select
                    id="member"
                    aria-label="Select member"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input text-sm"
                    required
                  >
                    <option value="">-- Select a member --</option>
                    {members
                      .filter(m => m.status === 'active' && (selectedBranch === 'all' || m.branchId === selectedBranch))
                      .map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes..."
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    Check-in
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Today's Attendence Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Check-ins</p>
                <p className="text-2xl font-bold">{todayAttendance.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checked Out</p>
                <p className="text-2xl font-bold">
                  {todayAttendance.filter(r => r.checkOutTime).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Currently in Gym</p>
                <p className="text-2xl font-bold">
                  {todayAttendance.filter(r => !r.checkOutTime).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search by member name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Member Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Check-out Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {isLoading ? 'Loading records...' : 'No attendance records found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.memberName}</TableCell>
                        <TableCell>{record.recordedDate}</TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(record.checkInTime, 'HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.checkOutTime ? formatDateTime(record.checkOutTime, 'HH:mm:ss') : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.checkOutTime
                            ? formatDuration(calculateDuration(record.checkInTime, record.checkOutTime))
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.notes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {!record.checkOutTime && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCheckOut(record.id)}
                              className="gap-1"
                            >
                              <LogOut className="h-4 w-4" />
                              Check-out
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
                  Showing {Math.min((currentPage - 1) * 10 + 1, filteredAttendance.length)} to {Math.min(currentPage * 10, filteredAttendance.length)} of {filteredAttendance.length} records
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

        {/* QR Scanner Dialog */}
        <Dialog open={isScannerOpen} onOpenChange={(open) => {
          setIsScannerOpen(open)
          if (!open) {
            setScanStatus(null)
            setIsProcessing(false)
          }
        }}>
          <DialogContent className="sm:max-w-[480px] bg-slate-950 border-slate-800 text-white overflow-hidden p-0 rounded-2xl shadow-2xl">
            <style>{`
              @keyframes scan {
                0%, 100% { top: 5%; }
                50% { top: 95%; }
              }
            `}</style>
            <DialogHeader className="p-6 border-b border-slate-900">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
                <Camera className="h-5 w-5 text-primary" />
                Scan Member QR Pass
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Hold the member&apos;s QR pass in front of your camera.
              </DialogDescription>
            </DialogHeader>

            <div className="relative p-6 flex flex-col items-center justify-center">
              {/* The Scanner Viewfinder */}
              <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden border-2 border-slate-800 bg-black flex items-center justify-center">
                {/* Webcam container */}
                <div id="qr-reader" className="w-full h-full object-cover [&>video]:object-cover" />

                {/* Viewfinder Target Overlays */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Laser scan line animation */}
                  {!scanStatus && !isProcessing && (
                    <div className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                  )}

                  {/* Corner markers */}
                  <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-md" />
                  <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-md" />
                  <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-md" />
                  <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-md" />
                </div>

                {/* Status Message Overlay */}
                {scanStatus && (
                  <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md transition-all duration-300 ${
                    scanStatus.type === 'checkin' ? 'bg-emerald-950/90' :
                    scanStatus.type === 'checkout' ? 'bg-sky-950/90' : 'bg-red-950/90'
                  }`}>
                    {scanStatus.type === 'checkin' && <CheckCircle className="h-16 w-16 text-emerald-400 mb-4 animate-bounce" />}
                    {scanStatus.type === 'checkout' && <LogOut className="h-16 w-16 text-sky-400 mb-4 animate-bounce" />}
                    {scanStatus.type === 'error' && <AlertTriangle className="h-16 w-16 text-red-400 mb-4 animate-bounce" />}

                    <h3 className="text-xl font-bold tracking-tight text-white mb-2">{scanStatus.title}</h3>
                    <p className="text-sm text-slate-200 font-medium mb-1">{scanStatus.details}</p>
                    {scanStatus.warning && (
                      <Badge variant="destructive" className="mt-2 animate-pulse uppercase px-2 py-0.5 text-[10px]">
                        {scanStatus.warning}
                      </Badge>
                    )}
                    {scanStatus.duration && (
                      <p className="text-xs text-sky-300 font-mono mt-1 font-semibold">{scanStatus.duration}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Hint message */}
              {!scanStatus && (
                <p className="text-xs text-slate-400 mt-4 text-center flex items-center gap-1.5 justify-center">
                  <Volume2 className="h-3 w-3 text-slate-400" />
                  A sound beep will indicate a successful scan.
                </p>
              )}
            </div>

            <DialogFooter className="bg-slate-900 p-4 border-t border-slate-950 flex justify-end gap-2">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-800"
                onClick={() => setIsScannerOpen(false)}
              >
                Close Scanner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  )
}
