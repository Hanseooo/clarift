"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, MotionValue } from "framer-motion"
import { MockUploadFrame } from "./mock-upload-frame"
import { MockProcessingFrame } from "./mock-processing-frame"
import { MockResultFrame } from "./mock-result-frame"

function useProgress(scrollYProgress: MotionValue<number>, start: number, end: number) {
  return useTransform(scrollYProgress, [start, end], [0, 1])
}

export function ScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const frame1Progress = useProgress(scrollYProgress, 0, 0.33)
  const frame2Progress = useProgress(scrollYProgress, 0.33, 0.66)
  const frame3Progress = useProgress(scrollYProgress, 0.66, 1)

  const frame1Opacity = useTransform(frame1Progress, [0, 0.5, 1], [1, 1, 0])
  const frame2Opacity = useTransform(frame2Progress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])
  const frame3Opacity = useTransform(frame3Progress, [0, 0.5, 1], [0, 1, 1])

  return (
    <section className="mx-auto max-w-[640px] py-16 md:py-24 px-4">
      <div className="mb-8 text-center">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary">
          Watch your notes become study material
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Upload, process, and get structured summaries with quizzes — all automatically.
        </p>
      </div>

      <div ref={containerRef} className="relative" style={{ height: 600 }}>
        <div className="sticky top-24 h-[400px] md:h-[450px]">
          <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: frame1Opacity }}>
            <MockUploadFrame />
          </motion.div>
          <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: frame2Opacity }}>
            <MockProcessingFrame />
          </motion.div>
          <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: frame3Opacity }}>
            <MockResultFrame />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
