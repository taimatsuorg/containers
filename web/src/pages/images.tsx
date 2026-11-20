import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Layers, Trash2 } from "lucide-react"
import { useState } from "react"

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
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { formatBytes, formatUnixDate } from "@/lib/format"

export function ImagesPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState("")
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

  const filtered = (images.data ?? []).filter((img) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      img.shortId.toLowerCase().includes(q) ||
      img.repoTags.some((t) => t.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Images</PageHeaderTitle>
          <PageHeaderDescription>Docker images stored on this host.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Input
            size="sm"
            placeholder="Filter images..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
        </PageHeaderActions>
      </PageHeader>

      {images.isPending ? (
        <Skeleton className="h-64" />
      ) : images.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to list images</AlertTitle>
          <AlertDescription>{images.error.message}</AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <EmptyState variant="outline">
          <EmptyStateIcon>
            <Layers />
          </EmptyStateIcon>
          <EmptyStateTitle>No images found</EmptyStateTitle>
        </EmptyState>
      ) : (
        <SimpleTable variant="plain">
          <SimpleTableHeader>
            <SimpleTableRow>
              <SimpleTableHead>Tag</SimpleTableHead>
              <SimpleTableHead>Image ID</SimpleTableHead>
              <SimpleTableHead>Size</SimpleTableHead>
              <SimpleTableHead>Created</SimpleTableHead>
              <SimpleTableHead align="right">Actions</SimpleTableHead>
            </SimpleTableRow>
          </SimpleTableHeader>
          <SimpleTableBody>
            {filtered.map((img) => {
              const primaryTag = img.repoTags[0] || "<none>"
              return (
                <SimpleTableRow key={img.id}>
                  <SimpleTableCell>
                    <div className="flex flex-wrap gap-1">
                      {(img.repoTags.length > 0 ? img.repoTags : ["<none>"]).map((tag) => (
                        <Badge key={tag} variant="outline" size="sm" className="font-mono">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </SimpleTableCell>
                  <SimpleTableCell variant="code">{img.shortId}</SimpleTableCell>
                  <SimpleTableCell className="tabular-nums">{formatBytes(img.size)}</SimpleTableCell>
                  <SimpleTableCell className="text-muted-foreground">
                    {formatUnixDate(img.created)}
                  </SimpleTableCell>
                  <SimpleTableCell align="right">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      title="Remove image"
                      onClick={() => setDeleteTarget({ id: img.id, label: primaryTag })}
                    >
                      <Trash2 className="size-3.5 text-destructive-text" />
                    </Button>
                  </SimpleTableCell>
                </SimpleTableRow>
              )
            })}
          </SimpleTableBody>
        </SimpleTable>
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
