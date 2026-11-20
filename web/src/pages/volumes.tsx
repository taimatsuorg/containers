import { useQuery } from "@tanstack/react-query"
import { HardDrive } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state"
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
import { api } from "@/lib/api"

export function VolumesPage() {
  const [search, setSearch] = useState("")
  const volumes = useQuery({
    queryKey: ["volumes"],
    queryFn: api.listVolumes,
  })

  const filtered = (volumes.data ?? []).filter(
    (v) => !search || v.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Volumes</PageHeaderTitle>
          <PageHeaderDescription>Persistent Docker volumes on this host.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Input
            size="sm"
            placeholder="Filter volumes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
        </PageHeaderActions>
      </PageHeader>

      {volumes.isPending ? (
        <Skeleton className="h-64" />
      ) : volumes.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to list volumes</AlertTitle>
          <AlertDescription>{volumes.error.message}</AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <EmptyState variant="outline">
          <EmptyStateIcon>
            <HardDrive />
          </EmptyStateIcon>
          <EmptyStateTitle>No volumes found</EmptyStateTitle>
        </EmptyState>
      ) : (
        <SimpleTable variant="plain">
          <SimpleTableHeader>
            <SimpleTableRow>
              <SimpleTableHead>Name</SimpleTableHead>
              <SimpleTableHead>Driver</SimpleTableHead>
              <SimpleTableHead>Mountpoint</SimpleTableHead>
            </SimpleTableRow>
          </SimpleTableHeader>
          <SimpleTableBody>
            {filtered.map((v) => (
              <SimpleTableRow key={v.name}>
                <SimpleTableCell variant="code" className="font-medium">
                  {v.name}
                </SimpleTableCell>
                <SimpleTableCell>
                  <Badge variant="outline" size="sm">
                    {v.driver}
                  </Badge>
                </SimpleTableCell>
                <SimpleTableCell variant="code" className="text-muted-foreground">
                  {v.mountpoint}
                </SimpleTableCell>
              </SimpleTableRow>
            ))}
          </SimpleTableBody>
        </SimpleTable>
      )}
    </div>
  )
}
