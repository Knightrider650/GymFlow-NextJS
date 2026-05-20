'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Users, 
  Bell, 
  History, 
  Plus, 
  Search,
  CheckCircle2,
  AlertCircle,
  Megaphone
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { format } from 'date-fns'

interface MessageLog {
  id: string
  memberId: string
  memberName: string
  type: string
  channel: string
  status: string
  sentAt: string
  content: string
}

interface Campaign {
  id: string
  title: string
  subject: string
  content: string
  targetSegment: string
  status: string
  sentAt: string
  createdBy: string
}

export default function CommunicationsPage() {
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false)
  
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    subject: '',
    content: '',
    targetSegment: 'All Members'
  })

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [logsRes, campaignsRes] = await Promise.all([
        apiClient.get('/api/communications/logs'),
        apiClient.get('/api/campaigns')
      ])
      if (logsRes.success) setLogs(logsRes.data || [])
      if (campaignsRes.success) setCampaigns(campaignsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch communications data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await apiClient.post('/api/campaigns', newCampaign)
      if (res.success) {
        setIsCampaignDialogOpen(false)
        setNewCampaign({ title: '', subject: '', content: '', targetSegment: 'All Members' })
        fetchData()
      }
    } catch (err) {
      console.error('Failed to create campaign:', err)
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" />
              Member Communications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automated reminders, promotions, and member engagement
            </p>
          </div>
          
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setIsCampaignDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Launch New Campaign
          </Button>
        </div>

        <Tabs defaultValue="automated" className="space-y-6">
          <TabsList className="bg-card/50 border-white/5 p-1 h-12">
            <TabsTrigger value="automated" className="gap-2 px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="h-4 w-4" />
              Automated Reminders
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2 px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Megaphone className="h-4 w-4" />
              Campaign History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="automated" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-emerald-500/10 border-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-500">Sent Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500">{logs.filter(l => l.sentAt.startsWith(new Date().toISOString().split('T')[0])).length}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-500">Total Reminders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">{logs.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-indigo-500/10 border-indigo-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-indigo-500">Active Sequences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-500">3 (T-7, T-3, T-1)</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none bg-card/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Recent Automated Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No messages sent yet. The reminder engine scans daily.</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {log.channel.includes('Email') ? <Mail className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{log.memberName}</span>
                              <Badge variant="outline" className="text-[10px] font-mono py-0">{log.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{log.content}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right shrink-0">
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.sentAt), 'MMM dd • hh:mm a')}
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-none">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
               {campaigns.length === 0 ? (
                 <div className="col-span-full text-center py-20 text-muted-foreground bg-card/20 rounded-3xl border-2 border-dashed">
                   <Megaphone className="h-12 w-12 mx-auto opacity-20 mb-4" />
                   <p className="text-lg font-medium">No marketing campaigns yet</p>
                   <p className="text-sm">Reach out to your members with promotions and updates</p>
                 </div>
               ) : (
                 campaigns.map((campaign) => (
                   <Card key={campaign.id} className="border-none bg-card/40 backdrop-blur-md group hover:bg-card/60 transition-all">
                     <CardHeader>
                       <div className="flex justify-between items-start mb-2">
                         <Badge className="bg-primary/10 text-primary border-none">{campaign.targetSegment}</Badge>
                         <span className="text-[10px] text-muted-foreground">{format(new Date(campaign.sentAt), 'MMM dd, yyyy')}</span>
                       </div>
                       <CardTitle className="group-hover:text-primary transition-colors">{campaign.title}</CardTitle>
                       <CardDescription className="line-clamp-2">{campaign.subject}</CardDescription>
                     </CardHeader>
                     <CardContent>
                       <div className="p-3 rounded-lg bg-black/20 text-xs text-muted-foreground italic mb-4">
                         &quot;{campaign.content.substring(0, 100)}...&quot;
                       </div>
                       <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                         <span>Sent by {campaign.createdBy}</span>
                         <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Delivered</span>
                       </div>
                     </CardContent>
                   </Card>
                 ))
               )}
             </div>
          </TabsContent>
        </Tabs>

        {/* Create Campaign Dialog (Simple version for demo) */}
        {isCampaignDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-lg border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle>Launch New Campaign</CardTitle>
                <CardDescription>Send an email/SMS broadcast to selected members.</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateCampaign}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Title (Internal)</Label>
                    <Input 
                      placeholder="e.g. Summer Discount Offer" 
                      value={newCampaign.title}
                      onChange={(e) => setNewCampaign({...newCampaign, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input 
                      placeholder="e.g. Special Offer Just For You!" 
                      value={newCampaign.subject}
                      onChange={(e) => setNewCampaign({...newCampaign, subject: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-white/10 bg-muted px-3 text-sm"
                      value={newCampaign.targetSegment}
                      onChange={(e) => setNewCampaign({...newCampaign, targetSegment: e.target.value})}
                    >
                      <option>All Members</option>
                      <option>Active Members Only</option>
                      <option>Expired Members (Re-engagement)</option>
                      <option>Leads Only</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message Content</Label>
                    <textarea 
                      className="w-full h-32 rounded-md border border-white/10 bg-muted px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Write your message here..."
                      value={newCampaign.content}
                      onChange={(e) => setNewCampaign({...newCampaign, content: e.target.value})}
                      required
                    />
                  </div>
                </CardContent>
                <div className="p-6 border-t border-white/5 flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setIsCampaignDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="gap-2">
                    <Send className="h-4 w-4" />
                    Launch Campaign
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
