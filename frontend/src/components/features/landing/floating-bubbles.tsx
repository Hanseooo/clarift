"use client"

import { motion, useReducedMotion } from "framer-motion"

export function FloatingBubbles() {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-64 h-64 rounded-full bg-brand-500/10 dark:bg-brand-500/15 blur-3xl" style={{ top: "10%", left: "15%" }} />
        <div className="absolute w-48 h-48 rounded-full bg-accent-500/8 dark:bg-accent-500/12 blur-3xl" style={{ top: "40%", right: "20%" }} />
        <div className="absolute w-56 h-56 rounded-full bg-brand-400/8 dark:bg-brand-400/12 blur-3xl" style={{ bottom: "20%", left: "30%" }} />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Indigo bubble */}
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-brand-500/10 dark:bg-brand-500/15 blur-3xl"
        style={{ top: "10%", left: "15%" }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Amber bubble */}
      <motion.div
        className="absolute w-48 h-48 rounded-full bg-accent-500/8 dark:bg-accent-500/12 blur-3xl"
        style={{ top: "40%", right: "20%" }}
        animate={{
          x: [0, -25, 15, 0],
          y: [0, 30, -20, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Secondary indigo bubble */}
      <motion.div
        className="absolute w-56 h-56 rounded-full bg-brand-400/8 dark:bg-brand-400/12 blur-3xl"
        style={{ bottom: "20%", left: "30%" }}
        animate={{
          x: [0, 20, -30, 0],
          y: [0, -25, 15, 0],
          scale: [1, 1.05, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </div>
  )
}
