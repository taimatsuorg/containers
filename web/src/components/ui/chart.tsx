import type * as React from "react"
import { ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

export function ChartContainer({
  config,
  className,
  children,
}: {
  config?: ChartConfig
  className?: string
  children: React.ReactElement
}) {
  const style = Object.entries(config ?? {}).reduce<Record<string, string>>((acc, [key, val]) => {
    if (val.color) acc[`--color-${key}`] = val.color
    return acc
  }, {})
  return (
    <div style={style} className={cn("h-56 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export const ChartTooltip = Tooltip

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator: _indicator,
  labelFormatter,
  formatter,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string }>
  label?: React.ReactNode
  indicator?: string
  labelFormatter?: (label: any, payload: any) => React.ReactNode
  formatter?: (value: any, name: any) => React.ReactNode
}) {
  if (!active || !payload?.length) return null
  const renderedLabel = labelFormatter ? labelFormatter(label, payload) : label
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md">
      {renderedLabel ? <div className="mb-1 font-medium text-foreground">{renderedLabel}</div> : null}
      <div className="space-y-0.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-muted-foreground">
            {formatter ? (
              formatter(entry.value, entry.name)
            ) : (
              <>
                <span>{entry.name}</span>
                <span className="font-mono font-medium text-foreground">{entry.value}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
