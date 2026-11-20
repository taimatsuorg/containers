import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router"

import { Shell } from "@/components/shell"
import { ContainerDetailPage } from "@/pages/container-detail"
import { ContainersPage } from "@/pages/containers"
import { ImagesPage } from "@/pages/images"
import { NetworksPage } from "@/pages/networks"
import { OverviewPage } from "@/pages/overview"
import { ProjectDetailPage } from "@/pages/project-detail"
import { ProjectsPage } from "@/pages/projects"
import { SettingsPage } from "@/pages/settings"
import { VolumesPage } from "@/pages/volumes"

const rootRoute = createRootRoute({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
})

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: OverviewPage,
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
})

const projectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$project",
  component: ProjectDetailPage,
})

const containersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/containers",
  component: ContainersPage,
})

const containerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/containers/$id",
  component: ContainerDetailPage,
})

const imagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/images",
  component: ImagesPage,
})

const volumesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/volumes",
  component: VolumesPage,
})

const networksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/networks",
  component: NetworksPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  overviewRoute,
  projectsRoute,
  projectDetailRoute,
  containersRoute,
  containerDetailRoute,
  imagesRoute,
  volumesRoute,
  networksRoute,
  settingsRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
