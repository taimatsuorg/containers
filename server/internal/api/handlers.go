package api

import (
	"encoding/json"
	"net/http"
	"os"
	"sort"
	"strings"

	"github.com/containers-im/containers/server/internal/docker"
	dockertypes "github.com/docker/docker/api/types"
)

func (s *Server) handleAuthMe(w http.ResponseWriter, r *http.Request) {
	username := "local"
	if s.auth.enabled() {
		username = s.auth.cfg.Username
	}
	writeJSON(w, http.StatusOK, AuthMe{
		Username:    username,
		AuthEnabled: s.auth.enabled(),
	})
}

func (s *Server) handleOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "localhost"
	}

	host := HostInfo{Hostname: hostname}
	if s.docker == nil {
		writeJSON(w, http.StatusOK, OverviewResponse{
			Host:     host,
			Counts:   ResourceCounts{},
			Projects: []ProjectSummary{},
		})
		return
	}

	if _, err := s.docker.Ping(ctx); err == nil {
		host.DockerConnected = true
	}
	if v, err := s.docker.Version(ctx); err == nil {
		host.DockerVersion = v.Version
	}
	if info, err := s.docker.Info(ctx); err == nil {
		if info.Name != "" {
			host.Hostname = info.Name
		}
		host.OS = info.OperatingSystem
		host.Kernel = info.KernelVersion
		host.Arch = info.Architecture
		host.CPUs = info.NCPU
		host.MemoryBytes = info.MemTotal
	}

	groups, err := s.docker.ListProjects(ctx)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	projects := make([]ProjectSummary, 0, len(groups))
	var totalCtrs, runningCtrs, stoppedCtrs int
	for _, g := range groups {
		ps := toProjectSummary(g)
		totalCtrs += ps.Total
		runningCtrs += ps.Running
		stoppedCtrs += ps.Stopped
		projects = append(projects, ps)
	}

	var imgCount, volCount, netCount int
	if imgs, err := s.docker.ListImages(ctx); err == nil {
		imgCount = len(imgs)
	}
	if vols, err := s.docker.ListVolumes(ctx); err == nil {
		volCount = len(vols)
	}
	if nets, err := s.docker.ListNetworks(ctx); err == nil {
		netCount = len(nets)
	}

	writeJSON(w, http.StatusOK, OverviewResponse{
		Host: host,
		Counts: ResourceCounts{
			Projects:          len(projects),
			ContainersTotal:   totalCtrs,
			ContainersRunning: runningCtrs,
			ContainersStopped: stoppedCtrs,
			Images:            imgCount,
			Volumes:           volCount,
			Networks:          netCount,
		},
		Projects: projects,
	})
}

