"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { Button } from "./button"
import { RefreshCw } from "lucide-react"

export interface JobEvent {
  id: string
  type: "document_upload" | "quiz" | "summary"
  status: "pending" | "processing" | "completed" | "failed" | "timeout"
  progress: number
  result: Record<string, unknown> | null
  error: string | null
  updated_at: string
}

interface SSEProgressProps {
  jobId: string
  accessToken: string
  onComplete?: (result: Record<string, unknown>) => void
  onError?: (error: string) => void
  stepLabel?: string
  className?: string
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  document_upload: {
    pending: "Queued...",
    processing: "Processing document...",
    completed: "Complete!",
    failed: "Processing failed",
    timeout: "Connection timed out",
  },
  quiz: {
    pending: "Queued...",
    processing: "Generating quiz...",
    completed: "Quiz ready!",
    failed: "Quiz generation failed",
    timeout: "Connection timed out",
  },
  summary: {
    pending: "Queued...",
    processing: "Creating summary...",
    completed: "Summary ready!",
    failed: "Summary generation failed",
    timeout: "Connection timed out",
  },
}

export function SSEProgress({
  jobId,
  accessToken,
  onComplete,
  onError,
  stepLabel,
  className,
}: SSEProgressProps) {
  const [status, setStatus] = useState<"pending" | "processing" | "completed" | "failed" | "timeout">("pending")
  const [progress, setProgress] = useState(0)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [eventType, setEventType] = useState<"document_upload" | "quiz" | "summary">("document_upload")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reconnectTrigger, setReconnectTrigger] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasCompletedRef = useRef(false)
  const isReconnectingRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
  }, [onComplete, onError])

  const createConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    isReconnectingRef.current = false

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const url = `${baseUrl}/api/v1/jobs/${jobId}/stream?token=${encodeURIComponent(accessToken)}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data: JobEvent = JSON.parse(event.data)
        setEventType(data.type)
        setStatus(data.status as "pending" | "processing" | "completed" | "failed" | "timeout")

        const newProgress = data.progress
        setProgress((prev) => {
          if (newProgress > prev && newProgress - prev > 30) {
            let step = prev
            const animate = () => {
              step += 5
              if (step < newProgress) {
                setProgress(step)
                requestAnimationFrame(animate)
              } else {
                setProgress(newProgress)
              }
            }
            requestAnimationFrame(animate)
          }
          return newProgress
        })

        if (data.status === "completed" && data.result && !hasCompletedRef.current) {
          hasCompletedRef.current = true
          onCompleteRef.current?.(data.result)
        }

        if (data.status === "failed" && data.error) {
          setErrorMessage(data.error)
          onErrorRef.current?.(data.error)
        }

        if (data.status === "timeout") {
          setStatus("timeout")
          es.close()
        }
      } catch {
        console.error("Failed to parse SSE message")
      }
    }

    es.onerror = () => {
      isReconnectingRef.current = true
      setIsReconnecting(true)
      es.close()

      reconnectTimeoutRef.current = setTimeout(() => {
        if (!hasCompletedRef.current) {
          setReconnectTrigger((n) => n + 1)
        }
      }, 2000)
    }
  }, [jobId, accessToken])

  useEffect(() => {
    createConnection()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [createConnection, reconnectTrigger])

  const label = stepLabel || STATUS_LABELS[eventType]?.[status] || ""

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-success-500"
      case "failed":
        return "bg-danger-500"
      case "timeout":
        return "bg-warning-500"
      default:
        return "bg-brand-500"
    }
  }

  const handleRetry = () => {
    hasCompletedRef.current = false
    isReconnectingRef.current = false
    setErrorMessage(null)
    setStatus("pending")
    setProgress(0)
    setIsReconnecting(false)
    setReconnectTrigger((n) => n + 1)
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 w-full overflow-hidden rounded-full bg-border-default h-1">
          {status === "pending" || isReconnecting ? (
            <div className={cn("h-full w-1/3 sse-progress-indeterminate rounded-full")} />
          ) : (
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease",
                getStatusColor()
              )}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          )}
        </div>
        {isReconnecting && (
          <Badge variant="pro">Reconnecting...</Badge>
        )}
      </div>
      {label && (
        <p className="text-xs text-text-tertiary">{label}</p>
      )}
      {errorMessage && (
        <p className="mt-1 text-xs text-danger-500">{errorMessage}</p>
      )}
      {status === "timeout" && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-1"
          onClick={handleRetry}
        >
          <RefreshCw className="size-3" />
          Retry
        </Button>
      )}
    </div>
  )
}
