import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Box, Play, Plus, RotateCw, Square, Trash2 } from "lucide-react"
import { useState } from "react"

import { DeployDialog } from "@/components/deploy-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import {
  SimpleTable,
  SimpleTableBody,
  SimpleTableCell,
  SimpleTableHead,
  SimpleTableHeader,
  SimpleTableRow,
} from "@/components/ui/simple-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { stateBadgeVariant } from "@/lib/format"

export function ContainersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "running" | "stopped">("all")
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

  const filtered = (list.data ?? []).filter((c) => {
    if (filter === "running" && c.state !== "running") return false
    if (filter === "stopped" && c.state === "running") return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.image.toLowerCase().includes(q) ||
      c.project.toLowerCase().includes(q)
    )
  })

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList size="sm">
            <TabsTab value="all">All</TabsTab>
            <TabsTab value="running">Running</TabsTab>
            <TabsTab value="stopped">Stopped</TabsTab>
          </TabsList>
        </Tabs>

        <Input
          size="sm"
          placeholder="Search containers or images..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to list containers</AlertTitle>
          <AlertDescription>{list.error.message}</AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <EmptyState variant="outline">
          <EmptyStateIcon>
            <Box />
          </EmptyStateIcon>
          <EmptyStateTitle>No containers match</EmptyStateTitle>
          <EmptyStateDescription>Try clearing your filter or deploy a new container.</EmptyStateDescription>
          <EmptyStateActions>
            <Button size="sm" onClick={() => setDeployOpen(true)}>
              Deploy Container
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <SimpleTable variant="plain">
          <SimpleTableHeader>
            <SimpleTableRow>
              <SimpleTableHead>Name</SimpleTableHead>
              <SimpleTableHead>Project</SimpleTableHead>
              <SimpleTableHead>Image</SimpleTableHead>
              <SimpleTableHead>State</SimpleTableHead>
              <SimpleTableHead>Ports</SimpleTableHead>
              <SimpleTableHead align="right">Actions</SimpleTableHead>
            </SimpleTableRow>
          </SimpleTableHeader>
          <SimpleTableBody>
            {filtered.map((ctr) => {
              const running = ctr.state === "running"
              const ports = ctr.ports
                .filter((p) => p.publicPort > 0)
                .map((p) => `${p.publicPort}:${p.privatePort}`)
              return (
                <SimpleTableRow key={ctr.id}>
                  <SimpleTableCell className="font-medium">
                    <Link
                      to="/containers/$id"
                      params={{ id: ctr.name }}
                      className="text-foreground hover:text-primary-text hover:underline"
                    >
                      {ctr.name}
                    </Link>
                  </SimpleTableCell>
                  <SimpleTableCell>
                    <Link
                      to="/projects/$project"
                      params={{ project: ctr.project }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {ctr.project}
                    </Link>
                  </SimpleTableCell>
                  <SimpleTableCell variant="code">{ctr.image}</SimpleTableCell>
                  <SimpleTableCell>
                    <Badge variant={stateBadgeVariant(ctr.state)} size="sm">
                      {ctr.state}
                    </Badge>
                  </SimpleTableCell>
                  <SimpleTableCell className="font-mono text-ui-xs text-muted-foreground">
                    {ports.length > 0 ? ports.join(", ") : "—"}
                  </SimpleTableCell>
                  <SimpleTableCell align="right">
                    <div className="inline-flex items-center gap-1">
                      {running ? (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          title="Stop"
                          disabled={lifecycle.isPending}
                          onClick={() => lifecycle.mutate({ id: ctr.name, op: "stop" })}
                        >
                          <Square className="size-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          title="Start"
                          disabled={lifecycle.isPending}
                          onClick={() => lifecycle.mutate({ id: ctr.name, op: "start" })}
                        >
                          <Play className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        title="Restart"
                        disabled={lifecycle.isPending}
                        onClick={() => lifecycle.mutate({ id: ctr.name, op: "restart" })}
                      >
                        <RotateCw className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        title="Remove"
                        disabled={lifecycle.isPending}
                        onClick={() => setDeleteTarget(ctr.name)}
                      >
                        <Trash2 className="size-3.5 text-destructive-text" />
                      </Button>
                    </div>
                  </SimpleTableCell>
                </SimpleTableRow>
              )
            })}
          </SimpleTableBody>
        </SimpleTable>
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
