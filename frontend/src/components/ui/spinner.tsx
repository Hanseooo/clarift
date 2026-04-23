import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  label?: string
}

export function Spinner({ size = "md", label, className, ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)} {...props}>
      <div className={cn("spinner", sizeClasses[size])} />
      {label && <span className="text-xs text-text-tertiary">{label}</span>}
    </div>
  )
}
