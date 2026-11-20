import { cn } from "@/lib/utils"

export type MeterPart = {
  value: number
  tone?: "ok" | "warn" | "fail" | "over" | "idle" | "primary" | "muted"
  label?: string
}

export function meterPartTone(health: string | number): MeterPart["tone"] {
  switch (String(health)) {
    case "ok":
    case "healthy":
      return "ok"
    case "warn":
    case "warning":
      return "warn"
    case "fail":
    case "failing":
    case "danger":
      return "fail"
    case "progress":
    case "progressing":
      return "primary"
    default:
      return "idle"
  }
}

const toneClass: Record<NonNullable<MeterPart["tone"]>, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  fail: "bg-destructive",
  over: "bg-destructive",
  primary: "bg-primary",
  idle: "bg-muted-foreground/30",
  muted: "bg-muted-foreground/20",
}

export function Meter({
  value = 0,
  max = 100,
  tone = "primary",
  size: _size,
  mark: _mark,
  unbounded: _unbounded,
  label,
  className,
}: {
  value?: number
  max?: number
  tone?: MeterPart["tone"]
  size?: string
  mark?: number
  unbounded?: boolean
  label?: string
  className?: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div title={label} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full transition-all", toneClass[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function MeterStack({
  parts,
  total,
  className,
}: {
  parts: Array<MeterPart | number>
  total?: number
  className?: string
}) {
  const normalized: MeterPart[] = parts.map((p) => (typeof p === "number" ? { value: p } : p))
  const sum = total ?? normalized.reduce((acc, p) => acc + p.value, 0)
  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      {normalized.map((part, idx) => {
        const pct = sum > 0 ? (part.value / sum) * 100 : 0
        if (pct <= 0) return null
        return (
          <div
            key={idx}
            title={part.label}
            className={cn("h-full", toneClass[part.tone ?? "idle"])}
            style={{ width: `${pct}%` }}
          />
        )
      })}
    </div>
  )
}
