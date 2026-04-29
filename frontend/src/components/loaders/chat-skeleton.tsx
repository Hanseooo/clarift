import { Skeleton } from "@/components/ui/skeleton"

export function ChatSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Chat card */}
      <div className="border border-border-default rounded-2xl overflow-hidden bg-surface-card">
        {/* Chat header */}
        <div className="p-4 border-b border-border-default flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24 rounded-md ml-auto" />
        </div>

        {/* Messages area */}
        <div className="p-4 space-y-4 min-h-[300px]">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-16 w-[70%] rounded-2xl rounded-tl-sm" />
          </div>
          <div className="flex gap-3 justify-end">
            <Skeleton className="h-12 w-[60%] rounded-2xl rounded-tr-sm" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-20 w-[80%] rounded-2xl rounded-tl-sm" />
          </div>
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-border-default flex items-center gap-3">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  )
}
