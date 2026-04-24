"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, MotionValue, useReducedMotion } from "framer-motion"
import { MockUploadFrame } from "./mock-upload-frame"
import { MockProcessingFrame } from "./mock-processing-frame"
import { MockResultFrame } from "./mock-result-frame"
import { MockDeviceFrame } from "./mock-device-frame"

function useProgress(scrollYProgress: MotionValue<number>, start: number, end: number) {
  return useTransform(scrollYProgress, [start, end], [0, 1])
}

interface FrameState {
  progress: MotionValue<number>
  opacity: MotionValue<number>
  y: MotionValue<number>
  scale: MotionValue<number>
}

function useFrameState(
  scrollYProgress: MotionValue<number>,
  start: number,
  end: number,
  isFirst: boolean,
  isLast: boolean
): FrameState {
  const progress = useProgress(scrollYProgress, start, end)

  // Opacity: fade in during first 20%, hold, fade out during last 20%
  const opacity = useTransform(
    progress,
    isFirst ? [0, 0.2, 0.8, 1] : isLast ? [0, 0.2, 1, 1] : [0, 0.2, 0.8, 1],
    isFirst ? [1, 1, 1, 0] : isLast ? [0, 1, 1, 1] : [0, 1, 1, 0]
  )

  // Y: slide from bottom (40px) to center (0) to top (-40px)
  const y = useTransform(
    progress,
    isFirst ? [0, 0.3, 0.7, 1] : isLast ? [0, 0.3, 1, 1] : [0, 0.3, 0.7, 1],
    isFirst ? [0, 0, -20, -60] : isLast ? [60, 0, 0, 0] : [60, 0, -20, -60]
  )

  // Scale: start slightly smaller, grow to 1, shrink slightly on exit
  const scale = useTransform(
    progress,
    isFirst ? [0, 0.3, 0.7, 1] : isLast ? [0, 0.3, 1, 1] : [0, 0.3, 0.7, 1],
    isFirst ? [1, 1, 0.98, 0.95] : isLast ? [0.95, 1, 1, 1] : [0.95, 1, 0.98, 0.95]
  )

  return { progress, opacity, y, scale }
}

function ProgressIndicator({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const dot1Opacity = useTransform(scrollYProgress, [0, 0.15, 0.35, 0.5], [1, 1, 0.3, 0.3])
  const dot2Opacity = useTransform(scrollYProgress, [0.15, 0.35, 0.50, 0.70], [0.3, 1, 1, 0.3])
  const dot3Opacity = useTransform(scrollYProgress, [0.50, 0.70, 0.85, 1], [0.3, 0.3, 1, 1])

  const dot1Scale = useTransform(scrollYProgress, [0, 0.15, 0.35, 0.5], [1.2, 1.2, 1, 1])
  const dot2Scale = useTransform(scrollYProgress, [0.15, 0.35, 0.50, 0.70], [1, 1.2, 1.2, 1])
  const dot3Scale = useTransform(scrollYProgress, [0.50, 0.70, 0.85, 1], [1, 1, 1.2, 1.2])

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
      <motion.div
        className="w-2 h-2 rounded-full bg-brand-500"
        style={{ opacity: dot1Opacity, scale: dot1Scale }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-brand-500"
        style={{ opacity: dot2Opacity, scale: dot2Scale }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-brand-500"
        style={{ opacity: dot3Opacity, scale: dot3Scale }}
      />
    </div>
  )
}

function ReducedMotionScrollReveal() {
  return (
    <section className="relative py-24 bg-surface-subtle">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-xl md:text-2xl font-semibold text-text-primary">
            Watch your notes become study material
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Upload, process, and get structured summaries with quizzes automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <MockDeviceFrame className="w-full">
              <MockUploadFrame />
            </MockDeviceFrame>
            <p className="text-sm text-center text-text-secondary font-medium">1. Upload</p>
          </div>
          <div className="space-y-4">
            <MockDeviceFrame className="w-full">
              <MockProcessingFrame />
            </MockDeviceFrame>
            <p className="text-sm text-center text-text-secondary font-medium">2. Process</p>
          </div>
          <div className="space-y-4">
            <MockDeviceFrame className="w-full">
              <MockResultFrame />
            </MockDeviceFrame>
            <p className="text-sm text-center text-text-secondary font-medium">3. Study</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })



  const frame1 = useFrameState(scrollYProgress, 0, 0.35, true, false)
  const frame2 = useFrameState(scrollYProgress, 0.25, 0.70, false, false)
  const frame3 = useFrameState(scrollYProgress, 0.60, 1, false, true)

  const frames = [
    { state: frame1, component: <MockUploadFrame /> },
    { state: frame2, component: <MockProcessingFrame /> },
    { state: frame3, component: <MockResultFrame /> },
  ]

  if (shouldReduceMotion) {
    return <ReducedMotionScrollReveal />
  }

  return (
    <motion.section
      ref={containerRef}
      className="relative bg-surface-page"
      style={{ height: "300vh" }}
    >
      {/* Section header */}
      <div className="sticky top-0 pt-24 pb-8 text-center z-10">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary">
          Watch your notes become study material
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Upload, process, and get structured summaries with quizzes automatically.
        </p>
      </div>

      {/* Pinned mock UI area */}
      <div className="sticky top-32 h-[calc(100vh-8rem)] flex items-center justify-center">
        <ProgressIndicator scrollYProgress={scrollYProgress} />

        <div className="relative w-full max-w-2xl mx-auto px-4">
          {frames.map((frame, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                opacity: frame.state.opacity,
                y: frame.state.y,
                scale: frame.state.scale,
              }}
            >
              <MockDeviceFrame className="w-full">
                {frame.component}
              </MockDeviceFrame>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
