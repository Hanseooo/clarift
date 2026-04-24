"use client"

import Link from "next/link"
import { FileText, MessageSquare, GraduationCap, Target, Upload, BookOpen, Settings } from "lucide-react"
import { QuotaMeter } from "./quota-meter"
import { QuickActionCard } from "./quick-action-card"
import { DocumentCard } from "@/components/features/documents/document-card"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  createdAt: Date | string
}

interface DashboardOverviewProps {
  userName: string
  documents: Document[]
  usage?: {
    summariesUsed: number
    summariesLimit: number
    quizzesUsed: number
    quizzesLimit: number
    resetAt: string
  }
}

export function DashboardOverview({ userName, documents, usage }: DashboardOverviewProps) {
  const recentDocuments = documents.slice(0, 3)
  const hasDocuments = documents.length > 0

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Here&apos;s what&apos;s happening with your studies
          </p>
        </div>
        <Link
          href="/settings"
          className="flex items-center justify-center size-9 rounded-lg bg-surface-subtle text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors-fast"
          aria-label="Settings"
        >
          <Settings className="size-[18px] stroke-[1.5]" />
        </Link>
      </div>

      {/* Quota meters */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuotaMeter
            label="Summaries"
            used={usage.summariesUsed}
            limit={usage.summariesLimit}
            resetAt={usage.resetAt}
          />
          <QuotaMeter
            label="Quizzes"
            used={usage.quizzesUsed}
            limit={usage.quizzesLimit}
            resetAt={usage.resetAt}
          />
        </div>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickActionCard
            href="/documents"
            icon={<Upload className="size-5 text-brand-500" />}
            label="Upload"
            description="Add notes"
          />
          <QuickActionCard
            href="/summaries"
            icon={<BookOpen className="size-5 text-brand-500" />}
            label="Summaries"
            description="Study guides"
          />
          <QuickActionCard
            href="/quizzes"
            icon={<GraduationCap className="size-5 text-brand-500" />}
            label="Quiz"
            description="Test yourself"
          />
          <QuickActionCard
            href="/practice"
            icon={<Target className="size-5 text-brand-500" />}
            label="Practice"
            description="Weak areas"
          />
          <QuickActionCard
            href="/chat"
            icon={<MessageSquare className="size-5 text-brand-500" />}
            label="Chat"
            description="Ask questions"
          />
        </div>
      </section>

      {/* Recent documents */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
            Recent Documents
          </h2>
          {hasDocuments && (
            <Link
              href="/documents"
              className="text-xs text-brand-500 hover:text-brand-600 font-medium"
            >
              View all
            </Link>
          )}
        </div>

        {hasDocuments ? (
          <div className="space-y-2">
            {recentDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                status={doc.status as "pending" | "processing" | "ready" | "failed"}
                createdAt={doc.createdAt}
                showDelete={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-surface-subtle rounded-xl">
            <FileText className="size-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No documents yet</p>
            <Link
              href="/documents"
              className="text-xs text-brand-500 hover:text-brand-600 font-medium mt-1 inline-block"
            >
              Upload your first notes &rarr;
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
