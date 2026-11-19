# Containers Go Server (`server/`)

Go + Docker Engine API backend for **Containers** (`containers.im`).

## Prerequisites

- Go 1.22+ (tested with Go 1.27)
- Bun 1.x (for building `../web/dist`)
- Running local Docker daemon (`/var/run/docker.sock`)

## Build & Run

```bash
# 1. (Optional) Regenerate Go & TypeScript types from openapi.yaml
go generate ./...
cd ../web && bun run gen:api

# 2. Build the Web UI
cd ../web && bun run build

# 3. Build the Go server
cd ../server && CGO_ENABLED=0 go build -o bin/containers ./cmd/containers

# 4. Run locally
./bin/containers --addr 127.0.0.1:8080 --web-dir ../web/dist
```

Then open `http://127.0.0.1:8080` in your browser.
