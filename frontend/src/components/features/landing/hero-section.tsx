"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShaderBackground } from "./shader-background"
import { FloatingBubbles } from "./floating-bubbles"
import { MockDeviceFrame } from "./mock-device-frame"
import { MockUploadFrame } from "./mock-upload-frame"

const headlines = [
  "Stop re-reading. Start testing yourself.",
  "Turn 25 pages into 5 key concepts.",
  "Your past papers, now a personalized tutor.",
]

function WordByWordText({ text, reducedMotion }: { text: string; reducedMotion?: boolean }) {
  const words = text.split(" ")

  if (reducedMotion) {
    return <span>{text}</span>
  }

  return (
    <span>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            duration: 0.3,
            delay: i * 0.04,
            ease: "easeOut",
          }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

export function HeroSection() {
  const [index, setIndex] = useState(0)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % headlines.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-48 pb-16">
      <ShaderBackground />
      <FloatingBubbles />

      <div className="relative z-10 mx-auto flex max-w-[960px] flex-col items-center text-center w-full">
        {/* Main heading with glow */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          {/* Glow effect behind text */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
            <div className="w-full h-full bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600 rounded-full scale-150" />
          </div>

          <h1 className="text-6xl font-bold tracking-tight text-text-primary md:text-8xl lg:text-9xl">
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600 bg-clip-text text-transparent">
                Clarift
              </span>
              {/* Animated underline */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                />
              )}
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-6 text-xl font-medium text-text-secondary md:text-2xl"
        >
          Your notes become summaries, quizzes, and practice.
        </motion.p>

        {/* Rotating headlines with word-by-word animation */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.5, ease: "easeOut" }}
          className="mt-4 h-10 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              className="text-base text-text-tertiary md:text-lg"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0.2 } : { duration: 0.2 }}
            >
              <WordByWordText text={headlines[index]} reducedMotion={!!shouldReduceMotion} />
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.7, ease: "easeOut" }}
          className="mt-10"
        >
          <Button
            variant="default"
            size="lg"
            className="relative h-14 px-10 text-lg rounded-xl overflow-hidden group"
            asChild
          >
            <Link href="/login">
              <span className="relative z-10">Start Studying Free</span>
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-text-on-brand/20 to-transparent" />
            </Link>
          </Button>
        </motion.div>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.9 }}
          className="mt-4 text-sm text-text-tertiary"
        >
          No credit card required. 3 summaries/day free.
        </motion.p>

        {/* Mock device frame */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, delay: 1.1, ease: "easeOut" }}
          className="mt-16 w-full max-w-lg"
        >
          <MockDeviceFrame>
            <MockUploadFrame />
          </MockDeviceFrame>
        </motion.div>
      </div>
    </section>
  )
}
