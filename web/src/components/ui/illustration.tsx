import type * as React from "react"
import { cn } from "@/lib/utils"

export function Illustration({
  name,
  kind,
  seed: _seed,
  className,
  ...props
}: { name?: string; kind?: string; seed?: string } & React.ComponentProps<"div">) {
  return (
    <div
      data-illustration={name ?? kind}
      className={cn(
        "flex size-12 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
        <path
          d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M12 12L20 7.5M12 12L4 7.5M12 12V21" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
