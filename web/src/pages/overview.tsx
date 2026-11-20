import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { Box, Cpu, FolderKanban, Layers, Plus } from "lucide-react"
import { useMemo, useState } from "react"

import { DeployDialog } from "@/components/deploy-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatCard,
  StatCardFooter,
  StatCardHeader,
  StatCardHint,
  StatCardLabel,
  StatCardValue,
} from "@/components/ui/stat-card"
import { Table, type TableColumn } from "@/components/ui/table"
import { api, type ContainerSummary } from "@/lib/api"
import { formatBytes, stateBadgeVariant } from "@/lib/format"

const DEFAULT_SORT = { key: "name", direction: "asc" as const }

export function OverviewPage() {
  const [deployOpen, setDeployOpen] = useState(false)
  const navigate = useNavigate()
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: api.getOverview,
    refetchInterval: 8_000,
  })

  const columns = useMemo<TableColumn<ContainerSummary>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        width: 190,
        grow: true,
        sortable: true,
        cell: (ctr) => <span className="font-medium text-foreground">{ctr.name}</span>,
      },
      {
        key: "project",
        header: "Project",
        width: 130,
        sortable: true,
        cell: (ctr) => (
          <Link
            to="/projects/$project"
            params={{ project: ctr.project }}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {ctr.project}
          </Link>
        ),
      },
      {
        key: "image",
        header: "Image",
        width: 240,
        grow: true,
        sortable: true,
        cell: (ctr) => (
          <span className="font-mono text-ui-xs text-muted-foreground" title={ctr.image}>
            {ctr.image}
          </span>
        ),
      },
      {
        key: "state",
        header: "State",
        width: 110,
        sortable: true,
        cell: (ctr) => (
          <Badge variant={stateBadgeVariant(ctr.state)} size="sm">
            {ctr.state}
          </Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: 170,
        sortable: true,
        cell: (ctr) => <span className="text-muted-foreground">{ctr.status}</span>,
      },
    ],
    [],
  )

  if (overview.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (overview.isError || !overview.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load Docker overview</AlertTitle>
        <AlertDescription>{overview.error?.message || "Docker daemon unreachable."}</AlertDescription>
      </Alert>
    )
  }

  const { host, counts, projects } = overview.data
  const allContainers = projects.flatMap((p) => p.containers).slice(0, 12)
  const tableHeight = allContainers.length === 0 ? 160 : 40 + Math.min(allContainers.length, 10) * 44

  return (
    <div className="space-y-8">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Overview</PageHeaderTitle>
          <PageHeaderDescription>
            {host.hostname} · Docker {host.dockerVersion || "unknown"} · {host.os} ({host.arch})
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button size="sm" onClick={() => setDeployOpen(true)}>
            <Plus data-icon="inline-start" className="size-4" />
            Deploy Container
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {!host.dockerConnected ? (
        <Alert variant="warning">
          <AlertTitle>Docker daemon disconnected</AlertTitle>
          <AlertDescription>Ensure /var/run/docker.sock is mounted and running.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard>
          <StatCardHeader>
            <StatCardLabel>
              <Box />
              Running Containers
            </StatCardLabel>
            <Badge variant={counts.containersRunning > 0 ? "success" : "chip"} size="sm">
              {counts.containersTotal} total
            </Badge>
          </StatCardHeader>
          <StatCardValue>{counts.containersRunning}</StatCardValue>
          <StatCardFooter>
            <StatCardHint>{counts.containersStopped} stopped</StatCardHint>
          </StatCardFooter>
        </StatCard>

        <StatCard>
          <StatCardHeader>
            <StatCardLabel>
              <FolderKanban />
              Projects
            </StatCardLabel>
          </StatCardHeader>
          <StatCardValue>{counts.projects}</StatCardValue>
          <StatCardFooter>
            <StatCardHint>Grouped by Compose label</StatCardHint>
          </StatCardFooter>
        </StatCard>

        <StatCard>
          <StatCardHeader>
            <StatCardLabel>
              <Layers />
              Local Images
            </StatCardLabel>
          </StatCardHeader>
          <StatCardValue>{counts.images}</StatCardValue>
          <StatCardFooter>
            <StatCardHint>
              {counts.volumes} volumes · {counts.networks} networks
            </StatCardHint>
          </StatCardFooter>
        </StatCard>

        <StatCard>
          <StatCardHeader>
            <StatCardLabel>
              <Cpu />
              Host Capacity
            </StatCardLabel>
          </StatCardHeader>
          <StatCardValue>{host.cpus} vCPU</StatCardValue>
          <StatCardFooter>
            <StatCardHint>{formatBytes(host.memoryBytes)} RAM</StatCardHint>
          </StatCardFooter>
        </StatCard>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-ui-lg font-semibold">Projects</h2>
          <Button variant="ghost" size="sm" render={<Link to="/projects" />}>
            View all
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => (
            <Card
              key={proj.name}
              interactive
              render={<Link to="/projects/$project" params={{ project: proj.name }} />}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{proj.name}</CardTitle>
                  <Badge variant={proj.stopped === 0 && proj.running > 0 ? "success" : "warning"} size="sm">
                    {proj.running}/{proj.total} running
                  </Badge>
                </div>
                <CardDescription>
                  {proj.containers
                    .slice(0, 3)
                    .map((c) => c.name)
                    .join(", ")}
                  {proj.containers.length > 3 ? ` +${proj.containers.length - 3} more` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {proj.containers.slice(0, 4).map((c) => (
                  <Badge key={c.id} variant="outline" size="sm">
                    {c.name}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-ui-lg font-semibold">Containers</h2>
          <Button variant="ghost" size="sm" render={<Link to="/containers" />}>
            Manage all
          </Button>
        </div>
        <Table
          data={allContainers}
          columns={columns}
          getRowId={(ctr) => ctr.id}
          aria-label="Recent containers"
          resizable
          defaultSort={DEFAULT_SORT}
          height={tableHeight}
          onRowClick={({ row }) => void navigate({ to: "/containers/$id", params: { id: row.name } })}
          emptyState="No containers running on this host."
        />
      </section>

      <DeployDialog open={deployOpen} onOpenChange={setDeployOpen} />
    </div>
  )
}
