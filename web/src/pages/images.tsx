import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Layers, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, DataTableRowActions, type DataTableColumn } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state"
import { MenuItem } from "@/components/ui/menu"
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { api, type ImageSummary } from "@/lib/api"
import { formatBytes, formatUnixDate } from "@/lib/format"

const DEFAULT_SORT = { key: "created", direction: "desc" as const }
const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function ImagesPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)

  const images = useQuery({
    queryKey: ["images"],
    queryFn: api.listImages,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.removeImage(id, false),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["images"] }),
        qc.invalidateQueries({ queryKey: ["overview"] }),
      ])
      toast.add({ title: "Image removed", type: "success" })
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.add({ title: "Failed to remove image", description: err.message, type: "error" })
    },
  })

  const columns = useMemo<DataTableColumn<ImageSummary>[]>(
    () => [
      {
        key: "tag",
        header: "Tag",
        width: 280,
        grow: true,
        sortable: true,
        sortValue: (img) => img.repoTags[0] || "<none>",
        cell: (img) => {
          const tags = img.repoTags.length > 0 ? img.repoTags : ["<none>"]
          const primaryTag = tags[0] || "<none>"
          return (
            <div className="flex min-w-0 items-center gap-1.5" title={tags.join(", ")}>
              <Badge variant="outline" size="sm" className="max-w-full font-mono">
                <span className="truncate">{primaryTag}</span>
              </Badge>
              {tags.length > 1 ? (
                <Badge variant="chip" size="sm" className="shrink-0">
                  +{tags.length - 1}
                </Badge>
              ) : null}
            </div>
          )
        },
      },
      {
        key: "shortId",
        header: "Image ID",
        width: 140,
        sortable: true,
        cell: (img) => (
          <span className="font-mono text-ui-xs text-muted-foreground">{img.shortId}</span>
        ),
      },
      {
        key: "size",
        header: "Size",
        width: 120,
        align: "right",
        sortable: true,
        sortValue: (img) => img.size,
        cell: (img) => <span className="tabular-nums">{formatBytes(img.size)}</span>,
      },
      {
        key: "created",
        header: "Created",
        width: 160,
        sortable: true,
        sortValue: (img) => img.created,
        cell: (img) => (
          <span className="text-muted-foreground">{formatUnixDate(img.created)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        label: "Actions",
        width: 56,
        align: "right",
        hideable: false,
        cell: (img) => {
          const primaryTag = img.repoTags[0] || "<none>"
          return (
            <DataTableRowActions>
              <MenuItem
                variant="destructive"
                onClick={() => setDeleteTarget({ id: img.id, label: primaryTag })}
              >
                <Trash2 className="size-4" />
                Remove image
              </MenuItem>
            </DataTableRowActions>
          )
        },
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Images</PageHeaderTitle>
          <PageHeaderDescription>Docker images stored on this host.</PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {images.isPending ? (
        <Skeleton className="h-64" />
      ) : images.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to list images</AlertTitle>
          <AlertDescription>{images.error.message}</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          data={images.data ?? []}
          columns={columns}
          getRowId={(img) => img.id}
          aria-label="Images"
          noun="images"
          searchPlaceholder="Search image tags or IDs..."
          searchText={(img) => [img.shortId, img.id, ...img.repoTags].join(" ")}
          defaultSort={DEFAULT_SORT}
          defaultPageSize={20}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          emptyState={
            <EmptyState size="sm">
              <EmptyStateIcon>
                <Layers />
              </EmptyStateIcon>
              <EmptyStateTitle>No images found</EmptyStateTitle>
            </EmptyState>
          }
        />
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove image</DialogTitle>
            <DialogDescription>
              Delete image <span className="font-mono font-medium">{deleteTarget?.label}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
