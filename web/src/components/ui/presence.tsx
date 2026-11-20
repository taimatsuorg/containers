import { useEffect, useRef, useState } from "react"

export function usePresence<T extends HTMLElement = HTMLElement>(open: boolean, durationMs = 150) {
  const ref = useRef<T | null>(null)
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), durationMs)
    return () => clearTimeout(timer)
  }, [open, durationMs])
  return {
    mounted: open || mounted,
    props: {
      ref,
      "data-state": open ? "open" : "closed",
    } as const,
  }
}
