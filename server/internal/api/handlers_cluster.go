package api

import (
	"fmt"
	"net/http"
	"os"
	"time"
)

func (s *Server) handleCluster(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	host, _ := os.Hostname()
	if host == "" {
		host = "containers-local"
	}

	ver := "docker"
	if s.docker != nil {
		if v, err := s.docker.Version(ctx); err == nil && v.Version != "" {
			ver = "docker-" + v.Version
		}
	}

	dist := "docker"
	writeJSON(w, http.StatusOK, Cluster{
		Name:              host,
		NameSource:        "setting",
		KubernetesVersion: ver,
		Distribution:      &dist,
		Builds: BuildSettings{
			Registry: nil,
		},
		Domains: DomainSettings{
			Suffixes: []string{"containers.im"},
		},
		Can: ClusterRights{
			ChangeBackups: "allowed",
			ChangeNodes:   "allowed",
		},
	})
}

func (s *Server) handleClusterHealth(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if s.docker == nil {
		writeJSON(w, http.StatusOK, ClusterHealth{
			Id:      "cluster/health",
			Checks:  1,
			Ready:   false,
			Failing: []FailingCheck{{Name: "docker", Reason: strPtr("Docker client not initialized")}},
			Leaders: []LeaderLease{},
		})
		return
	}

	if _, err := s.docker.Ping(ctx); err != nil {
		writeJSON(w, http.StatusOK, ClusterHealth{
			Id:      "cluster/health",
			Checks:  1,
			Ready:   false,
			Failing: []FailingCheck{{Name: "docker", Reason: strPtr(err.Error())}},
			Leaders: []LeaderLease{},
		})
		return
	}

	writeJSON(w, http.StatusOK, ClusterHealth{
		Id:      "cluster/health",
		Checks:  1,
		Ready:   true,
		Failing: []FailingCheck{},
		Leaders: []LeaderLease{},
	})
}

func (s *Server) handleClusterNodes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	host, _ := os.Hostname()
	if host == "" {
		host = "localhost"
	}

	var cpuCapacity, memCapacity string
	var osImage, kernel, arch string
	if s.docker != nil {
		if info, err := s.docker.Info(ctx); err == nil {
			if info.Name != "" {
				host = info.Name
			}
			cpuCapacity = fmt.Sprintf("%d", info.NCPU)
			memCapacity = fmt.Sprintf("%dMi", info.MemTotal/(1024*1024))
			osImage = info.OperatingSystem
			kernel = info.KernelVersion
			arch = info.Architecture
		}
	}

	ver := "docker"
	if v, err := s.docker.Version(ctx); err == nil && v.Version != "" {
		ver = v.Version
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"disk":            "unavailable",
		"metrics":         "unavailable",
		"podScan":         "complete",
		"podsScanned":     0,
		"unscheduledPods": 0,
		"unreadable":      []any{},
		"totals": map[string]any{
			"allocatable": map[string]any{
				"cpu":    cpuCapacity,
				"memory": memCapacity,
			},
		},
		"items": []map[string]any{
			{
				"id":               "cluster/nodes/" + host,
				"name":             host,
				"ready":            "True",
				"roles":            []string{"docker-host"},
				"cordoned":         false,
				"problems":         []any{},
				"taints":           []any{},
				"osImage":          osImage,
				"kernelVersion":    kernel,
				"architecture":     arch,
				"containerRuntime": "docker://" + ver,
				"kubeletVersion":   "docker-" + ver,
				"origin": map[string]any{
					"kind": "Node",
					"name": host,
				},
				"allocatable": map[string]any{
					"cpu":    cpuCapacity,
					"memory": memCapacity,
				},
				"capacity": map[string]any{
					"cpu":    cpuCapacity,
					"memory": memCapacity,
				},
			},
		},
	})
}

func (s *Server) handleClusterUsage(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"id":          "cluster/usage",
		"metrics":     "unavailable",
		"podScan":     "complete",
		"podsScanned": 0,
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"items":       []any{},
		"unreadable":  []any{},
	})
}

func (s *Server) handleClusterAlerts(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      []any{},
		"state":      "notInstalled",
		"unreadable": []any{},
	})
}

func (s *Server) handleClusterBackups(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"backups":      []any{},
		"locations":    []any{},
		"restores":     []any{},
		"schedules":    []any{},
		"unreadable":   []any{},
		"state":        "notInstalled",
		"canChange":    "denied",
		"canRestore":   "denied",
		"namespace":    "",
		"totalBackups": 0,
	})
}

func (s *Server) handleClusterNotifications(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      []any{},
		"receivers":  []any{},
		"routes":     []any{},
		"unreadable": []any{},
		"state":      "notInstalled",
	})
}

func (s *Server) handleClusterUpgrades(w http.ResponseWriter, r *http.Request) {
	ver := "docker"
	if s.docker != nil {
		if v, err := s.docker.Version(r.Context()); err == nil && v.Version != "" {
			ver = "docker-" + v.Version
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":                "cluster/upgrades",
		"dataAsOf":          time.Now().UTC().Format("2006-01-02"),
		"distribution":      "docker",
		"kubernetesVersion": ver,
		"severity":          "none",
		"extensions":        map[string]any{},
		"skew":              []any{},
		"states":            []any{},
		"unreadable":        []any{},
		"upgrading":         []any{},
	})
}

func (s *Server) handleClusterEvents(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, ClusterEventList{
		Items:     []any{},
		Partial:   false,
		TotalSize: 0,
	})
}

func (s *Server) handleClusterCapabilities(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      []any{},
		"unreadable": []any{},
	})
}

func (s *Server) handleClusterVersion(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"version": "0.1.0-docker-mvp",
		"source":  "other",
	})
}

func (s *Server) handleEmptyItems(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"items": []any{},
	})
}

func (s *Server) handleEmptyGaps(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      []any{},
		"unreadable": []any{},
	})
}

func (s *Server) handleEmptyMap(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{})
}

func strPtr(s string) *string {
	return &s
}
