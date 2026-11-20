import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { FolderKanban, Plus } from "lucide-react"
import { useState } from "react"

import { DeployDialog } from "@/components/deploy-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { stateBadgeVariant } from "@/lib/format"

export function ProjectsPage() {
  const [search, setSearch] = useState("")
  const [deployOpen, setDeployOpen] = useState(false)

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
    refetchInterval: 8_000,
  })

  const filtered = (projects.data ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.containers.some((c) => c.name.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Projects</PageHeaderTitle>
          <PageHeaderDescription>
            Containers grouped by <code className="font-mono text-ui-xs">com.docker.compose.project</code> label.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Input
            size="sm"
            placeholder="Filter projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Button size="sm" onClick={() => setDeployOpen(true)}>
            <Plus data-icon="inline-start" className="size-4" />
            Deploy
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {projects.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : projects.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to list projects</AlertTitle>
          <AlertDescription>{projects.error.message}</AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <EmptyState variant="outline">
          <EmptyStateIcon>
            <FolderKanban />
          </EmptyStateIcon>
          <EmptyStateTitle>No projects found</EmptyStateTitle>
          <EmptyStateDescription>
            {search ? "No projects matched your search query." : "Deploy a container to get started."}
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button size="sm" onClick={() => setDeployOpen(true)}>
              Deploy Container
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((proj) => (
            <Card
              key={proj.name}
              interactive
              render={<Link to="/projects/$project" params={{ project: proj.name }} />}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{proj.name}</CardTitle>
                  <Badge variant={proj.stopped === 0 && proj.running > 0 ? "success" : "warning"} size="sm">
                    {proj.running}/{proj.total}
                  </Badge>
                </div>
                <CardDescription>
                  {proj.running} running · {proj.stopped} stopped
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {proj.containers.slice(0, 6).map((c) => (
                  <Badge key={c.id} variant={stateBadgeVariant(c.state)} size="sm">
                    {c.name}
                  </Badge>
                ))}
                {proj.containers.length > 6 ? (
                  <Badge variant="outline" size="sm">
                    +{proj.containers.length - 6}
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeployDialog open={deployOpen} onOpenChange={setDeployOpen} />
    </div>
  )
}
