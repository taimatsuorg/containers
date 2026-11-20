# Containers Go Server (`server/`)

Go + Docker Engine API backend for **Containers** (`containers.im`).

## Prerequisites

- Go 1.22+ (tested with Go 1.27)
- Bun 1.x (for building `../web/dist`)
- Running local Docker daemon (`/var/run/docker.sock`)

## Build & Run

```bash
# 1. Build the PaneUI Web UI
cd ../web && bun run build

# 2. Build the static Go server
cd ../server && CGO_ENABLED=0 go build -o bin/containers ./cmd/containers

# 3. Run locally
CONTAINERS_AUTH_USER=admin CONTAINERS_AUTH_PASS=secret \
  ./bin/containers --addr 127.0.0.1:8080 --web-dir ../web/dist
```

Then open `http://127.0.0.1:8080` in your browser.
