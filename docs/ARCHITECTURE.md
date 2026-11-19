# Containers Architecture & MVP Roadmap

**Containers** (`containers.im`) reuses the web UI from `web/` (originally from `zeabur-oss/zeabur`) and replaces the Kubernetes-coupled Rust control plane with a lightweight **Go + Docker Engine API** backend (`server/`) designed to run directly on a local Docker host.

## 1. Repository Layout

- `web/`: Reused React + TypeScript + Vite + TanStack Router/Query UI, rebranded to **Containers** (`containers.im`).
  - API client types and fetchers live in `web/src/api/zeabur.ts`.
- `server/`: Go backend (`github.com/containers-im/containers/server`) talking to `/var/run/docker.sock` via `github.com/docker/docker/client` and serving `web/dist`.
  - `cmd/containers/main.go`: Entrypoint (`--addr`, `--web-dir`, `--auth-user`, `--auth-pass`).
  - `internal/docker/client.go`: Docker Engine API wrapper.
  - `internal/api/`: HTTP router, session authentication, SPA static handler, RFC 9457 `Problem` helper, and REST/SSE/WebSocket handlers.

## 2. Concept Mapping (Kubernetes → Local Docker)

| UI / OpenAPI Concept | Local Docker Mapping |
| :--- | :--- |
| Cluster / Host | Local Docker Daemon (`/var/run/docker.sock`) & host OS info |
| Project (`Namespace`) | Docker Compose project (`com.docker.compose.project` label) or `standalone` |
| Service (`Deployment`) / Pod | Docker Container |
| Pod Logs | `ContainerLogs` (`stdout` / `stderr`) |
| Pod Exec (Terminal) | `ContainerExec` over WebSocket (Stage 2) |
| Domain Suffix | `containers.im` |

## 3. Phased MVP Roadmap

### Stage 1: Skeleton & Read-Only Docker Integration (Current)
- [x] Install Go & Bun toolchains.
- [x] Rebrand `web/` UI copy, HTML title, and i18n strings to `Containers` / `containers.im`.
- [x] Scaffold `server/` with `net/http` (Go 1.22+ method routing) + Docker Engine Go SDK.
- [x] Implement core identity/session/cluster endpoints (`/api/v1/whoami`, `/api/v1/session`, `/api/v1/cluster`, `/api/v1/cluster/health`, `/api/v1/cluster/nodes`).
- [x] Implement Docker-backed project listing, project details, and container log snapshot (`/api/v1/projects`, `/api/v1/projects/{project}`, `/api/v1/projects/{project}/pods/{pod}/logs`).
- [x] Serve `web/dist` with SPA fallback and return RFC 9457 `501 Not Implemented` for unimplemented `/api/` endpoints.

### Stage 2: Container Lifecycle, Usage & Interactive Streams (In Progress)
- [x] Container lifecycle endpoints (`start`, `stop`, `restart`, `remove`).
- [x] Live CPU & memory usage metrics via `docker stats` (`/api/v1/projects/{project}/usage`).
- [x] Real-time log streaming (`GET /api/v1/projects/{project}/pods/{pod}/logs/follow` over SSE).
- [x] Interactive WebSocket terminal (`GET /api/v1/projects/{project}/pods/{pod}/exec`).
- [ ] Wire `web/` plan/apply mutations to create/deploy services from Docker images or Docker Compose YAML.

### Stage 3: Files & Local Routing
- [ ] Container file browser & editor (`/api/v1/projects/{project}/pods/{pod}/files*`).
- [ ] Local reverse proxy integration for `*.containers.im`.
