import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import {
  ArrowLeft,
  Cpu,
  Eye,
  EyeOff,
  MemoryStick,
  Play,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { TerminalPane } from "@/components/terminal-pane"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard, StatCardHeader, StatCardLabel, StatCardValue } from "@/components/ui/stat-card"
import { Switch } from "@/components/ui/switch"
import { Table, type TableColumn } from "@/components/ui/table"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { UsageMeter } from "@/components/ui/usage-meter"
import { api, type MountInfo } from "@/lib/api"
import { formatBytes, stateBadgeVariant } from "@/lib/format"

const SECRET_KEY_RE = /(pass|secret|token|key|auth|pwd)/i

export function ContainerDetailPage() {
  const { id } = useParams({ from: "/containers/$id" })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const [tab, setTab] = useState("overview")
  const [confirmRemove, setConfirmRemove] = useState(false)

  const mountColumns = useMemo<TableColumn<MountInfo>[]>(
    () => [
      {
        key: "type",
        header: "Type",
        width: 100,
        sortable: true,
        cell: (m) => <span className="text-muted-foreground">{m.type}</span>,
      },
      {
        key: "source",
        header: "Source",
        width: 260,
        grow: true,
        sortable: true,
        cell: (m) => (
          <span className="font-mono text-ui-xs text-foreground" title={m.source}>
            {m.source}
          </span>
        ),
      },
      {
        key: "destination",
        header: "Destination",
        width: 240,
        grow: true,
        sortable: true,
        cell: (m) => (
          <span className="font-mono text-ui-xs text-muted-foreground" title={m.destination}>
            {m.destination}
          </span>
        ),
      },
      {
        key: "readOnly",
        header: "Mode",
        width: 90,
        sortable: true,
        sortValue: (m) => (m.readOnly ? "ro" : "rw"),
        cell: (m) => (
          <Badge variant="outline" size="sm">
            {m.readOnly ? "ro" : "rw"}
          </Badge>
        ),
      },
    ],
    [],
  )

  const detail = useQuery({
    queryKey: ["containers", id],
    queryFn: () => api.getContainer(id),
    refetchInterval: 5_000,
  })

  const isRunning = detail.data?.state === "running"

  const stats = useQuery({
    queryKey: ["containers", id, "stats"],
    queryFn: () => api.getContainerStats(id),
    enabled: isRunning,
    refetchInterval: 4_000,
  })

  const lifecycle = useMutation({
    mutationFn: async (op: "start" | "stop" | "restart" | "remove") => {
      if (op === "start") return api.startContainer(id)
      if (op === "stop") return api.stopContainer(id)
      if (op === "restart") return api.restartContainer(id)
      return api.removeContainer(id, true)
    },
    onSuccess: async (_, op) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["containers"] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["overview"] }),
      ])
      if (op === "remove") {
        toast.add({ title: "Container removed", description: id, type: "success" })
        void navigate({ to: "/containers" })
        return
      }
      toast.add({ title: `Container ${op}ed`, description: id, type: "success" })
    },
    onError: (err) => {
      toast.add({ title: "Action failed", description: err.message, type: "error" })
    },
  })

  if (detail.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (detail.isError || !detail.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Container unavailable</AlertTitle>
        <AlertDescription>{detail.error?.message || "Container not found"}</AlertDescription>
      </Alert>
    )
  }

  const c = detail.data
  const memMb = stats.data ? Math.round(stats.data.memoryBytes / (1024 * 1024)) : 0
  const limitMb =
    stats.data && stats.data.memoryLimit > 0
      ? Math.round(stats.data.memoryLimit / (1024 * 1024))
      : 0

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>
            <Link
              to="/projects/$project"
              params={{ project: c.project }}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              {c.project}
            </Link>
          </PageHeaderEyebrow>
          <div className="flex flex-wrap items-center gap-2.5">
            <PageHeaderTitle>{c.name}</PageHeaderTitle>
            <Badge variant={stateBadgeVariant(c.state)}>{c.state}</Badge>
          </div>
          <PageHeaderDescription className="font-mono text-ui-xs">
            {c.image} · {c.shortId}
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          {isRunning ? (
            <Button
              size="sm"
              variant="outline"
              disabled={lifecycle.isPending}
              onClick={() => lifecycle.mutate("stop")}
            >
              <Square data-icon="inline-start" className="size-3.5" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={lifecycle.isPending}
              onClick={() => lifecycle.mutate("start")}
            >
              <Play data-icon="inline-start" className="size-3.5" />
              Start
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={lifecycle.isPending}
            onClick={() => lifecycle.mutate("restart")}
          >
            <RotateCw data-icon="inline-start" className="size-3.5" />
            Restart
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={lifecycle.isPending}
            onClick={() => setConfirmRemove(true)}
          >
            <Trash2 data-icon="inline-start" className="size-3.5" />
            Remove
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTab value="overview">Overview</TabsTab>
          <TabsTab value="logs">Logs</TabsTab>
          <TabsTab value="terminal" disabled={!isRunning}>
            Terminal
          </TabsTab>
          <TabsTab value="env">Environment ({c.env.length})</TabsTab>
        </TabsList>

        <TabsPanel value="overview" className="space-y-6 pt-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard>
              <StatCardHeader>
                <StatCardLabel>
                  <Cpu />
                  CPU Usage
                </StatCardLabel>
              </StatCardHeader>
              <StatCardValue>
                {isRunning && stats.data ? `${stats.data.cpuPercent.toFixed(2)}%` : "—"}
              </StatCardValue>
            </StatCard>

            <StatCard>
              <StatCardHeader>
                <StatCardLabel>
                  <MemoryStick />
                  Memory
                </StatCardLabel>
              </StatCardHeader>
              <StatCardValue>
                {isRunning && stats.data ? formatBytes(stats.data.memoryBytes) : "—"}
              </StatCardValue>
              {isRunning && stats.data && limitMb > 0 ? (
                <UsageMeter label="Limit" value={memMb} max={limitMb} unit="MB" readout="percent" />
              ) : null}
            </StatCard>

            <StatCard>
              <StatCardHeader>
                <StatCardLabel>Restart Policy</StatCardLabel>
              </StatCardHeader>
              <StatCardValue className="text-lg">{c.restartPolicy || "no"}</StatCardValue>
              <div className="text-ui-xs text-muted-foreground">Restarts: {c.restartCount}</div>
            </StatCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Runtime &amp; Networks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-ui">
                <div>
                  <div className="text-ui-xs text-muted-foreground">Command</div>
                  <code className="mt-0.5 block rounded-lg bg-muted px-2.5 py-1.5 font-mono text-ui-xs">
                    {[...c.entrypoint, ...c.command].join(" ") || "—"}
                  </code>
                </div>
                <div>
                  <div className="text-ui-xs text-muted-foreground">Networks</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.networks.length > 0 ? (
                      c.networks.map((n) => (
                        <Badge key={n} variant="outline" size="sm">
                          {n}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-ui-xs text-muted-foreground">Ports</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.ports.length > 0 ? (
                      c.ports.map((p, i) => (
                        <Badge key={i} variant="chip" size="sm" className="font-mono">
                          {p.publicPort > 0
                            ? `${p.publicPort} -> ${p.privatePort}/${p.type}`
                            : `${p.privatePort}/${p.type}`}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No exposed ports</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Labels</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(c.labels).length === 0 ? (
                  <p className="text-ui-sm text-muted-foreground">No labels</p>
                ) : (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto">
                    {Object.entries(c.labels).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1 text-ui-xs">
                        <span className="shrink-0 font-mono text-muted-foreground">{k}</span>
                        <span className="truncate font-mono text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <section className="space-y-2">
            <h3 className="font-heading text-ui font-semibold">Mounts ({c.mounts.length})</h3>
            <Table
              data={c.mounts}
              columns={mountColumns}
              getRowId={(m, i) => `${m.destination}-${i}`}
              aria-label="Container mounts"
              resizable
              height={c.mounts.length === 0 ? 120 : 40 + Math.min(c.mounts.length, 8) * 44}
              emptyState="No volume mounts"
            />
          </section>
        </TabsPanel>

        <TabsPanel value="logs" className="pt-2">
          <LogsViewer containerId={c.name} />
        </TabsPanel>

        <TabsPanel value="terminal" className="pt-2">
          {isRunning ? <TerminalPane containerId={c.name} /> : null}
        </TabsPanel>

        <TabsPanel value="env" className="pt-2">
          <EnvViewer env={c.env} />
        </TabsPanel>
      </Tabs>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove container</DialogTitle>
            <DialogDescription>
              Force remove <span className="font-mono font-medium">{c.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={lifecycle.isPending}
              onClick={() => lifecycle.mutate("remove")}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LogsViewer({ containerId }: { containerId: string }) {
  const [follow, setFollow] = useState(true)
  const [timestamps, setTimestamps] = useState(false)
  const [filter, setFilter] = useState("")
  const [liveLines, setLiveLines] = useState<string[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  const snapshot = useQuery({
    queryKey: ["containers", containerId, "logs", timestamps],
    queryFn: () => api.getContainerLogs(containerId, 300, timestamps),
    enabled: !follow,
  })

  useEffect(() => {
    if (!follow) return
    setLiveLines([])
    const url = `/api/containers/${encodeURIComponent(containerId)}/logs/follow?tail=200&timestamps=${timestamps}`
    const es = new EventSource(url, { withCredentials: true })
    es.onmessage = (e) => {
      setLiveLines((prev) => {
        const next = [...prev, e.data as string]
        return next.length > 2000 ? next.slice(next.length - 2000) : next
      })
    }
    return () => es.close()
  }, [containerId, follow, timestamps])

  const rawLines = follow ? liveLines : (snapshot.data?.lines ?? [])
  const lines = filter
    ? rawLines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : rawLines

  useEffect(() => {
    if (follow) endRef.current?.scrollIntoView({ behavior: "auto" })
  }, [lines.length, follow])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-ui">
            <Switch size="sm" checked={follow} onCheckedChange={setFollow} />
            Follow
          </label>
          <label className="flex items-center gap-2 text-ui">
            <Switch size="sm" checked={timestamps} onCheckedChange={setTimestamps} />
            Timestamps
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Input
            size="sm"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-56"
          />
          {!follow ? (
            <Button size="sm" variant="outline" onClick={() => void snapshot.refetch()}>
              Refresh
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setLiveLines([])}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="h-[460px] overflow-y-auto rounded-xl bg-[#09090b] p-4 font-mono text-xs leading-relaxed text-zinc-200 shadow-raised">
        {lines.length === 0 ? (
          <div className="text-zinc-500">No log lines available.</div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}

type EnvEntry = {
  id: string
  key: string
  value: string
}

const ENV_DEFAULT_SORT = { key: "key", direction: "asc" as const }
const ENV_PAGE_SIZE_OPTIONS = [10, 20, 50]

function EnvViewer({ env }: { env: string[] }) {
  const [revealSecrets, setRevealSecrets] = useState(false)

  const rows = useMemo<EnvEntry[]>(
    () =>
      env.map((entry, i) => {
        const idx = entry.indexOf("=")
        const key = idx >= 0 ? entry.slice(0, idx) : entry
        const value = idx >= 0 ? entry.slice(idx + 1) : ""
        return { id: `${key}-${i}`, key, value }
      }),
    [env],
  )

  const columns = useMemo<DataTableColumn<EnvEntry>[]>(
    () => [
      {
        key: "key",
        header: "Key",
        width: 240,
        sortable: true,
        hideable: false,
        cell: (row) => (
          <span className="font-mono text-ui-xs font-medium text-foreground" title={row.key}>
            {row.key}
          </span>
        ),
      },
      {
        key: "value",
        header: "Value",
        width: 380,
        grow: true,
        sortable: true,
        cell: (row) => {
          const masked = !revealSecrets && SECRET_KEY_RE.test(row.key) && row.value.length > 0
          const display = masked ? "••••••••" : row.value || "—"
          return (
            <span
              className="font-mono text-ui-xs text-muted-foreground"
              title={!masked && row.value ? row.value : undefined}
            >
              {display}
            </span>
          )
        },
      },
    ],
    [revealSecrets],
  )

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      aria-label="Environment variables"
      noun="variables"
      searchPlaceholder="Search variables..."
      searchText={(r) => (!revealSecrets && SECRET_KEY_RE.test(r.key) ? r.key : `${r.key} ${r.value}`)}
      defaultSort={ENV_DEFAULT_SORT}
      defaultPageSize={20}
      pageSizeOptions={ENV_PAGE_SIZE_OPTIONS}
      toolbar={
        <Button size="sm" variant="outline" onClick={() => setRevealSecrets((v) => !v)}>
          {revealSecrets ? (
            <>
              <EyeOff data-icon="inline-start" className="size-3.5" />
              Hide secrets
            </>
          ) : (
            <>
              <Eye data-icon="inline-start" className="size-3.5" />
              Reveal secrets
            </>
          )}
        </Button>
      }
      emptyState="No environment variables"
    />
  )
}
