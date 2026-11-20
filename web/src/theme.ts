import { useSyncExternalStore } from "react"

export type ThemeChoice = "system" | "light" | "dark"

const STORAGE_KEY = "containers.theme"
const ORDER: ThemeChoice[] = ["system", "light", "dark"]
const listeners = new Set<() => void>()

function readChoice(): ThemeChoice {
  if (typeof localStorage === "undefined") return "system"
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system"
}

function applyTheme(choice: ThemeChoice) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.classList.remove("light", "dark")
  if (choice === "light" || choice === "dark") {
    root.classList.add(choice)
  } else if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    root.classList.add("dark")
  }
}

export function followSystemTheme() {
  applyTheme(readChoice())
  if (typeof window === "undefined" || !window.matchMedia) return
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const onChange = () => {
    if (readChoice() === "system") applyTheme("system")
  }
  mq.addEventListener("change", onChange)
}

export function setTheme(next: ThemeChoice) {
  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, next)
  applyTheme(next)
  for (const fn of listeners) fn()
}

export function cycleTheme() {
  const current = readChoice()
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!
  setTheme(next)
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    readChoice,
    () => "system" as ThemeChoice,
  )
}
