# Containers (`containers.im`)

A local container management dashboard built by reusing the `web/` UI from `zeabur-oss/zeabur` (rebranded to **Containers** / `containers.im`) with a **Go + Docker Engine API** backend (`server/`) that runs directly against the local Docker daemon—no Kubernetes cluster required.

## Repository Layout

- [`web/`](web/): Reused React + TypeScript + Vite UI (rebranded to Containers / `containers.im`, built into `web/dist`).
- [`server/`](server/): Go backend (`net/http` + `github.com/docker/docker/client` + `gorilla/websocket`) that talks to `/var/run/docker.sock` and serves `web/dist`.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Architecture overview, Kubernetes-to-Docker concept mapping, and phased MVP roadmap.

## Prerequisites

- **Go** 1.22+
- **Bun** 1.x
- **Docker** daemon (`/var/run/docker.sock`)

## Quick Start

```bash
# 1. Install frontend dependencies and build the UI
bun install --frozen-lockfile
cd web && bun run build

# 2. Build and start the Go backend
cd ../server
go build -o bin/containers ./cmd/containers
./bin/containers --addr 127.0.0.1:8080 --web-dir ../web/dist
```

Open `http://127.0.0.1:8080` in your browser to inspect local Docker projects, containers, logs, live stats, and interactive terminal sessions.

## Documentation

- [Architecture & MVP Roadmap](docs/ARCHITECTURE.md)
- [Go Server Guide](server/README.md)
