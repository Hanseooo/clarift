import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-150 ease outline-none select-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/15 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger-500 aria-invalid:ring-3 aria-invalid:ring-danger-500/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
        outline:
          "border-border-default bg-surface-card text-text-primary hover:border-border-strong hover:bg-surface-overlay",
        secondary:
          "bg-surface-subtle text-text-primary border border-border-default hover:border-border-strong hover:bg-surface-card",
        ghost:
          "text-text-secondary hover:bg-surface-overlay",
        destructive:
          "bg-danger-100 text-danger-800 hover:bg-danger-500 hover:text-white",
        link: "text-brand-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 gap-2 md:h-10 md:px-3",
        xs: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3",
        lg: "h-11 gap-2 px-5 text-base",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
