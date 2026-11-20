export interface AuthMe {
  username: string
  authEnabled: boolean
}

export interface HostInfo {
  hostname: string
  os: string
  kernel: string
  arch: string
  dockerVersion: string
  cpus: number
  memoryBytes: number
  dockerConnected: boolean
}

export interface ResourceCounts {
  projects: number
  containersTotal: number
  containersRunning: number
  containersStopped: number
  images: number
  volumes: number
  networks: number
}

export interface PortMapping {
  ip?: string
  privatePort: number
  publicPort: number
  type: string
}

export interface ContainerSummary {
  id: string
  shortId: string
  name: string
  project: string
  image: string
  state: string
  status: string
  created: number
  ports: PortMapping[]
  mountCount: number
}

export interface ProjectSummary {
  name: string
  total: number
  running: number
  stopped: number
  containers: ContainerSummary[]
}

export interface OverviewResponse {
  host: HostInfo
  counts: ResourceCounts
  projects: ProjectSummary[]
}

export interface MountInfo {
  type: string
  source: string
  destination: string
  readOnly: boolean
}

export interface ContainerDetail extends ContainerSummary {
  command: string[]
  entrypoint: string[]
  env: string[]
  mounts: MountInfo[]
  networks: string[]
  labels: Record<string, string>
  restartPolicy: string
  restartCount: number
  startedAt: string
}

export interface ContainerStatsResponse {
  container: string
  cpuPercent: number
  memoryBytes: number
  memoryLimit: number
}

export interface ImageSummary {
  id: string
  shortId: string
  repoTags: string[]
  size: number
  created: number
}

export interface VolumeSummary {
  name: string
  driver: string
  mountpoint: string
  createdAt: string
}

export interface NetworkSummary {
  id: string
  shortId: string
  name: string
  driver: string
  scope: string
  containers: number
}

export interface CreateContainerInput {
  name: string
  image: string
  project: string
  ports: string[]
  env: string[]
  restartPolicy: string
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

let redirectingToLogin = false

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase()
  const headers = new Headers(init.headers)
  if (method !== "GET" && method !== "HEAD") {
    headers.set("X-Containers-Request", "1")
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers,
  })

  if (res.status === 401) {
    if (!redirectingToLogin && window.location.pathname !== "/auth/login") {
      redirectingToLogin = true
      const back = `${window.location.pathname}${window.location.search}${window.location.hash}`
      const target = back === "/" ? "/auth/login" : `/auth/login?return=${encodeURIComponent(back)}`
      window.location.assign(target)
    }
    throw new ApiError(401, "Authentication required")
  }

  if (res.status === 204) {
    return undefined as T
  }

  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new ApiError(res.status, data.error || `HTTP ${res.status}`)
  }
  return data as T
}

export const api = {
  getMe: () => apiFetch<AuthMe>("/api/auth/me"),
  logout: async () => {
    await fetch("/auth/logout", {
      method: "POST",
      headers: { "X-Containers-Request": "1" },
      credentials: "same-origin",
    })
    window.location.assign("/auth/login")
  },
  getOverview: () => apiFetch<OverviewResponse>("/api/overview"),
  listProjects: () => apiFetch<ProjectSummary[]>("/api/projects"),
  getProject: (name: string) => apiFetch<ProjectSummary>(`/api/projects/${encodeURIComponent(name)}`),
  listContainers: (params?: { project?: string; state?: string }) => {
    const q = new URLSearchParams()
    if (params?.project) q.set("project", params.project)
    if (params?.state) q.set("state", params.state)
    const qs = q.toString()
    return apiFetch<ContainerSummary[]>(`/api/containers${qs ? `?${qs}` : ""}`)
  },
  createContainer: (input: CreateContainerInput) =>
    apiFetch<{ id: string; shortId: string }>("/api/containers", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getContainer: (id: string) => apiFetch<ContainerDetail>(`/api/containers/${encodeURIComponent(id)}`),
  getContainerStats: (id: string) =>
    apiFetch<ContainerStatsResponse>(`/api/containers/${encodeURIComponent(id)}/stats`),
  startContainer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/containers/${encodeURIComponent(id)}/start`, { method: "POST" }),
  stopContainer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/containers/${encodeURIComponent(id)}/stop`, { method: "POST" }),
  restartContainer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/containers/${encodeURIComponent(id)}/restart`, { method: "POST" }),
  removeContainer: (id: string, force = true) =>
    apiFetch<{ ok: boolean }>(`/api/containers/${encodeURIComponent(id)}?force=${force}`, {
      method: "DELETE",
    }),
  getContainerLogs: (id: string, tail = 200, timestamps = false) =>
    apiFetch<{ lines: string[] }>(
      `/api/containers/${encodeURIComponent(id)}/logs?tail=${tail}&timestamps=${timestamps}`,
    ),
  listImages: () => apiFetch<ImageSummary[]>("/api/images"),
  removeImage: (id: string, force = false) =>
    apiFetch<{ ok: boolean }>(`/api/images/${encodeURIComponent(id)}?force=${force}`, {
      method: "DELETE",
    }),
  listVolumes: () => apiFetch<VolumeSummary[]>("/api/volumes"),
  listNetworks: () => apiFetch<NetworkSummary[]>("/api/networks"),
}
