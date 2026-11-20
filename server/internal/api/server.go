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
	s.mux.HandleFunc("GET /api/auth/me", s.handleAuthMe)

	// Host & Overview
	s.mux.HandleFunc("GET /api/overview", s.handleOverview)

	// Projects
	s.mux.HandleFunc("GET /api/projects", s.handleListProjects)
	s.mux.HandleFunc("GET /api/projects/{project}", s.handleGetProject)

	// Containers
	s.mux.HandleFunc("GET /api/containers", s.handleListContainers)
	s.mux.HandleFunc("POST /api/containers", s.handleCreateContainer)
	s.mux.HandleFunc("GET /api/containers/{id}", s.handleGetContainer)
	s.mux.HandleFunc("GET /api/containers/{id}/stats", s.handleContainerStats)
	s.mux.HandleFunc("POST /api/containers/{id}/start", s.handleContainerStart)
	s.mux.HandleFunc("POST /api/containers/{id}/stop", s.handleContainerStop)
	s.mux.HandleFunc("POST /api/containers/{id}/restart", s.handleContainerRestart)
	s.mux.HandleFunc("DELETE /api/containers/{id}", s.handleContainerRemove)
	s.mux.HandleFunc("GET /api/containers/{id}/logs", s.handleContainerLogs)
	s.mux.HandleFunc("GET /api/containers/{id}/logs/follow", s.handleFollowContainerLogs)
	s.mux.HandleFunc("GET /api/containers/{id}/exec", s.handleContainerExec)

	// Images, Volumes & Networks
	s.mux.HandleFunc("GET /api/images", s.handleListImages)
	s.mux.HandleFunc("DELETE /api/images/{id}", s.handleRemoveImage)
	s.mux.HandleFunc("GET /api/volumes", s.handleListVolumes)
	s.mux.HandleFunc("GET /api/networks", s.handleListNetworks)

	// Fallback for unknown API routes
	s.mux.HandleFunc("/api/", s.handleNotFound)

	// Web UI SPA fallback
	s.mux.HandleFunc("/", s.handleSPA)
}

func (s *Server) handleNotFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "not found")
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

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, ErrorResponse{Error: msg})
}
