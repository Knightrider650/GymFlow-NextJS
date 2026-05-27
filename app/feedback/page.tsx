'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, CheckCircle2, MessageSquare } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useActivityLogs } from '@/hooks'
import { useAuthStore } from '@/lib/store'
import { formatDate } from '@/utils/format'

export default function FeedbackPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { logActivity } = useActivityLogs()
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    details: ''
  })
  
  const user = useAuthStore((state: any) => state.user)
  const isElevated = user?.role && ['cto', 'ceo', 'admin', 'owner', 'manager'].includes(user.role)
  const [feedbackList, setFeedbackList] = useState<any[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  const fetchFeedback = async () => {
    setLoadingFeedback(true)
    try {
      const response = await apiClient.get('/api/feedback')
      if (response.success) {
        setFeedbackList(response.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch feedback list:', err)
    } finally {
      setLoadingFeedback(false)
    }
  }

  useEffect(() => {
    if (isElevated) {
      fetchFeedback()
    }
  }, [isElevated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await apiClient.post('/api/feedback', formData)
      if (response.success) {
        await logActivity('Feedback Submitted', 'Feedback', response.data.id, formData.title)
        setIsSubmitted(true)
        if (isElevated) {
          fetchFeedback()
        }
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8 bg-slate-50/30 min-h-screen">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Feedback & Suggestions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Help us improve GymFlow by sharing your thoughts and reporting issues
          </p>
        </div>

        <div className="w-full max-w-2xl mx-auto pt-8">
          {isSubmitted ? (
            <Card className="border-none bg-card/40 backdrop-blur-md text-center py-12 px-6 shadow-2xl animate-in zoom-in-95 duration-300">
              <CardContent className="flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                <p className="text-muted-foreground mb-8">
                  Your feedback has been successfully submitted and logged. We appreciate your input in making GymFlow better.
                </p>
                <Button onClick={() => {
                  setIsSubmitted(false)
                  setFormData({ category: '', title: '', details: '' })
                }} variant="outline" className="gap-2">
                  Submit Another Response
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none bg-card/40 backdrop-blur-md shadow-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-white/5">
                <CardTitle>Submit Feedback</CardTitle>
                <CardDescription>
                  Choose a category and provide details about your experience.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Feedback Category</Label>
                    <Select 
                      onValueChange={(val) => setFormData({...formData, category: val})}
                      required
                    >
                      <SelectTrigger className="bg-background/50 border-white/10">
                        <SelectValue placeholder="Select a category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="improvement">General Improvement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Summary Title</Label>
                    <Input 
                      id="title" 
                      required 
                      placeholder="e.g., Request for mobile app features" 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="bg-background/50 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="details">Detailed Description</Label>
                    <textarea 
                      id="details" 
                      required 
                      placeholder="Please provide as much detail as possible so we can better understand your feedback..." 
                      className="flex min-h-[150px] w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                      value={formData.details}
                      onChange={(e) => setFormData({...formData, details: e.target.value})}
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 py-6 border-t border-white/5 flex justify-end">
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 gap-2 shadow-lg shadow-primary/20">
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Feedback
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>

        {isElevated && (
          <div className="w-full max-w-4xl mx-auto pt-8">
            <Card className="border-none bg-card/40 backdrop-blur-md shadow-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-white/5">
                <CardTitle>Submitted Feedback Logs</CardTitle>
                <CardDescription>
                  View and audit feedback entries submitted by team members and managers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-muted/30 text-left font-semibold text-muted-foreground">
                        <th className="p-4">Category</th>
                        <th className="p-4">Title</th>
                        <th className="p-4">Details</th>
                        <th className="p-4 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingFeedback ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            Loading feedback logs...
                          </td>
                        </tr>
                      ) : feedbackList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No feedback submissions found.
                          </td>
                        </tr>
                      ) : (
                        feedbackList.map((item) => (
                          <tr key={item.id} className="border-b border-white/5 hover:bg-muted/10 transition-colors">
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.category === 'bug' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                item.category === 'feature' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                              }`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-primary">{item.title}</td>
                            <td className="p-4 text-muted-foreground max-w-xs truncate" title={item.details}>
                              {item.details}
                            </td>
                            <td className="p-4 text-right text-xs text-muted-foreground font-mono">
                              {formatDate(item.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
