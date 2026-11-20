import { useQuery } from "@tanstack/react-query"
import { Network } from "lucide-react"
import { useMemo } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/ui/data-table"
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state"
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type NetworkSummary } from "@/lib/api"

const DEFAULT_SORT = { key: "name", direction: "asc" as const }
const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function NetworksPage() {
  const networks = useQuery({
    queryKey: ["networks"],
    queryFn: api.listNetworks,
  })

  const filters = useMemo<DataTableFilter<NetworkSummary>[]>(() => {
    const drivers = new Set<string>()
    const scopes = new Set<string>()
    for (const n of networks.data ?? []) {
      if (n.driver) drivers.add(n.driver)
      if (n.scope) scopes.add(n.scope)
    }
    const list: DataTableFilter<NetworkSummary>[] = []
    if (drivers.size > 0) {
      list.push({
        key: "driver",
        label: "Driver",
        options: Array.from(drivers)
          .sort((a, b) => a.localeCompare(b))
          .map((d) => ({ value: d, label: d })),
      })
    }
    if (scopes.size > 0) {
      list.push({
        key: "scope",
        label: "Scope",
        options: Array.from(scopes)
          .sort((a, b) => a.localeCompare(b))
          .map((s) => ({ value: s, label: s })),
      })
    }
    return list
  }, [networks.data])

  const columns = useMemo<DataTableColumn<NetworkSummary>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        width: 180,
        grow: true,
        sortable: true,
        cell: (n) => <span className="font-medium text-foreground">{n.name}</span>,
      },
      {
        key: "shortId",
        header: "ID",
        width: 140,
        sortable: true,
        cell: (n) => (
          <span className="font-mono text-ui-xs text-muted-foreground">{n.shortId}</span>
        ),
      },
      {
        key: "driver",
        header: "Driver",
        width: 120,
        sortable: true,
        cell: (n) => (
          <Badge variant="outline" size="sm">
            {n.driver}
          </Badge>
        ),
      },
      {
        key: "scope",
        header: "Scope",
        width: 110,
        sortable: true,
        cell: (n) => <span className="text-muted-foreground">{n.scope}</span>,
      },
      {
        key: "containers",
        header: "Containers",
        width: 120,
        align: "right",
        sortable: true,
        sortValue: (n) => n.containers,
        cell: (n) => <span className="tabular-nums">{n.containers}</span>,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Networks</PageHeaderTitle>
          <PageHeaderDescription>Docker bridge and overlay networks.</PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {networks.isPending ? (
        <Skeleton className="h-64" />
      ) : networks.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to list networks</AlertTitle>
          <AlertDescription>{networks.error.message}</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          data={networks.data ?? []}
          columns={columns}
          getRowId={(n) => n.id}
          aria-label="Networks"
          noun="networks"
          searchPlaceholder="Search networks..."
          filters={filters}
          defaultSort={DEFAULT_SORT}
          defaultPageSize={20}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          emptyState={
            <EmptyState size="sm">
              <EmptyStateIcon>
                <Network />
              </EmptyStateIcon>
              <EmptyStateTitle>No networks found</EmptyStateTitle>
            </EmptyState>
          }
        />
      )}
    </div>
  )
}
