import type * as React from "react"
import { cn } from "@/lib/utils"

export function AppFrame({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex min-h-screen w-full bg-muted/60 text-foreground dark:bg-background", className)}>
      {children}
    </div>
  )
}

export function FrameSidebar({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <aside
      className={cn(
        "hidden w-60 shrink-0 flex-col bg-transparent md:flex",
        className,
      )}
    >
      {children}
    </aside>
  )
}

export function FramePanel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <main
      className={cn(
        "flex min-w-0 flex-1 flex-col bg-background md:my-2 md:me-2 md:overflow-hidden md:rounded-2xl md:shadow-raised md:ring-1 md:ring-border/60",
        className,
      )}
    >
      {children}
    </main>
  )
}
