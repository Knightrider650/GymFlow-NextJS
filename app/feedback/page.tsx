'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, CheckCircle2, MessageSquare } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useActivityLogs } from '@/hooks'

export default function FeedbackPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { logActivity } = useActivityLogs()
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    details: ''
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await apiClient.post('/api/feedback', formData)
      if (response.success) {
        await logActivity('Feedback Submitted', 'Feedback', response.data.id, formData.title)
        setIsSubmitted(true)
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
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
      </div>
    </ProtectedLayout>
  )
}

