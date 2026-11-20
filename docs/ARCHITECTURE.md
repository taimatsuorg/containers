# Containers Architecture

**Containers** (`containers.im`) pairs a clean **PaneUI** React frontend (`web/`) with a **Docker-native Go API** backend (`server/`) that communicates directly with the local Docker daemon via `/var/run/docker.sock`.

## 1. Repository Layout

- `web/`: React 19 + TypeScript + Vite + TanStack Router + TanStack Query + PaneUI (`src/components/ui/`) + xterm.js.
- `server/`: Go backend (`github.com/containers-im/containers/server`).
  - `cmd/containers/main.go`: Entrypoint (`--addr`, `--web-dir`, `--auth-user`, `--auth-pass`).
  - `internal/docker/client.go`: Docker Engine API wrapper (containers, projects by `com.docker.compose.project`, stats, logs, exec, images, volumes, networks).
  - `internal/api/`: HTTP router (`server.go`), DTOs (`types.go`), session authentication (`auth.go`), REST handlers (`handlers.go`), and SSE/WebSocket streams (`handlers_streams.go`).

## 2. Docker-Native HTTP & Stream API

| Method & Path | Description |
| :--- | :--- |
| `GET /auth/login`, `POST /auth/login`, `POST /auth/logout` | Session cookie authentication |
| `GET /api/auth/me` | Current signed-in user and auth state |
| `GET /api/overview` | Host info, resource counts, and grouped projects |
| `GET /api/projects`, `GET /api/projects/{project}` | Projects grouped by `com.docker.compose.project` (fallback `standalone`) |
| `GET /api/containers`, `POST /api/containers` | List containers (`?project=`, `?state=`) or pull, create & start a container |
| `GET /api/containers/{id}`, `GET /api/containers/{id}/stats` | Detailed inspect data and live CPU/memory stats |
| `POST /api/containers/{id}/start\|stop\|restart`, `DELETE /api/containers/{id}` | Container lifecycle management |
| `GET /api/containers/{id}/logs`, `GET /api/containers/{id}/logs/follow` | Log snapshot & live SSE (`text/event-stream`) stream |
| `GET /api/containers/{id}/exec` | Interactive WebSocket TTY (`?cmd=/bin/sh`) |
| `GET /api/images`, `DELETE /api/images/{id}` | Local Docker images |
| `GET /api/volumes`, `GET /api/networks` | Local Docker volumes and networks |

## 3. Roadmap

- [x] Docker-native Go API covering host overview, projects, container CRUD/lifecycle, live stats, SSE logs, WebSocket TTY, images, volumes, and networks.
- [x] Native PaneUI frontend rewrite with AppShell, AnimatedSidebar, StatCard, SimpleTable, SettingsSection, ThemeToggle, and UserMenu.
- [x] Cookie session authentication & CSRF protection (`X-Containers-Request: 1`).
- [ ] Docker Compose YAML stack deployment & editing.
- [ ] Container file browser & download/upload.
- [ ] Local reverse proxy routing for `*.containers.im`.
