import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="max-w-xl text-center p-8 bg-card rounded shadow">
        <h1 className="text-6xl font-bold">403</h1>
        <p className="mt-4 text-lg">Forbidden — You don’t have permission to access this page.</p>
        <p className="mt-2 text-sm text-muted-foreground">If you believe this is an error, contact an administrator.</p>
        <div className="mt-6">
          <Link href="/dashboard" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded">Return to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
