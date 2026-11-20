import type * as React from "react"
import { cn } from "@/lib/utils"

export function ContextChip({
  place,
  who,
  identity,
  avatar,
  trailing,
  className,
  ...props
}: {
  place?: React.ReactNode
  who?: React.ReactNode
  identity?: React.ReactNode
  avatar?: React.ReactNode
  trailing?: React.ReactNode
} & React.ComponentProps<"button">) {
  const subtitle = who ?? identity
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl bg-card px-2.5 py-2 text-left text-ui-sm shadow-raised transition-[box-shadow,background-color] hover:shadow-raised-hover",
        className,
      )}
      {...props}
    >
      {avatar}
      <span className="min-w-0 flex-1 truncate">
        <span className="block truncate font-medium text-foreground">{place}</span>
        {subtitle ? <span className="block truncate text-muted-foreground">{subtitle}</span> : null}
      </span>
      {trailing}
    </button>
  )
}
