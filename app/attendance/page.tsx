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
import { useAttendance, useMembers } from '@/hooks'
import { formatDateTime, calculateDuration, formatDuration } from '@/utils/format'
import { Plus, LogOut, Search } from 'lucide-react'

export default function AttendancePage() {
  const { attendance, isLoading, fetchAttendance, checkInMember, checkOutMember } = useAttendance()
  const { members, fetchMembers } = useMembers()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [notes, setNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAttendance()
    fetchMembers()
  }, [])

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

  const filteredAttendance = attendance.filter(record =>
    record.memberName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const todayAttendance = filteredAttendance.filter(record => {
    const today = new Date().toISOString().split('T')[0]
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
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input text-sm"
                    required
                  >
                    <option value="">-- Select a member --</option>
                    {members.filter(m => m.status === 'active').map(member => (
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

        {/* Today's Attendence Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Today's Check-ins</p>
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
                  {filteredAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {isLoading ? 'Loading records...' : 'No attendance records found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance.map((record) => (
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
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
