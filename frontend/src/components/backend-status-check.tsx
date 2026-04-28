"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const HEALTH_TIMEOUT = 10000 // 10 seconds

export function BackendStatusCheck() {
  const toastId = useRef<string | number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasNotified = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    // Start a 10-second timer
    timeoutRef.current = setTimeout(() => {
      if (!hasNotified.current) {
        hasNotified.current = true
        toastId.current = toast.loading(
          "Backend server is still starting. This may take up to 30 seconds on first load.",
          {
            duration: Infinity,
            position: "bottom-right",
          }
        )
      }
    }, HEALTH_TIMEOUT)

    // Call health endpoint
    const checkHealth = async () => {
      try {
        await fetch(`${API_URL}/health`, {
          signal: controller.signal,
          cache: "no-store",
        })

        // Health check succeeded — clear the timeout and dismiss toast
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        if (toastId.current !== null) {
          toast.dismiss(toastId.current)
          toast.success("Backend is ready!", {
            duration: 3000,
            position: "bottom-right",
          })
        }
      } catch {
        // Fetch failed or was aborted — timeout handler will show toast
      }
    }

    checkHealth()

    return () => {
      controller.abort()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return null
}
