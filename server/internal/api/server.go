package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/containers-im/containers/server/internal/docker"
)

// Server implements the Containers HTTP API and serves the web UI.
type Server struct {
	docker *docker.Client
	webDir string
	auth   *authManager
	mux    *http.ServeMux
}

// NewServer constructs the API router and SPA static file handler.
func NewServer(dockerClient *docker.Client, webDir string, authCfg AuthConfig) *Server {
	s := &Server{
		docker: dockerClient,
		webDir: webDir,
		auth:   newAuthManager(authCfg),
		mux:    http.NewServeMux(),
	}
	s.registerRoutes()
	return s
}

// ServeHTTP delegates to the auth middleware and internal mux.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.withAuth(s.mux).ServeHTTP(w, r)
}

func (s *Server) registerRoutes() {
	// Authentication
	s.mux.HandleFunc("GET /auth/login", s.handleLoginPage)
	s.mux.HandleFunc("POST /auth/login", s.handleLoginSubmit)
	s.mux.HandleFunc("POST /auth/logout", s.handleLogout)
	// Core identity & settings
	s.mux.HandleFunc("GET /api/v1/whoami", s.handleWhoAmI)
	s.mux.HandleFunc("GET /api/v1/session", s.handleSession)
	s.mux.HandleFunc("GET /api/v1/account", s.handleAccount)
	s.mux.HandleFunc("GET /api/v1/settings/cluster-name", s.handleSettingsClusterName)
	s.mux.HandleFunc("GET /api/v1/settings/domains", s.handleSettingsDomains)
	s.mux.HandleFunc("GET /api/v1/settings/metrics-store", s.handleSettingsMetricsStore)
	s.mux.HandleFunc("GET /api/v1/settings/sign-in", s.handleSettingsSignIn)

	// Cluster / local Docker host
	s.mux.HandleFunc("GET /api/v1/cluster", s.handleCluster)
	s.mux.HandleFunc("GET /api/v1/cluster/health", s.handleClusterHealth)
	s.mux.HandleFunc("GET /api/v1/cluster/nodes", s.handleClusterNodes)
	s.mux.HandleFunc("GET /api/v1/cluster/usage", s.handleClusterUsage)
	s.mux.HandleFunc("GET /api/v1/cluster/alerts", s.handleClusterAlerts)
	s.mux.HandleFunc("GET /api/v1/cluster/backups", s.handleClusterBackups)
	s.mux.HandleFunc("GET /api/v1/cluster/events", s.handleClusterEvents)
	s.mux.HandleFunc("GET /api/v1/cluster/gaps", s.handleEmptyGaps)
	s.mux.HandleFunc("GET /api/v1/cluster/incidents", s.handleEmptyGaps)
	s.mux.HandleFunc("GET /api/v1/cluster/notifications", s.handleClusterNotifications)
	s.mux.HandleFunc("GET /api/v1/cluster/capabilities", s.handleClusterCapabilities)
	s.mux.HandleFunc("GET /api/v1/cluster/zeabur", s.handleClusterVersion)
	s.mux.HandleFunc("GET /api/v1/cluster/catalog", s.handleEmptyItems)
	s.mux.HandleFunc("GET /api/v1/cluster/templates", s.handleEmptyItems)
	s.mux.HandleFunc("GET /api/v1/cluster/issuers", s.handleEmptyItems)
	s.mux.HandleFunc("GET /api/v1/cluster/upgrades", s.handleClusterUpgrades)

	// Projects & containers (Docker mapping)
	s.mux.HandleFunc("GET /api/v1/projects", s.handleListProjects)
	s.mux.HandleFunc("GET /api/v1/projects/{project}", s.handleGetProject)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/usage", s.handleProjectUsage)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/pods/{pod}/logs", s.handlePodLogs)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/pods/{pod}/logs/follow", s.handleFollowPodLogs)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/pods/{pod}/exec", s.handlePodExec)
	s.mux.HandleFunc("POST /api/v1/projects/{project}/containers/{container}/start", s.handleContainerStart)
	s.mux.HandleFunc("POST /api/v1/projects/{project}/containers/{container}/stop", s.handleContainerStop)
	s.mux.HandleFunc("POST /api/v1/projects/{project}/containers/{container}/restart", s.handleContainerRestart)
	s.mux.HandleFunc("DELETE /api/v1/projects/{project}/containers/{container}", s.handleContainerRemove)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/events", s.handleClusterEvents)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/gaps", s.handleEmptyGaps)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/incidents", s.handleEmptyGaps)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/alerts", s.handleClusterAlerts)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/databases", s.handleProjectDatabases)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/object-storage", s.handleProjectObjectStorage)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/namespace", s.handleProjectNamespace)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/configmaps", s.handleEmptyGaps)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/gateways", s.handleEmptyGaps)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/objects", s.handleEmptyGaps)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/builds", s.handleProjectBuilds)
	s.mux.HandleFunc("GET /api/v1/projects/{project}/creatable", s.handleEmptyGaps)

	// Fallback for unimplemented API routes
	s.mux.HandleFunc("/api/", s.handleNotImplemented)

	// Web UI SPA fallback
	s.mux.HandleFunc("/", s.handleSPA)
}

func (s *Server) handleNotImplemented(w http.ResponseWriter, r *http.Request) {
	writeProblem(w, http.StatusNotImplemented, "internal",
		"Endpoint not yet implemented in Go/Docker MVP",
		r.Method+" "+r.URL.Path+" is not yet implemented in the local Docker backend.",
		"This endpoint is scheduled for a later MVP phase.",
	)
}

func (s *Server) handleSPA(w http.ResponseWriter, r *http.Request) {
	if s.webDir == "" {
		http.Error(w, "web dist directory not configured", http.StatusServiceUnavailable)
		return
	}

	cleaned := filepath.Clean(r.URL.Path)
	if cleaned == "/" || cleaned == "." {
		http.ServeFile(w, r, filepath.Join(s.webDir, "index.html"))
		return
	}

	candidate := filepath.Join(s.webDir, strings.TrimPrefix(cleaned, "/"))
	if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
		http.ServeFile(w, r, candidate)
		return
	}

	http.ServeFile(w, r, filepath.Join(s.webDir, "index.html"))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeProblem(w http.ResponseWriter, status int, kind Kind, title, detail, fix string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Problem{
		Type:   "about:blank",
		Title:  title,
		Status: status,
		Detail: detail,
		Fix:    fix,
		Kind:   kind,
		Summary: Message{
			Key: "problem.summary." + string(kind),
		},
	})
}
