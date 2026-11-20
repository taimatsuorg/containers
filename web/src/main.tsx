import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { LocaleProvider } from "@/components/ui/locale-provider"
import { ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LoginPage } from "@/pages/login"
import { router } from "@/router"
import "@/styles/app.css"

function initTheme() {
  try {
    const stored = localStorage.getItem("theme")
    const dark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", dark)
    document.documentElement.style.colorScheme = dark ? "dark" : "light"
  } catch {
    // ignore
  }
}

initTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

const rootEl = document.getElementById("root")
if (rootEl) {
  const isLogin = window.location.pathname === "/auth/login"
  createRoot(rootEl).render(
    <StrictMode>
      <LocaleProvider>
        <TooltipProvider>
          <ToastProvider>
            {isLogin ? (
              <LoginPage />
            ) : (
              <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
              </QueryClientProvider>
            )}
          </ToastProvider>
        </TooltipProvider>
      </LocaleProvider>
    </StrictMode>,
  )
}
