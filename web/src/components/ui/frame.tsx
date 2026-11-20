import type * as React from "react"
import { cn } from "@/lib/utils"

export function AppFrame({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn("flex min-h-screen w-full bg-background text-foreground", className)}>{children}</div>
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
        "hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex",
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
  return <main className={cn("flex min-w-0 flex-1 flex-col", className)}>{children}</main>
}
