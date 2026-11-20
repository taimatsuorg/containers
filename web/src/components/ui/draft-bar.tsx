import type * as React from "react"
import { cn } from "@/lib/utils"

export function DraftBar({
  dirty,
  label,
  detail,
  blocked,
  actions,
  children,
  className,
}: {
  dirty?: boolean
  label?: React.ReactNode
  detail?: React.ReactNode
  blocked?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  if (dirty === false) return null
  return (
    <div
      className={cn(
        "sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur",
        className,
      )}
    >
      {label !== undefined || detail !== undefined || blocked !== undefined ? (
        <>
          <div className="min-w-0 space-y-0.5">
            {label ? <div className="text-sm font-medium text-foreground">{label}</div> : null}
            {detail ? <div className="text-xs text-muted-foreground">{detail}</div> : null}
            {blocked ? <div className="text-xs text-destructive-text">{blocked}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          {children}
        </>
      ) : (
        children
      )}
    </div>
  )
}
