import type * as React from "react"
import { cn } from "@/lib/utils"

export function Dock({ className, ...props }: Omit<React.ComponentProps<"div">, "ref"> & { ref?: React.Ref<any> }) {
  return (
    <div
      className={cn("flex flex-col border-t border-border bg-card text-foreground", className)}
      {...props}
    />
  )
}

export function DockBar({ className, ...props }: Omit<React.ComponentProps<"div">, "ref"> & { ref?: React.Ref<any> }) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 border-b border-border px-3 py-1.5", className)}
      {...props}
    />
  )
}

export function DockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />
}

export function DockResizer({
  value: _value,
  min: _min,
  max: _max,
  onValueChange: _onValueChange,
  className,
  ...props
}: {
  value?: number
  min?: number
  max?: number
  onValueChange?: (value: number) => void
} & React.ComponentProps<"div">) {
  return <div className={cn("h-1.5 w-full cursor-row-resize hover:bg-primary/20", className)} {...props} />
}

export function DockTabs({
  value: _value,
  onValueChange: _onValueChange,
  className,
  ...props
}: {
  value?: string
  onValueChange?: (value: string) => void
} & React.ComponentProps<"div">) {
  return <div className={cn("flex min-h-0 flex-1 flex-col", className)} {...props} />
}

export function DockTabList({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-1 overflow-x-auto", className)} {...props} />
}

export function DockTab({
  active,
  value: _value,
  closeLabel: _closeLabel,
  onClose: _onClose,
  className,
  ...props
}: {
  active?: boolean
  value?: string
  closeLabel?: string
  onClose?: () => void
} & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-active={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
        active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60",
        className,
      )}
      {...props}
    />
  )
}

export function DockPanel({
  value: _value,
  className,
  ...props
}: { value?: string } & React.ComponentProps<"div">) {
  return <div className={cn("min-h-0 flex-1 overflow-hidden", className)} {...props} />
}
