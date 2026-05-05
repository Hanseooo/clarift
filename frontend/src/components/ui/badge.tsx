import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors-fast truncate max-w-full",
  {
    variants: {
      variant: {
        pending: "bg-surface-subtle text-text-tertiary",
        processing: "bg-brand-100 text-brand-800",
        ready: "bg-success-100 text-success-800",
        failed: "bg-danger-100 text-danger-800",
        free: "bg-surface-subtle text-text-secondary",
        pro: "bg-accent-100 text-accent-800",
        mcq: "bg-brand-100 text-brand-800",
        true_false: "bg-success-100 text-success-800",
        identification: "bg-accent-100 text-accent-800",
        multi_select: "bg-brand-100 text-brand-800",
        ordering: "bg-brand-100 text-brand-800",
        default: "bg-brand-100 text-brand-800",
        secondary: "bg-surface-subtle text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
