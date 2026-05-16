import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Download, Upload, Database, ShieldCheck, FileJson, FileSpreadsheet, Trash2 } from 'lucide-react'

export function DataSettings() {
  const [isExporting, setIsExporting] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const handleExport = () => {
    setIsExporting(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsExporting(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>Download your gym data in various formats for backup or migration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 rounded-xl border bg-slate-50 hover:border-primary/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-4 mb-4">
                   <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <FileSpreadsheet className="h-5 w-5" />
                   </div>
                   <div className="font-bold">Excel/CSV Bundle</div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Export members, plans, and invoices as formatted spreadsheets.</p>
                <Button variant="outline" size="sm" className="w-full gap-2 group-hover:bg-primary group-hover:text-white transition-colors" onClick={handleExport} disabled={isExporting}>
                   <Download className="h-3 w-3" />
                   Export CSV
                </Button>
             </div>

             <div className="p-4 rounded-xl border bg-slate-50 hover:border-primary/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-4 mb-4">
                   <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <FileJson className="h-5 w-5" />
                   </div>
                   <div className="font-bold">JSON Backup</div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Full system state in JSON format. Best for restoring to another GymFlow instance.</p>
                <Button variant="outline" size="sm" className="w-full gap-2 group-hover:bg-primary group-hover:text-white transition-colors" onClick={handleExport} disabled={isExporting}>
                   <Download className="h-3 w-3" />
                   Export JSON
                </Button>
             </div>
          </div>

          {isExporting && (
            <div className="space-y-2 animate-in fade-in duration-300">
               <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Generating archive...</span>
                  <span>{progress}%</span>
               </div>
               <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automated Backups</CardTitle>
          <CardDescription>Configure cloud backup frequency and retention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/50">
              <div className="flex items-center gap-4">
                 <Database className="h-5 w-5 text-primary" />
                 <div>
                    <div className="font-bold text-sm">Daily Cloud Backup</div>
                    <p className="text-xs text-muted-foreground">Encrypted backup stored on AWS S3</p>
                 </div>
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-transparent">ACTIVE</Badge>
           </div>
           <p className="text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-green-500" />
              Last backup successful: 2 hours ago
           </p>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/10">
        <CardHeader>
          <CardTitle className="text-red-900">Danger Zone</CardTitle>
          <CardDescription>Irreversible data management actions</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-white">
              <div className="space-y-0.5">
                 <div className="font-bold text-red-900">Purge Sample Data</div>
                 <p className="text-xs text-red-700/60">Delete all demo members and records to start fresh</p>
              </div>
              <Button variant="destructive" size="sm" className="gap-2">
                 <Trash2 className="h-3 w-3" />
                 Purge Data
              </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
      {children}
    </span>
  )
}
