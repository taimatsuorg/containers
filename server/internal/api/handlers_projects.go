package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/containers-im/containers/server/internal/docker"
	dockertypes "github.com/docker/docker/api/types"
)

func (s *Server) handleListProjects(w http.ResponseWriter, r *http.Request) {
	if s.docker == nil {
		writeProblem(w, http.StatusServiceUnavailable, "unavailable",
			"Docker daemon unavailable",
			"Cannot list projects because the Docker client is not connected.",
			"Ensure Docker is running and /var/run/docker.sock is accessible.",
		)
		return
	}

	groups, err := s.docker.ListProjects(r.Context())
	if err != nil {
		writeProblem(w, http.StatusBadGateway, "unavailable",
			"Failed to query Docker",
			err.Error(),
			"Check Docker daemon status and permissions.",
		)
		return
	}

	items := make([]ProjectSummary, 0, len(groups))
	for _, g := range groups {
		services := make([]ServiceSummary, 0, len(g.Containers))
		healthy, progressing, failing := 0, 0, 0
		for _, ctr := range g.Containers {
			name := docker.ContainerName(ctr)
			health := containerHealth(ctr)
			switch health {
			case "ok":
				healthy++
			case "progress":
				progressing++
			case "fail":
				failing++
			}
			desired := 1
			ready := runningCount(ctr)
			services = append(services, ServiceSummary{
				Id:       "projects/" + g.Name + "/services/Deployment/" + name,
				Kind:     "Deployment",
				Name:     name,
				Health:   health,
				Desired:  &desired,
				Ready:    &ready,
				Reason:   strPtr(ctr.Status),
				Restarts: 0,
			})
		}

		items = append(items, ProjectSummary{
			Id:          "projects/" + g.Name,
			Name:        g.Name,
			DisplayName: strPtr(g.Name),
			Adopted:     true,
			System:      false,
			Origin: Origin{
				Kind: "Namespace",
				Name: g.Name,
			},
			Services: services,
			Health: &ProjectHealth{
				Services:    len(g.Containers),
				Healthy:     healthy,
				Progressing: progressing,
				Failing:     failing,
			},
		})
	}

	writeJSON(w, http.StatusOK, ProjectList{
		CanCreate: "allowed",
		Items:     items,
	})
}

