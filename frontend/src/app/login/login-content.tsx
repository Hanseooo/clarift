"use client"

import { SignIn } from "@clerk/nextjs"
import { motion, useReducedMotion } from "framer-motion"
import { BookOpen, CheckSquare, Target, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ShaderBackground } from "@/components/features/landing/shader-background"
import { FloatingBubbles } from "@/components/features/landing/floating-bubbles"

const valueProps = [
  {
    icon: BookOpen,
    text: "Turn notes into structured summaries",
  },
  {
    icon: CheckSquare,
    text: "Test yourself with AI quizzes",
  },
  {
    icon: Target,
    text: "Practice your weak areas",
  },
]

export function LoginContent() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="min-h-screen flex w-full">
      {/* Left panel — Brand continuity (desktop only) */}
      <div className="hidden md:flex md:w-1/2 relative flex-col items-center justify-center overflow-hidden bg-surface-page">
        <ShaderBackground />
        <FloatingBubbles />

        <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-md">
          {/* Logo mark */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.6, ease: "easeOut" }
            }
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 border border-brand-200 mb-6"
          >
            <BookOpen className="size-7 text-brand-500" strokeWidth={1.5} />
          </motion.div>

          {/* Wordmark with gradient */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.6, delay: 0.1, ease: "easeOut" }
            }
            className="relative"
          >
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600 bg-clip-text text-transparent">
                Clarift
              </span>
            </h1>
            {!shouldReduceMotion && (
              <motion.div
                className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              />
            )}
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.5, delay: 0.25, ease: "easeOut" }
            }
            className="mt-4 text-lg text-text-secondary"
          >
            Your AI-powered study engine
          </motion.p>

          {/* Value props */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.5, delay: 0.4 }
            }
            className="mt-10 space-y-4 w-full"
          >
            {valueProps.map((prop, index) => {
              const Icon = prop.icon;
              return (
                <motion.div
                  key={prop.text}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : {
                          duration: 0.5,
                          delay: 0.5 + index * 0.1,
                          ease: "easeOut",
                        }
                  }
                  className="flex items-center gap-3 text-left"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Icon
                      className="size-[18px] text-brand-500"
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="text-sm text-text-secondary">
                    {prop.text}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Right panel — Auth experience */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-surface-page px-4 py-12">
        {/* Mobile brand header */}
        <div className="md:hidden flex flex-col items-center text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 border border-brand-200 mb-4">
            <BookOpen className="size-6 text-brand-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600 bg-clip-text text-transparent">
              Clarift
            </span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your AI-powered study engine
          </p>
        </div>

        <div className="w-full max-w-md mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} />
            Back to Clarift
          </Link>
        </div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.6, ease: "easeOut" }
          }
          className="w-full max-w-md"
        >
          <div className="bg-surface-card border border-border-default rounded-2xl p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-text-primary">
                  Welcome to Clarift
                </h2>
                <p className="text-sm text-text-secondary">
                  Sign in or create your account to start studying
                </p>
              </div>

              <div className="w-full max-w-full px-4 pt-2">
                <SignIn
                  path="/login"
                  routing="path"
                  fallbackRedirectUrl="/dashboard"
                  appearance={{
                    layout: {
                      hideButtons: false,
                    },
                    elements: {
                      card: "w-full max-w-[360px] mx-auto",
                      headerTitle: "hidden",
                      headerSubtitle: "hidden",
                      dividerText:
                        "text-text-tertiary uppercase text-[10px] font-bold",
                      footer: { display: "none" },
                      footerAction: { display: "none" },
                    },
                  }}
                />
              </div>

              <div className="pt-4 border-t border-border-default">
                <p className="text-xs text-text-tertiary text-center">
                  By signing in, you agree to our Terms of Service and Privacy
                  Policy. Your study data remains private and is never shared.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-text-tertiary">
            Built for students to study effectively
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            AI-powered learning for better retention and performance
          </p>
        </div>
      </div>
    </div>
  );
}
