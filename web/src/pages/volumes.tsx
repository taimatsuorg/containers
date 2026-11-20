import { useQuery } from "@tanstack/react-query"
import { HardDrive } from "lucide-react"
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
import { api, type VolumeSummary } from "@/lib/api"

const DEFAULT_SORT = { key: "name", direction: "asc" as const }
const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function VolumesPage() {
  const volumes = useQuery({
    queryKey: ["volumes"],
    queryFn: api.listVolumes,
  })

  const filters = useMemo<DataTableFilter<VolumeSummary>[]>(() => {
    const drivers = new Set<string>()
    for (const v of volumes.data ?? []) {
      if (v.driver) drivers.add(v.driver)
    }
    const sorted = Array.from(drivers).sort((a, b) => a.localeCompare(b))
    if (sorted.length === 0) return []
    return [
      {
        key: "driver",
        label: "Driver",
        options: sorted.map((d) => ({ value: d, label: d })),
      },
    ]
  }, [volumes.data])

  const columns = useMemo<DataTableColumn<VolumeSummary>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        width: 240,
        grow: true,
        sortable: true,
        cell: (v) => (
          <span className="font-mono text-ui-xs font-medium text-foreground" title={v.name}>
            {v.name}
          </span>
        ),
      },
      {
        key: "driver",
        header: "Driver",
        width: 120,
        sortable: true,
        cell: (v) => (
          <Badge variant="outline" size="sm">
            {v.driver}
          </Badge>
        ),
      },
      {
        key: "mountpoint",
        header: "Mountpoint",
        width: 340,
        grow: true,
        sortable: true,
        cell: (v) => (
          <span className="font-mono text-ui-xs text-muted-foreground" title={v.mountpoint}>
            {v.mountpoint}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Volumes</PageHeaderTitle>
          <PageHeaderDescription>Persistent Docker volumes on this host.</PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {volumes.isPending ? (
        <Skeleton className="h-64" />
      ) : volumes.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to list volumes</AlertTitle>
          <AlertDescription>{volumes.error.message}</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          data={volumes.data ?? []}
          columns={columns}
          getRowId={(v) => v.name}
          aria-label="Volumes"
          noun="volumes"
          searchPlaceholder="Search volumes or mountpoints..."
          filters={filters}
          defaultSort={DEFAULT_SORT}
          defaultPageSize={20}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          emptyState={
            <EmptyState size="sm">
              <EmptyStateIcon>
                <HardDrive />
              </EmptyStateIcon>
              <EmptyStateTitle>No volumes found</EmptyStateTitle>
            </EmptyState>
          }
        />
      )}
    </div>
  )
}
