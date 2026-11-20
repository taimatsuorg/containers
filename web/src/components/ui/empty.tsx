import type * as React from "react"
import {
  EmptyState,
  EmptyStateActions as EmptyContent,
  EmptyStateDescription as EmptyDescription,
  EmptyStateIcon,
  EmptyStateTitle as EmptyTitle,
} from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

export function Empty({
  size,
  variant: _variant,
  ...props
}: Omit<React.ComponentProps<typeof EmptyState>, "size"> & {
  size?: "sm" | "default" | "lg" | "inline"
  variant?: string
}) {
  const mappedSize = size === "inline" ? "sm" : size
  return <EmptyState size={mappedSize} {...props} />
}

export function EmptyMedia({
  variant: _variant,
  ...props
}: React.ComponentProps<typeof EmptyStateIcon> & { variant?: string }) {
  return <EmptyStateIcon {...props} />
}

export { EmptyContent, EmptyDescription, EmptyTitle }

export function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col items-center gap-1.5 text-center", className)} {...props} />
}
