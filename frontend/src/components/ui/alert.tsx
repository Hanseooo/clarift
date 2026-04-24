import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react"

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 text-sm",
  {
    variants: {
      variant: {
        default:
          "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300",
        success:
          "border-success-300 bg-success-100 text-success-800 dark:border-success-700 dark:bg-success-900/20 dark:text-success-300",
        warning:
          "border-accent-300 bg-accent-100 text-accent-800 dark:border-accent-700 dark:bg-accent-900/20 dark:text-accent-300",
        danger:
          "border-danger-300 bg-danger-100 text-danger-800 dark:border-danger-700 dark:bg-danger-900/20 dark:text-danger-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const alertIcons = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
}

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  dismissible?: boolean
  onDismiss?: () => void
}

function Alert({
  className,
  variant = "default",
  dismissible,
  onDismiss,
  children,
  ...props
}: AlertProps) {
  const Icon = alertIcons[variant || "default"]

  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 opacity-80" />
        <div className="flex-1">{children}</div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1 opacity-60 transition-colors-fast hover:opacity-100"
            aria-label="Dismiss alert"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
