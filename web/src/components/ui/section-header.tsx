import type * as React from "react"
import { cn } from "@/lib/utils"

export function SectionHeader({
  id,
  title,
  count,
  description,
  actions,
  action,
  className,
  children,
}: {
  id?: string
  title?: React.ReactNode
  count?: number | string
  description?: React.ReactNode
  actions?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  const trailing = actions ?? action
  return (
    <div id={id} className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        {title ? (
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <span>{title}</span>
            {count !== undefined ? (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">{count}</span>
            ) : null}
          </h2>
        ) : null}
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {children}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  )
}
