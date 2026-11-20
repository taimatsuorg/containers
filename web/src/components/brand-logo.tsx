import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-5 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0F172A" />
      <path
        d="M16 6L25 11.2V20.8L16 26L7 20.8V11.2L16 6Z"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 16L25 11.2M16 16L7 11.2M16 16V26"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M11.5 8.6L20.5 13.8" stroke="#818CF8" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function BrandLogo({ showWordmark = true, className }: { showWordmark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark />
      {showWordmark ? <span className="font-heading text-sm font-semibold tracking-tight">Containers</span> : null}
    </span>
  )
}
