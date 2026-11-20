import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const skeletonVariants = cva("animate-pulse bg-foreground/6 motion-reduce:animate-none", {
  variants: {
    shape: {
      default: "rounded-lg",
      circle: "rounded-full",
      card: "rounded-xl",
    },
  },
  defaultVariants: { shape: "default" },
})

/**
 * Placeholder for content that is still loading. Size it with `className` (`h-4 w-32`,
 * `size-8`). The pulse stops under reduced motion.
 */
function Skeleton({
  className,
  shape = "default",
  variant,
  delay: _delay,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof skeletonVariants> & {
    variant?: "default" | "circle" | "card" | string
    delay?: number | string
  }) {
  const resolvedShape = variant === "circle" || variant === "card" ? variant : shape
  return <div data-slot="skeleton" aria-hidden className={cn(skeletonVariants({ shape: resolvedShape }), className)} {...props} />
}

export { Skeleton, skeletonVariants }
