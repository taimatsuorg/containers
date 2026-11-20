import type * as React from "react"
import { cn } from "@/lib/utils"

export function Container({
  width: _width,
  title,
  titleAction,
  variant: _variant,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  width?: string
  title?: React.ReactNode
  titleAction?: React.ReactNode
  variant?: string
}) {
  return (
    <div className={cn("mx-auto w-full max-w-content px-4 sm:px-6", className)} {...props}>
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
