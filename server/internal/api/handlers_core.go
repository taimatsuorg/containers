package api

import (
	"net/http"
	"os"
)

func (s *Server) handleWhoAmI(w http.ResponseWriter, r *http.Request) {
	username := "local"
	if s.auth.enabled() {
		username = s.auth.cfg.Username
	}
	writeJSON(w, http.StatusOK, WhoAmI{
		Username: username,
		Groups:   []string{"system:masters"},
	})
}

func (s *Server) handleSession(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, SessionView{
		SignsIn: s.auth.enabled(),
	})
}

func (s *Server) handleAccount(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"username":    "local",
		"displayName": "Local Docker",
		"role":        "admin",
		"passkeys":    []any{},
		"linked":      []any{},
	})
}

func (s *Server) handleSettingsClusterName(w http.ResponseWriter, r *http.Request) {
	host, _ := os.Hostname()
	if host == "" {
		host = "containers-local"
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"name":   host,
		"source": "node",
	})
}

func (s *Server) handleSettingsDomains(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"suffix":        "containers.im",
		"clusterIssuer": nil,
	})
}

func (s *Server) handleSettingsMetricsStore(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled": false,
		"state":   "notInstalled",
	})
}

func (s *Server) handleSettingsSignIn(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"signsIn": false,
	})
}
