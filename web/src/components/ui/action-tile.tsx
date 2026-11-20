import type * as React from "react"
import { cn } from "@/lib/utils"

export function ActionTile({
  icon,
  title,
  description,
  onClick,
  disabled,
  className,
  children,
  ...props
}: {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
} & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-secondary/60 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {icon ? <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span> : null}
      <span className="min-w-0 flex-1 space-y-0.5">
        {title ? <span className="block text-sm font-medium text-foreground">{title}</span> : null}
        {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
        {children}
      </span>
    </button>
  )
}
