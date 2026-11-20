import type * as React from "react"
import { cn } from "@/lib/utils"

export function Term({
  children,
  detail: _detail,
  translate,
  className,
}: {
  children: React.ReactNode
  detail?: React.ReactNode
  translate?: "yes" | "no" | string
  className?: string
}) {
  return (
    <span translate={translate as "yes" | "no" | undefined} className={cn("border-b border-dotted border-border font-medium", className)}>
      {children}
    </span>
  )
}

export function TermDetail({
  children,
  translate,
  className,
}: {
  children: React.ReactNode
  translate?: "yes" | "no" | string
  className?: string
}) {
  return (
    <span translate={translate as "yes" | "no" | undefined} className={cn("text-xs text-muted-foreground", className)}>
      {children}
    </span>
  )
}