func (s *Server) handleListProjects(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	groups, err := s.docker.ListProjects(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	out := make([]ProjectSummary, 0, len(groups))
	for _, g := range groups {
		out = append(out, toProjectSummary(g))
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleGetProject(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	name := r.PathValue("project")
	group, err := s.docker.GetProject(r.Context(), name)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	if group == nil {
		writeError(w, http.StatusNotFound, "Project not found: "+name)
		return
	}
	writeJSON(w, http.StatusOK, toProjectSummary(*group))
}

func (s *Server) handleListContainers(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	ctrs, err := s.docker.ListContainers(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	filterProj := strings.TrimSpace(r.URL.Query().Get("project"))
	filterState := strings.TrimSpace(r.URL.Query().Get("state"))

	out := make([]ContainerSummary, 0, len(ctrs))
	for _, ctr := range ctrs {
		cs := toContainerSummary(ctr)
		if filterProj != "" && cs.Project != filterProj {
			continue
		}
		if filterState == "running" && cs.State != "running" {
			continue
		}
		if filterState == "stopped" && cs.State == "running" {
			continue
		}
		out = append(out, cs)
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleCreateContainer(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	var req docker.CreateContainerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON request body")
		return
	}
	if strings.TrimSpace(req.Image) == "" {
		writeError(w, http.StatusBadRequest, "Image is required")
		return
	}
	id, err := s.docker.CreateAndStartContainer(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":      id,
		"shortId": shortID(id),
	})
}

func (s *Server) handleGetContainer(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	id := r.PathValue("id")
	insp, err := s.docker.InspectContainer(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	name := strings.TrimPrefix(insp.Name, "/")
	project := "standalone"
	var labels map[string]string
	var env, cmd, entrypoint []string
	var img string
	if insp.Config != nil {
		img = insp.Config.Image
		labels = insp.Config.Labels
		if p := labels["com.docker.compose.project"]; p != "" {
			project = p
		}
		env = insp.Config.Env
		cmd = insp.Config.Cmd
		entrypoint = insp.Config.Entrypoint
	}
	if labels == nil {
		labels = map[string]string{}
	}
	if env == nil {
		env = []string{}
	}
	if cmd == nil {
		cmd = []string{}
	}
	if entrypoint == nil {
		entrypoint = []string{}
	}

	stateStr := "unknown"
	startedAt := ""
	if insp.State != nil {
		stateStr = insp.State.Status
		startedAt = insp.State.StartedAt
	}

	restartPolicy := ""
	if insp.HostConfig != nil {
		restartPolicy = string(insp.HostConfig.RestartPolicy.Name)
	}

	mounts := make([]MountInfo, 0, len(insp.Mounts))
	for _, m := range insp.Mounts {
		mounts = append(mounts, MountInfo{
			Type:        string(m.Type),
			Source:      m.Source,
			Destination: m.Destination,
			ReadOnly:    !m.RW,
		})
	}

	var networks []string
	if insp.NetworkSettings != nil {
		for netName := range insp.NetworkSettings.Networks {
			networks = append(networks, netName)
		}
		sort.Strings(networks)
	}
	if networks == nil {
		networks = []string{}
	}

	ports := []PortMapping{}
	if insp.NetworkSettings != nil {
		for portProto, bindings := range insp.NetworkSettings.Ports {
			priv := uint16(portProto.Int())
			proto := portProto.Proto()
			if len(bindings) == 0 {
				ports = append(ports, PortMapping{
					PrivatePort: priv,
					Type:        proto,
				})
				continue
			}
			for _, b := range bindings {
				var pub uint16
				if b.HostPort != "" {
					for _, ch := range b.HostPort {
						if ch >= '0' && ch <= '9' {
							pub = pub*10 + uint16(ch-'0')
						}
					}
				}
				ports = append(ports, PortMapping{
					IP:          b.HostIP,
					PrivatePort: priv,
					PublicPort:  pub,
					Type:        proto,
				})
			}
		}
	}

	writeJSON(w, http.StatusOK, ContainerDetail{
		ContainerSummary: ContainerSummary{
			ID:         insp.ID,
			ShortID:    shortID(insp.ID),
			Name:       name,
			Project:    project,
			Image:      img,
			State:      stateStr,
			Status:     stateStr,
			Ports:      ports,
			MountCount: len(mounts),
		},
		Command:       cmd,
		Entrypoint:    entrypoint,
		Env:           env,
		Mounts:        mounts,
		Networks:      networks,
		Labels:        labels,
		RestartPolicy: restartPolicy,
		RestartCount:  insp.RestartCount,
		StartedAt:     startedAt,
	})
}

func (s *Server) handleContainerStats(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	id := r.PathValue("id")
	usage, err := s.docker.ContainerStatsOneShot(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, ContainerStatsResponse{
		Container:   usage.Name,
		CPUPercent:  usage.CPUPercent,
		MemoryBytes: usage.MemoryBytes,
		MemoryLimit: usage.MemoryLimit,
	})
}

func (s *Server) handleContainerStart(w http.ResponseWriter, r *http.Request) {
	s.runContainerAction(w, r, func(id string) error {
		return s.docker.StartContainer(r.Context(), id)
	})
}

func (s *Server) handleContainerStop(w http.ResponseWriter, r *http.Request) {
	s.runContainerAction(w, r, func(id string) error {
		return s.docker.StopContainer(r.Context(), id)
	})
}

func (s *Server) handleContainerRestart(w http.ResponseWriter, r *http.Request) {
	s.runContainerAction(w, r, func(id string) error {
		return s.docker.RestartContainer(r.Context(), id)
	})
}

func (s *Server) handleContainerRemove(w http.ResponseWriter, r *http.Request) {
	force := r.URL.Query().Get("force") == "true"
	s.runContainerAction(w, r, func(id string) error {
		return s.docker.RemoveContainer(r.Context(), id, force)
	})
}

func (s *Server) runContainerAction(w http.ResponseWriter, r *http.Request, fn func(string) error) {
	if !s.requireDocker(w) {
		return
	}
	id := r.PathValue("id")
	if err := fn(id); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleContainerLogs(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	id := r.PathValue("id")
	tail := r.URL.Query().Get("tail")
	timestamps := r.URL.Query().Get("timestamps") == "true"
	lines, err := s.docker.ContainerLogs(r.Context(), id, tail, timestamps)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"lines": lines})
}

func (s *Server) handleListImages(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	items, err := s.docker.ListImages(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	out := make([]ImageSummary, 0, len(items))
	for _, img := range items {
		tags := img.RepoTags
		if tags == nil {
			tags = []string{}
		}
		out = append(out, ImageSummary{
			ID:       img.ID,
			ShortID:  shortID(strings.TrimPrefix(img.ID, "sha256:")),
			RepoTags: tags,
			Size:     img.Size,
			Created:  img.Created,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleRemoveImage(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	id := r.PathValue("id")
	force := r.URL.Query().Get("force") == "true"
	if err := s.docker.RemoveImage(r.Context(), id, force); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleListVolumes(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	items, err := s.docker.ListVolumes(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	out := make([]VolumeSummary, 0, len(items))
	for _, v := range items {
		out = append(out, VolumeSummary{
			Name:       v.Name,
			Driver:     v.Driver,
			Mountpoint: v.Mountpoint,
			CreatedAt:  v.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleListNetworks(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}
	items, err := s.docker.ListNetworks(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	out := make([]NetworkSummary, 0, len(items))
	for _, n := range items {
		out = append(out, NetworkSummary{
			ID:         n.ID,
			ShortID:    shortID(n.ID),
			Name:       n.Name,
			Driver:     n.Driver,
			Scope:      n.Scope,
			Containers: len(n.Containers),
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) requireDocker(w http.ResponseWriter) bool {
	if s.docker == nil {
		writeError(w, http.StatusServiceUnavailable, "Docker daemon is not connected")
		return false
	}
	return true
}

func toProjectSummary(g docker.ProjectGroup) ProjectSummary {
	ctrs := make([]ContainerSummary, 0, len(g.Containers))
	var running, stopped int
	for _, ctr := range g.Containers {
		cs := toContainerSummary(ctr)
		if cs.State == "running" {
			running++
		} else {
			stopped++
		}
		ctrs = append(ctrs, cs)
	}
	return ProjectSummary{
		Name:       g.Name,
		Total:      len(ctrs),
		Running:    running,
		Stopped:    stopped,
		Containers: ctrs,
	}
}

func toContainerSummary(ctr dockertypes.Container) ContainerSummary {
	ports := make([]PortMapping, 0, len(ctr.Ports))
	for _, p := range ctr.Ports {
		ports = append(ports, PortMapping{
			IP:          p.IP,
			PrivatePort: p.PrivatePort,
			PublicPort:  p.PublicPort,
			Type:        p.Type,
		})
	}
	return ContainerSummary{
		ID:         ctr.ID,
		ShortID:    shortID(ctr.ID),
		Name:       docker.ContainerName(ctr),
		Project:    docker.ContainerProject(ctr),
		Image:      ctr.Image,
		State:      ctr.State,
		Status:     ctr.Status,
		Created:    ctr.Created,
		Ports:      ports,
		MountCount: len(ctr.Mounts),
	}
}

func shortID(id string) string {
	if len(id) > 12 {
		return id[:12]
	}
	return id
}
