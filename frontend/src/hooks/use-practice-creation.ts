"use client"

import { useState, useCallback } from "react"
import { useCreatePractice } from "./use-practice"

export function usePracticeCreation() {
  const { mutateAsync, isLoading, error } = useCreatePractice()
  const [practiceId, setPracticeId] = useState<string | null>(null)
  const [drills, setDrills] = useState<unknown[] | null>(null)

  const create = useCallback(
    async (topics: string[], drillCount: number) => {
      const response = await mutateAsync({ weak_topics: topics, drill_count: drillCount })
      setPracticeId(response.practice_id)
      setDrills(response.drills)
      return response
    },
    [mutateAsync]
  )

  const reset = useCallback(() => {
    setPracticeId(null)
    setDrills(null)
  }, [])

  return { create, reset, practiceId, drills, isLoading, error }
}
