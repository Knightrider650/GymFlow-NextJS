'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Send, CheckCircle2 } from 'lucide-react'

export default function FeedbackPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate submission flow without a strict backend since this is structural 
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 1200)
  }

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Feedback</h1>
          <p className="text-slate-400">Share your thoughts on the GymFlow experience</p>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto mt-10">
        {isSubmitted ? (
          <Card className="bg-slate-900 border-slate-800 text-center py-12 px-6">
            <CardContent className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
              <p className="text-slate-400 mb-6">
                Your feedback has been successfully submitted and logged. We appreciate your input.
              </p>
              <Button onClick={() => setIsSubmitted(false)} variant="outline" className="border-slate-700 hover:bg-slate-800">
                Submit Another Response
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>Submit Feedback</CardTitle>
              <CardDescription className="text-slate-400">
                Help us improve by providing suggestions or reporting issues.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="category">Feedback Category</Label>
                  <select 
                    id="category" 
                    required 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <option value="">Select a category...</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">General Improvement</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Summary Title</Label>
                  <Input 
                    id="title" 
                    required 
                    placeholder="Brief description of your feedback" 
                    className="bg-slate-800 border-slate-700" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Detailed Description</Label>
                  <textarea 
                    id="details" 
                    required 
                    placeholder="Please provide as much detail as possible..." 
                    className="flex min-h-[150px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" 
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-800/30 py-4 border-t border-slate-800 flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? 'Sending...' : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Send Feedback
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  )
}