func (s *Server) handleGetProject(w http.ResponseWriter, r *http.Request) {
	if s.docker == nil {
		writeProblem(w, http.StatusServiceUnavailable, "unavailable",
			"Docker daemon unavailable",
			"Cannot load project because the Docker client is not connected.",
			"Ensure Docker is running and /var/run/docker.sock is accessible.",
		)
		return
	}

	projectName := r.PathValue("project")
	group, err := s.docker.GetProject(r.Context(), projectName)
	if err != nil {
		writeProblem(w, http.StatusBadGateway, "unavailable",
			"Failed to query Docker",
			err.Error(),
			"Check Docker daemon status and permissions.",
		)
		return
	}
	if group == nil {
		writeProblem(w, http.StatusNotFound, "not-found",
			"Project not found",
			"No containers found for project "+projectName+".",
			"Return to the projects list.",
		)
		return
	}

	services := make([]map[string]any, 0, len(group.Containers))
	for _, ctr := range group.Containers {
		name := docker.ContainerName(ctr)
		health := containerHealth(ctr)
		ready := runningCount(ctr)
		startedAt := time.Unix(ctr.Created, 0).UTC().Format(time.RFC3339)

		ports := make([]map[string]any, 0, len(ctr.Ports))
		for _, p := range ctr.Ports {
			ports = append(ports, map[string]any{
				"containerPort": p.PrivatePort,
				"hostPort":      p.PublicPort,
				"protocol":      p.Type,
			})
		}

		mounts := make([]map[string]any, 0, len(ctr.Mounts))
		for _, m := range ctr.Mounts {
			mountName := m.Name
			if mountName == "" {
				mountName = m.Source
			}
			mounts = append(mounts, map[string]any{
				"name":      mountName,
				"mountPath": m.Destination,
				"readOnly":  !m.RW,
			})
		}

		services = append(services, map[string]any{
			"id":            "projects/" + projectName + "/services/Deployment/" + name,
			"kind":          "Deployment",
			"name":          name,
			"namespace":     projectName,
			"image":         ctr.Image,
			"created":       startedAt,
			"phase":         containerPhase(ctr),
			"provenance":    map[string]any{"tool": nil},
			"replicas":      map[string]any{"desired": 1, "ready": ready, "available": ready, "updated": ready},
			"desired":       1,
			"ready":         ready,
			"restarts":      0,
			"endpointNames": []string{},
			"routeNames":    []string{},
			"diagnoses":     []any{},
			"origin": map[string]any{
				"kind":      "Deployment",
				"name":      name,
				"namespace": projectName,
			},
			"status": map[string]any{
				"health": health,
				"phase":  containerPhase(ctr),
				"reason": ctr.Status,
			},
			"containers": []map[string]any{
				{
					"name":        name,
					"image":       ctr.Image,
					"init":        false,
					"ports":       ports,
					"env":         []any{},
					"importedEnv": []any{},
					"mounts":      mounts,
					"origin": map[string]any{
						"kind":      "Deployment",
						"name":      name,
						"namespace": projectName,
					},
				},
			},
			"pods": []map[string]any{
				{
					"id":         "projects/" + projectName + "/pods/" + name,
					"name":       name,
					"phase":      containerPhase(ctr),
					"health":     health,
					"ready":      ctr.State == "running",
					"restarts":   0,
					"created":    startedAt,
					"containers": []string{name},
					"containerStatuses": []map[string]any{
						{
							"name":     name,
							"ready":    ctr.State == "running",
							"restarts": 0,
						},
					},
				},
			},
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"namespace":   projectName,
		"connections": []any{},
		"endpoints":   []any{},
		"resources":   []any{},
		"routes":      []any{},
		"services":    services,
		"unreadable":  []any{},
	})
}

func (s *Server) handleProjectNamespace(w http.ResponseWriter, r *http.Request) {
	projectName := r.PathValue("project")
	writeJSON(w, http.StatusOK, map[string]any{
		"name":    projectName,
		"adopted": true,
		"can": map[string]any{
			"edit":   "allowed",
			"delete": "allowed",
		},
	})
}

func (s *Server) handleProjectDatabases(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      []any{},
		"operators":  []any{},
		"unreadable": []any{},
	})
}

func (s *Server) handleProjectObjectStorage(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      []any{},
		"module":     "seaweedfs-operator",
		"state":      "notInstalled",
		"unreadable": []any{},
	})
}

func (s *Server) handleProjectBuilds(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"builds":     []any{},
		"keel":       []any{},
		"runs":       []any{},
		"state":      "notInstalled",
		"unreadable": []any{},
	})
}

