import { useQuery } from "@tanstack/react-query"
import { Network } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state"
import {
  PageHeader,
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

export function NetworksPage() {
  const networks = useQuery({
    queryKey: ["networks"],
    queryFn: api.listNetworks,
  })

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
      ) : (networks.data ?? []).length === 0 ? (
        <EmptyState variant="outline">
          <EmptyStateIcon>
            <Network />
          </EmptyStateIcon>
          <EmptyStateTitle>No networks found</EmptyStateTitle>
        </EmptyState>
      ) : (
        <SimpleTable variant="plain">
          <SimpleTableHeader>
            <SimpleTableRow>
              <SimpleTableHead>Name</SimpleTableHead>
              <SimpleTableHead>ID</SimpleTableHead>
              <SimpleTableHead>Driver</SimpleTableHead>
              <SimpleTableHead>Scope</SimpleTableHead>
              <SimpleTableHead align="right">Containers</SimpleTableHead>
            </SimpleTableRow>
          </SimpleTableHeader>
          <SimpleTableBody>
            {(networks.data ?? []).map((n) => (
              <SimpleTableRow key={n.id}>
                <SimpleTableCell className="font-medium">{n.name}</SimpleTableCell>
                <SimpleTableCell variant="code">{n.shortId}</SimpleTableCell>
                <SimpleTableCell>
                  <Badge variant="outline" size="sm">
                    {n.driver}
                  </Badge>
                </SimpleTableCell>
                <SimpleTableCell className="text-muted-foreground">{n.scope}</SimpleTableCell>
                <SimpleTableCell align="right" className="tabular-nums">
                  {n.containers}
                </SimpleTableCell>
              </SimpleTableRow>
            ))}
          </SimpleTableBody>
        </SimpleTable>
      )}
    </div>
  )
}
