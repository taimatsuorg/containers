import type * as React from "react"
import { cn } from "@/lib/utils"

export function PageColumn({
  width: _width,
  gap: _gap,
  className,
  ...props
}: { width?: string; gap?: string } & React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-6 sm:px-6", className)}
      {...props}
    />
  )
}
