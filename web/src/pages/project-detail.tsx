import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "@tanstack/react-router"
import { ArrowLeft, Play, Plus, RotateCw, Square, Terminal } from "lucide-react"
import { useState } from "react"

import { DeployDialog } from "@/components/deploy-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
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
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { stateBadgeVariant } from "@/lib/format"

export function ProjectDetailPage() {
  const { project } = useParams({ from: "/projects/$project" })
  const qc = useQueryClient()
  const toast = useToast()
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

      <SimpleTable variant="plain">
        <SimpleTableHeader>
          <SimpleTableRow>
            <SimpleTableHead>Container</SimpleTableHead>
            <SimpleTableHead>Image</SimpleTableHead>
            <SimpleTableHead>State</SimpleTableHead>
            <SimpleTableHead>Ports</SimpleTableHead>
            <SimpleTableHead align="right">Actions</SimpleTableHead>
          </SimpleTableRow>
        </SimpleTableHeader>
        <SimpleTableBody>
          {p.containers.map((ctr) => {
            const running = ctr.state === "running"
            const ports = ctr.ports
              .filter((pt) => pt.publicPort > 0)
              .map((pt) => `${pt.publicPort}:${pt.privatePort}/${pt.type}`)
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
                        disabled={action.isPending}
                        onClick={() => action.mutate({ id: ctr.name, op: "stop" })}
                      >
                        <Square className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        title="Start"
                        disabled={action.isPending}
                        onClick={() => action.mutate({ id: ctr.name, op: "start" })}
                      >
                        <Play className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      title="Restart"
                      disabled={action.isPending}
                      onClick={() => action.mutate({ id: ctr.name, op: "restart" })}
                    >
                      <RotateCw className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      title="Inspect / Terminal"
                      render={<Link to="/containers/$id" params={{ id: ctr.name }} />}
                    >
                      <Terminal className="size-3.5" />
                    </Button>
                  </div>
                </SimpleTableCell>
              </SimpleTableRow>
            )
          })}
        </SimpleTableBody>
      </SimpleTable>

      <DeployDialog open={deployOpen} onOpenChange={setDeployOpen} defaultProject={p.name} />
    </div>
  )
}
