'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, Users } from 'lucide-react'
import { useGymStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function CalendarPage() {
  const fetchClasses = useGymStore(state => state.fetchClasses)
  const classes = useGymStore(state => state.classes) || []
  const classesLoading = useGymStore(state => state.classesLoading)
  const [selectedClass, setSelectedClass] = useState<any | null>(null)

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const timeSlots = ['06:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '06:30 PM', '07:00 PM']
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dayFullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Map each class to the days it actually runs on (from its `days` field)
  const getClassForSlot = (dayShort: string, time: string) => {
    return classes.find(cls => {
      // Check if the class's time matches this time slot
      const classTime = (cls.time || '').toUpperCase().replace(/\s/g, '')
      const slotTime = time.toUpperCase().replace(/\s/g, '')
      const timeMatch = classTime === slotTime

      // Check if the class runs on this day — handle both string and array formats
      let classDaysStr = ''
      if (Array.isArray(cls.days)) {
        classDaysStr = cls.days.join(', ').toUpperCase()
      } else {
        classDaysStr = (cls.days || '').toUpperCase()
      }
      const dayMatch = classDaysStr.includes(dayShort.toUpperCase())

      return timeMatch && dayMatch
    })
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-primary" />
              Class Schedule
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Weekly class calendar — populated from your scheduled sessions</p>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md overflow-hidden">
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[1050px]">
                {/* Header Row */}
                <div className="grid grid-cols-8 border-b border-white/5 bg-muted/50">
                  <div className="p-4 text-center font-bold text-muted-foreground border-r border-white/5">
                    Time
                  </div>
                  {dayFullNames.map(day => (
                    <div key={day} className="p-4 text-center font-bold text-foreground border-r border-white/5 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Body Rows */}
                {classesLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-medium">Loading schedule...</p>
                  </div>
                ) : (
                  timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b border-white/5 last:border-b-0">
                      <div className="p-3 flex items-center justify-center font-mono text-sm font-medium text-muted-foreground border-r border-white/5 bg-muted/20">
                        {time}
                      </div>
                      {dayNames.map((dayShort, dayIdx) => {
                        const slotClass = getClassForSlot(dayShort, time)

                        return (
                          <div key={`${dayShort}-${time}`} className="p-1.5 border-r border-white/5 last:border-r-0 hover:bg-muted/20 transition-colors min-h-[90px]">
                            {slotClass && (
                              <div 
                                onClick={() => setSelectedClass(slotClass)}
                                className="h-full w-full rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-sm flex flex-col gap-1.5 hover:bg-primary/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer duration-200"
                              >
                                <div className="font-bold text-primary text-xs leading-tight">{slotClass.name}</div>
                                <div className="flex items-center text-muted-foreground text-[10px]">
                                  <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                                  {slotClass.currentEnrollment || 0}/{slotClass.maxCapacity || 20}
                                </div>
                                <Badge variant="outline" className="mt-auto self-start text-[9px] py-0 px-1.5 border-white/10 bg-muted/30 font-medium">
                                  {slotClass.instructorName || 'TBA'}
                                </Badge>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        {classes.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center text-sm text-muted-foreground">
            <span className="font-medium">Active Classes:</span>
            {classes.map(cls => (
              <Badge key={cls.id} className="bg-primary/10 text-primary border-primary/20 gap-1.5">
                {cls.name}
                <span className="text-[10px] text-muted-foreground">({cls.days || 'N/A'})</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Class Detail Dialog */}
        <Dialog open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                <CalendarIcon className="h-5 w-5" />
                {selectedClass?.name}
              </DialogTitle>
              <DialogDescription>
                Detailed information for this scheduled fitness session.
              </DialogDescription>
            </DialogHeader>
            
            {selectedClass && (
              <div className="space-y-6 py-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instructor</div>
                  <div className="text-sm font-medium text-foreground bg-muted/40 px-3 py-2 rounded-md">
                    {selectedClass.instructorName || 'TBA'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time Slot</div>
                  <div className="text-sm font-medium text-foreground bg-muted/40 px-3 py-2 rounded-md">
                    {selectedClass.time || 'N/A'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule Days</div>
                  <div className="text-sm font-medium text-foreground bg-muted/40 px-3 py-2 rounded-md">
                    {Array.isArray(selectedClass.days) ? selectedClass.days.join(', ') : selectedClass.days || 'N/A'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Capacity / Enrollment</span>
                    <span>{selectedClass.currentEnrollment || 0} / {selectedClass.maxCapacity || 20}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round(((selectedClass.currentEnrollment || 0) / (selectedClass.maxCapacity || 20)) * 100))}%` }}
                    />
                  </div>
                </div>

                {selectedClass.description && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedClass.description}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setSelectedClass(null)} className="w-full sm:w-auto">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedLayout>
  )
}
