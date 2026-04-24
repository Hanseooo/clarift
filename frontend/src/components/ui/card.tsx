import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "transition-colors-fast",
  {
    variants: {
      variant: {
        document: "bg-surface-card border border-border-default rounded-xl p-4 hover:bg-surface-overlay hover:border-border-strong",
        feature: "bg-surface-card border border-border-default rounded-2xl p-5 md:p-6",
        stat: "bg-surface-subtle rounded-xl p-3 md:p-4",
        option: "bg-surface-card border-[1.5px] border-border-default rounded-[14px] p-4 cursor-pointer transition-colors-fast hover:border-border-strong hover:bg-surface-overlay",
        default: "bg-surface-card border border-border-default rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props} />
  )
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between", className)} {...props} />
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />
}

export { Card, CardHeader, CardContent, CardFooter, cardVariants }