func (s *Server) handleProjectUsage(w http.ResponseWriter, r *http.Request) {
	if s.docker == nil {
		writeProblem(w, http.StatusServiceUnavailable, "unavailable",
			"Docker daemon unavailable",
			"Cannot read container usage because the Docker client is not connected.",
			"Ensure Docker is running.",
		)
		return
	}

	projectName := r.PathValue("project")
	group, err := s.docker.GetProject(r.Context(), projectName)
	if err != nil {
		writeProblem(w, http.StatusBadGateway, "unavailable",
			"Failed to query Docker",
			err.Error(),
			"Check Docker daemon status.",
		)
		return
	}
	if group == nil {
		writeProblem(w, http.StatusNotFound, "not-found",
			"Project not found",
			"No containers found for project "+projectName+".",
			"Return to the projects list.",
		)
		return
	}

	pods := make([]map[string]any, 0, len(group.Containers))
	for _, ctr := range group.Containers {
		if ctr.State != "running" {
			continue
		}
		name := docker.ContainerName(ctr)
		stats, err := s.docker.ContainerStatsOneShot(r.Context(), name)
		if err != nil {
			continue
		}
		pods = append(pods, map[string]any{
			"pod": name,
			"cpu": fmt.Sprintf("%.2f%%", stats.CPUPercent),
			"memory": fmt.Sprintf("%dMi", stats.MemoryBytes/(1024*1024)),
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":        "projects/" + projectName + "/usage",
		"state":     "available",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"pods":      pods,
	})
}

func (s *Server) handlePodLogs(w http.ResponseWriter, r *http.Request) {
	if s.docker == nil {
		writeProblem(w, http.StatusServiceUnavailable, "unavailable",
			"Docker daemon unavailable",
			"Cannot read container logs because the Docker client is not connected.",
			"Ensure Docker is running.",
		)
		return
	}

	projectName := r.PathValue("project")
	pod := r.PathValue("pod")
	tail := r.URL.Query().Get("tailLines")
	if tail == "" {
		tail = r.URL.Query().Get("tail")
	}
	timestamps := r.URL.Query().Get("timestamps") == "true"

	lines, err := s.docker.ContainerLogs(r.Context(), pod, tail, timestamps)
	if err != nil {
		writeProblem(w, http.StatusNotFound, "not-found",
			"Container logs unavailable",
			err.Error(),
			"Check that the container exists.",
		)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"lines": lines,
		"origin": map[string]any{
			"kind":      "Pod",
			"name":      pod,
			"namespace": projectName,
			"fieldPath": pod,
		},
	})
}

func (s *Server) handleContainerStart(w http.ResponseWriter, r *http.Request) {
	s.handleContainerAction(w, r, "start", func(name string) error {
		return s.docker.StartContainer(r.Context(), name)
	})
}

func (s *Server) handleContainerStop(w http.ResponseWriter, r *http.Request) {
	s.handleContainerAction(w, r, "stop", func(name string) error {
		return s.docker.StopContainer(r.Context(), name)
	})
}

func (s *Server) handleContainerRestart(w http.ResponseWriter, r *http.Request) {
	s.handleContainerAction(w, r, "restart", func(name string) error {
		return s.docker.RestartContainer(r.Context(), name)
	})
}

func (s *Server) handleContainerRemove(w http.ResponseWriter, r *http.Request) {
	force := r.URL.Query().Get("force") == "true"
	s.handleContainerAction(w, r, "remove", func(name string) error {
		return s.docker.RemoveContainer(r.Context(), name, force)
	})
}

func (s *Server) handleContainerAction(w http.ResponseWriter, r *http.Request, action string, fn func(string) error) {
	if s.docker == nil {
		writeProblem(w, http.StatusServiceUnavailable, "unavailable",
			"Docker daemon unavailable",
			"Cannot "+action+" container because the Docker client is not connected.",
			"Ensure Docker is running.",
		)
		return
	}
	containerName := r.PathValue("container")
	if err := fn(containerName); err != nil {
		writeProblem(w, http.StatusBadGateway, "internal",
			"Failed to "+action+" container",
			err.Error(),
			"Check Docker daemon logs and container state.",
		)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"container": containerName,
		"action":    action,
		"ok":        true,
	})
}

func containerHealth(ctr dockertypes.Container) string {
	switch ctr.State {
	case "running":
		return "ok"
	case "restarting", "created":
		return "progress"
	case "exited", "dead":
		return "fail"
	default:
		return "warn"
	}
}

func containerPhase(ctr dockertypes.Container) string {
	switch ctr.State {
	case "running":
		return "running"
	case "restarting", "created":
		return "pending"
	case "exited", "dead":
		return "failed"
	default:
		return "unknown"
	}
}

func runningCount(ctr dockertypes.Container) int {
	if ctr.State == "running" {
		return 1
	}
	return 0
}
