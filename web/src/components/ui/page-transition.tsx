import { useRef } from "react"

export function viewTransitionTypes(..._args: unknown[]): string[] | false {
  return ["slide"]
}

export const pageViewTransition = {
  types: () => ["slide"],
}

export function usePageTransition<T extends HTMLElement = HTMLDivElement>(_key?: unknown) {
  return useRef<T>(null)
}
