# Containers (`containers.im`)

A lightweight local Docker management dashboard built with a **PaneUI** (`paneui.dev`) React frontend (`web/`) and a **Go + Docker Engine API** backend (`server/`).

## Repository Layout

- [`web/`](web/): React 19 + TypeScript + Vite + TanStack Router/Query UI built natively with [PaneUI](https://paneui.dev) components (`web/dist`).
- [`server/`](server/): Go backend (`net/http` + `github.com/docker/docker/client` + `gorilla/websocket`) that talks directly to `/var/run/docker.sock` and serves `web/dist`.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Architecture overview, API routes, and roadmap.

## Prerequisites

- **Go** 1.22+
- **Bun** 1.x
- **Docker** daemon (`/var/run/docker.sock`)

## Quick Start

```bash
# 1. Install dependencies and build the PaneUI frontend
bun install
cd web && bun run build

# 2. Build and start the Go backend
cd ../server
CGO_ENABLED=0 go build -o bin/containers ./cmd/containers
CONTAINERS_AUTH_USER=admin CONTAINERS_AUTH_PASS=secret ./bin/containers --addr 127.0.0.1:8080 --web-dir ../web/dist
```

Open `http://127.0.0.1:8080` in your browser to manage local projects, containers, images, volumes, networks, logs, and interactive terminal sessions.

## Documentation

- [Architecture & API](docs/ARCHITECTURE.md)
- [Go Server Guide](server/README.md)
