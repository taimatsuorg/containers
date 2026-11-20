import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"

export function DeployDialog({
  open,
  onOpenChange,
  defaultProject = "",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultProject?: string
}) {
  const qc = useQueryClient()
  const toast = useToast()

  const [image, setImage] = useState("")
  const [name, setName] = useState("")
  const [project, setProject] = useState(defaultProject)
  const [portsText, setPortsText] = useState("")
  const [envText, setEnvText] = useState("")
  const [restartPolicy, setRestartPolicy] = useState("unless-stopped")
  const [error, setError] = useState("")

  const deploy = useMutation({
    mutationFn: api.createContainer,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["overview"] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["containers"] }),
        qc.invalidateQueries({ queryKey: ["images"] }),
      ])
      toast.add({
        title: "Container started",
        description: `${name || image} is now running.`,
        type: "success",
      })
      setImage("")
      setName("")
      setPortsText("")
      setEnvText("")
      setError("")
      onOpenChange(false)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to deploy container")
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!image.trim()) {
      setError("Image is required (e.g. nginx:alpine)")
      return
    }
    setError("")
    deploy.mutate({
      name: name.trim(),
      image: image.trim(),
      project: project.trim(),
      ports: portsText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      env: envText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      restartPolicy,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deploy Container</DialogTitle>
          <DialogDescription>
            Pull an image if needed and start a new Docker container locally.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Image</FieldLabel>
              <Input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="nginx:alpine"
                required
                autoFocus
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Container Name</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-web"
                />
              </Field>

              <Field>
                <FieldLabel>Project</FieldLabel>
                <Input
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="standalone"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Ports</FieldLabel>
              <textarea
                rows={2}
                value={portsText}
                onChange={(e) => setPortsText(e.target.value)}
                placeholder={"8080:80\n8443:443"}
                className="w-full rounded-lg bg-background px-2.5 py-1.5 font-mono text-ui shadow-well outline-none placeholder:text-muted-foreground/72 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32"
              />
              <FieldDescription>One host:container mapping per line.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Environment Variables</FieldLabel>
              <textarea
                rows={2}
                value={envText}
                onChange={(e) => setEnvText(e.target.value)}
                placeholder={"NODE_ENV=production\nPORT=80"}
                className="w-full rounded-lg bg-background px-2.5 py-1.5 font-mono text-ui shadow-well outline-none placeholder:text-muted-foreground/72 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32"
              />
            </Field>

            <Field>
              <FieldLabel>Restart Policy</FieldLabel>
              <Select value={restartPolicy} onValueChange={(v) => v && setRestartPolicy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unless-stopped">unless-stopped</SelectItem>
                  <SelectItem value="always">always</SelectItem>
                  <SelectItem value="on-failure">on-failure</SelectItem>
                  <SelectItem value="no">no</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={deploy.isPending}>
              {deploy.isPending ? "Deploying..." : "Deploy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
