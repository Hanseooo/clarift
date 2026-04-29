import { auth, currentUser } from '@clerk/nextjs/server'
import { cache } from 'react'

/**
 * Cached version of currentUser() for per-request deduplication.
 * Use this instead of currentUser() directly to avoid multiple Clerk API calls.
 */
export const getCachedUser = cache(async () => {
  return currentUser()
})

/**
 * Cached version of auth() for per-request deduplication.
 * Use this instead of auth() directly to avoid multiple Clerk API calls.
 */
export const getCachedAuth = cache(async () => {
  return auth()
})
