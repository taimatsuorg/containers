import type * as React from "react"
import { cn } from "@/lib/utils"

export function SummaryCard({
  title,
  titleAction,
  variant: _variant,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  title?: React.ReactNode
  titleAction?: React.ReactNode
  variant?: string
}) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-4 text-card-foreground", className)}
      {...props}
    >
      {title !== undefined ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {titleAction}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export function SummaryCardMain({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-start justify-between gap-4", className)} {...props} />
}

export function SummaryCardStatus({
  tone: _tone,
  className,
  ...props
}: { tone?: string } & React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2.5", className)} {...props} />
}

export function SummaryCardCount({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-2xl font-semibold tracking-tight tabular-nums", className)} {...props} />
}

export function SummaryCardWord({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export function SummaryCardAside({
  width: _width,
  className,
  ...props
}: { width?: string } & React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />
}

export function SummaryCardSince({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-xs text-muted-foreground", className)} {...props} />
}

export function SummaryCardActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />
}

export function SummaryCardFacts({ className, ...props }: React.ComponentProps<"dl">) {
  return <dl className={cn("mt-4 grid gap-3 border-t border-border pt-3 sm:grid-cols-3", className)} {...props} />
}

export function SummaryCardFact({
  label,
  value,
  children,
  className,
}: {
  label?: React.ReactNode
  value?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      {label ? <dt className="text-xs text-muted-foreground">{label}</dt> : null}
      {value ?? children ? <dd className="text-sm font-medium text-foreground">{value ?? children}</dd> : null}
    </div>
  )
}
