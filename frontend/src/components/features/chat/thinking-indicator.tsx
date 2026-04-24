export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex items-center gap-1">
        <span className="thinking-dot" />
        <span className="thinking-dot" />
        <span className="thinking-dot" />
      </div>
      <span className="text-xs text-text-tertiary">
        Searching your notes...
      </span>
    </div>
  )
}
