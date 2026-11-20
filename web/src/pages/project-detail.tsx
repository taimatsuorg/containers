import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { ArrowLeft, Play, Plus, RotateCw, Square, Terminal } from "lucide-react"
import { useMemo, useState } from "react"

import { DeployDialog } from "@/components/deploy-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DataTable,
  DataTableRowActions,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/ui/data-table"
import { MenuItem } from "@/components/ui/menu"
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { api, type ContainerSummary } from "@/lib/api"
import { stateBadgeVariant } from "@/lib/format"

const DEFAULT_SORT = { key: "name", direction: "asc" as const }
const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function ProjectDetailPage() {
  const { project } = useParams({ from: "/projects/$project" })
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [deployOpen, setDeployOpen] = useState(false)

  const detail = useQuery({
    queryKey: ["projects", project],
    queryFn: () => api.getProject(project),
    refetchInterval: 6_000,
  })

  const action = useMutation({
    mutationFn: async ({ id, op }: { id: string; op: "start" | "stop" | "restart" }) => {
      if (op === "start") return api.startContainer(id)
      if (op === "stop") return api.stopContainer(id)
      return api.restartContainer(id)
    },
    onSuccess: async (_, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["overview"] }),
        qc.invalidateQueries({ queryKey: ["containers"] }),
      ])
      toast.add({ title: `Container ${vars.op}ed`, description: vars.id, type: "success" })
    },
    onError: (err) => {
      toast.add({ title: "Action failed", description: err.message, type: "error" })
    },
  })

  const bulkAction = useMutation({
    mutationFn: async ({
      ids,
      op,
    }: {
      ids: string[]
      op: "start" | "stop" | "restart"
      onDone?: () => void
    }) => {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (op === "start") return api.startContainer(id)
          if (op === "stop") return api.stopContainer(id)
          return api.restartContainer(id)
        }),
      )
      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.length - succeeded
      return { op, succeeded, failed }
    },
    onSuccess: async (res, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["overview"] }),
        qc.invalidateQueries({ queryKey: ["containers"] }),
      ])
      vars.onDone?.()
      if (res.failed === 0) {
        toast.add({
          title: `${res.succeeded} container${res.succeeded === 1 ? "" : "s"} ${res.op}ed`,
          type: "success",
        })
      } else {
        toast.add({
          title: `Bulk ${res.op} completed with errors`,
          description: `${res.succeeded} succeeded, ${res.failed} failed`,
          type: "error",
        })
      }
    },
    onError: (err) => {
      toast.add({ title: "Bulk action failed", description: err.message, type: "error" })
    },
  })

  const containers = detail.data?.containers ?? []

  const filters = useMemo<DataTableFilter<ContainerSummary>[]>(() => {
    const states = new Set<string>(["running", "exited"])
    for (const c of containers) {
      if (c.state) states.add(c.state)
    }
    const priority = ["running", "exited"]
    const sortedStates = Array.from(states).sort((a, b) => {
      const ia = priority.indexOf(a)
      const ib = priority.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
    return [
      {
        key: "state",
        label: "State",
        options: sortedStates.map((s) => ({ value: s, label: s })),
      },
    ]
  }, [containers])

  const columns = useMemo<DataTableColumn<ContainerSummary>[]>(
    () => [
      {
        key: "name",
        header: "Container",
        width: 190,
        grow: true,
        sortable: true,
        hideable: false,
        cell: (c) => <span className="font-medium text-foreground">{c.name}</span>,
      },
      {
        key: "image",
        header: "Image",
        width: 240,
        grow: true,
        sortable: true,
        cell: (c) => (
          <span className="font-mono text-ui-xs text-muted-foreground" title={c.image}>
            {c.image}
          </span>
        ),
      },
      {
        key: "state",
        header: "State",
        width: 110,
        sortable: true,
        cell: (c) => (
          <Badge variant={stateBadgeVariant(c.state)} size="sm">
            {c.state}
          </Badge>
        ),
      },
      {
        key: "ports",
        header: "Ports",
        width: 160,
        cell: (c) => {
          const ports = c.ports
            .filter((pt) => pt.publicPort > 0)
            .map((pt) => `${pt.publicPort}:${pt.privatePort}/${pt.type}`)
          const label = ports.length > 0 ? ports.join(", ") : "—"
          return (
            <span
              className="font-mono text-ui-xs text-muted-foreground"
              title={ports.length > 0 ? label : undefined}
            >
              {label}
            </span>
          )
        },
      },
      {
        key: "status",
        header: "Status",
        width: 160,
        sortable: true,
        cell: (c) => <span className="text-muted-foreground">{c.status}</span>,
      },
      {
        key: "actions",
        header: "",
        label: "Actions",
        width: 56,
        align: "right",
        hideable: false,
        cell: (c) => {
          const running = c.state === "running"
          return (
            <DataTableRowActions>
              <MenuItem onClick={() => void navigate({ to: "/containers/$id", params: { id: c.name } })}>
                <Terminal className="size-4" />
                Inspect / Terminal
              </MenuItem>
              {running ? (
                <MenuItem
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: c.name, op: "stop" })}
                >
                  <Square className="size-4" />
                  Stop
                </MenuItem>
              ) : (
                <MenuItem
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: c.name, op: "start" })}
                >
                  <Play className="size-4" />
                  Start
                </MenuItem>
              )}
              <MenuItem
                disabled={action.isPending}
                onClick={() => action.mutate({ id: c.name, op: "restart" })}
              >
                <RotateCw className="size-4" />
                Restart
              </MenuItem>
            </DataTableRowActions>
          )
        },
      },
    ],
    [action.isPending, action.mutate, navigate],
  )

  if (detail.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (detail.isError || !detail.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Project unavailable</AlertTitle>
        <AlertDescription>{detail.error?.message || "Not found"}</AlertDescription>
      </Alert>
    )
  }

  const p = detail.data

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>
            <Link to="/projects" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="size-3.5" />
              Projects
            </Link>
          </PageHeaderEyebrow>
          <div className="flex items-center gap-2.5">
            <PageHeaderTitle>{p.name}</PageHeaderTitle>
            <Badge variant={p.stopped === 0 && p.running > 0 ? "success" : "warning"}>
              {p.running}/{p.total} running
            </Badge>
          </div>
          <PageHeaderDescription>{p.containers.length} containers in this group</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button size="sm" onClick={() => setDeployOpen(true)}>
            <Plus data-icon="inline-start" className="size-4" />
            Deploy to {p.name}
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <DataTable
        data={p.containers}
        columns={columns}
        getRowId={(c) => c.id}
        aria-label={`${p.name} containers`}
        noun="containers"
        searchPlaceholder="Search containers in project..."
        filters={filters}
        defaultSort={DEFAULT_SORT}
        defaultPageSize={20}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        selectable
        bulkActions={(rows, clear) => (
          <>
            <Button
              size="xs"
              variant="outline"
              disabled={bulkAction.isPending}
              onClick={() =>
                bulkAction.mutate({ ids: rows.map((r) => r.name), op: "start", onDone: clear })
              }
            >
              <Play data-icon="inline-start" className="size-3" />
              Start
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={bulkAction.isPending}
              onClick={() =>
                bulkAction.mutate({ ids: rows.map((r) => r.name), op: "stop", onDone: clear })
              }
            >
              <Square data-icon="inline-start" className="size-3" />
              Stop
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={bulkAction.isPending}
              onClick={() =>
                bulkAction.mutate({ ids: rows.map((r) => r.name), op: "restart", onDone: clear })
              }
            >
              <RotateCw data-icon="inline-start" className="size-3" />
              Restart
            </Button>
          </>
        )}
        onRowClick={({ row }) => void navigate({ to: "/containers/$id", params: { id: row.name } })}
      />

      <DeployDialog open={deployOpen} onOpenChange={setDeployOpen} defaultProject={p.name} />
    </div>
  )
}
