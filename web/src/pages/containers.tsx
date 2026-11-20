import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { Box, Play, Plus, RotateCw, Square, Terminal, Trash2 } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/components/ui/empty-state"
import { MenuItem, MenuSeparator } from "@/components/ui/menu"
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { api, type ContainerSummary } from "@/lib/api"
import { stateBadgeVariant } from "@/lib/format"

const DEFAULT_HIDDEN_COLUMNS = ["status"] as const
const DEFAULT_SORT = { key: "name", direction: "asc" as const }
const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function ContainersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [deployOpen, setDeployOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.listContainers(),
    refetchInterval: 6_000,
  })

  const lifecycle = useMutation({
    mutationFn: async ({ id, op }: { id: string; op: "start" | "stop" | "restart" | "remove" }) => {
      if (op === "start") return api.startContainer(id)
      if (op === "stop") return api.stopContainer(id)
      if (op === "restart") return api.restartContainer(id)
      return api.removeContainer(id, true)
    },
    onSuccess: async (_, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["containers"] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["overview"] }),
      ])
      toast.add({
        title: vars.op === "remove" ? "Container removed" : `Container ${vars.op}ed`,
        description: vars.id,
        type: "success",
      })
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.add({ title: "Action failed", description: err.message, type: "error" })
    },
  })

  const bulkLifecycle = useMutation({
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
        qc.invalidateQueries({ queryKey: ["containers"] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["overview"] }),
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

  const filters = useMemo<DataTableFilter<ContainerSummary>[]>(() => {
    const rows = list.data ?? []
    const states = new Set<string>(["running", "exited"])
    const projects = new Set<string>()
    for (const c of rows) {
      if (c.state) states.add(c.state)
      if (c.project) projects.add(c.project)
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
    const sortedProjects = Array.from(projects).sort((a, b) => a.localeCompare(b))
    return [
      {
        key: "state",
        label: "State",
        options: sortedStates.map((s) => ({ value: s, label: s })),
      },
      {
        key: "project",
        label: "Project",
        options: sortedProjects.map((p) => ({ value: p, label: p })),
      },
    ]
  }, [list.data])

  const columns = useMemo<DataTableColumn<ContainerSummary>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        width: 190,
        grow: true,
        sortable: true,
        hideable: false,
        cell: (c) => <span className="font-medium text-foreground">{c.name}</span>,
      },
      {
        key: "project",
        header: "Project",
        width: 130,
        sortable: true,
        cell: (c) => (
          <Link
            to="/projects/$project"
            params={{ project: c.project }}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {c.project}
          </Link>
        ),
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
        width: 150,
        cell: (c) => {
          const ports = c.ports
            .filter((p) => p.publicPort > 0)
            .map((p) => `${p.publicPort}:${p.privatePort}`)
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
                Inspect
              </MenuItem>
              {running ? (
                <MenuItem
                  disabled={lifecycle.isPending}
                  onClick={() => lifecycle.mutate({ id: c.name, op: "stop" })}
                >
                  <Square className="size-4" />
                  Stop
                </MenuItem>
              ) : (
                <MenuItem
                  disabled={lifecycle.isPending}
                  onClick={() => lifecycle.mutate({ id: c.name, op: "start" })}
                >
                  <Play className="size-4" />
                  Start
                </MenuItem>
              )}
              <MenuItem
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate({ id: c.name, op: "restart" })}
              >
                <RotateCw className="size-4" />
                Restart
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                variant="destructive"
                disabled={lifecycle.isPending}
                onClick={() => setDeleteTarget(c.name)}
              >
                <Trash2 className="size-4" />
                Remove
              </MenuItem>
            </DataTableRowActions>
          )
        },
      },
    ],
    [lifecycle.isPending, lifecycle.mutate, navigate],
  )

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Containers</PageHeaderTitle>
          <PageHeaderDescription>All local Docker containers across projects.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button size="sm" onClick={() => setDeployOpen(true)}>
            <Plus data-icon="inline-start" className="size-4" />
            Deploy Container
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {list.isPending ? (
        <Skeleton className="h-72" />
      ) : list.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to list containers</AlertTitle>
          <AlertDescription>{list.error.message}</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          data={list.data ?? []}
          columns={columns}
          getRowId={(c) => c.id}
          aria-label="Containers"
          noun="containers"
          searchPlaceholder="Search containers, images, or projects..."
          searchText={(c) => `${c.name} ${c.image} ${c.project} ${c.shortId} ${c.state}`}
          filters={filters}
          defaultSort={DEFAULT_SORT}
          defaultHiddenColumns={DEFAULT_HIDDEN_COLUMNS}
          defaultPageSize={20}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          selectable
          bulkActions={(rows, clear) => (
            <>
              <Button
                size="xs"
                variant="outline"
                disabled={bulkLifecycle.isPending}
                onClick={() =>
                  bulkLifecycle.mutate({
                    ids: rows.map((r) => r.name),
                    op: "start",
                    onDone: clear,
                  })
                }
              >
                <Play data-icon="inline-start" className="size-3" />
                Start
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={bulkLifecycle.isPending}
                onClick={() =>
                  bulkLifecycle.mutate({
                    ids: rows.map((r) => r.name),
                    op: "stop",
                    onDone: clear,
                  })
                }
              >
                <Square data-icon="inline-start" className="size-3" />
                Stop
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={bulkLifecycle.isPending}
                onClick={() =>
                  bulkLifecycle.mutate({
                    ids: rows.map((r) => r.name),
                    op: "restart",
                    onDone: clear,
                  })
                }
              >
                <RotateCw data-icon="inline-start" className="size-3" />
                Restart
              </Button>
            </>
          )}
          onRowClick={({ row }) => void navigate({ to: "/containers/$id", params: { id: row.name } })}
          emptyState={
            <EmptyState size="sm">
              <EmptyStateIcon>
                <Box />
              </EmptyStateIcon>
              <EmptyStateTitle>No containers yet</EmptyStateTitle>
              <EmptyStateDescription>Deploy a container to get started on this host.</EmptyStateDescription>
              <EmptyStateActions>
                <Button size="sm" onClick={() => setDeployOpen(true)}>
                  Deploy Container
                </Button>
              </EmptyStateActions>
            </EmptyState>
          }
        />
      )}

      <DeployDialog open={deployOpen} onOpenChange={setDeployOpen} />

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove container</DialogTitle>
            <DialogDescription>
              Force remove <span className="font-mono font-medium">{deleteTarget}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={lifecycle.isPending}
              onClick={() => deleteTarget && lifecycle.mutate({ id: deleteTarget, op: "remove" })}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
