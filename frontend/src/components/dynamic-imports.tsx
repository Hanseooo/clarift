'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Loading fallback for dynamic components
function DynamicSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className || "h-48 w-full"} />
}

// Landing page heavy components
export const ShaderBackground = dynamic(
  () => import('@/components/features/landing/shader-background').then(m => m.ShaderBackground),
  { 
    loading: () => <DynamicSkeleton className="h-screen w-full" />,
    ssr: false // Canvas cannot SSR
  }
)

export const FloatingBubbles = dynamic(
  () => import('@/components/features/landing/floating-bubbles').then(m => m.FloatingBubbles),
  { 
    loading: () => <DynamicSkeleton className="h-64 w-full" />,
    ssr: false 
  }
)

export const ScrollReveal = dynamic(
  () => import('@/components/features/landing/scroll-reveal').then(m => m.ScrollReveal),
  { 
    loading: () => <DynamicSkeleton className="h-96 w-full" />,
    ssr: false // framer-motion scroll animations
  }
)

export const FeatureShowcase = dynamic(
  () => import('@/components/features/landing/feature-showcase').then(m => m.FeatureShowcase),
  { 
    loading: () => <DynamicSkeleton className="h-96 w-full" />,
    ssr: false
  }
)

// Editor components (only loaded when user interacts with summaries)
export const TiptapEditor = dynamic(
  () => import('@/components/features/editor/tiptap-editor').then(m => m.TiptapEditor),
  { 
    loading: () => <DynamicSkeleton className="h-96 w-full rounded-xl" />,
    ssr: false // Editor is client-only
  }
)

// Chart components
export const MasteryChart = dynamic(
  () => import('@/components/features/quiz/mastery-chart').then(m => m.MasteryChart),
  { 
    loading: () => <DynamicSkeleton className="h-80 w-full rounded-xl" />,
    ssr: false // Charts are client-only
  }
)
