import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "@tanstack/react-router"
import {
  Box,
  FolderKanban,
  HardDrive,
  LayoutDashboard,
  Layers,
  LogOut,
  Network,
  Settings,
} from "lucide-react"
import type * as React from "react"

import { BrandLogo, BrandMark } from "@/components/brand-logo"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarItem,
  SidebarMenu,
} from "@/components/ui/animated-sidebar"
import {
  AppShell,
  AppShellInsetHeader,
  AppShellMain,
  AppShellSidebar,
} from "@/components/ui/app-shell"
import { MenuItem, MenuSeparator } from "@/components/ui/menu"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { UserMenu } from "@/components/ui/user-menu"
import { api } from "@/lib/api"

const PAGE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/projects", title: "Projects" },
  { prefix: "/containers", title: "Containers" },
  { prefix: "/images", title: "Images" },
  { prefix: "/volumes", title: "Volumes" },
  { prefix: "/networks", title: "Networks" },
  { prefix: "/settings", title: "Settings" },
]

function resolveTitle(pathname: string): string {
  if (pathname === "/") return "Overview"
  for (const item of PAGE_TITLES) {
    if (pathname.startsWith(item.prefix)) return item.title
  }
  return "Containers"
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (l) => l.pathname })
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.getMe,
    staleTime: 60_000,
  })
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: api.getOverview,
    refetchInterval: 10_000,
  })

  const pageTitle = resolveTitle(pathname)
  const hostname = overview.data?.host.hostname || "local"
  const counts = overview.data?.counts

  return (
    <AppShell layout="inset" variant="page">
      <AppShellSidebar mobileTitle={<BrandLogo />}>
        <SidebarHeader className="px-3 pt-3 pb-2">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandMark className="size-6" />
            <div className="flex min-w-0 flex-col leading-tight transition-opacity duration-200 group-data-[state=collapsed]/sidebar:opacity-0">
              <span className="truncate font-heading text-sm font-semibold tracking-tight">Containers</span>
              <span className="truncate text-ui-xs text-muted-foreground">{hostname}</span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarItem
                icon={<LayoutDashboard />}
                label="Overview"
                isActive={pathname === "/"}
                render={<Link to="/" />}
              />
              <SidebarItem
                icon={<FolderKanban />}
                label="Projects"
                badge={counts?.projects}
                isActive={pathname.startsWith("/projects")}
                render={<Link to="/projects" />}
              />
              <SidebarItem
                icon={<Box />}
                label="Containers"
                badge={counts ? `${counts.containersRunning}/${counts.containersTotal}` : undefined}
                isActive={pathname.startsWith("/containers")}
                render={<Link to="/containers" />}
              />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Resources</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarItem
                icon={<Layers />}
                label="Images"
                badge={counts?.images}
                isActive={pathname.startsWith("/images")}
                render={<Link to="/images" />}
              />
              <SidebarItem
                icon={<HardDrive />}
                label="Volumes"
                badge={counts?.volumes}
                isActive={pathname.startsWith("/volumes")}
                render={<Link to="/volumes" />}
              />
              <SidebarItem
                icon={<Network />}
                label="Networks"
                badge={counts?.networks}
                isActive={pathname.startsWith("/networks")}
                render={<Link to="/networks" />}
              />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarItem
                icon={<Settings />}
                label="Settings"
                isActive={pathname.startsWith("/settings")}
                render={<Link to="/settings" />}
              />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <UserMenu name={me.data?.username || "admin"} email={`${hostname} · Docker`}>
            <MenuItem render={<Link to="/settings" />}>
              <Settings className="size-4" />
              Settings
            </MenuItem>
            {me.data?.authEnabled ? (
              <>
                <MenuSeparator />
                <MenuItem variant="destructive" onClick={() => void api.logout()}>
                  <LogOut className="size-4" />
                  Sign out
                </MenuItem>
              </>
            ) : null}
          </UserMenu>
        </SidebarFooter>
      </AppShellSidebar>

      <AppShellMain>
        <AppShellInsetHeader className="justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-ui font-medium text-foreground">{pageTitle}</span>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </AppShellInsetHeader>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</div>
      </AppShellMain>
    </AppShell>
  )
}
