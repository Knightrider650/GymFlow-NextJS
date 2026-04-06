'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, Clock, Users } from 'lucide-react'
import { useGymStore } from '@/lib/store'

export default function CalendarPage() {
  const fetchClasses = useGymStore(state => state.fetchClasses)
  const classes = useGymStore(state => state.classes) || []
  const classesLoading = useGymStore(state => state.classesLoading)

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // Mock schedule grid strictly for demonstration
  const timeSlots = ['06:00 AM', '09:00 AM', '12:00 PM', '05:00 PM', '07:00 PM']
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Class Schedule</h1>
          <p className="text-slate-400">Weekly class and session calendar</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-800/50">
                <div className="p-4 text-center font-semibold text-slate-400 border-r border-slate-800">
                  Time
                </div>
                {days.map(day => (
                  <div key={day} className="p-4 text-center font-semibold text-slate-300 border-r border-slate-800 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {classesLoading ? (
                <div className="p-12 text-center text-slate-500">Loading schedule...</div>
              ) : (
                timeSlots.map((time, idx) => (
                  <div key={time} className="grid grid-cols-7 border-b border-slate-800 last:border-b-0">
                    <div className="p-4 flex items-center justify-center font-medium text-slate-400 border-r border-slate-800 bg-slate-900/50">
                      {time}
                    </div>
                    {days.map((day, dayIdx) => {
                      // Randomly scatter existing classes for visual demo purposes since model doesn't have literal dates yet
                      const slotClass = (classes.length > 0 && (idx + dayIdx) % 3 === 0) ? classes[dayIdx % classes.length] : null;
                      
                      return (
                        <div key={`${day}-${time}`} className="p-2 border-r border-slate-800 last:border-r-0 hover:bg-slate-800/30 transition-colors min-h-[120px]">
                          {slotClass && (
                            <div className="h-full w-full rounded-md bg-primary/10 border border-primary/20 p-2 text-sm flex flex-col gap-2">
                              <div className="font-semibold text-primary">{slotClass.name}</div>
                              <div className="flex items-center text-slate-300 text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {slotClass.currentEnrollment || 0} / {slotClass.maxCapacity || 20}
                              </div>
                              <Badge variant="outline" className="mt-auto self-start text-[10px] py-0 border-slate-700 bg-slate-800 text-slate-300">
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
    </ProtectedLayout>
  )
}
