"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShaderBackground } from "./shader-background"

const headlines = [
  "Stop re-reading. Start testing yourself.",
  "Turn 50 pages into 5 key concepts.",
  "Your past papers, now a personalized tutor.",
]

export function HeroSection() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % headlines.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4">
      <ShaderBackground />

      <div className="relative z-10 mx-auto flex max-w-[640px] flex-col items-center text-center">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          Your notes → summaries → quizzes
        </h1>

        <div className="mt-4 h-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="text-base text-text-secondary md:text-lg"
            >
              {headlines[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-8">
          <Button variant="default" size="lg" asChild>
            <Link href="/sign-in">Start Studying — It&apos;s Free</Link>
          </Button>
        </div>

        <p className="mt-3 text-xs text-text-tertiary">
          No credit card required. 3 summaries/day free.
        </p>
      </div>
    </section>
  )
}
