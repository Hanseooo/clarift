'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-12 w-12 text-danger-500" />
      <h2 className="text-2xl font-bold text-text-primary">Something went wrong</h2>
      <p className="text-muted-foreground text-center max-w-md text-text-secondary">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
